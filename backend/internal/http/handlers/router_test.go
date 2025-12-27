package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skufu/DianaV2/backend/internal/config"
	appRouter "github.com/skufu/DianaV2/backend/internal/http/router"
	"github.com/skufu/DianaV2/backend/internal/store"
	"golang.org/x/crypto/bcrypt"
)

// NOTE: requires a Postgres test database reachable via TEST_DB_DSN.

func setupTestServer(t *testing.T) (*gin.Engine, func()) {
	t.Helper()
	dsn := os.Getenv("TEST_DB_DSN")
	if dsn == "" {
		t.Skip("TEST_DB_DSN not set; skipping integration tests")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("failed to connect test db: %v", err)
	}
	// Ensure schema is present (assumes migrations already applied in test DB).
	st := store.NewPostgresStore(pool)
	cfg := config.Config{
		Port:          "0",
		Env:           "test",
		DBDSN:         dsn,
		JWTSecret:     "test-secret",
		CORSOrigins:   []string{"*"},
		ModelVersion:  "test-model",
		ExportMaxRows: 100,
	}
	r := appRouter.New(cfg, st)

	return r, func() {
		cancel()
		st.Close()
	}
}

func seedTestUser(t *testing.T, pool *pgxpool.Pool, email, password string) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash err: %v", err)
	}
	_, err = pool.Exec(context.Background(), `
		INSERT INTO users (email, password_hash, role)
		VALUES ($1,$2,'clinician')
		ON CONFLICT (email) DO NOTHING`, email, string(hash))
	if err != nil {
		t.Fatalf("seed user err: %v", err)
	}
}

func getToken(t *testing.T, r http.Handler, email, password string) string {
	body, _ := json.Marshal(map[string]string{
		"email":    email,
		"password": password,
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("login failed code=%d body=%s", w.Code, w.Body.String())
	}
	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("parse token resp: %v", err)
	}
	return resp["token"]
}

func TestProtectedPatientsList(t *testing.T) {
	dsn := os.Getenv("TEST_DB_DSN")
	if dsn == "" {
		t.Skip("TEST_DB_DSN not set; skipping integration tests")
	}
	r, cleanup := setupTestServer(t)
	defer cleanup()

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("pool err: %v", err)
	}
	defer pool.Close()
	seedTestUser(t, pool, "tester@example.com", "password123")

	token := getToken(t, r, "tester@example.com", "password123")
	req := httptest.NewRequest("GET", "/api/v1/patients", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}
}

func TestAssessmentsCreateValidation(t *testing.T) {
	dsn := os.Getenv("TEST_DB_DSN")
	if dsn == "" {
		t.Skip("TEST_DB_DSN not set; skipping integration tests")
	}
	r, cleanup := setupTestServer(t)
	defer cleanup()

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("pool err: %v", err)
	}
	defer pool.Close()
	seedTestUser(t, pool, "tester@example.com", "password123")
	token := getToken(t, r, "tester@example.com", "password123")

	// Seed patient
	_, err = pool.Exec(ctx, `INSERT INTO patients (name) VALUES ('Test Patient') ON CONFLICT DO NOTHING`)
	if err != nil {
		t.Fatalf("seed patient err: %v", err)
	}
	var pid int
	_ = pool.QueryRow(ctx, `SELECT id FROM patients ORDER BY id DESC LIMIT 1`).Scan(&pid)

	payload := map[string]interface{}{
		"fbs":      130,
		"hba1c":    6.8,
		"activity": "Sedentary",
		"bmi":      31.2,
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/api/v1/patients/"+itoa(pid)+"/assessments", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != 201 {
		t.Fatalf("expected 201, got %d body=%s", w.Code, w.Body.String())
	}
	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("parse resp err: %v", err)
	}
	if resp["validation_status"] == nil {
		t.Fatalf("validation_status missing")
	}
}

func itoa(v int) string {
	return strconv.Itoa(v)
}
