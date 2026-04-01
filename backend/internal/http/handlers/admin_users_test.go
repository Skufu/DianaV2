package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
	"golang.org/x/crypto/bcrypt"
)

var mockErrNotFound = errors.New("not found")

type mockUserStore struct {
	users     []models.User
	createErr error
	findByID  func(ctx context.Context, id int32) (*models.User, error)
	updateErr error
	listErr   error
	total     int
}

func (m *mockUserStore) Create(ctx context.Context, user models.User) (*models.User, error) {
	if m.createErr != nil {
		return nil, m.createErr
	}
	user.ID = int64(len(m.users) + 1)
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	m.users = append(m.users, user)
	return &user, nil
}

func (m *mockUserStore) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	for _, u := range m.users {
		if u.Email == email {
			return &u, nil
		}
	}
	return nil, mockErrNotFound
}

func (m *mockUserStore) FindByID(ctx context.Context, id int32) (*models.User, error) {
	if m.findByID != nil {
		return m.findByID(ctx, id)
	}
	for _, u := range m.users {
		if u.ID == int64(id) {
			return &u, nil
		}
	}
	return nil, mockErrNotFound
}

func (m *mockUserStore) GetUserByID(ctx context.Context, id int32) (*models.User, error) {
	return m.FindByID(ctx, id)
}

func (m *mockUserStore) Update(ctx context.Context, user models.User) (*models.User, error) {
	if m.updateErr != nil {
		return nil, m.updateErr
	}
	for i, u := range m.users {
		if u.ID == user.ID {
			user.UpdatedAt = time.Now()
			m.users[i] = user
			return &user, nil
		}
	}
	return nil, mockErrNotFound
}

func (m *mockUserStore) UpdateUser(ctx context.Context, user models.User) (*models.User, error) {
	return m.Update(ctx, user)
}

func (m *mockUserStore) List(ctx context.Context, params models.UserListParams) ([]models.User, int, error) {
	if m.listErr != nil {
		return nil, 0, m.listErr
	}
	if m.total == 0 {
		m.total = len(m.users)
	}
	return m.users, m.total, nil
}

func (m *mockUserStore) Deactivate(ctx context.Context, id int32) error {
	for i, u := range m.users {
		if u.ID == int64(id) {
			m.users[i].IsActive = false
			return nil
		}
	}
	return mockErrNotFound
}

func (m *mockUserStore) Activate(ctx context.Context, id int32) error {
	for i, u := range m.users {
		if u.ID == int64(id) {
			m.users[i].IsActive = true
			return nil
		}
	}
	return mockErrNotFound
}

func (m *mockUserStore) UpdateLastLogin(ctx context.Context, id int32) error {
	for i, u := range m.users {
		if u.ID == int64(id) {
			now := time.Now()
			m.users[i].LastLoginAt = &now
			return nil
		}
	}
	return mockErrNotFound
}

func (m *mockUserStore) GetLatestAssessmentByUser(ctx context.Context, userID int64) (*models.Assessment, error) {
	return nil, mockErrNotFound
}

func (m *mockUserStore) GetAssessmentCountByUser(ctx context.Context, userID int64) (int, error) {
	return 0, nil
}

func (m *mockUserStore) GetUserTrends(ctx context.Context, userID int64, months int) (*models.TrendData, error) {
	return nil, mockErrNotFound
}

func (m *mockUserStore) SoftDeleteUser(ctx context.Context, userID int64) error {
	return nil
}

func (m *mockUserStore) UpdateUserOnboarding(ctx context.Context, userID int64, completed bool) error {
	return nil
}

func (m *mockUserStore) UpdateUserConsent(ctx context.Context, userID int64, consent models.ConsentSettings) error {
	return nil
}

func (m *mockUserStore) GetUsersForNotification(ctx context.Context) ([]models.UserForNotification, error) {
	return nil, nil
}

type mockAuditEventStore struct {
	mu     sync.Mutex
	events []models.AuditEvent
}

func (m *mockAuditEventStore) Create(ctx context.Context, event models.AuditEvent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.events = append(m.events, event)
	return nil
}

func (m *mockAuditEventStore) List(ctx context.Context, params models.AuditListParams) ([]models.AuditEvent, int, error) {
	return nil, 0, nil
}

func (m *mockAuditEventStore) Events() []models.AuditEvent {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]models.AuditEvent, len(m.events))
	copy(out, m.events)
	return out
}

type mockAdminUsersStore struct {
	mockUserStore
	auditEvents *mockAuditEventStore
}

func (m *mockAdminUsersStore) Users() store.UserRepository {
	return &m.mockUserStore
}

func (m *mockAdminUsersStore) AuditEvents() store.AuditEventRepository {
	return m.auditEvents
}

func (m *mockAdminUsersStore) Close() {}

func (m *mockAdminUsersStore) Patients() store.PatientRepository           { return nil }
func (m *mockAdminUsersStore) Assessments() store.AssessmentRepository     { return nil }
func (m *mockAdminUsersStore) RefreshTokens() store.RefreshTokenRepository { return nil }
func (m *mockAdminUsersStore) Cohort() store.CohortRepository              { return nil }
func (m *mockAdminUsersStore) Clinics() store.ClinicRepository             { return nil }
func (m *mockAdminUsersStore) ModelRuns() store.ModelRunRepository         { return nil }
func (m *mockAdminUsersStore) BeginTx(ctx context.Context) (store.TxStore, error) {
	return nil, fmt.Errorf("mock store does not support transactions")
}

