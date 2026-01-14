package handlers

import (
	"errors"
	"net/http"
	"regexp"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
)

// APIError represents a standardized error response
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

// PaginatedResponse wraps list responses with pagination metadata
type PaginatedResponse struct {
	Data       any            `json:"data"`
	Pagination PaginationMeta `json:"pagination"`
}

// PaginationMeta contains pagination information
type PaginationMeta struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	TotalItems int `json:"total_items"`
	TotalPages int `json:"total_pages"`
}

// PaginationParams holds parsed pagination query parameters
type PaginationParams struct {
	Page     int
	PageSize int
	Offset   int
}

// ParsePagination extracts and validates pagination params from query string
// Defaults: page=1, page_size=20, max page_size=100
func ParsePagination(c *gin.Context) PaginationParams {
	page := 1
	pageSize := 20

	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if ps := c.Query("page_size"); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 && parsed <= 100 {
			pageSize = parsed
		}
	}

	return PaginationParams{
		Page:     page,
		PageSize: pageSize,
		Offset:   (page - 1) * pageSize,
	}
}

// NewPaginatedResponse creates a paginated response from data and total count
func NewPaginatedResponse(data any, params PaginationParams, totalItems int) PaginatedResponse {
	totalPages := (totalItems + params.PageSize - 1) / params.PageSize
	if totalPages < 1 {
		totalPages = 1
	}
	return PaginatedResponse{
		Data: data,
		Pagination: PaginationMeta{
			Page:       params.Page,
			PageSize:   params.PageSize,
			TotalItems: totalItems,
			TotalPages: totalPages,
		},
	}
}

// Error response helpers for consistent API responses

func errorResponse(c *gin.Context, status int, code, message string) {
	c.JSON(status, APIError{Code: code, Message: message})
}

func errorResponseWithDetails(c *gin.Context, status int, code, message string, details any) {
	c.JSON(status, APIError{Code: code, Message: message, Details: details})
}

// Common error responses

func ErrUnauthorized(c *gin.Context) {
	errorResponse(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
}

func ErrForbidden(c *gin.Context) {
	errorResponse(c, http.StatusForbidden, "FORBIDDEN", "You do not have permission to perform this action")
}

func ErrNotFound(c *gin.Context, resource string) {
	errorResponse(c, http.StatusNotFound, "NOT_FOUND", resource+" not found")
}

func ErrBadRequest(c *gin.Context, message string) {
	errorResponse(c, http.StatusBadRequest, "BAD_REQUEST", message)
}

func ErrValidation(c *gin.Context, details any) {
	errorResponseWithDetails(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request payload", details)
}

func ErrInternal(c *gin.Context, message string) {
	errorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", message)
}

var controlCharRegex = regexp.MustCompile(`[\x00-\x1f\x7f]`)

func parseIDParam(c *gin.Context, name string) (int64, error) {
	raw := c.Param(name)
	return strconv.ParseInt(raw, 10, 64)
}

func getUserID(c *gin.Context) (int64, error) {
	claims, err := getUserClaims(c)
	if err != nil {
		return 0, err
	}
	return int64(claims.UserID), nil
}

func getUserClaims(c *gin.Context) (middleware.UserClaims, error) {
	val, exists := c.Get("user")
	if !exists {
		return middleware.UserClaims{}, errors.New("user not found in context")
	}
	claims, ok := val.(middleware.UserClaims)
	if !ok {
		return middleware.UserClaims{}, errors.New("invalid user claims")
	}
	return claims, nil
}

func sanitizeForAudit(s string) string {
	sanitized := controlCharRegex.ReplaceAllString(s, "")
	if len(sanitized) > 500 {
		sanitized = sanitized[:500]
	}
	return sanitized
}

func sanitizeAuditDetails(details map[string]interface{}) map[string]interface{} {
	if details == nil {
		return nil
	}
	sanitized := make(map[string]interface{}, len(details))
	for k, v := range details {
		key := sanitizeForAudit(k)
		switch val := v.(type) {
		case string:
			sanitized[key] = sanitizeForAudit(val)
		default:
			sanitized[key] = val
		}
	}
	return sanitized
}
