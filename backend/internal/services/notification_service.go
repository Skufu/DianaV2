package services

import (
	"fmt"
	"log"
	"time"

	"github.com/skufu/DianaV2/backend/internal/store"
)

type NotificationService struct {
	store store.Store
}

type NotificationConfig struct {
	FromEmail string
	FromName  string
}

type NotificationType string

const (
	NotificationAssessmentReminder NotificationType = "assessment_reminder"
	NotificationRiskAlert          NotificationType = "risk_alert"
	NotificationMonthlySummary     NotificationType = "monthly_summary"
	NotificationEducational        NotificationType = "educational"
)

type Notification struct {
	UserID       int64
	Type         NotificationType
	Subject      string
	Body         string
	ScheduledFor time.Time
	Priority     int
}

// NewNotificationService creates a new notification service
func NewNotificationService(store store.Store) *NotificationService {
	return &NotificationService{
		store: store,
	}
}

// QueueAssessmentReminder schedules an assessment reminder for a user
func (s *NotificationService) QueueAssessmentReminder(userID int64, frequencyMonths int) error {
	// Calculate next due date
	// For now, just schedule for 24 hours from now (can be refined later)
	scheduledFor := time.Now().Add(24 * time.Hour)

	notification := Notification{
		UserID:       userID,
		Type:         NotificationAssessmentReminder,
		Subject:      "DIANA: Time for Your Assessment",
		Body:         "It's time to log your next assessment. Regular monitoring helps track your health trends.\n\nVisit DIANA to log your assessment at your convenience.",
		ScheduledFor: scheduledFor,
		Priority:     5,
	}

	return s.queueNotification(notification)
}

// ScheduleMonthlySummary schedules a monthly health summary
func (s *NotificationService) ScheduleMonthlySummary(userID int64) error {
	// Schedule for 1st of next month at 9 AM
	now := time.Now()
	// Schedule for 1st of next month at 9 AM
	year, month, _ := now.Date()
	firstOfNextMonth := time.Date(year, month+1, 1, 9, 0, 0, 0, now.Location())

	notification := Notification{
		UserID:       userID,
		Type:         NotificationMonthlySummary,
		Subject:      fmt.Sprintf("DIANA: Your Monthly Health Summary - %s %d", now.Month(), now.Year()),
		Body:         fmt.Sprintf("Here's your health summary for %s %d.\n\nYour health is important to us. Keep up the great work with your assessments!\n\n- Total assessments this month: [Calculated in email]\n- Average HbA1c: [Calculated in email]\n- Overall risk trend: [Calculated in email]\n\nView your full dashboard at DIANA for detailed insights.", now.Month(), now.Year()),
		ScheduledFor: firstOfNextMonth,
		Priority:     4, // Lower priority than reminders
	}

	return s.queueNotification(notification)
}

// SendRiskAlert sends a risk alert when HbA1c crosses threshold
func (s *NotificationService) SendRiskAlert(userID int64, hba1c float64, riskLevel string) error {
	notification := Notification{
		UserID:       userID,
		Type:         NotificationRiskAlert,
		Subject:      "DIANA: Health Alert - HbA1c Above Threshold",
		Body:         fmt.Sprintf("Your latest assessment shows HbA1c of %.2f%%, which is %s.\n\nThis indicates:\n\nHigh Blood Sugar Levels\n\nWe strongly recommend scheduling an appointment with your healthcare provider to discuss your results.\n\nIn the meantime, focus on lifestyle factors you can control:\n- Healthy diet\n- Regular physical activity\n- Stress management\n- Adequate sleep\n\n\nRemember: This is an AI prediction, not a medical diagnosis. Always consult with a healthcare professional for medical advice.", hba1c, riskLevel),
		ScheduledFor: time.Now(), // Send immediately
		Priority:     1,          // Highest priority
	}

	return s.queueNotification(notification)
}

// queueNotification adds a notification to the database queue
func (s *NotificationService) queueNotification(notification Notification) error {
	// For now, just log the notification
	// In production, this would insert into notification_queue table
	log.Printf("Notification queued: UserID=%d, Type=%s, Subject=%s, ScheduledFor=%s",
		notification.UserID, notification.Type, notification.Subject, notification.ScheduledFor.Format(time.RFC3339))

	// TODO: Implement actual email sending via notification_queue table
	// Would need email service integration (SendGrid, AWS SES, etc.)
	return nil
}

// ProcessQueue processes and sends pending notifications
func (s *NotificationService) ProcessQueue() error {
	log.Println("Processing notification queue...")
	// TODO: Implement queue processing logic
	// This would:
	// 1. Query notification_queue WHERE status = 'pending' AND scheduled_for <= NOW()
	// 2. Send emails via SMTP service
	// 3. Update status to 'sent' or 'failed'
	// 4. Retry failed notifications
	return nil
}
