package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"github.com/pressly/goose/v3"
	"github.com/skufu/DianaV2/backend/internal/cache"
	"github.com/skufu/DianaV2/backend/internal/config"
	"github.com/skufu/DianaV2/backend/internal/http/router"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// @title           DIANA API
// @version         1.0
// @description     Diabetes Insulin Activity and Nutrition Analyzer (DIANA) - Risk assessment and patient management API
// @termsOfService  http://swagger.io/terms/

// @contact.name   DIANA Support
// @contact.email  support@diana-health.com

// @license.name  MIT
// @license.url   https://opensource.org/licenses/MIT

// @host      localhost:8080
// @BasePath  /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description JWT Bearer token. Format: Bearer <token>

func main() {
	// Load .env file if it exists (not required in production)
	if err := godotenv.Load(); err != nil {
		log.Printf("No .env file found or error loading it: %v", err)
	}

	cfg := config.Load()

	// Create cancellable context for background goroutines
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var pool *pgxpool.Pool
	if cfg.DBDSN != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		var err error

		// Ensure NeonDB pooler (PgBouncer) compatibility by using simple protocol
		dsn := cfg.DBDSN
		if !strings.Contains(dsn, "default_query_exec_mode") {
			sep := "&"
			if !strings.Contains(dsn, "?") {
				sep = "?"
			}
			dsn += sep + "default_query_exec_mode=simple_protocol"
		}

		poolConfig, err := pgxpool.ParseConfig(dsn)
		if err != nil {
			log.Fatalf("failed to parse DB config: %v", err)
		}

		poolConfig.MaxConns = 10
		poolConfig.MinConns = 2
		poolConfig.MaxConnLifetime = 1 * time.Hour
		poolConfig.MaxConnIdleTime = 30 * time.Minute
		poolConfig.HealthCheckPeriod = 1 * time.Minute

		pool, err = pgxpool.NewWithConfig(ctx, poolConfig)
		if err != nil {
			log.Fatalf("failed to init pgx pool: %v", err)
		}
		if err := pool.Ping(ctx); err != nil {
			log.Fatalf("failed to ping database: %v", err)
		}

		log.Printf("connected to Postgres (MaxConns: %d, MinConns: %d, MaxConnLifetime: %s, MaxConnIdleTime: %s)",
			poolConfig.MaxConns, poolConfig.MinConns, poolConfig.MaxConnLifetime, poolConfig.MaxConnIdleTime)

		// Auto-run database migrations using Goose
		// Use simple protocol for NeonDB pooler (PgBouncer) compatibility
		log.Printf("running database migrations...")
		migrationDSN := cfg.DBDSN
		if !strings.Contains(migrationDSN, "default_query_exec_mode") {
			sep := "&"
			if !strings.Contains(migrationDSN, "?") {
				sep = "?"
			}
			migrationDSN += sep + "default_query_exec_mode=simple_protocol"
		}
		migrationDB, err := sql.Open("pgx", migrationDSN)
		if err != nil {
			log.Fatalf("failed to open migration DB connection: %v", err)
		}
		if err := goose.SetDialect("postgres"); err != nil {
			log.Fatalf("failed to set goose dialect: %v", err)
		}
		if err := goose.Up(migrationDB, "./migrations"); err != nil {
			log.Fatalf("migration failed: %v", err)
		}
		if err := migrationDB.Close(); err != nil {
			log.Printf("failed to close migration DB connection: %v", err)
		}
		log.Printf("database migrations completed successfully")
	} else {
		log.Printf("DB_DSN not set; running without database (handlers will error on DB access)")
	}

	var st store.Store
	if pool != nil {
		st = store.NewPostgresStore(pool)
	} else {
		st = store.NewPostgresStore(nil)
	}

	var redisCache *cache.Cache
	if cfg.RedisAddr != "" {
		cache, err := cache.NewCache(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
		if err != nil {
			log.Printf("WARNING: Failed to connect to Redis at %s: %v", cfg.RedisAddr, err)
			log.Printf("Continuing without cache layer...")
			redisCache = nil
		} else {
			redisCache = cache
			log.Printf("connected to Redis at %s (DB: %d)", cfg.RedisAddr, cfg.RedisDB)

			go func() {
				ticker := time.NewTicker(5 * time.Minute)
				defer ticker.Stop()

				for {
					select {
					case <-ticker.C:
						metrics := redisCache.GetMetrics()
						total := metrics.Hits + metrics.Misses
						var hitRate float64
						if total > 0 {
							hitRate = float64(metrics.Hits) / float64(total) * 100
						}

						log.Printf("[CACHE METRICS] Hits: %d, Misses: %d, Total: %d, Hit Rate: %.2f%%",
							metrics.Hits, metrics.Misses, total, hitRate)
					case <-ctx.Done():
						return
					}
				}
			}()
		}
	} else {
		log.Printf("REDIS_ADDR not set; running without cache layer")
		redisCache = nil
	}

	r, auditLogger := router.New(cfg, st, redisCache)
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s", err)
		}
	}()

	// Start background job to clean up expired refresh tokens every 24 hours
	go func() {
		// Run once immediately on startup
		if err := st.RefreshTokens().DeleteExpiredTokens(ctx); err != nil {
			log.Printf("initial token cleanup error: %v", err)
		}
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := st.RefreshTokens().DeleteExpiredTokens(ctx); err != nil {
					log.Printf("token cleanup error: %v", err)
				} else {
					log.Printf("expired tokens cleaned up successfully")
				}
			case <-ctx.Done():
				return
			}
		}
	}()

	log.Printf("server started on :%s", cfg.Port)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit
	log.Printf("shutting down...")

	// Cancel context to stop background goroutines
	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("server shutdown error: %v", err)
	}
	if redisCache != nil {
		if err := redisCache.Close(); err != nil {
			log.Printf("redis shutdown error: %v", err)
		}
	}
	st.Close()
	log.Printf("waiting for pending audit logs...")
	auditLogger.Shutdown()
	log.Printf("shutdown complete")
}
