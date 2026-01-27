# UI Flow Map & Interaction Inventory

## Milestone 1: Discovery & Flow Mapping

### 1. Top-Level Navigation (App.jsx)
- **Entry**: `main.jsx` -> `App.jsx`
- **Auth Gate**: Checks `localStorage` for `diana_token`.
- **Primary Switch**:
  - `!isAuthenticated` -> `Signup` or `Login`
  - `isAdmin` -> `AdminSidebar` + `AdminDashboard` (Sub-views: overview, users, audit, auth-events, models)
  - `!isAdmin` -> `Sidebar` + `renderUserContent()` (Tabs: dashboard, profile, trends, insights, education, export)
- **Onboarding Gate**: If `onboarding_completed` is false, forces `Onboarding` component.

### 2. Auth Flows
- **Login**: `Login.jsx` -> `handleLogin` (App.jsx) -> `loginApi` (`POST /auth/login`)
- **Signup**: `Signup.jsx` -> `handleSignupSuccess` (App.jsx) -> `signupApi` (`POST /auth/register`)
- **Logout**: `handleLogout` (App.jsx) -> `logoutMutation` (`POST /auth/logout`) -> Clear `localStorage`

### 3. User Flows
- **Dashboard**: `Dashboard_user.jsx`
  - "Log Assessment" -> `setActiveTab('profile')`
  - "View Trends" -> `setActiveTab('trends')`
  - "Export Health Report" -> `setActiveTab('export')`
- **Onboarding**: `Onboarding.jsx` (5-step wizard) -> `completeOnboardingApi` (`POST /users/me/onboarding`)
- **Profile**: `UserProfile.jsx` -> `updateUserProfileApi` (`PUT /users/me/profile`)
- **Trends**: `PersonalTrends.jsx` -> `useTrends(months)` (`GET /users/me/trends`)
- **Insights**: `Insights.jsx` -> ML endpoints (`/insights/*`)
- **Export**: `Export.jsx` -> `/api/v1/export/patients.csv`, `/api/v1/export/assessments.csv`, `/users/me/export/pdf`

### 4. Admin Flows
- **User Management**: `UserManagement.jsx` -> `/admin/users` (GET, POST, PUT, DELETE)
- **Audit Logs**: `AuditLogViewer.jsx` -> `/admin/audit` (GET)
- **Model Tracking**: `ModelTraceability.jsx` -> `/admin/models` (GET)

### 5. UI Interaction Inventory (Buttons/Actions)
- **Auth**: Sign In (submit), Sign Up (link), Toggle Password (icon).
- **Dashboard**: Log Assessment (card/button), View Trends (card), Export (card), Retery (error state).
- **Profile**: Save Changes (submit), Log Assessment (plus button), Delete Account (danger button).
- **Onboarding**: Next (button), Back (button), Complete Setup (submit).
- **Trends**: Time Range Filter (1M, 3M, 6M, 1Y, 2Y, 5Y, All).
- **Export**: Menopause Filter (radio), Risk Filter (radio), Download CSV (button), Generate PDF (button).
- **Admin**: Add User (button), Edit User (icon), Deactivate/Activate (icon), Expand Audit Details (row click), Pagination (chevron icons).
- **Education**: Expand/Collapse Cluster (card click), FAQ Accordion (expandable card).

### 6. E2E Journeys (Playwright)
- Auth: `auth.spec.js` (Login/Signup/Logout)
- Setup: `onboarding.spec.js`
- Core: `assessment-creation.spec.js`, `trends.spec.js`, `export.spec.js`
- Admin: `admin-users.spec.js`, `admin-audit.spec.js`
