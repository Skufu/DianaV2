package security

import "testing"

func TestSanitizeRawQueryRedactsSensitiveFields(t *testing.T) {
	got := SanitizeRawQuery("token=jwt-value&page=1&refresh_token=refresh-value&email=admin%40diana.app")

	if got != "email=admin%40diana.app&page=1&refresh_token=%5BREDACTED%5D&token=%5BREDACTED%5D" {
		t.Fatalf("unexpected sanitized query: %s", got)
	}
}

func TestSanitizeRawQueryFallbackRedactsMalformedQuery(t *testing.T) {
	got := SanitizeRawQuery("token=%zz&page=1")

	if got != "token=[REDACTED]&page=1" {
		t.Fatalf("unexpected fallback sanitized query: %s", got)
	}
}
