package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/skufu/DianaV2/internal/config"
	"github.com/skufu/DianaV2/internal/http/router"
	"github.com/skufu/DianaV2/internal/store"
)

func main() {
	// Load .env file if it exists (not required in production)
	if err := godotenv.Load(); err != nil {
		log.Printf("No .env file found or error loading it: %v", err)
	}

	cfg := config.Load()

	var pool *pgxpool.Pool
	if cfg.DBDSN != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		var err error
		pool, err = pgxpool.New(ctx, cfg.DBDSN)
		if err != nil {
			log.Fatalf("failed to init pgx pool: %v", err)
		}
		if err := pool.Ping(ctx); err != nil {
			log.Fatalf("failed to ping database: %v", err)
		}
		log.Printf("connected to Postgres")
	} else {
		log.Printf("DB_DSN not set; running without database (handlers will error on DB access)")
	}

	var st store.Store
	if pool != nil {
		st = store.NewPostgresStore(pool)
	} else {
		st = store.NewPostgresStore(nil)
	}

	r := router.New(cfg, st)
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s", err)
		}
	}()
	log.Printf("server started on :%s", cfg.Port)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit
	log.Printf("shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("server shutdown error: %v", err)
	}
	st.Close()
	log.Printf("shutdown complete")
}
