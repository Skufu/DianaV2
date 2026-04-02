package logging

import (
	"encoding/json"
	"regexp"
	"strings"
)

// Scrubber handles PII detection and redaction in log messages
type Scrubber struct {
	patterns        []ScrubPattern
	maskEmail       bool
	maskPhone       bool
	maskIP          bool
	maskTokens      bool
	maskPasswords   bool
	maskBiomarkers  bool
	maskNames       bool
}

// ScrubPattern defines a regex pattern for PII detection
type ScrubPattern struct {
	Name        string
	Pattern     *regexp.Regexp
	Replacement string
}

// DefaultScrubber returns a scrubber with sensible defaults
func DefaultScrubber() *Scrubber {
	return &Scrubber{
		patterns: []ScrubPattern{
			// Email addresses
			{
				Name:        "email",
				Pattern:     regexp.MustCompile(`(?i)[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}`),
				Replacement: "[REDACTED_EMAIL]",
			},
			// Phone numbers (various formats)
			{
				Name:        "phone",
				Pattern:     regexp.MustCompile(`(?i)(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}`),
				Replacement: "[REDACTED_PHONE]",
			},
			// IP addresses
			{
				Name:        "ipv4",
				Pattern:     regexp.MustCompile(`\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b`),
				Replacement: "[REDACTED_IP]",
			},
			// JWT tokens (simplified pattern)
			{
				Name:        "jwt",
				Pattern:     regexp.MustCompile(`(?i)ey[a-zA-Z0-9]*\.ey[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*`),
				Replacement: "[REDACTED_JWT]",
			},
			// API keys
			{
				Name:        "api_key",
				Pattern:     regexp.MustCompile(`(?i)(api[_-]?key|apikey)\s*[:=]\s*["']?[a-zA-Z0-9_-]{16,}["']?`),
				Replacement: "[REDACTED_API_KEY]",
			},
			// Passwords in various formats
			{
				Name:        "password",
				Pattern:     regexp.MustCompile(`(?i)(password|passwd|pwd)\s*[:=]\s*["']?[^\s"']+["']?`),
				Replacement: "[REDACTED_PASSWORD]",
			},
			// Authorization headers
			{
				Name:        "auth_header",
				Pattern:     regexp.MustCompile(`(?i)(authorization|x-api-key)\s*:\s*bearer\s+[^\s]+`),
				Replacement: "[REDACTED_AUTH_HEADER]",
			},
			// Session tokens
			{
				Name:        "session_token",
				Pattern:     regexp.MustCompile(`(?i)(session[_-]?token|token)\s*[:=]\s*["']?[a-zA-Z0-9_-]{20,}["']?`),
				Replacement: "[REDACTED_TOKEN]",
			},
		},
		maskEmail:      true,
		maskPhone:      true,
		maskIP:         true,
		maskTokens:     true,
		maskPasswords:  true,
		maskBiomarkers: true,
		maskNames:      true,
	}
}

// ScrubString scrubs PII from a string
func (s *Scrubber) ScrubString(input string) string {
	if input == "" {
		return input
	}

	result := input

	// Apply regex patterns
	for _, pattern := range s.patterns {
		result = pattern.Pattern.ReplaceAllString(result, pattern.Replacement)
	}

	return result
}

// ScrubMap scrubs PII from a map (recursively)
func (s *Scrubber) ScrubMap(data map[string]interface{}) map[string]interface{} {
	if data == nil {
		return nil
	}

	result := make(map[string]interface{})
	for key, value := range data {
		// Check if key indicates sensitive data
		if s.isSensitiveKey(key) {
			result[key] = "[REDACTED]"
			continue
		}

		// Process value based on type
		switch v := value.(type) {
		case string:
			result[key] = s.ScrubString(v)
		case map[string]interface{}:
			result[key] = s.ScrubMap(v)
		case []interface{}:
			result[key] = s.ScrubSlice(v)
		default:
			result[key] = value
		}
	}

	return result
}

// ScrubSlice scrubs PII from a slice (recursively)
func (s *Scrubber) ScrubSlice(data []interface{}) []interface{} {
	if data == nil {
		return nil
	}

	result := make([]interface{}, len(data))
	for i, value := range data {
		switch v := value.(type) {
		case string:
			result[i] = s.ScrubString(v)
		case map[string]interface{}:
			result[i] = s.ScrubMap(v)
		case []interface{}:
			result[i] = s.ScrubSlice(v)
		default:
			result[i] = value
		}
	}

	return result
}

