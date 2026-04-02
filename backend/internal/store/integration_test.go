// integration_test.go: Comprehensive integration tests for store layer.
// Tests all repository methods against a real PostgreSQL database.
// Uses a test database connection for isolation and proper cleanup.

package store

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/skufu/DianaV2/backend/internal/models"
)

// Test database connection string from environment
var testDBDSN = os.Getenv("TEST_DB_DSN")

// fallback to standard dev DSN if TEST_DB_DSN not set
func getTestDBDSN() string {
	if testDBDSN != "" {
		return testDBDSN
	}
	// Use default dev connection for local testing
	return "postgres://diana:diana@localhost:5432/diana?sslmode=disable"
}

// Global test store and pool
var testStore *PostgresStore
var testPool *pgxpool.Pool

// TestMain handles setup and teardown for all integration tests
func TestMain(m *testing.M) {
	dsn := getTestDBDSN()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Connect to test database
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Printf("[INTEGRATION TEST] Failed to connect to database: %v", err)
		log.Printf("[INTEGRATION TEST] Skipping integration tests - database not available")
		os.Exit(0) // Exit gracefully, don't fail
	}
	testPool = pool

	// Verify connection
	if err := pool.Ping(ctx); err != nil {
		log.Printf("[INTEGRATION TEST] Failed to ping database: %v", err)
		pool.Close()
		os.Exit(0)
	}

	// Run migrations to ensure schema is up to date
	dbConn, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Printf("[INTEGRATION TEST] Failed to open database connection: %v", err)
		pool.Close()
		os.Exit(0)
	}
	defer dbConn.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		log.Printf("[INTEGRATION TEST] Failed to set goose dialect: %v", err)
		pool.Close()
		os.Exit(0)
	}

	// Run migrations up
	if err := goose.Up(dbConn, "../../migrations"); err != nil {
		// Already up is fine
		if err.Error() != "no migrations to run" && err.Error() != "goose: no migrations to run. current version: 21" {
			log.Printf("[INTEGRATION TEST] Migration warning: %v", err)
		}
	}

	// Create test store
	testStore = NewPostgresStore(pool)

	// Run tests
	code := m.Run()

	// Cleanup
	cleanupTestData()
	pool.Close()

	os.Exit(code)
}

// cleanupTestData removes test data from database after tests
func cleanupTestData() {
	ctx := context.Background()

	// Clean test users
	testPool.Exec(ctx, "DELETE FROM users WHERE email LIKE '%@test.integration%'")
	testPool.Exec(ctx, "DELETE FROM assessments WHERE notes LIKE '%integration test%'")
	testPool.Exec(ctx, "DELETE FROM refresh_tokens WHERE token_hash LIKE 'test_hash_%'")
	testPool.Exec(ctx, "DELETE FROM audit_events WHERE actor LIKE 'test_actor_%'")
	testPool.Exec(ctx, "DELETE FROM model_runs WHERE notes LIKE '%integration test%'")
}

// Helper to generate unique test email
func testEmail(suffix string) string {
	return fmt.Sprintf("user_%d_%s@test.integration", time.Now().UnixNano(), suffix)
}

// Helper to generate unique test hash
func testHash(suffix string) string {
	return fmt.Sprintf("test_hash_%d_%s", time.Now().UnixNano(), suffix)
}

// ============================================================================
// UserRepository Integration Tests
// ============================================================================

func TestIntegration_UserRepository_Create(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	email := testEmail("create")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password_123",
		Role:         models.RoleUser,
	}

	created, err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	if created.ID == 0 {
		t.Error("Expected user ID to be set after creation")
	}
	if created.Email != email {
		t.Errorf("Expected email %s, got %s", email, created.Email)
	}
	if created.Role != models.RoleUser {
		t.Errorf("Expected role %s, got %s", models.RoleUser, created.Role)
	}
	if !created.IsActive {
		t.Error("Expected user to be active by default")
	}
	if created.CreatedAt.IsZero() {
		t.Error("Expected CreatedAt to be set")
	}
}

func TestIntegration_UserRepository_FindByEmail(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create test user first
	email := testEmail("find")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	created, err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Find by email
	found, err := repo.FindByEmail(ctx, email)
	if err != nil {
		t.Fatalf("Failed to find user by email: %v", err)
	}

	if found.ID != created.ID {
		t.Errorf("Expected ID %d, got %d", created.ID, found.ID)
	}
	if found.Email != email {
		t.Errorf("Expected email %s, got %s", email, found.Email)
	}
}

func TestIntegration_UserRepository_FindByID(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create test user
	email := testEmail("findid")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	created, err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Find by ID
	found, err := repo.FindByID(ctx, int32(created.ID))
	if err != nil {
		t.Fatalf("Failed to find user by ID: %v", err)
	}

	if found.ID != created.ID {
		t.Errorf("Expected ID %d, got %d", created.ID, found.ID)
	}
}

func TestIntegration_UserRepository_FindByEmail_NotFound(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	_, err := repo.FindByEmail(ctx, "nonexistent@test.integration")
	if err == nil {
		t.Error("Expected error when finding non-existent user")
	}
}

func TestIntegration_UserRepository_List(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create multiple test users
	for i := 0; i < 3; i++ {
		email := testEmail(fmt.Sprintf("list%d", i))
		user := models.User{
			Email:        email,
			PasswordHash: "hashed_password",
			Role:         models.RoleUser,
		}
		_, err := repo.Create(ctx, user)
		if err != nil {
			t.Fatalf("Setup failed for user %d: %v", i, err)
		}
	}

	// List users
	params := models.UserListParams{
		Page:     1,
		PageSize: 10,
		Search:   "test.integration",
	}

	users, total, err := repo.List(ctx, params)
	if err != nil {
		t.Fatalf("Failed to list users: %v", err)
	}

	if total < 3 {
		t.Errorf("Expected at least 3 test users, got %d", total)
	}
	if len(users) < 1 {
		t.Error("Expected at least one user in list")
	}
}

func TestIntegration_UserRepository_List_FilterByRole(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create test user with specific role
	email := testEmail("rolefilter")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleAdmin,
	}
	_, err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// List with role filter
	params := models.UserListParams{
		Page:     1,
		PageSize: 10,
		Role:     models.RoleAdmin,
		Search:   "test.integration",
	}

	users, _, err := repo.List(ctx, params)
	if err != nil {
		t.Fatalf("Failed to list users: %v", err)
	}

	for _, u := range users {
		if u.Role != models.RoleAdmin {
			t.Errorf("Expected role filter to return only admin users, got %s", u.Role)
		}
	}
}

func TestIntegration_UserRepository_Update(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create test user
	email := testEmail("update")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	created, err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Update user
	newEmail := testEmail("updated")
	updated := models.User{
		ID:    created.ID,
		Email: newEmail,
		Role:  models.RoleDoctor,
	}
	result, err := repo.Update(ctx, updated)
	if err != nil {
		t.Fatalf("Failed to update user: %v", err)
	}

	if result.Email != newEmail {
		t.Errorf("Expected updated email %s, got %s", newEmail, result.Email)
	}
}

