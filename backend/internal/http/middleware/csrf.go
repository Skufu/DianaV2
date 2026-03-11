package middleware

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	csrfCookieName  = "diana_csrf_token"
	csrfHeaderName  = "X-CSRF-Token"
	csrfTokenLength = 32
)

func CSRF() gin.HandlerFunc {
	return func(c *gin.Context) {
		if isSafeMethod(c.Request.Method) {
			token := generateCSRFToken()
			c.SetCookie(csrfCookieName, token, 7*24*60*60, "/", "", isSecure(c), false)
			c.Next()
			return
		}

		cookieToken, err := c.Cookie(csrfCookieName)
		if err != nil || cookieToken == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "CSRF token missing",
				"code":  "CSRF_MISSING",
			})
			return
		}

		headerToken := c.GetHeader(csrfHeaderName)
		if headerToken == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "CSRF token required in header",
				"code":  "CSRF_HEADER_MISSING",
			})
			return
		}

		if !constantTimeEqual(cookieToken, headerToken) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "CSRF token mismatch",
				"code":  "CSRF_MISMATCH",
			})
			return
		}

		newToken := generateCSRFToken()
		c.SetCookie(csrfCookieName, newToken, 7*24*60*60, "/", "", isSecure(c), false)
		c.Next()
	}
}

func isSafeMethod(method string) bool {
	return method == "GET" || method == "HEAD" || method == "OPTIONS" || method == "TRACE"
}

func generateCSRFToken() string {
	b := make([]byte, csrfTokenLength)
	_, _ = rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

func constantTimeEqual(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	var result byte
	for i := 0; i < len(a); i++ {
		result |= a[i] ^ b[i]
	}
	return result == 0
}

func isSecure(c *gin.Context) bool {
	if strings.HasPrefix(c.Request.URL.Scheme, "https") {
		return true
	}
	if c.Request.Header.Get("X-Forwarded-Proto") == "https" {
		return true
	}
	return false
}
