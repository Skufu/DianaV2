package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// UserClaims represents the authenticated user's claims stored in the request context
type UserClaims struct {
	UserID int64
	Email  string
	Role   string
}

func Auth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authz := c.GetHeader("Authorization")
		if authz == "" || !strings.HasPrefix(authz, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}
		tokenStr := strings.TrimPrefix(authz, "Bearer ")

		// Parse token with claims validation
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
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

		// Store user claims in context for handlers to use
		c.Set("user", UserClaims{
			UserID: int64(userID),
			Email:  sub,
			Role:   role,
		})

		c.Next()
	}
}