func setupAdminUsersRouter() (*gin.Engine, *mockAdminUsersStore) {
	gin.SetMode(gin.TestMode)

	store := &mockAdminUsersStore{
		mockUserStore: mockUserStore{
			users: []models.User{},
		},
		auditEvents: &mockAuditEventStore{},
	}

	hashedPassword1, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	hashedPassword2, _ := bcrypt.GenerateFromPassword([]byte("password456"), bcrypt.DefaultCost)

	store.users = append(store.users, models.User{
		ID:           1,
		Email:        "user1@example.com",
		PasswordHash: string(hashedPassword1),
		FirstName:    "John",
		LastName:     "Doe",
		Role:         "clinician",
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	})

	store.users = append(store.users, models.User{
		ID:           2,
		Email:        "user2@example.com",
		PasswordHash: string(hashedPassword2),
		FirstName:    "Jane",
		LastName:     "Smith",
		Role:         "admin",
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	})

	handler := NewAdminUsersHandler(store, nil)
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 999,
			Email:  "admin@example.com",
			Role:   "admin",
		})
	})
	auditLogger := middleware.NewAuditLogger(store)
	handler.Register(router.Group("/admin"), auditLogger)

	return router, store
}

func TestAdminGetUsers_NoPasswordHashExposed(t *testing.T) {
	router, _ := setupAdminUsersRouter()

	t.Run("list users endpoint does not expose password_hash", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/admin/users?page=1&page_size=20", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response models.PaginatedResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)

		var users []models.User
		dataBytes, _ := json.Marshal(response.Data)
		err = json.Unmarshal(dataBytes, &users)
		assert.NoError(t, err)
		assert.Len(t, users, 2)

		for _, user := range users {
			assert.Empty(t, user.PasswordHash, "password_hash should not be exposed in list endpoint")
		}
	})

	t.Run("get single user endpoint does not expose password_hash", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/admin/users/1", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var user models.User
		err := json.Unmarshal(w.Body.Bytes(), &user)
		assert.NoError(t, err)

		assert.Empty(t, user.PasswordHash, "password_hash should not be exposed in get endpoint")
	})

	t.Run("create user endpoint does not return password_hash", func(t *testing.T) {
		reqBody := CreateUserRequest{
			Email:    "newuser@example.com",
			Password: "password123",
			Role:     "user",
		}
		reqBytes, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/admin/users", bytes.NewReader(reqBytes))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var user models.User
		err := json.Unmarshal(w.Body.Bytes(), &user)
		assert.NoError(t, err)

		assert.Empty(t, user.PasswordHash, "password_hash should not be returned after creation")
		assert.Equal(t, "newuser@example.com", user.Email)
	})

	t.Run("update user endpoint does not return password_hash", func(t *testing.T) {
		reqBody := UpdateUserRequest{
			Email: "updated@example.com",
			Role:  "admin",
		}
		reqBytes, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("PUT", "/admin/users/1", bytes.NewReader(reqBytes))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Wait for async audit goroutine to complete to avoid race condition
		time.Sleep(50 * time.Millisecond)

		assert.Equal(t, http.StatusOK, w.Code)

		var user models.User
		err := json.Unmarshal(w.Body.Bytes(), &user)
		assert.NoError(t, err)

		assert.Empty(t, user.PasswordHash, "password_hash should not be returned after update")
	})
}

func TestAdminListUsers_PaginationMetadata(t *testing.T) {
	router, st := setupAdminUsersRouter()

	t.Run("returns total_pages as at least 1 when list is empty", func(t *testing.T) {
		st.users = []models.User{}
		st.total = 0

		req, _ := http.NewRequest("GET", "/admin/users?page=1&page_size=10", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response models.PaginatedResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, 0, response.Total)
		assert.Equal(t, 1, response.TotalPages)
		assert.Equal(t, 1, response.Page)
		assert.Equal(t, 10, response.PageSize)
	})

	t.Run("returns expected total_pages for multi-page datasets", func(t *testing.T) {
		st.total = 25
		req, _ := http.NewRequest("GET", "/admin/users?page=2&page_size=10", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response models.PaginatedResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, 25, response.Total)
		assert.Equal(t, 3, response.TotalPages)
		assert.Equal(t, 2, response.Page)
		assert.Equal(t, 10, response.PageSize)
	})
}

func TestAdminCreateUser_AuditTargetIDMatchesCreatedUser(t *testing.T) {
	router, st := setupAdminUsersRouter()

	reqBody := CreateUserRequest{
		Email:    "audit-target@example.com",
		Password: "password123",
		Role:     "user",
	}
	reqBytes, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "/admin/users", bytes.NewReader(reqBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var created models.User
	err := json.Unmarshal(w.Body.Bytes(), &created)
	assert.NoError(t, err)
	assert.NotZero(t, created.ID)

	// Audit logging runs asynchronously in middleware.
	time.Sleep(50 * time.Millisecond)

	events := st.auditEvents.Events()
	assert.NotEmpty(t, events)

	last := events[len(events)-1]
	assert.Equal(t, "user.create", last.Action)
	assert.Equal(t, "user", last.TargetType)
	assert.Equal(t, int(created.ID), last.TargetID)
}