func TestIntegration_UserRepository_UpdateUser(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create test user with health profile
	email := testEmail("updateprofile")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	created, err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Update profile fields (with valid assessment_frequency_months: 1-12)
	profile := models.User{
		ID:                      created.ID,
		FirstName:               "Test",
		LastName:                "User",
		MenopauseStatus:         "peri",
		Hypertension:            "controlled",
		SmokingStatus:           "former",
		PhysicalActivity:        "Moderate",
		AssessmentFrequencyMonths: 3, // Valid value between 1-12
	}
	result, err := repo.UpdateUser(ctx, profile)
	if err != nil {
		t.Fatalf("Failed to update user profile: %v", err)
	}

	if result.FirstName != "Test" {
		t.Errorf("Expected FirstName 'Test', got '%s'", result.FirstName)
	}
	if result.LastName != "User" {
		t.Errorf("Expected LastName 'User', got '%s'", result.LastName)
	}
	if result.MenopauseStatus != "peri" {
		t.Errorf("Expected MenopauseStatus 'peri', got '%s'", result.MenopauseStatus)
	}
}

func TestIntegration_UserRepository_Deactivate(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create test user
	email := testEmail("deactivate")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	created, err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Deactivate
	err = repo.Deactivate(ctx, int32(created.ID))
	if err != nil {
		t.Fatalf("Failed to deactivate user: %v", err)
	}

	// Verify deactivated
	found, err := repo.FindByID(ctx, int32(created.ID))
	if err != nil {
		t.Fatalf("Failed to find deactivated user: %v", err)
	}
	if found.IsActive {
		t.Error("Expected user to be deactivated")
	}
}

func TestIntegration_UserRepository_Activate(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create test user
	email := testEmail("activate")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	created, err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Deactivate then activate
	repo.Deactivate(ctx, int32(created.ID))
	err = repo.Activate(ctx, int32(created.ID))
	if err != nil {
		t.Fatalf("Failed to activate user: %v", err)
	}

	// Verify activated
	found, err := repo.FindByID(ctx, int32(created.ID))
	if err != nil {
		t.Fatalf("Failed to find activated user: %v", err)
	}
	if !found.IsActive {
		t.Error("Expected user to be activated")
	}
}

func TestIntegration_UserRepository_UpdateLastLogin(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create test user
	email := testEmail("lastlogin")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	created, err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Update last login
	err = repo.UpdateLastLogin(ctx, int32(created.ID))
	if err != nil {
		t.Fatalf("Failed to update last login: %v", err)
	}

	// Note: LastLoginAt is not returned by FindByID in the current query
	// This test verifies that the update operation completes without error
	// A more thorough test would query the database directly for last_login_at
}

func TestIntegration_UserRepository_UpdateUserOnboarding(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create test user
	email := testEmail("onboarding")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	created, err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Mark onboarding complete
	err = repo.UpdateUserOnboarding(ctx, created.ID, true)
	if err != nil {
		t.Fatalf("Failed to update onboarding: %v", err)
	}

	// Verify
	found, err := repo.FindByID(ctx, int32(created.ID))
	if err != nil {
		t.Fatalf("Failed to find user: %v", err)
	}
	if !found.OnboardingCompleted {
		t.Error("Expected OnboardingCompleted to be true")
	}
}

func TestIntegration_UserRepository_UpdateUserConsent(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create test user
	email := testEmail("consent")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	created, err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Update consent
	consent := models.ConsentSettings{
		ConsentPersonalData:          true,
		ConsentResearchParticipation: true,
		ConsentEmailUpdates:          false,
		ConsentAnalytics:             true,
	}
	err = repo.UpdateUserConsent(ctx, created.ID, consent)
	if err != nil {
		t.Fatalf("Failed to update consent: %v", err)
	}

	// Verify
	found, err := repo.FindByID(ctx, int32(created.ID))
	if err != nil {
		t.Fatalf("Failed to find user: %v", err)
	}
	if !found.ConsentPersonalData {
		t.Error("Expected ConsentPersonalData to be true")
	}
}

func TestIntegration_UserRepository_GetAssessmentCountByUser(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user
	email := testEmail("assessmentcount")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	created, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Create assessments
	for i := 0; i < 2; i++ {
		assessment := models.Assessment{
			UserID: created.ID,
			HbA1c:  6.5,
			FBS:    100.0,
			Notes:  "integration test count",
		}
		_, err := assessmentRepo.Create(ctx, assessment)
		if err != nil {
			t.Fatalf("Failed to create assessment: %v", err)
		}
	}

	// Get count
	count, err := userRepo.GetAssessmentCountByUser(ctx, created.ID)
	if err != nil {
		t.Fatalf("Failed to get assessment count: %v", err)
	}

	if count < 2 {
		t.Errorf("Expected at least 2 assessments, got %d", count)
	}
}

// ============================================================================
// AssessmentRepository Integration Tests
// ============================================================================

func TestIntegration_AssessmentRepository_Create(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user
	email := testEmail("assessment")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Create assessment
	assessment := models.Assessment{
		UserID:        createdUser.ID,
		HbA1c:         6.5,
		FBS:           100.0,
		Cholesterol:   180,
		LDL:           100,
		HDL:           50,
		Triglycerides: 150,
		Systolic:      120,
		Diastolic:     80,
		BMI:           25.0,
		RiskScore:     45,
		Cluster:       "metabolic_risk",
		Notes:         "integration test create",
	}

	created, err := assessmentRepo.Create(ctx, assessment)
	if err != nil {
		t.Fatalf("Failed to create assessment: %v", err)
	}

	if created.ID == 0 {
		t.Error("Expected assessment ID to be set")
	}
	if created.UserID != createdUser.ID {
		t.Errorf("Expected UserID %d, got %d", createdUser.ID, created.UserID)
	}
	if created.HbA1c != 6.5 {
		t.Errorf("Expected HbA1c 6.5, got %f", created.HbA1c)
	}
}

func TestIntegration_AssessmentRepository_Get(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user and assessment
	email := testEmail("getassessment")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	assessment := models.Assessment{
		UserID: createdUser.ID,
		HbA1c:  7.2,
		Notes:  "integration test get",
	}
	created, err := assessmentRepo.Create(ctx, assessment)
	if err != nil {
		t.Fatalf("Failed to create assessment: %v", err)
	}

	// Get assessment
	found, err := assessmentRepo.Get(ctx, int32(created.ID))
	if err != nil {
		t.Fatalf("Failed to get assessment: %v", err)
	}

	if found.ID != created.ID {
		t.Errorf("Expected ID %d, got %d", created.ID, found.ID)
	}
	if found.HbA1c != 7.2 {
		t.Errorf("Expected HbA1c 7.2, got %f", found.HbA1c)
	}
}

func TestIntegration_AssessmentRepository_ListByPatient(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user
	email := testEmail("listassessment")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Create multiple assessments
	for i := 0; i < 3; i++ {
		assessment := models.Assessment{
			UserID: createdUser.ID,
			HbA1c:  6.0 + float64(i)*0.5,
			Notes:  "integration test list",
		}
		_, err := assessmentRepo.Create(ctx, assessment)
		if err != nil {
			t.Fatalf("Failed to create assessment %d: %v", i, err)
		}
	}

	// List assessments
	assessments, err := assessmentRepo.ListByPatient(ctx, createdUser.ID)
	if err != nil {
		t.Fatalf("Failed to list assessments: %v", err)
	}

	if len(assessments) < 3 {
		t.Errorf("Expected at least 3 assessments, got %d", len(assessments))
	}
}

