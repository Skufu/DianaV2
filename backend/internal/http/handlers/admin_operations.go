package handlers

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/config"
	"github.com/skufu/DianaV2/backend/internal/store"
)

const (
	defaultOperationsLogLimit = 200
	maxOperationsLogLimit     = 1000
	maxOperationsSearchLength = 120
	maxLogLineBytes           = 64 * 1024
	maxReturnedRawLogBytes    = 16 * 1024
	maxTailReadBytes          = 2 * 1024 * 1024
)

var allowedOperationsLogFiles = map[string]string{
	"backend": "backend.log",
	"ml":      "ml.log",
}

var allowedOperationsLogLevels = map[string]bool{
	"":        true,
	"debug":   true,
	"info":    true,
	"warn":    true,
	"warning": true,
	"error":   true,
	"fatal":   true,
	"panic":   true,
}

var sensitiveLogKeyPattern = regexp.MustCompile(`(?i)(password|passwd|pwd|secret|jwt|token|authorization|api[_-]?key|ml[_-]?api[_-]?key|refresh[_-]?token|access[_-]?token|email|first[_-]?name|last[_-]?name|phone|address|hba1c|fbs|cholesterol|ldl|hdl|triglycerides|systolic|diastolic|bmi|waist)`)
var timestampLinePattern = regexp.MustCompile(`^\d{4}[-/]\d{2}[-/]\d{2}`)

