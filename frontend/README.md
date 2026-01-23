# Frontend - React/Vite Client Application

> **Purpose**: Web client for DIANA diabetes risk assessment application  
> **Framework**: React 18 + Vite | **Styling**: Tailwind CSS  
> **Port**: 4000 (dev)

---

## Quick Search Index

| Topic | File Location |
|-------|---------------|
| App Entry | `src/App.jsx` |
| API Layer | `src/api.js` |
| User Dashboard | `src/components/user/Dashboard_user.jsx` |
| Admin Dashboard | `src/components/admin/AdminDashboard.jsx` |
| Profile | `src/components/user/UserProfile.jsx` |
| Onboarding | `src/components/user/Onboarding.jsx` |
| Insights | `src/components/insights/Insights.jsx` |
| Export | `src/components/export/Export.jsx` |
| Auth (Login) | `src/components/auth/Login.jsx` |
| Styles | `src/index.css` |

---

## Directory Structure

```
frontend/
├── src/
│   ├── App.jsx                   # Main app, routing, auth state
│   ├── api.js                    # API wrapper, token refresh logic
│   ├── main.jsx                  # React entry point
│   ├── index.css                 # Global Tailwind styles
│   └── components/
│       ├── user/
│       │   ├── Dashboard_user.jsx  # User overview, assessments
│       │   ├── UserProfile.jsx    # Profile management
│       │   ├── Onboarding.jsx    # Multi-step user setup
│       │   └── PersonalTrends.jsx # Assessment trend charts
│       ├── admin/
│       │   ├── AdminDashboard.jsx  # Admin system stats
│       │   ├── UserManagement.jsx  # User CRUD operations
│       │   ├── AuditLogViewer.jsx  # Audit log viewing
│       │   └── ModelTraceability.jsx # ML model tracking
│       ├── insights/
│       │   └── Insights.jsx     # ML metrics, visualizations
│       ├── auth/
│       │   └── Login.jsx         # Login/register forms
│       ├── common/
│       │   └── *.jsx             # Reusable UI components
│       ├── layout/
│       │   └── *.jsx             # Navigation, sidebar
│       └── export/
│           └── Export.jsx        # PDF export functionality
│
├── index.html                    # HTML entry
├── vite.config.js                # Vite build config
├── tailwind.config.cjs           # Tailwind configuration
├── postcss.config.cjs            # PostCSS config
└── package.json                  # Dependencies
```

---

## Component Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| `App` | `src/App.jsx` | Root component, auth state, routing |
| `Login` | `components/auth/Login.jsx` | Authentication forms |
| `Signup` | `components/auth/Signup.jsx` | Registration form |
| `Onboarding` | `components/user/Onboarding.jsx` | Multi-step user profile setup |
| `Dashboard_user` | `components/user/Dashboard_user.jsx` | User overview, assessments |
| `UserProfile` | `components/user/UserProfile.jsx` | Profile management |
| `PersonalTrends` | `components/user/PersonalTrends.jsx` | Assessment trend charts |
| `Insights` | `components/insights/Insights.jsx` | ML visualizations, model metrics |
| `Export` | `components/export/Export.jsx` | CSV export functionality |

---

## API Layer (`src/api.js`)

### Core Functions
| Function | Purpose | Endpoint Called |
|----------|---------|-----------------|
| `loginApi(email, password)` | User login | `POST /api/v1/auth/login` |
| `logoutApi(refreshToken)` | User logout | `POST /api/v1/auth/logout` |
| `registerApi(data)` | Create account | `POST /api/v1/auth/register` |
| `getUserProfileApi()` | Get current user | `GET /api/v1/users/me/profile` |
| `updateUserProfileApi(data)` | Update profile | `PUT /api/v1/users/me/profile` |
| `completeOnboardingApi(data)` | Complete onboarding | `POST /api/v1/users/me/onboarding` |
| `getConsentSettingsApi()` | Get consent flags | `GET /api/v1/users/me/consent` |
| `updateConsentSettingsApi(data)` | Update consent | `PUT /api/v1/users/me/consent` |
| `getTrendsApi(months)` | Get assessment trends | `GET /api/v1/users/me/trends` |
| `deleteAccountApi()` | Delete account | `DELETE /api/v1/users/me/account` |
| `getAssessmentsApi()` | Get user assessments | `GET /api/v1/users/me/assessments` |
| `createAssessmentApi(data)` | New assessment | `POST /api/v1/users/me/assessments` |
| `updateAssessmentApi(id, data)` | Update assessment | `PUT /api/v1/users/me/assessments/:id` |
| `deleteAssessmentApi(id)` | Delete assessment | `DELETE /api/v1/users/me/assessments/:id` |
| `fetchMLHealthApi()` | Check ML server | `GET /health` |
| `fetchMLMetricsApi()` | Model performance | `GET /insights/metrics` |
| `fetchMLInformationGainApi()` | Feature ranking | `GET /insights/information-gain` |
| `fetchMLClustersApi()` | Cluster data | `GET /insights/clusters` |
| `getMLVisualizationUrl(name)` | Visualization image URL | `/insights/visualizations/` |

### Token Management
- `apiFetch(path, options, isRetry)` - Core fetch wrapper with 401 handling
- `attemptTokenRefresh()` - Refresh expired access tokens
- Token stored in `localStorage.getItem('diana_token')`

---

## State Management

**Approach**: Simple React state + prop drilling (no Redux)

| State | Location | Purpose |
|-------|----------|---------|
| `token` | `App.jsx` | JWT access token |
| `refreshToken` | `App.jsx` | JWT refresh token |
| `isAuthenticated` | `App.jsx` | Login status |
| `userRole` | `App.jsx` | User role (admin/user) |
| `userId` | `App.jsx` | Current user ID |
| `userProfile` | `App.jsx` | Cached user profile data |
| `activeTab` | `App.jsx` | Current navigation tab |
| `showOnboarding` | `App.jsx` | Show onboarding flow |

---

## ML Integration

The Analytics component fetches directly from ML server:

```javascript
const ML_BASE = import.meta.env.VITE_ML_BASE || 'http://localhost:5000';

// Endpoints called:
// GET /analytics/metrics        → Model performance
// GET /analytics/clusters       → Cluster distribution
// GET /analytics/visualizations/roc_curve → Images
```

---

## Environment Variables

Create `frontend/.env.local`:

```bash
VITE_API_BASE=http://localhost:8080   # Go backend URL
VITE_ML_BASE=http://localhost:5000    # Flask ML server URL
```

---

## Running

```bash
cd frontend
npm install           # Install dependencies
npm run dev           # Development server (port 4000)
npm run build         # Production build → dist/
npm run preview       # Preview production build
```

---

## Search Keywords

`React` `Vite` `Tailwind` `components` `authentication` `login` `register` `signup` `token` `JWT` `users` `user profile` `onboarding` `consent` `assessments` `dashboard` `trends` `insights` `export` `CSV` `API` `fetch` `state management` `ML visualizations` `charts`
