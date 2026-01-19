package handlers

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
)

func TestParsePagination(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name     string
		query    string
		wantPage int
		wantSize int
		wantOff  int
	}{
		{
			name:     "defaults",
			query:    "",
			wantPage: 1,
			wantSize: 20,
			wantOff:  0,
		},
		{
			name:     "custom page",
			query:    "?page=3",
			wantPage: 3,
			wantSize: 20,
			wantOff:  40,
		},
		{
			name:     "custom page size",
			query:    "?page_size=50",
			wantPage: 1,
			wantSize: 50,
			wantOff:  0,
		},
		{
			name:     "custom both",
			query:    "?page=2&page_size=30",
			wantPage: 2,
			wantSize: 30,
			wantOff:  30,
		},
		{
			name:     "max page size limit",
			query:    "?page_size=150",
			wantPage: 1,
			wantSize: 20,
			wantOff:  0,
		},
		{
			name:     "negative page ignored",
			query:    "?page=-5",
			wantPage: 1,
			wantSize: 20,
			wantOff:  0,
		},
		{
			name:     "zero page size ignored",
			query:    "?page_size=0",
			wantPage: 1,
			wantSize: 20,
			wantOff:  0,
		},
		{
			name:     "string page ignored",
			query:    "?page=abc",
			wantPage: 1,
			wantSize: 20,
			wantOff:  0,
		},
		{
			name:     "string page size ignored",
			query:    "?page_size=xyz",
			wantPage: 1,
			wantSize: 20,
			wantOff:  0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test"+tc.query, nil)

			c, _ := gin.CreateTestContext(nil)
			c.Request = req

			params := ParsePagination(c)

			if params.Page != tc.wantPage {
				t.Errorf("Page = %d, want %d", params.Page, tc.wantPage)
			}
			if params.PageSize != tc.wantSize {
				t.Errorf("PageSize = %d, want %d", params.PageSize, tc.wantSize)
			}
			if params.Offset != tc.wantOff {
				t.Errorf("Offset = %d, want %d", params.Offset, tc.wantOff)
			}
		})
	}
}

func TestNewPaginatedResponse(t *testing.T) {
	tests := []struct {
		name       string
		data       interface{}
		params     PaginationParams
		totalItems int
		wantPages  int
	}{
		{
			name:       "first page",
			data:       []int{1, 2, 3},
			params:     PaginationParams{Page: 1, PageSize: 10},
			totalItems: 95,
			wantPages:  10,
		},
		{
			name:       "second page",
			data:       []int{1, 2, 3},
			params:     PaginationParams{Page: 2, PageSize: 10},
			totalItems: 95,
			wantPages:  10,
		},
		{
			name:       "last page partial",
			data:       []int{1, 2, 3},
			params:     PaginationParams{Page: 10, PageSize: 10},
			totalItems: 95,
			wantPages:  10,
		},
		{
			name:       "exact division",
			data:       []int{1, 2, 3},
			params:     PaginationParams{Page: 1, PageSize: 20},
			totalItems: 60,
			wantPages:  3,
		},
		{
			name:       "empty data",
			data:       []int{},
			params:     PaginationParams{Page: 1, PageSize: 10},
			totalItems: 0,
			wantPages:  1,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			response := NewPaginatedResponse(tc.data, tc.params, tc.totalItems)

			if response.Data == nil {
				t.Error("Data should not be nil")
			}

			if response.Pagination.Page != tc.params.Page {
				t.Errorf("Page = %d, want %d", response.Pagination.Page, tc.params.Page)
			}
			if response.Pagination.PageSize != tc.params.PageSize {
				t.Errorf("PageSize = %d, want %d", response.Pagination.PageSize, tc.params.PageSize)
			}
			if response.Pagination.TotalItems != tc.totalItems {
				t.Errorf("TotalItems = %d, want %d", response.Pagination.TotalItems, tc.totalItems)
			}
			if response.Pagination.TotalPages != tc.wantPages {
				t.Errorf("TotalPages = %d, want %d", response.Pagination.TotalPages, tc.wantPages)
			}
		})
	}
}

