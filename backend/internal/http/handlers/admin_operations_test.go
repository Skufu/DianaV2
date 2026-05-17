package handlers

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestOperationsLogPathForServiceWhitelist(t *testing.T) {
	handler := &AdminOperationsHandler{logDir: "/var/log/diana"}

	if _, ok := handler.logPathForService("../backend"); ok {
		t.Fatal("expected path traversal service name to be rejected")
	}

	path, ok := handler.logPathForService("backend")
	if !ok {
		t.Fatal("expected backend service to be allowed")
	}
	if path != filepath.Join("/var/log/diana", "backend.log") {
		t.Fatalf("unexpected backend log path: %s", path)
	}
}

func TestParseOperationsLogEntryRedactsSensitiveFields(t *testing.T) {
	record := `{"timestamp":"2026-05-14T10:00:00Z","level":"info","message":"authorization bearer abc.def.ghi for admin@example.com","request_id":"rid-1","authorization":"Bearer secret-token","user_email":"admin@example.com","hba1c":6.8,"api_key":"secret-key"}`

	entry := parseOperationsLogEntry("backend", record)

	for _, forbidden := range []string{"secret-token", "secret-key", "abc.def.ghi", "admin@example.com", "6.8"} {
		if strings.Contains(entry.Raw, forbidden) {
			t.Fatalf("expected raw log to redact %q, got %s", forbidden, entry.Raw)
		}
	}

	if entry.Fields["authorization"] != "[REDACTED]" {
		t.Fatalf("expected authorization field to be redacted, got %#v", entry.Fields["authorization"])
	}
	if entry.Fields["hba1c"] != "[REDACTED]" {
		t.Fatalf("expected biomarker field to be redacted, got %#v", entry.Fields["hba1c"])
	}
	if entry.Fields["user_email"] != "[REDACTED]" {
		t.Fatalf("expected email field to be redacted, got %#v", entry.Fields["user_email"])
	}
}

func TestReadRecentLogRecordsGroupsContinuationLines(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "backend.log")
	content := strings.Join([]string{
		`{"level":"error","message":"handler failed"}`,
		`  File "/app/service.py", line 10`,
		`{"level":"info","message":"recovered"}`,
		"",
	}, "\n")
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("failed to write log file: %v", err)
	}

	records, truncated, err := readRecentLogRecords(path)
	if err != nil {
		t.Fatalf("failed to read log records: %v", err)
	}
	if truncated {
		t.Fatal("did not expect small test log to be truncated")
	}
	if len(records) != 2 {
		t.Fatalf("expected 2 grouped records, got %d: %#v", len(records), records)
	}
	if !strings.Contains(records[0], "\n  File") {
		t.Fatalf("expected continuation line to be grouped, got %q", records[0])
	}
}