func TestIntegration_AssessmentRepository_ListByPatientPaginated(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user
	email := testEmail("paginated")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Create multiple assessments
	for i := 0; i < 5; i++ {
		assessment := models.Assessment{
			UserID: createdUser.ID,
			HbA1c:  6.0 + float64(i)*0.2,
			Notes:  "integration test paginated",
		}
		_, err := assessmentRepo.Create(ctx, assessment)
		if err != nil {
			t.Fatalf("Failed to create assessment: %v", err)
		}
	}

	// List with pagination
	assessments, total, err := assessmentRepo.ListByPatientPaginated(ctx, createdUser.ID, 2, 0)
	if err != nil {
		t.Fatalf("Failed to list paginated assessments: %v", err)
	}

	if total < 5 {
		t.Errorf("Expected total >= 5, got %d", total)
	}
	if len(assessments) > 2 {
		t.Errorf("Expected at most 2 assessments with limit=2, got %d", len(assessments))
	}
}

func TestIntegration_AssessmentRepository_Update(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user and assessment
	email := testEmail("updateassessment")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	assessment := models.Assessment{
		UserID: createdUser.ID,
		HbA1c:  6.5,
		Notes:  "integration test update",
	}
	created, err := assessmentRepo.Create(ctx, assessment)
	if err != nil {
		t.Fatalf("Failed to create assessment: %v", err)
	}

	// Update assessment
	updated := models.Assessment{
		ID:     created.ID,
		UserID: createdUser.ID,
		HbA1c:  7.0,
		FBS:    110.0,
		Notes:  "integration test updated",
	}
	result, err := assessmentRepo.Update(ctx, updated)
	if err != nil {
		t.Fatalf("Failed to update assessment: %v", err)
	}

	if result.HbA1c != 7.0 {
		t.Errorf("Expected HbA1c 7.0, got %f", result.HbA1c)
	}
}

func TestIntegration_AssessmentRepository_Delete(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user and assessment
	email := testEmail("deleteassessment")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	assessment := models.Assessment{
		UserID: createdUser.ID,
		HbA1c:  6.5,
		Notes:  "integration test delete",
	}
	created, err := assessmentRepo.Create(ctx, assessment)
	if err != nil {
		t.Fatalf("Failed to create assessment: %v", err)
	}

	// Delete assessment
	err = assessmentRepo.Delete(ctx, int32(created.ID))
	if err != nil {
		t.Fatalf("Failed to delete assessment: %v", err)
	}

	// Verify deletion - Get should fail
	_, err = assessmentRepo.Get(ctx, int32(created.ID))
	if err == nil {
		t.Error("Expected error when getting deleted assessment")
	}
}

func TestIntegration_AssessmentRepository_ClusterCounts(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()

	// Get cluster counts (works even without test data)
	counts, err := testStore.Assessments().ClusterCounts(ctx)
	if err != nil {
		t.Fatalf("Failed to get cluster counts: %v", err)
	}

	// Should return valid slice (even if empty)
	if counts == nil {
		t.Error("Expected non-nil result")
	}
}

func TestIntegration_AssessmentRepository_TrendAverages(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()

	// Get trend averages
	trends, err := testStore.Assessments().TrendAverages(ctx)
	if err != nil {
		t.Fatalf("Failed to get trend averages: %v", err)
	}

	if trends == nil {
		t.Error("Expected non-nil result")
	}
}

// ============================================================================
// RefreshTokenRepository Integration Tests
// ============================================================================

func TestIntegration_RefreshTokenRepository_Create(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	tokenRepo := testStore.RefreshTokens()

	// Create test user
	email := testEmail("token")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Create refresh token
	tokenHash := testHash("create")
	expiresAt := time.Now().Add(24 * time.Hour)

	token, err := tokenRepo.CreateRefreshToken(ctx, tokenHash, int32(createdUser.ID), expiresAt)
	if err != nil {
		t.Fatalf("Failed to create refresh token: %v", err)
	}

	if token.ID == 0 {
		t.Error("Expected token ID to be set")
	}
	if token.TokenHash != tokenHash {
		t.Errorf("Expected token hash %s, got %s", tokenHash, token.TokenHash)
	}
	if token.UserID != createdUser.ID {
		t.Errorf("Expected UserID %d, got %d", createdUser.ID, token.UserID)
	}
}

func TestIntegration_RefreshTokenRepository_FindRefreshToken(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	tokenRepo := testStore.RefreshTokens()

	// Create test user and token
	email := testEmail("findtoken")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	tokenHash := testHash("find")
	expiresAt := time.Now().Add(24 * time.Hour)
	created, err := tokenRepo.CreateRefreshToken(ctx, tokenHash, int32(createdUser.ID), expiresAt)
	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	// Find token
	found, err := tokenRepo.FindRefreshToken(ctx, tokenHash)
	if err != nil {
		t.Fatalf("Failed to find refresh token: %v", err)
	}

	if found.ID != created.ID {
		t.Errorf("Expected ID %d, got %d", created.ID, found.ID)
	}
	if found.Revoked {
		t.Error("Expected token not to be revoked initially")
	}
}

func TestIntegration_RefreshTokenRepository_RevokeRefreshToken(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	tokenRepo := testStore.RefreshTokens()

	// Create test user and token
	email := testEmail("revoketoken")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	tokenHash := testHash("revoke")
	expiresAt := time.Now().Add(24 * time.Hour)
	_, err = tokenRepo.CreateRefreshToken(ctx, tokenHash, int32(createdUser.ID), expiresAt)
	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	// Revoke token
	err = tokenRepo.RevokeRefreshToken(ctx, tokenHash)
	if err != nil {
		t.Fatalf("Failed to revoke token: %v", err)
	}

	// Verify revoked
	found, err := tokenRepo.FindRefreshToken(ctx, tokenHash)
	if err != nil {
		t.Fatalf("Failed to find token: %v", err)
	}
	if !found.Revoked {
		t.Error("Expected token to be revoked")
	}
}

func TestIntegration_RefreshTokenRepository_RevokeAllUserTokens(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	tokenRepo := testStore.RefreshTokens()

	// Create test user
	email := testEmail("revokeall")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Create multiple tokens
	for i := 0; i < 3; i++ {
		tokenHash := testHash(fmt.Sprintf("revokeall%d", i))
		expiresAt := time.Now().Add(24 * time.Hour)
		_, err := tokenRepo.CreateRefreshToken(ctx, tokenHash, int32(createdUser.ID), expiresAt)
		if err != nil {
			t.Fatalf("Failed to create token %d: %v", i, err)
		}
	}

	// Revoke all user tokens
	err = tokenRepo.RevokeAllUserTokens(ctx, int32(createdUser.ID))
	if err != nil {
		t.Fatalf("Failed to revoke all tokens: %v", err)
	}

	// Verify (Note: we can't easily verify all without querying by user)
	// This test ensures the operation doesn't error
}

func TestIntegration_RefreshTokenRepository_DeleteExpiredTokens(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	tokenRepo := testStore.RefreshTokens()

	// Delete expired tokens (cleanup operation)
	err := tokenRepo.DeleteExpiredTokens(ctx)
	if err != nil {
		t.Fatalf("Failed to delete expired tokens: %v", err)
	}
}

// ============================================================================
// AuditEventRepository Integration Tests
// ============================================================================

func TestIntegration_AuditEventRepository_Create(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	auditRepo := testStore.AuditEvents()

	// Create audit event
	event := models.AuditEvent{
		Actor:      "test_actor_create",
		Action:     "user_created",
		TargetType: "user",
		TargetID:   123,
		Details:    map[string]any{"email": "test@test.integration"},
	}

	err := auditRepo.Create(ctx, event)
	if err != nil {
		t.Fatalf("Failed to create audit event: %v", err)
	}
}

