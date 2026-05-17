package security

import (
	"net/url"
	"strings"
)

const redactedValue = "[REDACTED]"

// SanitizeRawQuery redacts credentials from a URL query string before it is
// written to application logs, traces, or error reporting tools.
func SanitizeRawQuery(raw string) string {
	if raw == "" {
		return ""
	}

	values, err := url.ParseQuery(raw)
	if err != nil {
		return sanitizeRawQueryFallback(raw)
	}

	for key := range values {
		if IsSensitiveField(key) {
			values.Set(key, redactedValue)
		}
	}
	return values.Encode()
}

// IsSensitiveField returns true for field names that commonly carry secrets.
func IsSensitiveField(key string) bool {
	key = strings.ToLower(strings.TrimSpace(key))
	return strings.Contains(key, "token") ||
		strings.Contains(key, "password") ||
		strings.Contains(key, "secret") ||
		strings.Contains(key, "api_key") ||
		strings.Contains(key, "apikey") ||
		strings.Contains(key, "authorization") ||
		strings.Contains(key, "auth") ||
		strings.Contains(key, "dsn")
}

func sanitizeRawQueryFallback(raw string) string {
	parts := strings.Split(raw, "&")
	for i, part := range parts {
		key, _, hasValue := strings.Cut(part, "=")
		if IsSensitiveField(key) {
			if hasValue {
				parts[i] = key + "=" + redactedValue
			} else {
				parts[i] = key
			}
		}
	}
	return strings.Join(parts, "&")
}
