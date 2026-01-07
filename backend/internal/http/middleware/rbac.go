package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RoleRequired returns middleware that enforces role-based access control.
// It accepts a variadic list of allowed roles - the user must have at least one.
// This middleware must be used AFTER the Auth middleware since it depends on UserClaims.
//
// Example usage:
//
//	adminGroup := router.Group("/admin")
//	adminGroup.Use(middleware.Auth(jwtSecret))
//	adminGroup.Use(middleware.RoleRequired("admin"))
//
// Or with multiple allowed roles:
//
//	managerRoutes.Use(middleware.RoleRequired("admin", "manager"))
func RoleRequired(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user claims from context (set by Auth middleware)
		userInterface, exists := c.Get("user")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "authentication required",
			})
			return
		}

		claims, ok := userInterface.(UserClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "invalid user context",
			})
			return
		}

		// Check if user's role matches any of the allowed roles
		for _, role := range allowedRoles {
			if claims.Role == role {
				c.Next()
				return
			}
		}

		// Role not allowed
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "access denied - insufficient permissions",
			"required_roles": allowedRoles,
			"current_role":   claims.Role,
		})
	}
}

// AdminOnly is a convenience middleware that only allows admin users.
// It's equivalent to RoleRequired("admin").
func AdminOnly() gin.HandlerFunc {
	return RoleRequired("admin")
}
