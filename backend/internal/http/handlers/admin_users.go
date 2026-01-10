package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
	"golang.org/x/crypto/bcrypt"
)

// AdminUsersHandler handles admin user management operations
type AdminUsersHandler struct {
	store store.Store
}

// NewAdminUsersHandler creates a new AdminUsersHandler
func NewAdminUsersHandler(store store.Store) *AdminUsersHandler {
	return &AdminUsersHandler{store: store}
}

// Register registers admin user routes on the given router group
// All routes require admin role (enforced by RBAC middleware at group level)
func (h *AdminUsersHandler) Register(rg *gin.RouterGroup) {
	users := rg.Group("/users")
	{
		users.GET("", h.listUsers)
		users.POST("", h.createUser)
		users.GET("/:id", h.getUser)
		users.PUT("/:id", h.updateUser)
		users.DELETE("/:id", h.deactivateUser)
		users.POST("/:id/activate", h.activateUser)
	}
}

// CreateUserRequest defines the payload for creating a new user
type CreateUserRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Role     string `json:"role" binding:"required,oneof=clinician admin"`
}

// UpdateUserRequest defines the payload for updating a user
type UpdateUserRequest struct {
	Email string `json:"email" binding:"omitempty,email"`
	Role  string `json:"role" binding:"omitempty,oneof=clinician admin"`
}

// listUsers returns a paginated list of users
// @Summary List all users (admin only)
// @Description Returns paginated list of users with optional filters
// @Tags Admin
// @Produce json
// @Param page query int false "Page number (default 1)"
// @Param page_size query int false "Items per page (default 20, max 100)"
// @Param search query string false "Search by email"
// @Param role query string false "Filter by role"
// @Param is_active query bool false "Filter by active status"
// @Success 200 {object} models.PaginatedResponse
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /admin/users [get]
func (h *AdminUsersHandler) listUsers(c *gin.Context) {
	var params models.UserListParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid query parameters"})
		return
	}

	// Set defaults
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 {
		params.PageSize = 20
	}

	users, total, err := h.store.Users().List(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch users"})
		return
	}

	totalPages := (total + params.PageSize - 1) / params.PageSize

	c.JSON(http.StatusOK, models.PaginatedResponse{
		Data:       users,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages,
	})
}

// createUser creates a new user account
// @Summary Create a new user (admin only)
// @Description Creates a new clinician or admin account
// @Tags Admin
// @Accept json
// @Produce json
// @Param user body CreateUserRequest true "User data"
// @Success 201 {object} models.User
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 409 {object} map[string]string "Email already exists"
// @Failure 500 {object} map[string]string
// @Router /admin/users [post]
func (h *AdminUsersHandler) createUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	claims, err := getUserClaims(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process password"})
		return
	}

	creatorID := claims.UserID
	user := models.User{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         req.Role,
		CreatedBy:    &creatorID,
	}

	createdUser, err := h.store.Users().Create(c.Request.Context(), user)
	if err != nil {
		// Check for duplicate email
		if isDuplicateKeyError(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "email already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	_ = h.store.AuditEvents().Create(c.Request.Context(), models.AuditEvent{
		Actor:      claims.Email,
		Action:     "user.create",
		TargetType: "user",
		TargetID:   int(createdUser.ID),
		Details: sanitizeAuditDetails(map[string]interface{}{
			"email": req.Email,
			"role":  req.Role,
		}),
	})

	c.JSON(http.StatusCreated, createdUser)
}

// getUser returns a single user by ID
// @Summary Get user by ID (admin only)
// @Description Returns a single user's details
// @Tags Admin
// @Produce json
// @Param id path int true "User ID"
// @Success 200 {object} models.User
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /admin/users/{id} [get]
func (h *AdminUsersHandler) getUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	user, err := h.store.Users().FindByID(c.Request.Context(), int32(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// updateUser updates user information
// @Summary Update user (admin only)
// @Description Updates user email or role
// @Tags Admin
// @Accept json
// @Produce json
// @Param id path int true "User ID"
// @Param user body UpdateUserRequest true "Updated user data"
// @Success 200 {object} models.User
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /admin/users/{id} [put]
func (h *AdminUsersHandler) updateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	user := models.User{
		ID:    id,
		Email: req.Email,
		Role:  req.Role,
	}

	updatedUser, err := h.store.Users().Update(c.Request.Context(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	claims, _ := getUserClaims(c)
	_ = h.store.AuditEvents().Create(c.Request.Context(), models.AuditEvent{
		Actor:      claims.Email,
		Action:     "user.update",
		TargetType: "user",
		TargetID:   int(id),
		Details: sanitizeAuditDetails(map[string]interface{}{
			"email": req.Email,
			"role":  req.Role,
		}),
	})

	c.JSON(http.StatusOK, updatedUser)
}

// deactivateUser soft-deletes a user by setting is_active to false
// @Summary Deactivate user (admin only)
// @Description Soft-deletes a user account (can be reactivated)
// @Tags Admin
// @Produce json
// @Param id path int true "User ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /admin/users/{id} [delete]
func (h *AdminUsersHandler) deactivateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	claims, err := getUserClaims(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	if claims.UserID == id {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot deactivate your own account"})
		return
	}

	if err := h.store.Users().Deactivate(c.Request.Context(), int32(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to deactivate user"})
		return
	}

	// Log the audit event
	_ = h.store.AuditEvents().Create(c.Request.Context(), models.AuditEvent{
		Actor:      claims.Email,
		Action:     "user.deactivate",
		TargetType: "user",
		TargetID:   int(id),
	})

	c.JSON(http.StatusOK, gin.H{"message": "user deactivated successfully"})
}

// activateUser reactivates a deactivated user
// @Summary Activate user (admin only)
// @Description Reactivates a previously deactivated user account
// @Tags Admin
// @Produce json
// @Param id path int true "User ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /admin/users/{id}/activate [post]
func (h *AdminUsersHandler) activateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	if err := h.store.Users().Activate(c.Request.Context(), int32(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to activate user"})
		return
	}

	claims, _ := getUserClaims(c)
	_ = h.store.AuditEvents().Create(c.Request.Context(), models.AuditEvent{
		Actor:      claims.Email,
		Action:     "user.activate",
		TargetType: "user",
		TargetID:   int(id),
	})

	c.JSON(http.StatusOK, gin.H{"message": "user activated successfully"})
}

// isDuplicateKeyError checks if the error is a PostgreSQL duplicate key violation
func isDuplicateKeyError(err error) bool {
	return err != nil && (
	// PostgreSQL unique violation
	containsString(err.Error(), "duplicate key") ||
		containsString(err.Error(), "23505") ||
		containsString(err.Error(), "unique constraint"))
}

func containsString(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsSubstr(s, substr))
}

func containsSubstr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