// ScrubJSON scrubs PII from a JSON string
func (s *Scrubber) ScrubJSON(jsonStr string) string {
	if jsonStr == "" {
		return jsonStr
	}

	// Try to parse as JSON object
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(jsonStr), &data); err == nil {
		scrubbed := s.ScrubMap(data)
		result, err := json.Marshal(scrubbed)
		if err == nil {
			return string(result)
		}
	}

	// Try to parse as JSON array
	var arr []interface{}
	if err := json.Unmarshal([]byte(jsonStr), &arr); err == nil {
		scrubbed := s.ScrubSlice(arr)
		result, err := json.Marshal(scrubbed)
		if err == nil {
			return string(result)
		}
	}

	// Fall back to string scrubbing
	return s.ScrubString(jsonStr)
}

// isSensitiveKey checks if a key indicates sensitive data
func (s *Scrubber) isSensitiveKey(key string) bool {
	keyLower := strings.ToLower(key)
	sensitiveKeys := []string{
		"password", "passwd", "pwd",
		"secret", "secret_key", "api_key", "apikey",
		"token", "access_token", "refresh_token",
		"authorization",
		"credit_card", "cc_number", "cvv",
		"ssn", "social_security",
		"dob", "date_of_birth", "birthdate",
		"first_name", "last_name", "fullname",
		"phone", "mobile", "cell",
		"address", "street", "city", "zip", "postal",
		"email",
	}

	for _, sensitive := range sensitiveKeys {
		if strings.Contains(keyLower, sensitive) {
			return true
		}
	}

	return false
}

// AddPattern adds a custom scrubbing pattern
func (s *Scrubber) AddPattern(name string, pattern *regexp.Regexp, replacement string) {
	s.patterns = append(s.patterns, ScrubPattern{
		Name:        name,
		Pattern:     pattern,
		Replacement: replacement,
	})
}

// RemovePattern removes a pattern by name
func (s *Scrubber) RemovePattern(name string) {
	var filtered []ScrubPattern
	for _, p := range s.patterns {
		if p.Name != name {
			filtered = append(filtered, p)
		}
	}
	s.patterns = filtered
}

// EnableMask enables a specific mask type
func (s *Scrubber) EnableMask(maskType string) {
	switch strings.ToLower(maskType) {
	case "email":
		s.maskEmail = true
	case "phone":
		s.maskPhone = true
	case "ip":
		s.maskIP = true
	case "token":
		s.maskTokens = true
	case "password":
		s.maskPasswords = true
	case "biomarker":
		s.maskBiomarkers = true
	case "name":
		s.maskNames = true
	}
}

// DisableMask disables a specific mask type
func (s *Scrubber) DisableMask(maskType string) {
	switch strings.ToLower(maskType) {
	case "email":
		s.maskEmail = false
	case "phone":
		s.maskPhone = false
	case "ip":
		s.maskIP = false
	case "token":
		s.maskTokens = false
	case "password":
		s.maskPasswords = false
	case "biomarker":
		s.maskBiomarkers = false
	case "name":
		s.maskNames = false
	}
}

// ScrubError scrubs PII from an error message
func ScrubError(err error) error {
	if err == nil {
		return nil
	}
	scrubber := DefaultScrubber()
	scrubbedMsg := scrubber.ScrubString(err.Error())
	return &scrubbedError{message: scrubbedMsg, original: err}
}

type scrubbedError struct {
	message  string
	original error
}

func (e *scrubbedError) Error() string {
	return e.message
}

func (e *scrubbedError) Unwrap() error {
	return e.original
}

// SafeLogField represents a field that can be safely logged
type SafeLogField struct {
	Key   string
	Value interface{}
}

// SanitizeForLog sanitizes data for logging
func SanitizeForLog(key string, value interface{}) SafeLogField {
	scrubber := DefaultScrubber()

	switch v := value.(type) {
	case string:
		return SafeLogField{Key: key, Value: scrubber.ScrubString(v)}
	case map[string]interface{}:
		return SafeLogField{Key: key, Value: scrubber.ScrubMap(v)}
	case []interface{}:
		return SafeLogField{Key: key, Value: scrubber.ScrubSlice(v)}
	default:
		// Check if the key indicates sensitive data
		if scrubber.isSensitiveKey(key) {
			return SafeLogField{Key: key, Value: "[REDACTED]"}
		}
		return SafeLogField{Key: key, Value: value}
	}
}

// Global scrubber instance
var defaultScrubber = DefaultScrubber()

// Scrub scrubs PII using the default scrubber
func Scrub(input string) string {
	return defaultScrubber.ScrubString(input)
}

// ScrubData scrubs a map using the default scrubber
func ScrubData(data map[string]interface{}) map[string]interface{} {
	return defaultScrubber.ScrubMap(data)
}