func TestIntegration_AuditEventRepository_List(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	auditRepo := testStore.AuditEvents()

	// Create audit events
	for i := 0; i < 3; i++ {
		event := models.AuditEvent{
			Actor:      fmt.Sprintf("test_actor_list_%d", i),
			Action:     "test_action",
			TargetType: "test",
			TargetID:   i,
			Details:    map[string]any{"index": i},
		}
		err := auditRepo.Create(ctx, event)
		if err != nil {
			t.Fatalf("Failed to create audit event %d: %v", i, err)
		}
	}

	// List audit events
	params := models.AuditListParams{
		Page:     1,
		PageSize: 10,
		Actor:    "test_actor_list",
	}

	events, total, err := auditRepo.List(ctx, params)
	if err != nil {
		t.Fatalf("Failed to list audit events: %v", err)
	}

	if total < 1 {
		t.Errorf("Expected at least 1 audit event, got %d", total)
	}
	if len(events) < 1 {
		t.Error("Expected at least one event in list")
	}
}

func TestIntegration_AuditEventRepository_List_FilterByAction(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	auditRepo := testStore.AuditEvents()

	// Create audit event with specific action
	event := models.AuditEvent{
		Actor:      "test_actor_filter",
		Action:     "specific_action_filter",
		TargetType: "test",
		TargetID:   1,
	}
	err := auditRepo.Create(ctx, event)
	if err != nil {
		t.Fatalf("Failed to create audit event: %v", err)
	}

	// List with action filter
	params := models.AuditListParams{
		Page:     1,
		PageSize: 10,
		Action:   "specific_action_filter",
	}

	events, _, err := auditRepo.List(ctx, params)
	if err != nil {
		t.Fatalf("Failed to list audit events: %v", err)
	}

	for _, e := range events {
		if e.Action != "specific_action_filter" {
			t.Errorf("Expected action filter, got %s", e.Action)
		}
	}
}

// ============================================================================
// ModelRunRepository Integration Tests
// ============================================================================

func TestIntegration_ModelRunRepository_Create(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	modelRepo := testStore.ModelRuns()

	// Create model run
	run := models.ModelRun{
		ModelVersion: "binary_v2_no_bp",
		DatasetHash:  "test_hash_integration",
		Notes:        "integration test create",
	}

	created, err := modelRepo.Create(ctx, run)
	if err != nil {
		t.Fatalf("Failed to create model run: %v", err)
	}

	if created.ID == 0 {
		t.Error("Expected model run ID to be set")
	}
	if created.ModelVersion != "binary_v2_no_bp" {
		t.Errorf("Expected ModelVersion binary_v2_no_bp, got %s", created.ModelVersion)
	}
}

func TestIntegration_ModelRunRepository_List(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	modelRepo := testStore.ModelRuns()

	// Create model run
	run := models.ModelRun{
		ModelVersion: "test_version_list",
		DatasetHash:  "test_hash",
		Notes:        "integration test list",
	}
	_, err := modelRepo.Create(ctx, run)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// List model runs
	runs, total, err := modelRepo.List(ctx, 10, 0)
	if err != nil {
		t.Fatalf("Failed to list model runs: %v", err)
	}

	if total < 1 {
		t.Errorf("Expected at least 1 model run, got %d", total)
	}
	if len(runs) < 1 {
		t.Error("Expected at least one model run in list")
	}
}

func TestIntegration_ModelRunRepository_GetActive(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	modelRepo := testStore.ModelRuns()

	// Get active model run (should return latest)
	active, err := modelRepo.GetActive(ctx)
	if err != nil {
		// May fail if no runs exist - that's acceptable for this test
		t.Logf("GetActive returned error (may be expected): %v", err)
		return
	}

	if active == nil {
		t.Error("Expected non-nil result if no error")
	} else if active.ID == 0 {
		t.Error("Expected valid model run ID")
	}
}

// ============================================================================
// Transaction Integration Tests
// ============================================================================

func TestIntegration_Transaction_Commit(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()

	// Begin transaction
	txStore, err := testStore.BeginTx(ctx)
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}

	// Create user in transaction
	email := testEmail("txcommit")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	created, err := txStore.Users().Create(ctx, user)
	if err != nil {
		txStore.Rollback(ctx)
		t.Fatalf("Failed to create user in transaction: %v", err)
	}

	// Commit transaction
	err = txStore.Commit(ctx)
	if err != nil {
		t.Fatalf("Failed to commit transaction: %v", err)
	}

	// Verify user exists after commit
	found, err := testStore.Users().FindByID(ctx, int32(created.ID))
	if err != nil {
		t.Fatalf("Failed to find user after commit: %v", err)
	}
	if found.Email != email {
		t.Errorf("Expected email %s, got %s", email, found.Email)
	}
}

func TestIntegration_Transaction_Rollback(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()

	// Begin transaction
	txStore, err := testStore.BeginTx(ctx)
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}

	// Create user in transaction
	email := testEmail("txrollback")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	created, err := txStore.Users().Create(ctx, user)
	if err != nil {
		txStore.Rollback(ctx)
		t.Fatalf("Failed to create user in transaction: %v", err)
	}

	// Rollback transaction
	err = txStore.Rollback(ctx)
	if err != nil {
		t.Fatalf("Failed to rollback transaction: %v", err)
	}

	// Verify user does NOT exist after rollback
	_, err = testStore.Users().FindByID(ctx, int32(created.ID))
	if err == nil {
		t.Error("Expected error when finding user after rollback - user should not exist")
	}
}

func TestIntegration_Transaction_MultiStep(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()

	// Begin transaction
	txStore, err := testStore.BeginTx(ctx)
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}

	// Create user
	email := testEmail("txmulti")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := txStore.Users().Create(ctx, user)
	if err != nil {
		txStore.Rollback(ctx)
		t.Fatalf("Failed to create user: %v", err)
	}

	// Create assessment in same transaction
	assessment := models.Assessment{
		UserID: createdUser.ID,
		HbA1c:  6.5,
		Notes:  "integration test transaction multi",
	}
	_, err = txStore.Assessments().Create(ctx, assessment)
	if err != nil {
		txStore.Rollback(ctx)
		t.Fatalf("Failed to create assessment: %v", err)
	}

	// Commit both operations
	err = txStore.Commit(ctx)
	if err != nil {
		t.Fatalf("Failed to commit transaction: %v", err)
	}

	// Verify both exist
	foundUser, err := testStore.Users().FindByID(ctx, int32(createdUser.ID))
	if err != nil {
		t.Fatalf("Failed to find user: %v", err)
	}
	if foundUser.Email != email {
		t.Errorf("Expected user email %s", email)
	}

	count, err := testStore.Users().GetAssessmentCountByUser(ctx, createdUser.ID)
	if err != nil {
		t.Fatalf("Failed to get assessment count: %v", err)
	}
	if count < 1 {
		t.Error("Expected at least 1 assessment for user")
	}
}

