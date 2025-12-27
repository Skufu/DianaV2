package main

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/skufu/DianaV2/backend/internal/config"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Load .env file if it exists
	_ = godotenv.Load()

	cfg := config.Load()
	if cfg.DBDSN == "" {
		log.Fatalf("DB_DSN is required for seeding")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DBDSN)
	if err != nil {
		log.Fatalf("failed to connect: %v", err)
	}
	defer pool.Close()

	if err := seedUser(ctx, pool, "clinician@example.com", "password123", "clinician"); err != nil {
		log.Fatalf("seed user: %v", err)
	}
	log.Println("seed complete")
}

func seedUser(ctx context.Context, pool *pgxpool.Pool, email, password, role string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	const q = `
	INSERT INTO users (email, password_hash, role)
	VALUES ($1, $2, $3)
	ON CONFLICT (email) DO NOTHING`
	_, err = pool.Exec(ctx, q, email, string(hash), role)
	return err
}
