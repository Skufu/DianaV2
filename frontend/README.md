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
│       │   ├── PersonalTrends.jsx # Assessment trend charts
│       │   └── AssessmentForm.jsx # Biomarker input form
│       ├── admin/
│       │   ├── AdminDashboard.jsx  # Admin system stats
│       │   ├── UserManagement.jsx  # User CRUD operations
│       │   ├── AuditLogViewer.jsx  # Audit log viewing
│       │   ├── AuthEventLogViewer.jsx # Auth event streaming
│       │   └── ModelTraceability.jsx # ML model tracking
│       ├── insights/
│       │   ├── Insights.jsx     # Main insights container
│       │   ├── InsightsHeader.jsx # Insights navigation
│       │   ├── InsightsSummary.jsx # Overview cards
│       │   ├── BiomarkerTrends.jsx # Trend charts
│       │   ├── BMIGlucoseCorrelation.jsx # Correlation analysis
│       │   ├── ClusterComparison.jsx # Cluster comparison
│       │   ├── CohortAnalysis.jsx # Cohort comparison analysis
│       │   ├── ModelPerformance.jsx # ML metrics
│       │   ├── RiskDistribution.jsx # Risk visualization
│       │   ├── RiskFactorChart.jsx # Feature importance
│       │   ├── SubgroupDistribution.jsx # Cluster distribution
│       │   ├── VisualizationCard.jsx # Card component
│       │   └── index.jsx # Export file
│       ├── auth/
│       │   ├── Login.jsx         # Login/register forms
│       │   └── Signup.jsx        # Registration form
│       ├── common/
│       │   ├── BiomarkerInput.jsx # Biomarker input component
│       │   ├── Button.jsx         # Button component
│       │   ├── ClusterRecommendations.jsx # Recommendations display
│       │   ├── ClusterTooltip.jsx # Tooltip component
│       │   ├── RiskIndicator.jsx  # Risk status display
│       │   ├── SHAPExplanation.jsx # Feature contributions
│       │   ├── PDFExport.jsx      # PDF export button
│       │   ├── ErrorBoundary.jsx  # Error handling
│       │   ├── ErrorFallback.jsx  # Error fallback UI
│       │   ├── MockMLResultModal.jsx # Mock ML results
│       │   ├── Skeleton.jsx       # Loading skeleton
│       │   └── Toast.jsx          # Notification toast
│       ├── layout/
│       │   ├── Sidebar.jsx       # Main navigation sidebar
│       │   ├── AdminSidebar.jsx  # Admin navigation sidebar
│       │   ├── BiologicalNetwork.jsx # Animated background
│       │   ├── MouseGlow.jsx     # Visual effect
│       │   └── AdminLayout.jsx   # Admin layout wrapper
│       ├── export/
│       │   └── Export.jsx        # PDF export functionality
│       ├── education/
│       │   └── Education.jsx     # Educational content
│       ├── backup/
│       │   ├── clinic/
│       │   │   └── ClinicDashboard.jsx # Legacy clinic dashboard
│       │   ├── dashboard/
│       │   │   └── Dashboard.jsx # Legacy dashboard
│       │   └── patients/
│       │       ├── PatientHistory.jsx # Legacy patient history
│       │       └── RiskTrendChart.jsx # Legacy risk trends
│
├── e2e/                          # Playwright E2E tests
│   ├── auth.spec.js             # Authentication tests
│   └── user-flows.spec.js       # User journey tests
├── index.html                    # HTML entry
├── vite.config.js                # Vite build config
├── tailwind.config.cjs           # Tailwind configuration
├── postcss.config.cjs            # PostCSS config
└── package.json                  # Dependencies
```

---

## Legacy Artifacts

The following directories contain legacy components from the previous B2B (clinician-managed) architecture:

| Directory | Status | Description |
|-----------|--------|-------------|
| `components/backup/` | **Deprecated** | Legacy B2B clinician-facing components superseded by user-facing components in B2C architecture |

**Note**: These directories are candidates for removal. Do not import or reference these components in new code. All active development should use components in `user/`, `admin/`, `auth/`, `insights/`, `export/`, `education/`, `common/`, and `layout/` directories.

---

## Component Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| `App` | `src/App.jsx` | Root component, auth state, routing |
| `Login` | `components/auth/Login.jsx` | Authentication forms |
| `Signup` | `components/auth/Signup.jsx` | Registration form |
| `Onboarding` | `components/user/Onboarding.jsx` | Multi-step user profile setup |
| `AssessmentForm` | `components/user/AssessmentForm.jsx` | Biomarker input form |
| `Dashboard_user` (user) | `components/user/Dashboard_user.jsx` | User overview, assessments |
| `UserProfile` | `components/user/UserProfile.jsx` | Profile management |
| `PersonalTrends` | `components/user/PersonalTrends.jsx` | Assessment trend charts |
| `Insights` | `components/insights/Insights.jsx` | ML visualizations, model metrics |
| `InsightsHeader` | `components/insights/InsightsHeader.jsx` | Insights navigation |
| `InsightsSummary` | `components/insights/InsightsSummary.jsx` | Overview cards |
| `BiomarkerTrends` | `components/insights/BiomarkerTrends.jsx` | Trend charts |
| `BMIGlucoseCorrelation` | `components/insights/BMIGlucoseCorrelation.jsx` | Correlation analysis |
| `ClusterComparison` | `components/insights/ClusterComparison.jsx` | Cluster comparison |
| `CohortAnalysis` | `components/insights/CohortAnalysis.jsx` | Cohort comparison analysis |
| `ModelPerformance` | `components/insights/ModelPerformance.jsx` | ML metrics |
| `RiskDistribution` | `components/insights/RiskDistribution.jsx` | Risk visualization |
| `RiskFactorChart` | `components/insights/RiskFactorChart.jsx` | Feature importance |
| `SubgroupDistribution` | `components/insights/SubgroupDistribution.jsx` | Cluster distribution |
| `VisualizationCard` | `components/insights/VisualizationCard.jsx` | Card component |
| `Export` | `components/export/Export.jsx` | CSV export functionality |
| `Education` | `components/education/Education.jsx` | Educational content |
| `AdminDashboard` | `components/admin/AdminDashboard.jsx` | Admin system stats |
| `UserManagement` | `components/admin/UserManagement.jsx` | User CRUD operations |
| `AuditLogViewer` | `components/admin/AuditLogViewer.jsx` | Audit log viewing |
| `AuthEventLogViewer` | `components/admin/AuthEventLogViewer.jsx` | Auth event streaming |
| `ModelTraceability` | `components/admin/ModelTraceability.jsx` | ML model tracking |
| `AdminSidebar` | `components/layout/AdminSidebar.jsx` | Admin navigation |
| `Sidebar` | `components/layout/Sidebar.jsx` | Main navigation sidebar |
| `BiologicalNetwork` | `components/layout/BiologicalNetwork.jsx` | Animated background |
| `MouseGlow` | `components/layout/MouseGlow.jsx` | Visual effect |
| `BiomarkerInput` | `components/common/BiomarkerInput.jsx` | Biomarker input component |
| `Button` | `components/common/Button.jsx` | Button component |
| `ClusterRecommendations` | `components/common/ClusterRecommendations.jsx` | Recommendations display |
| `ClusterTooltip` | `components/common/ClusterTooltip.jsx` | Tooltip component |
| `RiskIndicator` | `components/common/RiskIndicator.jsx` | Risk status display |
| `SHAPExplanation` | `components/common/SHAPExplanation.jsx` | Feature contributions |
| `PDFExport` | `components/common/PDFExport.jsx` | PDF export button |
| `ErrorBoundary` | `components/common/ErrorBoundary.jsx` | Error handling |
| `MockMLResultModal` | `components/common/MockMLResultModal.jsx` | Mock ML results |
| `Skeleton` | `components/common/Skeleton.jsx` | Loading skeleton |
| `Toast` | `components/common/Toast.jsx` | Notification toast |

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
VITE_API_BASE=http://localhost:8080/api/v1   # Go backend URL
VITE_ML_BASE=http://localhost:5001    # Flask ML server URL
VITE_ML_PORT=5001                     # ML Server Port
VITE_ML_API_KEY=your-secure-ml-api-key # ML API Key
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
