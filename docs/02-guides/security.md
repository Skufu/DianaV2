# Security Improvements

This document provides an overview of the security enhancements and fixes implemented in the DianaV2 project to ensure data integrity, user privacy, and system reliability.

## Security Improvements Overview

The DianaV2 project has undergone a comprehensive security review and remediation process. The implemented fixes address vulnerabilities identified in authentication, data isolation, input validation, and system monitoring. These improvements strengthen the application's defense against common web vulnerabilities and ensure that sensitive patient data remains protected.

## Authentication & Authorization

- **User Profile in Auth Responses**: The login and token refresh endpoints now return basic user information (id, email, and role) alongside the JWT. This allows the frontend to manage user state securely without additional API calls.
- **Safe Claim Extraction**: Replaced manual and potentially unsafe type assertions for user context with a centralized `getUserClaims()` helper. This ensures consistent and type-safe access to user credentials across all handlers.
- **RBAC Information Leak Prevention**: The Role-Based Access Control (RBAC) middleware has been updated to return generic "access denied" messages. It no longer includes the user's current role in error responses, preventing unauthorized role enumeration.

## Data Isolation

- **Analytics Data Leak Fix**: Addressed a data exposure vulnerability in the analytics endpoints. Data is now strictly filtered by the authenticated user's ID using the `ClusterCountsByUser` and `TrendAveragesByUser` repository methods.
- **Efficient Scoped Queries**: Replaced inefficient N+1 queries with a single `ListPatientsWithLatestAssessment` call using SQL JOINs. This improvement ensures that clinicians only see patients associated with their account while optimizing database performance.
- **Client-Side Data Consistency**: The Analytics component now utilizes the `patients` property passed from the main application state instead of independently refetching the patient list. This ensures data consistency across the UI and reduces unnecessary network traffic.

## Input Validation

- **ML Biomarker Validation**: The ML server now performs strict range checks on all input biomarkers. Values for hba1c, fbs, bmi, triglycerides, ldl, hdl, and age are validated against physiological ranges to prevent processing of malicious or erroneous data.
- **Sanitized Export Filenames**: Filenames for exported reports are now sanitized to remove control characters and potentially dangerous symbols, preventing header injection and path traversal issues.
- **Cache Invalidation on Assessment**: The `createAssessmentApi` workflow now triggers an immediate, background refresh of the full patient list. This ensures that the dashboard and patient history views reflect the most recent diagnostic results without manual reloading.

## Rate Limiting

- **ML Server Rate Limiting**: Implemented a token-bucket rate limiter on the ML server to protect against brute-force and DoS attacks. The limits are configurable via the following environment variables:
  - `ML_RATE_LIMIT_MINUTE`: Requests allowed per minute (default: 120)
  - `ML_RATE_LIMIT_SECOND`: Requests allowed per second (default: 20)

## Error Handling

- **Structured ML Logging**: Enhanced the `http_predictor.go` component with structured logging. All failures in ML communication—including timeouts, non-OK status codes, and malformed responses—are logged with detailed context for auditing.
- **Consistent API Contract**: Standardized the communication between the backend and ML server. The ML server now consistently returns the `risk_cluster` field, ensuring reliable data parsing.
- **Informative Export Failures**: Updated export handlers to return JSON error bodies instead of empty status codes. This provides better feedback to the frontend and facilitates troubleshooting of export issues.

## Audit Logging

- **Audit Log Sanitization**: Implemented a sanitization layer for the audit trail. Control characters are stripped from log entries, and the length of detail fields is limited to 500 characters to prevent log injection and resource exhaustion.
- **Admin Action Tracking**: All administrative actions are automatically recorded in the `audit_events` table, providing a transparent trail of user management and system configuration changes.
