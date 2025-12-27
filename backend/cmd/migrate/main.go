package main

import (
	"database/sql"
	"flag"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/skufu/DianaV2/backend/internal/config"
)

const migrationsDir = "./migrations"

func main() {
	// Load .env file if it exists
	_ = godotenv.Load()

	cfg := config.Load()
	if cfg.DBDSN == "" {
		log.Fatal("DB_DSN environment variable is required")
	}

	// Define command-line flags
	command := flag.String("command", "up", "Migration command: up, down, status, reset, version, create")
	name := flag.String("name", "", "Name for new migration (used with 'create' command)")
	flag.Parse()

	// Open database connection using pgx stdlib driver
	db, err := sql.Open("pgx", cfg.DBDSN)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}

	// Set the goose dialect
	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatalf("failed to set dialect: %v", err)
	}

	// Handle the migration command
	switch *command {
	case "up":
		if err := goose.Up(db, migrationsDir); err != nil {
			log.Fatalf("migration up failed: %v", err)
		}
		log.Println("migrations applied successfully")

	case "down":
		if err := goose.Down(db, migrationsDir); err != nil {
			log.Fatalf("migration down failed: %v", err)
		}
		log.Println("last migration reverted successfully")

	case "status":
		if err := goose.Status(db, migrationsDir); err != nil {
			log.Fatalf("migration status failed: %v", err)
		}

	case "reset":
		if err := goose.Reset(db, migrationsDir); err != nil {
			log.Fatalf("migration reset failed: %v", err)
		}
		log.Println("all migrations reverted successfully")

	case "version":
		if err := goose.Version(db, migrationsDir); err != nil {
			log.Fatalf("failed to get version: %v", err)
		}

	case "create":
		if *name == "" {
			log.Fatal("migration name is required for 'create' command (use -name flag)")
		}
		if err := goose.Create(db, migrationsDir, *name, "sql"); err != nil {
			log.Fatalf("failed to create migration: %v", err)
		}
		log.Printf("migration '%s' created successfully", *name)

	case "redo":
		if err := goose.Redo(db, migrationsDir); err != nil {
			log.Fatalf("migration redo failed: %v", err)
		}
		log.Println("last migration redone successfully")

	case "up-one":
		if err := goose.UpByOne(db, migrationsDir); err != nil {
			log.Fatalf("migration up-one failed: %v", err)
		}
		log.Println("one migration applied successfully")

	default:
		log.Printf("unknown command: %s", *command)
		log.Println("available commands: up, down, status, reset, version, create, redo, up-one")
		os.Exit(1)
	}
}
