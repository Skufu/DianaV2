# 🛡️ DIANA Admin Dashboard Implementation Plan

## 1. Context & Purpose
The DIANA Admin Dashboard is designed for system administrators to manage clinician accounts, monitor system-wide predictive analytics, track model versions, and audit system activity. It serves as the "Control Center" for the research platform.

## 2. Technical Architecture

### 2.1 Backend (Go/Gin)
- **Middleware**: Implement `RoleRequired("admin")` middleware using JWT claims.
- **Endpoints**:
  - `GET /api/admin/users`: Paginated list of all clinicians.
  - `POST /api/admin/users`: Create new accounts for research staff.
  - `GET /api/admin/audit`: Fetch system logs from `audit_events` table.
  - `GET /api/admin/stats`: Aggregated risk distribution across all users.
  - `GET /api/admin/models`: Retrieve history from `model_runs`.

### 2.2 Frontend (React/Tailwind)
- **Role-Based Routing**: Protect the `/admin` route.
- **Components**:
  - `AdminDashboard.jsx`: Main layout with sidebar integration.
  - `UserManagement.jsx`: CRUD operations for users.
  - `AuditLogViewer.jsx`: Filterable table for system transparency.
  - `SystemAnalytics.jsx`: Aggregated Recharts visualizations.

## 3. Data Schema Alignment
We will leverage existing tables defined in `0001_init.sql`:
- **`users`**: Already contains a `role` field.
- **`audit_events`**: Will be used to populate the log viewer.
- **`model_runs`**: Will track training history and dataset hashes.
- **`assessments`**: Will be aggregated for system-wide risk trends.

## 4. Design Guidelines (Aesthetic Alignment)
- **Theme**: Glassmorphism (dark mode, teal/cyan gradients).
- **Interactive**: Maintain the "Biological Network" animation in the background.
- **Performance**: Use pagination and lazy loading for large log/user tables.

## 5. Implementation Phases
1. **Phase 1**: RBAC Middleware & Admin User creation.
2. **Phase 2**: User Management UI & Backend CRUD.
3. **Phase 3**: System Analytics (Aggregated Cluster Distribution).
4. **Phase 4**: Audit Log Viewer & Model Traceability.
