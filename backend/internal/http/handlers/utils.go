package handlers

import (
	"errors"
	"regexp"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
)

var controlCharRegex = regexp.MustCompile(`[\x00-\x1f\x7f]`)

func parseIDParam(c *gin.Context, name string) (int64, error) {
	raw := c.Param(name)
	return strconv.ParseInt(raw, 10, 64)
}

func getUserID(c *gin.Context) (int32, error) {
	claims, err := getUserClaims(c)
	if err != nil {
		return 0, err
	}
	return int32(claims.UserID), nil
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