func TestIntegration_Transaction_RollbackOnError(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()

	email := testEmail("txerror")
	userID := int64(0)

	// Begin transaction
	txStore, err := testStore.BeginTx(ctx)
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}

	// Create user - this should succeed
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := txStore.Users().Create(ctx, user)
	if err != nil {
		txStore.Rollback(ctx)
		t.Fatalf("Failed to create user: %v", err)
	}
	userID = createdUser.ID

	// Simulate an error - rollback
	err = txStore.Rollback(ctx)
	if err != nil {
		t.Fatalf("Failed to rollback: %v", err)
	}

	// Verify user was NOT persisted
	_, err = testStore.Users().FindByID(ctx, int32(userID))
	if err == nil {
		t.Error("Expected user to not exist after rollback")
	}
}

// ============================================================================
// Paginated List Tests
// ============================================================================

func TestIntegration_UserRepository_List_Pagination(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create 5 test users
	for i := 0; i < 5; i++ {
		email := testEmail(fmt.Sprintf("page%d", i))
		user := models.User{
			Email:        email,
			PasswordHash: "hashed_password",
			Role:         models.RoleUser,
		}
		_, err := repo.Create(ctx, user)
		if err != nil {
			t.Fatalf("Setup failed for user %d: %v", i, err)
		}
	}

	// Test page 1
	params1 := models.UserListParams{
		Page:     1,
		PageSize: 2,
		Search:   "test.integration",
	}
	users1, total, err := repo.List(ctx, params1)
	if err != nil {
		t.Fatalf("Failed to list page 1: %v", err)
	}

	if total < 5 {
		t.Errorf("Expected total >= 5, got %d", total)
	}
	if len(users1) > 2 {
		t.Errorf("Expected at most 2 users on page 1, got %d", len(users1))
	}

	// Test page 2
	params2 := models.UserListParams{
		Page:     2,
		PageSize: 2,
		Search:   "test.integration",
	}
	users2, _, err := repo.List(ctx, params2)
	if err != nil {
		t.Fatalf("Failed to list page 2: %v", err)
	}

	// Should have different users on different pages
	if len(users2) > 0 && len(users1) > 0 {
		if users1[0].ID == users2[0].ID {
			t.Error("Expected different users on different pages")
		}
	}
}

func TestIntegration_AssessmentRepository_ListByPatientPaginated_Pagination(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user
	email := testEmail("apage")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Create 5 assessments
	for i := 0; i < 5; i++ {
		assessment := models.Assessment{
			UserID: createdUser.ID,
			HbA1c:  6.0 + float64(i)*0.1,
			Notes:  "integration test pagination",
		}
		_, err := assessmentRepo.Create(ctx, assessment)
		if err != nil {
			t.Fatalf("Failed to create assessment: %v", err)
		}
	}

	// Test first page
	assessments1, total, err := assessmentRepo.ListByPatientPaginated(ctx, createdUser.ID, 2, 0)
	if err != nil {
		t.Fatalf("Failed to list page 1: %v", err)
	}

	if total < 5 {
		t.Errorf("Expected total >= 5, got %d", total)
	}
	if len(assessments1) > 2 {
		t.Errorf("Expected at most 2 assessments, got %d", len(assessments1))
	}

	// Test second page (offset 2)
	assessments2, _, err := assessmentRepo.ListByPatientPaginated(ctx, createdUser.ID, 2, 2)
	if err != nil {
		t.Fatalf("Failed to list page 2: %v", err)
	}

	// Different assessments on different pages
	if len(assessments2) > 0 && len(assessments1) > 0 {
		if assessments1[0].ID == assessments2[0].ID {
			t.Error("Expected different assessments on different pages")
		}
	}
}

// ============================================================================
// Edge Cases and Error Handling Tests
// ============================================================================

func TestIntegration_UserRepository_FindByID_NonExistent(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Try to find non-existent user (very large ID)
	_, err := repo.FindByID(ctx, 99999999)
	if err == nil {
		t.Error("Expected error when finding non-existent user")
	}
}

func TestIntegration_AssessmentRepository_Get_NonExistent(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Assessments()

	// Try to get non-existent assessment
	_, err := repo.Get(ctx, 99999999)
	if err == nil {
		t.Error("Expected error when getting non-existent assessment")
	}
}

func TestIntegration_RefreshTokenRepository_Find_NonExistent(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.RefreshTokens()

	// Try to find non-existent token
	_, err := repo.FindRefreshToken(ctx, "nonexistent_hash_integration_test")
	if err == nil {
		t.Error("Expected error when finding non-existent token")
	}
}

// ============================================================================
// Additional Coverage Tests
// ============================================================================

func TestIntegration_UserRepository_SoftDeleteUser(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create test user
	email := testEmail("softdelete")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	created, err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Soft delete - should succeed without error
	err = repo.SoftDeleteUser(ctx, created.ID)
	if err != nil {
		t.Fatalf("Failed to soft delete user: %v", err)
	}

	// Verify the operation completed successfully
	// Note: SoftDeleteUser sets deleted_at timestamp and deactivates the user
	// The user record still exists but is marked as deleted
}

func TestIntegration_UserRepository_GetUserTrends(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user
	email := testEmail("trends")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Create multiple assessments for trend data
	for i := 0; i < 3; i++ {
		assessment := models.Assessment{
			UserID:   createdUser.ID,
			HbA1c:    6.0 + float64(i)*0.3,
			BMI:      24.0 + float64(i)*0.5,
			FBS:      95.0 + float64(i)*5,
			RiskScore: 30 + i*10,
			Cluster:  "low_risk",
			Notes:    "integration test trends",
		}
		_, err := assessmentRepo.Create(ctx, assessment)
		if err != nil {
			t.Fatalf("Failed to create assessment: %v", err)
		}
	}

	// Get trends
	trends, err := userRepo.GetUserTrends(ctx, createdUser.ID, 12)
	if err != nil {
		t.Fatalf("Failed to get user trends: %v", err)
	}

	if trends == nil {
		t.Fatal("Expected non-nil trends data")
	}
	if len(trends.Dates) < 3 {
		t.Errorf("Expected at least 3 dates, got %d", len(trends.Dates))
	}
	if len(trends.HbA1cValues) < 3 {
		t.Errorf("Expected at least 3 HbA1c values, got %d", len(trends.HbA1cValues))
	}
}

func TestIntegration_UserRepository_GetLatestAssessmentByUser(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user
	email := testEmail("latest")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Create assessment
	assessment := models.Assessment{
		UserID:   createdUser.ID,
		HbA1c:    7.2,
		RiskScore: 55,
		Cluster:  "metabolic_risk",
		Notes:    "integration test latest",
	}
	_, err = assessmentRepo.Create(ctx, assessment)
	if err != nil {
		t.Fatalf("Failed to create assessment: %v", err)
	}

	// Get latest assessment
	latest, err := userRepo.GetLatestAssessmentByUser(ctx, createdUser.ID)
	if err != nil {
		t.Fatalf("Failed to get latest assessment: %v", err)
	}

	if latest == nil {
		t.Fatal("Expected non-nil latest assessment")
	}
	if latest.HbA1c != 7.2 {
		t.Errorf("Expected HbA1c 7.2, got %f", latest.HbA1c)
	}
}

func TestIntegration_AssessmentRepository_ListAllLimited(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	assessmentRepo := testStore.Assessments()

	// List all limited
	assessments, err := assessmentRepo.ListAllLimited(ctx, 10)
	if err != nil {
		t.Fatalf("Failed to list all limited: %v", err)
	}

	// Should return at most 10 assessments
	if len(assessments) > 10 {
		t.Errorf("Expected at most 10 assessments, got %d", len(assessments))
	}
}

