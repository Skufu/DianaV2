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
	Email     string
	Password  string
	IsAdmin   bool
	FirstName string
	LastName  string
}

func main() {
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
		{Email: "admin@diana.app", Password: "admin123", IsAdmin: true},
		{Email: "demo@diana.app", Password: "demopassword123", IsAdmin: false, FirstName: "Demo", LastName: "User"},
	}

	for _, u := range users {
		firstName := ""
		lastName := ""
		if u.FirstName != "" {
			firstName = u.FirstName
		}
		if u.LastName != "" {
			lastName = u.LastName
		}

		if err := seedUser(ctx, pool, u.Email, u.Password, firstName, lastName, u.IsAdmin); err != nil {
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

func seedUser(ctx context.Context, pool *pgxpool.Pool, email, password, firstName, lastName string, isAdmin bool) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	const q = `
		DELETE FROM users WHERE email = $1
	`

	_, err = pool.Exec(ctx, q, email)
	if err != nil {
		return err
	}

	const insertQ = `
		INSERT INTO users (email, password_hash, is_admin, is_active, account_status, onboarding_completed, first_name, last_name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
	`

	_, err = pool.Exec(ctx, insertQ, email, string(hash), isAdmin)
	return err
}
