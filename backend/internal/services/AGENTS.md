# INTERNAL SERVICES KNOWLEDGE BASE

**Generated:** 2026-01-14
**Scope:** Business logic layer for PDF generation, notifications, and validation.

## OVERVIEW
Decoupled business logic services that handle report generation, user communications, and biomarker data integrity.

## WHERE TO LOOK
| Service | File | Purpose |
|---------|------|---------|
| PDF Export | `pdf_export_service.go` | Generates user health reports using `gopdf` |
| Notifications | `notification_service.go` | Handles scheduling and queuing of alerts/summaries |
| Validation | `validation_service.go` | Validates biomarker values against clinical ranges |

## CONVENTIONS

**Validation Pattern:**
- Uses `map[string]BiomarkerRange` for hardcoded reference values.
- `ValidateBiomarkerRanges` returns a `ValidationResult` with warning strings.
- Table-driven tests in `validation_service_test.go` cover various clinical edge cases.

**Notification Pattern:**
- Type-safe notifications via `NotificationType` constants.
- Schedules reminders (24h), monthly summaries (1st of month), and immediate risk alerts.
- Uses `queueNotification` internal method for persistence (currently stubbed).

**PDF Generation:**
- Uses `gopdf` library for document creation.
- Expects `models.UserProfile` and `[]models.Assessment` as input.

## TODO / ANTI-PATTERNS

**NOT IMPLEMENTED:**
- **Email Sending**: `notification_service.go` only logs; needs SMTP/API integration (SendGrid/SES).
- **Queue Processing**: `ProcessQueue()` is a stub; requires a background worker to process pending tasks.
- **Anonymized CSV**: No service exists for generating privacy-preserving data exports (TODO).
- **Notification Table**: Persistence to a `notification_queue` table is defined but not implemented.

**CRITICAL:**
- `pdf_export_service.go`: Generation is "temporarily disabled" due to library update conflicts.
- `notification_service.go`: Silent failure potential as it returns `nil` on stubs without erroring.