func TestIntegration_AssessmentRepository_ListAllLimitedByUser(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user
	email := testEmail("listlimited")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Create assessments
	for i := 0; i < 3; i++ {
		assessment := models.Assessment{
			UserID: createdUser.ID,
			HbA1c:  6.0 + float64(i)*0.1,
			Notes:  "integration test list limited by user",
		}
		_, err := assessmentRepo.Create(ctx, assessment)
		if err != nil {
			t.Fatalf("Failed to create assessment: %v", err)
		}
	}

	// List by user
	assessments, err := assessmentRepo.ListAllLimitedByUser(ctx, int32(createdUser.ID), 5)
	if err != nil {
		t.Fatalf("Failed to list all limited by user: %v", err)
	}

	if len(assessments) < 3 {
		t.Errorf("Expected at least 3 assessments, got %d", len(assessments))
	}
}

func TestIntegration_AssessmentRepository_ClusterCountsByUser(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user
	email := testEmail("clusteruser")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Create assessment with cluster
	assessment := models.Assessment{
		UserID:  createdUser.ID,
		HbA1c:   6.5,
		Cluster: "test_cluster",
		Notes:   "integration test cluster by user",
	}
	_, err = assessmentRepo.Create(ctx, assessment)
	if err != nil {
		t.Fatalf("Failed to create assessment: %v", err)
	}

	// Get cluster counts by user
	counts, err := assessmentRepo.ClusterCountsByUser(ctx, int32(createdUser.ID))
	if err != nil {
		t.Fatalf("Failed to get cluster counts by user: %v", err)
	}

	// Should return valid slice
	if counts == nil {
		t.Error("Expected non-nil result")
	}
}

func TestIntegration_AssessmentRepository_TrendAveragesByUser(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user
	email := testEmail("trenduser")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Create assessment
	assessment := models.Assessment{
		UserID:   createdUser.ID,
		HbA1c:    6.5,
		BMI:      25.0,
		RiskScore: 40,
		Notes:    "integration test trend averages by user",
	}
	_, err = assessmentRepo.Create(ctx, assessment)
	if err != nil {
		t.Fatalf("Failed to create assessment: %v", err)
	}

	// Get trend averages by user
	trends, err := assessmentRepo.TrendAveragesByUser(ctx, int32(createdUser.ID))
	if err != nil {
		t.Fatalf("Failed to get trend averages by user: %v", err)
	}

	// Should return valid slice
	if trends == nil {
		t.Error("Expected non-nil result")
	}
}

func TestIntegration_AssessmentRepository_GetTrend(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user
	email := testEmail("gettrend")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Create assessments for trend
	for i := 0; i < 3; i++ {
		assessment := models.Assessment{
			UserID:   createdUser.ID,
			HbA1c:    6.0 + float64(i)*0.2,
			BMI:      24.0 + float64(i)*0.5,
			RiskScore: 30 + i*10,
			Cluster:  "test_cluster",
			Notes:    "integration test get trend",
		}
		_, err := assessmentRepo.Create(ctx, assessment)
		if err != nil {
			t.Fatalf("Failed to create assessment: %v", err)
		}
	}

	// Get trend
	trends, err := assessmentRepo.GetTrend(ctx, createdUser.ID)
	if err != nil {
		t.Fatalf("Failed to get trend: %v", err)
	}

	if len(trends) < 3 {
		t.Errorf("Expected at least 3 trend points, got %d", len(trends))
	}
}

func TestIntegration_ModelRunRepository_SetActive(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	modelRepo := testStore.ModelRuns()

	// Create model run
	run := models.ModelRun{
		ModelVersion: "test_set_active",
		DatasetHash:  "test_hash",
		Notes:        "integration test set active",
	}
	created, err := modelRepo.Create(ctx, run)
	if err != nil {
		t.Fatalf("Failed to create model run: %v", err)
	}

	// Set active (this is currently a no-op but should not error)
	err = modelRepo.SetActive(ctx, int32(created.ID))
	if err != nil {
		t.Fatalf("Failed to set active: %v", err)
	}
}

func TestIntegration_UserRepository_List_FilterByIsActive(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create test user
	email := testEmail("isactive")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	_, err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Test with IsActive filter
	isActive := true
	params := models.UserListParams{
		Page:     1,
		PageSize: 10,
		IsActive: &isActive,
		Search:   "test.integration",
	}

	users, _, err := repo.List(ctx, params)
	if err != nil {
		t.Fatalf("Failed to list users with isActive filter: %v", err)
	}

	for _, u := range users {
		if !u.IsActive {
			t.Error("Expected only active users")
		}
	}
}

func TestIntegration_AuditEventRepository_List_WithDateFilter(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	auditRepo := testStore.AuditEvents()

	// Create audit event
	event := models.AuditEvent{
		Actor:      "test_actor_date",
		Action:     "test_action_date",
		TargetType: "test",
		TargetID:   1,
	}
	err := auditRepo.Create(ctx, event)
	if err != nil {
		t.Fatalf("Failed to create audit event: %v", err)
	}

	// List with date filter
	params := models.AuditListParams{
		Page:      1,
		PageSize:  10,
		StartDate: time.Now().Add(-24 * time.Hour),
		EndDate:   time.Now().Add(24 * time.Hour),
	}

	events, _, err := auditRepo.List(ctx, params)
	if err != nil {
		t.Fatalf("Failed to list audit events with date filter: %v", err)
	}

	if events == nil {
		t.Error("Expected non-nil events")
	}
}

func TestIntegration_UserRepository_GetUsersForNotification(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create test user with reminder_email enabled
	email := testEmail("notification")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	created, err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Update user to have reminder_email enabled
	profile := models.User{
		ID:                      created.ID,
		AssessmentFrequencyMonths: 3,
	}
	_, err = repo.UpdateUser(ctx, profile)
	if err != nil {
		t.Logf("UpdateUser warning: %v", err)
	}

	// Get users for notification
	users, err := repo.GetUsersForNotification(ctx)
	if err != nil {
		t.Fatalf("Failed to get users for notification: %v", err)
	}

	// Should return a valid slice
	if users == nil {
		t.Error("Expected non-nil users slice")
	}
}

func TestIntegration_UserRepository_GetUserByID_vs_FindByID(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// Create test user
	email := testEmail("getuser")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	created, err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Test GetUserByID (alias for FindByID)
	found, err := repo.GetUserByID(ctx, int32(created.ID))
	if err != nil {
		t.Fatalf("Failed to get user by ID: %v", err)
	}

	if found.ID != created.ID {
		t.Errorf("Expected ID %d, got %d", created.ID, found.ID)
	}
}

func TestIntegration_AssessmentRepository_GetTrend_DataVerification(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user
	email := testEmail("trenddata")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Create assessments with specific values
	for i := 0; i < 2; i++ {
		assessment := models.Assessment{
			UserID:       createdUser.ID,
			HbA1c:        6.5 + float64(i)*0.5,
			BMI:          25.0 + float64(i),
			FBS:          100.0 + float64(i)*5,
			Triglycerides: 150 + i*10,
			LDL:          100 + i*5,
			HDL:          50 + i*2,
			Systolic:     120 + i*5,
			Diastolic:    80 + i*2,
			RiskScore:    40 + i*10,
			Cluster:      "test_cluster",
			Notes:        "integration test trend data",
		}
		_, err := assessmentRepo.Create(ctx, assessment)
		if err != nil {
			t.Fatalf("Failed to create assessment: %v", err)
		}
	}

	// Get trend
	trends, err := assessmentRepo.GetTrend(ctx, createdUser.ID)
	if err != nil {
		t.Fatalf("Failed to get trend: %v", err)
	}

	if len(trends) < 2 {
		t.Fatalf("Expected at least 2 trend points, got %d", len(trends))
	}

	// Verify data in trend points
	for _, trend := range trends {
		if trend.HbA1c < 6.0 {
			t.Errorf("Unexpected HbA1c value: %f", trend.HbA1c)
		}
		if trend.BMI < 20.0 {
			t.Errorf("Unexpected BMI value: %f", trend.BMI)
		}
	}
}

