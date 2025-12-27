package handlers

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
)

func parseIDParam(c *gin.Context, name string) (int64, error) {
	raw := c.Param(name)
	return strconv.ParseInt(raw, 10, 64)
}

// getUserID extracts the authenticated user's ID from the request context
func getUserID(c *gin.Context) (int32, error) {
	val, exists := c.Get("user")
	if !exists {
		return 0, errors.New("user not found in context")
	}
	claims, ok := val.(middleware.UserClaims)
	if !ok {
		return 0, errors.New("invalid user claims")
	}
	return int32(claims.UserID), nil
}
