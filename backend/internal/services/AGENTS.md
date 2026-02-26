# SERVICES KNOWLEDGE BASE

**Directory**: `backend/internal/services`
**Generated:** 2026-01-28

## OVERVIEW
Business logic layer handling PDF generation, notification scheduling, and biomarker validation.

## WHERE TO LOOK

| Service | File | Purpose | Status |
|---------|------|---------|--------|
| PDF Export | `pdf_export_service.go` | Generates user health reports using gopdf | ⚠️ Disabled |
| Notifications | `notification_service.go` | Schedules and queues user communications | 🚧 Stub |
| Validation | `validation_service.go` | Biomarker range validation | ✅ Implemented |

## CONVENTIONS

### Service Pattern
```go
type ServiceName struct {
    store store.Store  // Data access (optional)
    // ... other dependencies
}

func NewServiceName(store store.Store) *ServiceName {
    return &ServiceName{store: store}
}
```

## CODE MAP

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| NewPDFExportService | func | pdf_export_service.go | export handler | PDF service constructor |
| GenerateHealthReport | method | pdf_export_service.go | export handler | Create PDF byte array |
| getRiskLevel | func | pdf_export_service.go | internal | Risk level string mapper |
| NewNotificationService | func | notification_service.go | - | Notification service constructor |
| QueueAssessmentReminder | method | notification_service.go | - | Schedule assessment reminder (24h) |
| ScheduleMonthlySummary | method | notification_service.go | - | Schedule monthly summary (1st of month) |
| SendRiskAlert | method | notification_service.go | - | Immediate risk alert (priority 1) |
| queueNotification | method | notification_service.go | internal | Stub for persisting notifications |
| ProcessQueue | method | notification_service.go | - | Stub for queue processing |
| NewValidationService | func | validation_service.go | - | Validation service constructor |
| ValidateBiomarkerRanges | method | validation_service.go | - | Check all biomarkers against ranges |
| GetReferenceRanges | method | validation_service.go | - | Get clinical ranges for display |
| GetRiskLevelText | method | validation_service.go | - | Convert risk level to readable text |
| NotificationType | const | notification_service.go | - | Type-safe notification types |
| NotificationAssessmentReminder | const | notification_service.go | - | "assessment_reminder" |
| NotificationRiskAlert | const | notification_service.go | - | "risk_alert" |
| NotificationMonthlySummary | const | notification_service.go | - | "monthly_summary" |
| NotificationEducational | const | notification_service.go | - | "educational" |
| BiomarkerRange | struct | validation_service.go | - | Min/Max/Unit/Name |
| ClinicalRange | struct | validation_service.go | - | Normal/Prediabetic/Diabetic |
| ValidationResult | struct | validation_service.go | - | Valid/Warnings |

## VALIDATION SERVICE

### Clinical Ranges
```go
// FBS (Fasting Blood Sugar) - mg/dL
Normal: 40-99, Prediabetic: 100-125, Diabetic: 126-600

// HbA1c - %
Normal: 3.5-5.6, Prediabetic: 5.7-6.4, Diabetic: 6.5-15.0

// BMI - kg/m²
Valid: 15-60 (outside range triggers warning)

// Blood Pressure - mmHg
Systolic: 70-250, Diastolic: 40-150

// Lipids - mg/dL
Cholesterol: 100-400, LDL: 30-300, HDL: 15-120, Triglycerides: 20-1000
```

### Validation Result
```go
type ValidationResult struct {
    Valid    bool       // All values in range
    Warnings []string  // List of out-of-range warnings
}
```

## NOTIFICATION SERVICE

### Notification Types
- **`assessment_reminder`**: Scheduled 24 hours after last assessment
- **`risk_alert`**: Immediate alert when HbA1c crosses threshold
- **`monthly_summary`**: Scheduled for 1st of each month at 9 AM
- **`educational`**: Health education content (not yet implemented)

### Priority Levels
- **Priority 1**: Risk alerts (highest urgency)
- **Priority 4**: Monthly summaries
- **Priority 5**: Assessment reminders

### Stub Implementation
```go
func (s *NotificationService) queueNotification(notification Notification) error {
    // TODO: Implement actual email sending via notification_queue table
    log.Printf("Notification queued: UserID=%d, Type=%s, ...")
    return nil  // Returns nil without persisting
}
```

## PDF EXPORT SERVICE

### Current Status
⚠️ **DISABLED** - Generation is temporarily disabled due to gopdf library update conflicts.

```go
// From GenerateHealthReport
err = pdf.Cell(nil, "Health Report generation temporarily disabled due to library updates.")
if err != nil {
    return nil, err
}
```

### Expected Implementation
When re-enabled, service should:
1. Accept `models.UserProfile` and `[]models.Assessment`
2. Generate multi-page PDF with:
   - User profile section
   - Assessment history table
   - Risk trend charts
   - Clinical recommendations
3. Return `[]byte` for HTTP response

## ANTI-PATTERNS (THIS PROJECT)

### Critical Issues
- **PDF generation disabled**: Core feature not working due to library conflicts
- **Stub notification queue**: `queueNotification()` returns nil without persistence
- **Silent failures**: No error handling when queue operation fails

### Technical Debt
- **No email integration**: Service logs but doesn't send emails (no SendGrid/SES/SimpleEmail)
- **No queue processing**: `ProcessQueue()` is a stub - no background worker
- **Missing tests**: PDF service has no test file

### Refactoring Needed
1. **Implement notification queue persistence**: Insert into `notification_queue` table
2. **Background worker**: Process pending notifications periodically
3. **Email service**: Integrate with email provider API
4. **Re-enable PDF generation**: Update gopdf or switch to alternative library
5. **Add PDF tests**: Ensure report generation works correctly

## NOTES

### Notification Flow (Intended)
1. Handler calls `QueueAssessmentReminder(userID, frequencyMonths)`
2. Service calculates `scheduledFor = NOW + 24 hours`
3. Service calls `queueNotification(notification)`
4. **TODO**: Background worker processes queue and sends emails
5. **TODO**: Update `notification_queue` status to `sent` or `failed`

### Risk Alert Flow
1. Handler detects `HbA1c > 6.5` or high risk score
2. Service creates `NotificationRiskAlert` with priority 1
3. Service queues immediately (scheduled for NOW)
4. **TODO**: Email sent with clinical recommendations

### Monthly Summary Flow
1. Scheduler triggers on 1st of month at 9 AM
2. Service calculates aggregation (from assessments table)
3. Service generates email with:
   - Total assessments this month
   - Average HbA1c
   - Overall risk trend
4. **TODO**: Email sent with dashboard link

### Database Table
`notification_queue` table exists in schema (migration 0011):
```sql
CREATE TABLE notification_queue (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    priority INT NOT NULL DEFAULT 5,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT
);
```

## TODO

- [ ] Implement actual `queueNotification()` persistence to `notification_queue` table
- [ ] Create background worker to process pending notifications
- [ ] Integrate email service (SendGrid, AWS SES, or SimpleEmail)
- [ ] Add retry logic for failed notifications
- [ ] Fix PDF generation (update gopdf or use alternative)
- [ ] Add unit tests for PDF export service
- [ ] Add unit tests for notification service
- [ ] Implement email template system
- [ ] Add notification preferences per user (opt-out)