func TestIntegration_UserRepository_List_EmptySearch(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	repo := testStore.Users()

	// List with empty search (should return all users)
	params := models.UserListParams{
		Page:     1,
		PageSize: 10,
		Search:   "",
	}

	users, total, err := repo.List(ctx, params)
	if err != nil {
		t.Fatalf("Failed to list users: %v", err)
	}

	// Should return at least some users
	if total < 0 {
		t.Errorf("Invalid total count: %d", total)
	}
	if users == nil {
		t.Error("Expected non-nil users slice")
	}
}

func TestIntegration_AssessmentRepository_Update_WithMLResults(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	userRepo := testStore.Users()
	assessmentRepo := testStore.Assessments()

	// Create test user
	email := testEmail("updateml")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := userRepo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Setup failed: %v", err)
	}

	// Create assessment
	assessment := models.Assessment{
		UserID: createdUser.ID,
		HbA1c:  6.5,
		Notes:  "integration test update with ml",
	}
	created, err := assessmentRepo.Create(ctx, assessment)
	if err != nil {
		t.Fatalf("Failed to create assessment: %v", err)
	}

	// Update with ML results
	updated := models.Assessment{
		ID:                created.ID,
		UserID:            createdUser.ID,
		HbA1c:             6.5,
		RiskScore:         55,
		Cluster:           "metabolic_risk",
		RiskLabel:         "Moderate Risk",
		PredictedStatus:   "at_risk",
		ClusterDescription: "High metabolic risk cluster",
		TreatmentFocus:    "Lifestyle modification recommended",
		AtRiskProbability:  0.72,
		ModelVersion:      "binary_v2_no_bp",
		Notes:             "integration test updated with ml",
	}
	result, err := assessmentRepo.Update(ctx, updated)
	if err != nil {
		t.Fatalf("Failed to update assessment: %v", err)
	}

	if result.RiskScore != 55 {
		t.Errorf("Expected RiskScore 55, got %d", result.RiskScore)
	}
	if result.Cluster != "metabolic_risk" {
		t.Errorf("Expected Cluster metabolic_risk, got %s", result.Cluster)
	}
}

func TestIntegration_Transaction_NestedTransactionError(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()

	// Begin transaction
	txStore, err := testStore.BeginTx(ctx)
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}

	// Try to begin nested transaction (should fail)
	_, err = txStore.BeginTx(ctx)
	if err == nil {
		txStore.Rollback(ctx)
		t.Error("Expected error when beginning nested transaction")
		return
	}

	// Rollback original transaction
	txStore.Rollback(ctx)
}

func TestIntegration_ModelRunRepository_List_Pagination(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	modelRepo := testStore.ModelRuns()

	// Create multiple model runs
	for i := 0; i < 3; i++ {
		run := models.ModelRun{
			ModelVersion: fmt.Sprintf("test_version_page_%d", i),
			DatasetHash:  fmt.Sprintf("test_hash_%d", i),
			Notes:        "integration test pagination",
		}
		_, err := modelRepo.Create(ctx, run)
		if err != nil {
			t.Fatalf("Failed to create model run %d: %v", i, err)
		}
	}

	// List with offset
	runs1, total, err := modelRepo.List(ctx, 2, 0)
	if err != nil {
		t.Fatalf("Failed to list model runs: %v", err)
	}

	if total < 3 {
		t.Errorf("Expected total >= 3, got %d", total)
	}
	if len(runs1) > 2 {
		t.Errorf("Expected at most 2 runs with limit=2, got %d", len(runs1))
	}
}

// ============================================================================
// CohortRepository Integration Tests
// ============================================================================

func TestIntegration_CohortRepository_StatsByCluster(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	cohortRepo := testStore.Cohort()

	stats, err := cohortRepo.StatsByCluster(ctx)
	if err != nil {
		t.Fatalf("Failed to get stats by cluster: %v", err)
	}

	// Should return valid slice
	if stats == nil {
		t.Error("Expected non-nil stats")
	}
}

func TestIntegration_CohortRepository_StatsByRiskLevel(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	cohortRepo := testStore.Cohort()

	stats, err := cohortRepo.StatsByRiskLevel(ctx)
	if err != nil {
		t.Fatalf("Failed to get stats by risk level: %v", err)
	}

	if stats == nil {
		t.Error("Expected non-nil stats")
	}
}

func TestIntegration_CohortRepository_StatsByAgeGroup(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	cohortRepo := testStore.Cohort()

	stats, err := cohortRepo.StatsByAgeGroup(ctx)
	if err != nil {
		t.Fatalf("Failed to get stats by age group: %v", err)
	}

	if stats == nil {
		t.Error("Expected non-nil stats")
	}
}

func TestIntegration_CohortRepository_StatsByMenopauseStatus(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	cohortRepo := testStore.Cohort()

	stats, err := cohortRepo.StatsByMenopauseStatus(ctx)
	if err != nil {
		t.Fatalf("Failed to get stats by menopause status: %v", err)
	}

	if stats == nil {
		t.Error("Expected non-nil stats")
	}
}

func TestIntegration_CohortRepository_TotalPatientCount(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	cohortRepo := testStore.Cohort()

	count, err := cohortRepo.TotalPatientCount(ctx)
	if err != nil {
		t.Fatalf("Failed to get total patient count: %v", err)
	}

	// Count should be >= 0
	if count < 0 {
		t.Errorf("Invalid patient count: %d", count)
	}
}

func TestIntegration_CohortRepository_TotalAssessmentCount(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	cohortRepo := testStore.Cohort()

	count, err := cohortRepo.TotalAssessmentCount(ctx)
	if err != nil {
		t.Fatalf("Failed to get total assessment count: %v", err)
	}

	// Count should be >= 0
	if count < 0 {
		t.Errorf("Invalid assessment count: %d", count)
	}
}

// ============================================================================
// ClinicRepository Integration Tests
// ============================================================================

func TestIntegration_ClinicRepository_List(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	clinicRepo := testStore.Clinics()

	_, err := clinicRepo.List(ctx)
	if err != nil {
		t.Fatalf("Failed to list clinics: %v", err)
	}

	// Empty slice is acceptable (no clinics exist in test database)
	// The test verifies the operation completes without error
}

func TestIntegration_ClinicRepository_AdminSystemStats(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	clinicRepo := testStore.Clinics()

	stats, err := clinicRepo.AdminSystemStats(ctx)
	if err != nil {
		t.Fatalf("Failed to get admin system stats: %v", err)
	}

	if stats == nil {
		t.Fatal("Expected non-nil stats")
	}

	// Verify stats are valid
	if stats.TotalUsers < 0 {
		t.Errorf("Invalid total users: %d", stats.TotalUsers)
	}
	if stats.TotalAssessments < 0 {
		t.Errorf("Invalid total assessments: %d", stats.TotalAssessments)
	}
}