func TestParseIDParam(t *testing.T) {
	tests := []struct {
		name      string
		param     string
		wantID    int64
		wantError bool
	}{
		{
			name:      "valid id",
			param:     "123",
			wantID:    123,
			wantError: false,
		},
		{
			name:      "zero id",
			param:     "0",
			wantID:    0,
			wantError: false,
		},
		{
			name:      "negative id",
			param:     "-5",
			wantID:    -5,
			wantError: false,
		},
		{
			name:      "large id",
			param:     "9999999999999",
			wantID:    9999999999999,
			wantError: false,
		},
		{
			name:      "empty string",
			param:     "",
			wantError: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test/"+tc.param, nil)

			c, _ := gin.CreateTestContext(nil)
			c.Request = req
			c.Params = gin.Params{gin.Param{Key: "id", Value: tc.param}}

			id, err := parseIDParam(c, "id")

			if tc.wantError {
				if err == nil {
					t.Error("expected error, got nil")
				}
			} else if err == nil && id != tc.wantID {
				t.Errorf("id = %d, want %d", id, tc.wantID)
			}
		})
	}
}

func TestGetUserID(t *testing.T) {
	tests := []struct {
		name      string
		claims    middleware.UserClaims
		wantID    int64
		wantError bool
	}{
		{
			name: "valid user",
			claims: middleware.UserClaims{
				UserID: 123,
				Email:  "test@example.com",
				Role:   "clinician",
			},
			wantID:    123,
			wantError: false,
		},
		{
			name: "zero id",
			claims: middleware.UserClaims{
				UserID: 0,
				Email:  "test@example.com",
				Role:   "clinician",
			},
			wantID:    0,
			wantError: false,
		},
		{
			name: "negative id",
			claims: middleware.UserClaims{
				UserID: -5,
				Email:  "test@example.com",
				Role:   "clinician",
			},
			wantID:    -5,
			wantError: false,
		},
		{
			name:      "no user claims",
			claims:    middleware.UserClaims{},
			wantError: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			c, _ := gin.CreateTestContext(nil)

			if tc.claims.UserID != 0 || tc.claims.Email != "" {
				c.Set("user", tc.claims)
			}

			userID, err := getUserID(c)

			if tc.wantError {
				if err == nil {
					t.Error("expected error, got nil")
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
				if userID != tc.wantID {
					t.Errorf("userID = %d, want %d", userID, tc.wantID)
				}
			}
		})
	}
}

func TestSanitizeForAudit(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "normal string",
			expected: "normal string",
		},
		{
			input:    "string with \x00null\x1fcontrol\x7fdelete",
			expected: "string with nullcontroldelete",
		},
		{
			input:    strings.Repeat("a", 600),
			expected: strings.Repeat("a", 500),
		},
		{
			input:    "",
			expected: "",
		},
		{
			input:    "a\nb\rc\td",
			expected: "ab",
		},
		{
			input:    "\x00a",
			expected: "a",
		},
		{
			input:    "\x7fab",
			expected: "ab",
		},
		{
			input:    "\x00ab",
			expected: "ab",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := sanitizeForAudit(tc.input)
			t.Logf("input=%q result=%q", tc.input, result)
			if result != tc.expected {
				t.Errorf("sanitizeForAudit() = %q, want %q", result, tc.expected)
			}
		})
	}
}

func TestSanitizeAuditDetails(t *testing.T) {
	tests := []struct {
		name     string
		input    map[string]interface{}
		expected map[string]interface{}
	}{
		{
			name:     "nil input",
			input:    nil,
			expected: nil,
		},
		{
			name:     "empty input",
			input:    map[string]interface{}{},
			expected: map[string]interface{}{},
		},
		{
			name: "string values sanitized",
			input: map[string]interface{}{
				"key1":     "value\x00with\x1fcontrol",
				"key\x1f2": "normal",
			},
			expected: map[string]interface{}{
				"key1": "valuewithcontrol",
				"key2": "normal",
			},
		},
		{
			name: "numeric values preserved",
			input: map[string]interface{}{
				"count": 123,
				"price": 45.67,
			},
			expected: map[string]interface{}{
				"count": 123,
				"price": 45.67,
			},
		},
		{
			name: "long strings truncated",
			input: map[string]interface{}{
				"key": strings.Repeat("a", 600),
			},
			expected: map[string]interface{}{
				"key": strings.Repeat("a", 500),
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := sanitizeAuditDetails(tc.input)

			if tc.expected == nil && result != nil {
				t.Error("expected nil")
			} else if tc.expected != nil && result == nil {
				t.Error("unexpected nil")
			}

			if result != nil {
				if len(result) != len(tc.expected) {
					t.Errorf("length = %d, want %d", len(result), len(tc.expected))
				}
				for k, v := range result {
					if expected, ok := tc.expected[k]; !ok {
						t.Errorf("unexpected key %s", k)
					} else if expected != v {
						t.Errorf("key %s = %v, want %v", k, v, expected)
					}
				}
			}
		})
	}
}
