# DIANA V2 Privacy & GDPR Compliance

This document outlines the privacy compliance features and GDPR implementation in DIANA V2.

## Overview

DIANA V2 implements comprehensive privacy controls to comply with:
- **GDPR** (General Data Protection Regulation - EU)
- **CCPA** (California Consumer Privacy Act)
- **HIPAA** considerations for health data

## User Rights Implementation

### 1. Right of Access (GDPR Article 15)

Users can export all their personal data via the API.

**Endpoint:** `GET /api/v1/users/me/privacy/export/data`

**Query Parameters:**
- `format` - Export format: `json` (default), `csv`, or `zip`

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.diana-health.com/api/v1/users/me/privacy/export/data?format=zip
```

**Export includes:**
- User profile information
- All health assessments
- Consent history
- Audit log entries (user-specific)
- Clinic memberships

### 2. Right to Erasure (GDPR Article 17)

Users can request deletion of their personal data.

**Endpoint:** `POST /api/v1/users/me/privacy/delete`

**Request Body:**
```json
{
  "confirm": true,
  "reason": "No longer using service",
  "keep_research_data": false
}
```

**Deletion Process:**
1. Account is soft-deleted immediately
2. 30-day grace period for account recovery
3. After 30 days, personal data is anonymized or purged
4. Research data (if consented) is anonymized and retained
5. Audit logs retained for 7 years (legal requirement)

### 3. Consent Management (GDPR Article 7)

Users can view and withdraw consent at any time.

**View Consent History:**
```bash
GET /api/v1/users/me/privacy/consent/history
```

**Withdraw Consent:**
```bash
POST /api/v1/users/me/privacy/consent/withdraw
Content-Type: application/json

{
  "consent_types": ["email", "analytics"],
  "reason": "Privacy preference"
}
```

**Consent Types:**
- `personal_data` - Processing of personal health data
- `research` - Participation in anonymized research
- `email` - Marketing and update emails
- `analytics` - Usage analytics and cookies

### 4. Data Processing Information (GDPR Articles 13 & 14)

Users can view complete information about data processing.

**Endpoint:** `GET /api/v1/users/me/privacy/processing-info`

Returns:
- Data controller identity and contact
- Purposes and legal bases for processing
- Retention periods
- Recipient categories
- User rights and how to exercise them
- Information about automated decision-making

## Data Retention Policy

| Data Type | Retention Period | Notes |
|-----------|------------------|-------|
| Active Account Data | 5 years from last login | Extended with each login |
| Deleted Accounts | 30 days grace + 90 days purge | Soft delete first |
| Health Assessments | Account duration + 2 years | Anonymized after deletion |
| Audit Logs | 7 years | Legal requirement |
| Consent Records | Account duration + 5 years | Prove compliance |
| Research Data (anonymized) | Indefinite | Cannot be linked to user |

## Security Measures

1. **Encryption at Rest**: All personal data encrypted in database
2. **Encryption in Transit**: TLS 1.3 for all API communications
3. **Access Controls**: Role-based access control (RBAC)
4. **Audit Logging**: All access to personal data is logged
5. **Pseudonymization**: Research data is pseudonymized
6. **Regular Backups**: Encrypted backups with 30-day retention

## Data Processors

| Processor | Purpose | Data Processed | Location |
|-----------|---------|----------------|----------|
| AWS/GCP | Cloud hosting | All data | EU/US (with SCCs) |
| SendGrid | Email delivery | Email addresses | US (with SCCs) |
| Sentry | Error tracking | Technical logs | US (with SCCs) |

## Cookies and Tracking

| Cookie | Purpose | Duration | Required |
|--------|---------|----------|----------|
| `session` | Authentication | Session | Yes |
| `auth_token` | JWT storage | 7 days | Yes |
| `_analytics` | Usage analytics | 1 year | No (consent required) |

## Contact

For privacy-related inquiries:
- **Email**: privacy@diana-health.com
- **DPO**: Data Protection Officer, DIANA Health Inc.
- **Address**: 123 Health Street, Medical District, 12345

## Compliance Certifications

- [ ] GDPR compliance audit (scheduled)
- [ ] HIPAA risk assessment (scheduled)
- [ ] ISO 27001 certification (planned)

## Updates

This document is reviewed quarterly. Last updated: April 2026.
