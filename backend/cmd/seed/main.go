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
	Role      string
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
		{Email: "admin@diana.app", Password: "admin123", Role: "admin"},
		{Email: "doctor@diana.app", Password: "doctor123", Role: "doctor"},
		{Email: "demo@diana.app", Password: "demopassword123", Role: "user", FirstName: "Demo", LastName: "User"},
		{Email: "test@test.com", Password: "password123", Role: "user", FirstName: "Test", LastName: "User"},
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

		if err := seedUser(ctx, pool, u.Email, u.Password, firstName, lastName, u.Role); err != nil {
			log.Printf("failed to seed user %s: %v", u.Email, err)
		} else {
			log.Printf("Seeded user: %s (Role: %s)", u.Email, u.Role)
		}
	}

	fmt.Println("\n==================================")
	fmt.Println("       DEMO CREDENTIALS")
	fmt.Println("==================================")
	for _, u := range users {
		role := u.Role
		if role == "" {
			role = "user"
		}
		fmt.Printf("Email: %-20s Password: %s Role: %s\n", u.Email, u.Password, role)
	}
	fmt.Println("==================================")
}

func seedUser(ctx context.Context, pool *pgxpool.Pool, email, password, firstName, lastName, role string) error {
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

	if role == "" {
		role = "user"
	}
	isAdmin := role == "admin"

	const insertQ = `
		INSERT INTO users (email, password_hash, role, is_admin, is_active, account_status, onboarding_completed, first_name, last_name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
	`

	_, err = pool.Exec(ctx, insertQ, email, string(hash), role, isAdmin, true, "active", false, firstName, lastName)
	return err
}
