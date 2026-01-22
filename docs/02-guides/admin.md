# Admin Dashboard Guide

> Role-based access control (RBAC) and system administration for DIANA

---

## Overview

The Admin Dashboard provides system administrators with tools to:
- **Manage Users** - Create, update, and deactivate clinician/admin accounts
- **View Audit Logs** - Monitor all administrative actions with full traceability
- **Track ML Models** - View model version history and active model details

---

## Access Requirements

| Requirement | Details |
|-------------|---------|
| **Role** | `admin` (set in users table) |
| **Authentication** | Valid JWT token |
| **Route** | `/admin` in frontend, `/api/v1/admin/*` for API |

---

## Accessing the Admin Panel

1. **Login** with an admin account
2. The **Admin Panel** tab appears in the sidebar (Shield icon)
3. Click to access the tabbed dashboard

> **Note**: Clinician accounts cannot see or access admin features.

---

## Dashboard Tabs

### 1. Overview
System-wide statistics and analytics:
- Total users, patients, and assessments
- High-risk patient count with average risk score
- T2DM cluster distribution (pie chart)
- Biomarker trends (HbA1c, FBS line chart)
- Clinic comparison table

### 2. Users
Manage all user accounts:

| Action | Description |
|--------|-------------|
| **Add User** | Create new clinician or admin account |
| **Edit** | Change email or role |
| **Deactivate** | Soft-delete (can be reactivated) |
| **Activate** | Restore deactivated account |
| **Filter** | Search by email, filter by role/status |

### 3. Audit Logs
View system activity history:

| Filter | Description |
|--------|-------------|
| **Actor** | Search by user email |
| **Action** | Filter by action type (user.create, user.update, etc.) |
| **Date Range** | Filter by start/end date |

Click any row to expand and view JSON details.

### 4. Model Tracking
ML model version history:
- **Active Model Card** - Currently deployed model version and dataset hash
- **Training History** - All model runs with version, date, and notes

---

## API Endpoints

All admin endpoints require `Authorization: Bearer <token>` and admin role.

### User Management
```
GET    /api/v1/admin/users           # List users (paginated)
POST   /api/v1/admin/users           # Create user
GET    /api/v1/admin/users/:id       # Get user
PUT    /api/v1/admin/users/:id       # Update user
DELETE /api/v1/admin/users/:id       # Deactivate user
POST   /api/v1/admin/users/:id/activate  # Reactivate user
```

### Audit Logs
```
GET    /api/v1/admin/audit           # List audit events (paginated, filterable)
```

Query parameters: `page`, `page_size`, `actor`, `action`, `start_date`, `end_date`

### Model Runs
```
GET    /api/v1/admin/models          # List model runs (paginated)
GET    /api/v1/admin/models/active   # Get active model
```

---

## Creating an Admin User

### Option 1: Manual Database Update
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Option 2: Via Admin Panel
An existing admin can create new admin accounts through the Users tab.

### Option 3: Seed Script (Development)
```bash
make seed  # Creates demo admin: admin@diana.app / admin123
```

---

## Database Migration

Run the admin features migration:

```bash
# From project root
export DB_DSN="your-connection-string"
cd backend && goose -dir migrations postgres "$DB_DSN" up
```

This adds:
- `is_active`, `last_login_at`, `created_by` columns to `users`
- Indexes for `audit_events`, `model_runs`, and `users`

---

## Security Notes

| Feature | Implementation |
|---------|----------------|
| RBAC Middleware | All `/admin/*` routes check for admin role |
| Audit Logging | All admin actions logged to `audit_events` table |
| Self-Protection | Admins cannot deactivate their own account |
| Soft Delete | Deactivated users can be reactivated |
| Password Security | bcrypt hashing for all passwords |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Admin tab not visible | Verify user role is `admin` in database |
| 403 Forbidden | JWT token missing admin role claim |
| Users not loading | Check backend logs, verify DB connection |
| Audit logs empty | Perform admin actions to generate events |
