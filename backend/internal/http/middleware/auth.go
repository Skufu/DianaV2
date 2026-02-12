package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/skufu/DianaV2/backend/internal/models"
)

// UserClaims represents the authenticated user's claims stored in the request context
type UserClaims struct {
	UserID int64
	Email  string
	Role   string
}

// ValidateToken validates a JWT token and returns the claims
// Used by handlers that need to validate tokens outside of the middleware chain
func ValidateToken(tokenStr, jwtSecret string) (map[string]any, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(jwtSecret), nil
	}, jwt.WithValidMethods([]string{"HS256"}))

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}

	// Validate required claims
	sub, ok := claims["sub"].(string)
	if !ok || sub == "" {
		return nil, jwt.ErrSignatureInvalid
	}

	role, ok := claims["role"].(string)
	if !ok || role == "" {
		return nil, jwt.ErrSignatureInvalid
	}

	scope, ok := claims["scope"].(string)
	if !ok || scope != "diana" {
		return nil, jwt.ErrSignatureInvalid
	}

	return claims, nil
}

type UserFinder interface {
	FindByID(ctx context.Context, id int32) (*models.User, error)
}

func Auth(jwtSecret string, users UserFinder) gin.HandlerFunc {
	return func(c *gin.Context) {
		authz := c.GetHeader("Authorization")
		if authz == "" || !strings.HasPrefix(authz, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}
		tokenStr := strings.TrimPrefix(authz, "Bearer ")

		// Parse token with claims validation
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (any, error) {
			// Verify signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		}, jwt.WithValidMethods([]string{"HS256"}))

		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		// Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token claims"})
			return
		}

		// Validate required claims
		sub, ok := claims["sub"].(string)
		if !ok || sub == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing subject claim"})
			return
		}

		role, ok := claims["role"].(string)
		if !ok || role == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing role claim"})
			return
		}

		scope, ok := claims["scope"].(string)
		if !ok || scope != "diana" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid scope"})
			return
		}

		// Extract user_id from claims
		userID, ok := claims["user_id"].(float64) // JSON numbers are float64
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing user_id claim"})
			return
		}

		userIDInt := int64(userID)
		if users == nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "auth store not configured"})
			return
		}
		user, err := users.FindByID(c.Request.Context(), int32(userIDInt))
		if err != nil || user == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
			return
		}
		if !user.IsActive || user.AccountStatus != "active" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "account inactive"})
			return
		}

		// Store user claims in context for handlers to use
		c.Set("user", UserClaims{
			UserID: userIDInt,
			Email:  sub,
			Role:   role,
		})

		c.Next()
	}
}