var logRedactors = []struct {
	pattern     *regexp.Regexp
	replacement string
}{
	{
		pattern:     regexp.MustCompile(`(?i)(bearer\s+)[a-z0-9._~+/=-]+`),
		replacement: `${1}[REDACTED]`,
	},
	{
		pattern:     regexp.MustCompile(`ey[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+`),
		replacement: `[REDACTED_JWT]`,
	},
	{
		pattern:     regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`),
		replacement: `[REDACTED_EMAIL]`,
	},
	{
		pattern:     regexp.MustCompile(`(?i)((?:api[_-]?key|password|passwd|pwd|access[_-]?token|refresh[_-]?token|authorization|jwt[_-]?secret|ml[_-]?api[_-]?key)\s*[:=]\s*)["']?[^"',\s}]+["']?`),
		replacement: `${1}[REDACTED]`,
	},
}

type AdminOperationsHandler struct {
	cfg    config.Config
	store  store.Store
	logDir string
	client *http.Client
}

func NewAdminOperationsHandler(cfg config.Config, st store.Store) *AdminOperationsHandler {
	return &AdminOperationsHandler{
		cfg:    cfg,
		store:  st,
		logDir: strings.TrimSpace(os.Getenv("DIANA_LOG_DIR")),
		client: &http.Client{Timeout: time.Duration(cfg.ModelTimeoutMS) * time.Millisecond},
	}
}

func (h *AdminOperationsHandler) Register(rg *gin.RouterGroup) {
	ops := rg.Group("/operations")
	{
		ops.GET("/health", h.getHealth)
		ops.GET("/logs", h.listLogs)
	}
}

type operationsServiceStatus struct {
	Name      string `json:"name"`
	Status    string `json:"status"`
	Detail    string `json:"detail,omitempty"`
	LatencyMS int64  `json:"latency_ms,omitempty"`
}

type operationsLogSourceStatus struct {
	Service    string    `json:"service"`
	Available  bool      `json:"available"`
	SizeBytes  int64     `json:"size_bytes,omitempty"`
	ModifiedAt time.Time `json:"modified_at,omitempty"`
	Detail     string    `json:"detail,omitempty"`
}

type operationsHealthResponse struct {
	Status      string                      `json:"status"`
	CheckedAt   time.Time                   `json:"checked_at"`
	Environment string                      `json:"environment"`
	Version     string                      `json:"version"`
	Services    []operationsServiceStatus   `json:"services"`
	LogSources  []operationsLogSourceStatus `json:"log_sources"`
}

type operationsLogEntry struct {
	Timestamp string         `json:"timestamp,omitempty"`
	Level     string         `json:"level,omitempty"`
	Service   string         `json:"service"`
	Message   string         `json:"message,omitempty"`
	RequestID string         `json:"request_id,omitempty"`
	Raw       string         `json:"raw"`
	Fields    map[string]any `json:"fields,omitempty"`
}

type operationsLogResponse struct {
	Service   string               `json:"service"`
	Limit     int                  `json:"limit"`
	Count     int                  `json:"count"`
	Truncated bool                 `json:"truncated"`
	Available bool                 `json:"available"`
	Data      []operationsLogEntry `json:"data"`
}

func (h *AdminOperationsHandler) getHealth(c *gin.Context) {
	services := []operationsServiceStatus{
		{
			Name:   "backend",
			Status: "healthy",
			Detail: "admin operations endpoint is responding",
		},
		h.databaseHealth(c.Request.Context()),
		h.mlHealth(c.Request.Context()),
	}

	status := "healthy"
	for _, service := range services {
		if service.Status == "unhealthy" {
			status = "degraded"
			break
		}
		if service.Status == "unknown" && status == "healthy" {
			status = "degraded"
		}
	}

	c.JSON(http.StatusOK, operationsHealthResponse{
		Status:      status,
		CheckedAt:   time.Now().UTC(),
		Environment: h.cfg.Env,
		Version:     getOperationsVersion(),
		Services:    services,
		LogSources:  h.logSourceStatuses(),
	})
}

func (h *AdminOperationsHandler) listLogs(c *gin.Context) {
	service := strings.ToLower(strings.TrimSpace(c.DefaultQuery("service", "backend")))
	logPath, ok := h.logPathForService(service)
	if !ok {
		ErrBadRequest(c, "unsupported log service")
		return
	}

	limit := parseOperationsLimit(c.Query("limit"))
	level := normalizeOperationsLogLevel(c.Query("level"))
	if !allowedOperationsLogLevels[level] {
		ErrBadRequest(c, "unsupported log level")
		return
	}

	search := sanitizeLogSearch(c.Query("q"))
	if len(search) > maxOperationsSearchLength {
		ErrBadRequest(c, "search query is too long")
		return
	}

	records, truncated, err := readRecentLogRecords(logPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			c.JSON(http.StatusOK, operationsLogResponse{
				Service:   service,
				Limit:     limit,
				Available: false,
				Data:      []operationsLogEntry{},
			})
			return
		}
		ErrInternal(c, "failed to read system logs")
		return
	}

	entries := make([]operationsLogEntry, 0, limit)
	for _, record := range records {
		entry := parseOperationsLogEntry(service, record)
		if !matchesOperationsLogFilters(entry, level, search) {
			continue
		}
		entries = append(entries, entry)
		if len(entries) > limit {
			entries = entries[1:]
		}
	}

	reverseOperationsLogEntries(entries)

	c.JSON(http.StatusOK, operationsLogResponse{
		Service:   service,
		Limit:     limit,
		Count:     len(entries),
		Truncated: truncated,
		Available: true,
		Data:      entries,
	})
}

func (h *AdminOperationsHandler) databaseHealth(ctx context.Context) operationsServiceStatus {
	start := time.Now()
	checkCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	if err := h.store.Ping(checkCtx); err != nil {
		return operationsServiceStatus{
			Name:      "database",
			Status:    "unhealthy",
			Detail:    "database ping failed",
			LatencyMS: time.Since(start).Milliseconds(),
		}
	}

	return operationsServiceStatus{
		Name:      "database",
		Status:    "healthy",
		Detail:    "database ping succeeded",
		LatencyMS: time.Since(start).Milliseconds(),
	}
}

func (h *AdminOperationsHandler) mlHealth(ctx context.Context) operationsServiceStatus {
	if strings.TrimSpace(h.cfg.ModelURL) == "" {
		return operationsServiceStatus{
			Name:   "ml",
			Status: "unknown",
			Detail: "MODEL_URL is not configured",
		}
	}

	start := time.Now()
	checkCtx, cancel := context.WithTimeout(ctx, time.Duration(h.cfg.ModelTimeoutMS)*time.Millisecond)
	defer cancel()

	url := strings.TrimRight(h.cfg.ModelURL, "/") + "/health"
	req, err := http.NewRequestWithContext(checkCtx, http.MethodGet, url, nil)
	if err != nil {
		return operationsServiceStatus{Name: "ml", Status: "unhealthy", Detail: "invalid ML health URL"}
	}
	if h.cfg.MLAPIKey != "" {
		req.Header.Set("X-API-Key", h.cfg.MLAPIKey)
	}

	resp, err := h.client.Do(req)
	if err != nil {
		return operationsServiceStatus{
			Name:      "ml",
			Status:    "unhealthy",
			Detail:    "ML health request failed",
			LatencyMS: time.Since(start).Milliseconds(),
		}
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return operationsServiceStatus{
			Name:      "ml",
			Status:    "unhealthy",
			Detail:    "ML health returned " + resp.Status,
			LatencyMS: time.Since(start).Milliseconds(),
		}
	}

	return operationsServiceStatus{
		Name:      "ml",
		Status:    "healthy",
		Detail:    "ML health endpoint succeeded",
		LatencyMS: time.Since(start).Milliseconds(),
	}
}

func (h *AdminOperationsHandler) logSourceStatuses() []operationsLogSourceStatus {
	statuses := make([]operationsLogSourceStatus, 0, len(allowedOperationsLogFiles))
	for service := range allowedOperationsLogFiles {
		logPath, _ := h.logPathForService(service)
		status := operationsLogSourceStatus{Service: service}
		if logPath == "" {
			status.Detail = "DIANA_LOG_DIR is not configured"
			statuses = append(statuses, status)
			continue
		}
		info, err := os.Stat(logPath)
		if err != nil {
			status.Detail = "log file has not been created yet"
			statuses = append(statuses, status)
			continue
		}
		status.Available = true
		status.SizeBytes = info.Size()
		status.ModifiedAt = info.ModTime().UTC()
		statuses = append(statuses, status)
	}
	return statuses
}

func (h *AdminOperationsHandler) logPathForService(service string) (string, bool) {
	filename, ok := allowedOperationsLogFiles[service]
	if !ok {
		return "", false
	}
	if h.logDir == "" {
		return "", true
	}
	return filepath.Join(h.logDir, filename), true
}

func readRecentLogRecords(path string) ([]string, bool, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, false, err
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return nil, false, err
	}

	truncated := false
	if info.Size() > maxTailReadBytes {
		truncated = true
		if _, err := file.Seek(info.Size()-maxTailReadBytes, io.SeekStart); err != nil {
			return nil, false, err
		}
		reader := bufio.NewReader(file)
		_, _ = reader.ReadString('\n')
		return scanLogRecords(reader), truncated, nil
	}

	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return nil, false, err
	}
	return scanLogRecords(file), truncated, nil
}

func scanLogRecords(reader io.Reader) []string {
	scanner := bufio.NewScanner(reader)
	scanner.Buffer(make([]byte, 0, 4096), maxLogLineBytes)

	records := make([]string, 0, defaultOperationsLogLimit)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) == "" {
			continue
		}
		if isLogContinuationLine(line) && len(records) > 0 {
			last := records[len(records)-1]
			if len(last)+len(line)+1 <= maxReturnedRawLogBytes {
				records[len(records)-1] = last + "\n" + line
			}
			continue
		}
		records = append(records, line)
	}
	return records
}

func isLogContinuationLine(line string) bool {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" || strings.HasPrefix(trimmed, "{") || timestampLinePattern.MatchString(trimmed) {
		return false
	}
	return strings.HasPrefix(line, " ") ||
		strings.HasPrefix(line, "\t") ||
		strings.HasPrefix(trimmed, "File ") ||
		strings.HasPrefix(trimmed, "Traceback ") ||
		strings.HasPrefix(trimmed, "at ") ||
		strings.HasPrefix(trimmed, "goroutine ")
}

func parseOperationsLogEntry(service, record string) operationsLogEntry {
	entry := operationsLogEntry{
		Service: service,
		Raw:     redactLogString(record),
	}

	var fields map[string]any
	if err := json.Unmarshal([]byte(record), &fields); err != nil {
		entry.Message = entry.Raw
		return entry
	}

	redactedFields := redactLogMap(fields)
	entry.Fields = redactedFields
	entry.Raw = marshalRedactedLogFields(redactedFields, entry.Raw)
	entry.Timestamp = firstString(redactedFields, "timestamp", "time", "created_at")
	entry.Level = normalizeOperationsLogLevel(firstString(redactedFields, "level", "severity"))
	entry.Message = firstString(redactedFields, "message", "msg", "error")
	entry.RequestID = firstString(redactedFields, "request_id", "requestId")
	if entry.Service == "" {
		entry.Service = firstString(redactedFields, "service")
	}
	return entry
}

func matchesOperationsLogFilters(entry operationsLogEntry, level, search string) bool {
	if level != "" && strings.ToLower(entry.Level) != level {
		return false
	}
	if search == "" {
		return true
	}
	haystack := strings.ToLower(entry.Raw + " " + entry.Message + " " + entry.RequestID)
	return strings.Contains(haystack, strings.ToLower(search))
}

func normalizeOperationsLogLevel(raw string) string {
	level := strings.ToLower(strings.TrimSpace(raw))
	if level == "warning" {
		return "warn"
	}
	return level
}

func parseOperationsLimit(raw string) int {
	if raw == "" {
		return defaultOperationsLogLimit
	}
	limit, err := parsePositiveInt(raw)
	if err != nil {
		return defaultOperationsLogLimit
	}
	if limit > maxOperationsLogLimit {
		return maxOperationsLogLimit
	}
	return limit
}

func parsePositiveInt(raw string) (int, error) {
	value := 0
	for _, ch := range raw {
		if ch < '0' || ch > '9' {
			return 0, errors.New("not a positive integer")
		}
		value = value*10 + int(ch-'0')
	}
	if value <= 0 {
		return 0, errors.New("not a positive integer")
	}
	return value, nil
}

func sanitizeLogSearch(raw string) string {
	return strings.TrimSpace(controlCharRegex.ReplaceAllString(raw, ""))
}

func redactLogMap(input map[string]any) map[string]any {
	output := make(map[string]any, len(input))
	for key, value := range input {
		output[key] = redactLogValue(key, value)
	}
	return output
}

func redactLogValue(key string, value any) any {
	if sensitiveLogKeyPattern.MatchString(key) {
		return "[REDACTED]"
	}
	switch typed := value.(type) {
	case map[string]any:
		return redactLogMap(typed)
	case []any:
		redacted := make([]any, len(typed))
		for i, item := range typed {
			redacted[i] = redactLogValue(key, item)
		}
		return redacted
	case string:
		return redactLogString(typed)
	default:
		return value
	}
}

func redactLogString(value string) string {
	redacted := value
	for _, redactor := range logRedactors {
		redacted = redactor.pattern.ReplaceAllString(redacted, redactor.replacement)
	}
	if len(redacted) > maxReturnedRawLogBytes {
		redacted = redacted[:maxReturnedRawLogBytes] + "...[truncated]"
	}
	return redacted
}

func marshalRedactedLogFields(fields map[string]any, fallback string) string {
	raw, err := json.Marshal(fields)
	if err != nil {
		return fallback
	}
	return string(raw)
}

func firstString(fields map[string]any, keys ...string) string {
	for _, key := range keys {
		value, ok := fields[key]
		if !ok || value == nil {
			continue
		}
		switch typed := value.(type) {
		case string:
			return typed
		case json.Number:
			return typed.String()
		}
	}
	return ""
}

func reverseOperationsLogEntries(entries []operationsLogEntry) {
	for i, j := 0, len(entries)-1; i < j; i, j = i+1, j-1 {
		entries[i], entries[j] = entries[j], entries[i]
	}
}

func getOperationsVersion() string {
	if version := os.Getenv("APP_VERSION"); version != "" {
		return version
	}
	return "dev"
}
