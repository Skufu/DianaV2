package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/skufu/DianaV2/backend/internal/config"
	"golang.org/x/crypto/bcrypt"
)

type SeedUser struct {
	Email    string
	Password string
	IsAdmin  bool
}

func main() {
	// Load .env file if it exists
	_ = godotenv.Load()

	cfg := config.Load()
	if cfg.DBDSN == "" {
		log.Fatalf("DB_DSN is required for seeding")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DBDSN)
	if err != nil {
		log.Fatalf("failed to connect: %v", err)
	}
	defer pool.Close()

	users := []SeedUser{
		{Email: "admin@example.com", Password: "password123", IsAdmin: true},
		{Email: "user@example.com", Password: "password123", IsAdmin: false},
		{Email: "jane.doe@example.com", Password: "password123", IsAdmin: false},
	}

	for _, u := range users {
		if err := seedUser(ctx, pool, u.Email, u.Password, u.IsAdmin); err != nil {
			log.Printf("failed to seed user %s: %v", u.Email, err)
		} else {
			role := "user"
			if u.IsAdmin {
				role = "admin"
			}
			log.Printf("Seeded user: %s (Role: %s)", u.Email, role)
		}
	}

	fmt.Println("\n==================================")
	fmt.Println("       DEMO CREDENTIALS")
	fmt.Println("==================================")
	for _, u := range users {
		role := "User"
		if u.IsAdmin {
			role = "Admin"
		}
		fmt.Printf("Email: %-20s Password: %s Role: %s\n", u.Email, u.Password, role)
	}
	fmt.Println("==================================")
}

func seedUser(ctx context.Context, pool *pgxpool.Pool, email, password string, isAdmin bool) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	// Using is_admin, account_status, onboarding_completed based on schema analysis
	const q = `
	INSERT INTO users (email, password_hash, is_admin, is_active, account_status, onboarding_completed, created_at, updated_at)
	VALUES ($1, $2, $3, true, 'active', true, NOW(), NOW())
	ON CONFLICT (email) 
	DO UPDATE SET 
		password_hash = EXCLUDED.password_hash,
		is_admin = EXCLUDED.is_admin,
		is_active = true,
		account_status = 'active',
		onboarding_completed = true,
		updated_at = NOW()`

	_, err = pool.Exec(ctx, q, email, string(hash), isAdmin)
	return err
}