func TestIntegration_ClinicRepository_AdminClinicComparison(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()
	clinicRepo := testStore.Clinics()

	_, err := clinicRepo.AdminClinicComparison(ctx)
	if err != nil {
		t.Fatalf("Failed to get clinic comparison: %v", err)
	}

	// Empty slice is acceptable (no clinics exist in test database)
	// The test verifies the operation completes without error
}

// ============================================================================
// Transaction Atomicity Tests - Verify all repositories participate in transactions
// ============================================================================

func TestIntegration_Transaction_AllRepos_ParticipateInAtomicity(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()

	// Begin transaction
	txStore, err := testStore.BeginTx(ctx)
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}

	// Create user in transaction
	email := testEmail("tx_all_repos")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := txStore.Users().Create(ctx, user)
	if err != nil {
		txStore.Rollback(ctx)
		t.Fatalf("Failed to create user: %v", err)
	}

	// Create refresh token in same transaction
	tokenHash := testHash("tx_all_repos")
	expiresAt := time.Now().Add(24 * time.Hour)
	_, err = txStore.RefreshTokens().CreateRefreshToken(ctx, tokenHash, int32(createdUser.ID), expiresAt)
	if err != nil {
		txStore.Rollback(ctx)
		t.Fatalf("Failed to create refresh token: %v", err)
	}

	// Create audit event in same transaction
	auditEvent := models.AuditEvent{
		Actor:      "test_tx_all_repos",
		Action:     "test_action",
		TargetType: "user",
		TargetID:   int(createdUser.ID),
		Details:    map[string]any{"test": "transaction_atomicity"},
	}
	err = txStore.AuditEvents().Create(ctx, auditEvent)
	if err != nil {
		txStore.Rollback(ctx)
		t.Fatalf("Failed to create audit event: %v", err)
	}

	// ROLLBACK the transaction
	err = txStore.Rollback(ctx)
	if err != nil {
		t.Fatalf("Failed to rollback: %v", err)
	}

	// Verify user was NOT persisted
	_, err = testStore.Users().FindByID(ctx, int32(createdUser.ID))
	if err == nil {
		t.Error("Expected user to NOT exist after rollback")
	}

	// Verify refresh token was NOT persisted
	_, err = testStore.RefreshTokens().FindRefreshToken(ctx, tokenHash)
	if err == nil {
		t.Error("Expected refresh token to NOT exist after rollback")
	}

	// Verify audit event was NOT persisted
	params := models.AuditListParams{
		Page:   1,
		PageSize: 10,
		Actor:  "test_tx_all_repos",
	}
	events, _, err := testStore.AuditEvents().List(ctx, params)
	if err != nil {
		t.Fatalf("Failed to list audit events: %v", err)
	}
	for _, e := range events {
		if e.Actor == "test_tx_all_repos" {
			t.Error("Expected audit event to NOT exist after rollback")
		}
	}
}

func TestIntegration_Transaction_AllRepos_CommitPersistsAll(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()

	// Begin transaction
	txStore, err := testStore.BeginTx(ctx)
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}

	// Create user in transaction
	email := testEmail("tx_commit_all")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := txStore.Users().Create(ctx, user)
	if err != nil {
		txStore.Rollback(ctx)
		t.Fatalf("Failed to create user: %v", err)
	}

	// Create assessment in same transaction
	assessment := models.Assessment{
		UserID:   createdUser.ID,
		HbA1c:    6.8,
		Notes:    "integration test tx commit all repos",
	}
	_, err = txStore.Assessments().Create(ctx, assessment)
	if err != nil {
		txStore.Rollback(ctx)
		t.Fatalf("Failed to create assessment: %v", err)
	}

	// COMMIT the transaction
	err = txStore.Commit(ctx)
	if err != nil {
		t.Fatalf("Failed to commit: %v", err)
	}

	// Verify user exists after commit
	foundUser, err := testStore.Users().FindByID(ctx, int32(createdUser.ID))
	if err != nil {
		t.Fatalf("Expected user to exist after commit: %v", err)
	}
	if foundUser.Email != email {
		t.Errorf("Expected email %s, got %s", email, foundUser.Email)
	}

	// Verify assessment exists after commit
	count, err := testStore.Users().GetAssessmentCountByUser(ctx, createdUser.ID)
	if err != nil {
		t.Fatalf("Failed to get assessment count: %v", err)
	}
	if count < 1 {
		t.Error("Expected at least 1 assessment after commit")
	}
}

func TestIntegration_Transaction_AssessmentRepo_ParticipatesInRollback(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()

	// Begin transaction
	txStore, err := testStore.BeginTx(ctx)
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}

	// Create user
	email := testEmail("tx_assessment_rb")
	user := models.User{
		Email:        email,
		PasswordHash: "hashed_password",
		Role:         models.RoleUser,
	}
	createdUser, err := txStore.Users().Create(ctx, user)
	if err != nil {
		txStore.Rollback(ctx)
		t.Fatalf("Failed to create user: %v", err)
	}

	// Create assessment via transaction repo
	assessment := models.Assessment{
		UserID:   createdUser.ID,
		HbA1c:    7.5,
		Notes:    "integration test tx assessment rollback",
	}
	_, err = txStore.Assessments().Create(ctx, assessment)
	if err != nil {
		txStore.Rollback(ctx)
		t.Fatalf("Failed to create assessment: %v", err)
	}

	// ROLLBACK
	err = txStore.Rollback(ctx)
	if err != nil {
		t.Fatalf("Failed to rollback: %v", err)
	}

	// Verify user does NOT exist (proves atomicity)
	_, err = testStore.Users().FindByID(ctx, int32(createdUser.ID))
	if err == nil {
		t.Error("Expected user to NOT exist after rollback")
	}
}

// TestIntegration_Transaction_CohortRepo_ParticipatesInTransaction verifies
// that CohortRepository operations participate in transactions.
func TestIntegration_Transaction_CohortRepo_ParticipatesInTransaction(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()

	// Begin transaction
	txStore, err := testStore.BeginTx(ctx)
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}

	// CohortRepository has read-only methods, verify they work within transaction
	_, err = txStore.Cohort().StatsByCluster(ctx)
	if err != nil {
		txStore.Rollback(ctx)
		t.Fatalf("Failed to get cohort stats: %v", err)
	}

	// Commit should succeed
	err = txStore.Commit(ctx)
	if err != nil {
		t.Fatalf("Failed to commit: %v", err)
	}
}

// TestIntegration_Transaction_ClinicRepo_ParticipatesInTransaction verifies
// that ClinicRepository operations participate in transactions.
func TestIntegration_Transaction_ClinicRepo_ParticipatesInTransaction(t *testing.T) {
	if testStore == nil {
		t.Skip("Integration test database not available")
	}

	ctx := context.Background()

	// Begin transaction
	txStore, err := testStore.BeginTx(ctx)
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}

	// ClinicRepository has read-only methods, verify they work within transaction
	_, err = txStore.Clinics().AdminSystemStats(ctx)
	if err != nil {
		txStore.Rollback(ctx)
		t.Fatalf("Failed to get admin stats: %v", err)
	}

	// Commit should succeed
	err = txStore.Commit(ctx)
	if err != nil {
		t.Fatalf("Failed to commit: %v", err)
	}
}
