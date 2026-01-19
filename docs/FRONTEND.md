# Frontend Guide (React/Vite)

## Directory Structure

```
frontend/
├── src/
│   ├── App.jsx                   # Main app, routing, auth state
│   ├── api.js                    # API wrapper, token refresh logic
│   ├── main.jsx                  # React entry point
│   ├── index.css                 # Global Tailwind styles
│   ├── utils/
│   │   └── deviceCapabilities.js # Device performance detection
│   └── components/
│       ├── admin/                # Admin dashboard components
│       │   ├── AdminDashboard.jsx
│       │   ├── UserManagement.jsx
│       │   ├── AuditLogViewer.jsx
│       │   └── ModelTraceability.jsx
│       ├── auth/
│       │   └── Login.jsx         # Login forms
│       ├── common/               # Reusable UI components
│       │   ├── BiomarkerInput.jsx
│       │   ├── Button.jsx
│       │   ├── ClusterRecommendations.jsx
│       │   ├── ClusterTooltip.jsx
│       │   ├── CustomCursor.jsx
│       │   ├── ErrorBoundary.jsx
│       │   ├── ErrorFallback.jsx
│       │   ├── PDFExport.jsx
│       │   ├── RiskIndicator.jsx
│       │   └── SHAPExplanation.jsx
│       ├── dashboard/
│       │   └── Dashboard_user.jsx # User dashboard
│       ├── education/
│       │   └── Education.jsx     # Educational content
│       ├── export/
│       │   └── Export.jsx        # CSV download
│       ├── insights/             # ML visualizations
│       │   ├── Insights.jsx
│       │   └── CohortAnalysis.jsx
│       ├── layout/
│       │   ├── Sidebar.jsx       # Navigation sidebar
│       │   ├── BiologicalNetwork.jsx
│       │   └── MouseGlow.jsx
│       └── user/                 # User-focused components
│           ├── Dashboard_user.jsx  # User dashboard
│           ├── Onboarding.jsx      # User onboarding flow
│           ├── PersonalTrends.jsx  # Biomarker trends
│           └── UserProfile.jsx     # Profile & assessment
│
├── e2e/                          # Playwright E2E tests
│   ├── auth.spec.js
│   ├── assessment.spec.js
│   └── navigation.spec.js
├── index.html                    # HTML entry
├── vite.config.js                # Vite build config
├── tailwind.config.cjs           # Tailwind configuration
├── playwright.config.js          # Playwright configuration
└── package.json                  # Dependencies
```

---

## Key Files

### 1. `api.js` — API Layer

All API calls go through `apiFetch()` which handles:
- Token attachment
- 401 → automatic token refresh
- Error parsing

```javascript
// Core fetch wrapper
const apiFetch = async (path, options = {}, isRetry = false) => {
  const res = await fetch(`${API_BASE}${path}`, options);
  
  // Handle 401 - try to refresh token
  if (res.status === 401 && !isRetry) {
    await attemptTokenRefresh();
    return apiFetch(path, options, true);  // Retry
  }
  // ...
};

// Exported API functions
export const loginApi = (email, password) => apiFetch('/api/v1/auth/login', {...});
export const getUserProfileApi = (token) => apiFetch('/api/v1/users/me/profile', {...});
export const createAssessmentApi = (token, data) => apiFetch('/api/v1/users/me/assessments', {...});
export const getUserTrendsApi = (token) => apiFetch('/api/v1/users/me/trends', {...});
```

### 2. `App.jsx` — Main Component

```jsx
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userProfile, setUserProfile] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Lazy-loaded route components for code splitting
  const Dashboard_user = lazy(() => import('./components/user/Dashboard_user'));
  const UserProfile = lazy(() => import('./components/user/UserProfile'));
  const Onboarding = lazy(() => import('./components/user/Onboarding'));
  const PersonalTrends = lazy(() => import('./components/user/PersonalTrends'));
  const Insights = lazy(() => import('./components/insights/Insights'));
  const Education = lazy(() => import('./components/education/Education'));
  const Export = lazy(() => import('./components/export/Export'));
  const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
  // ...
}
```

---

## Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `App` | `src/App.jsx` | Root component, auth state, routing |
| `Login` | `components/auth/Login.jsx` | Authentication forms |
| `Dashboard_user` | `components/user/Dashboard_user.jsx` | User dashboard with risk overview |
| `UserProfile` | `components/user/UserProfile.jsx` | User profile & assessment entry |
| `Onboarding` | `components/user/Onboarding.jsx` | New user onboarding flow |
| `PersonalTrends` | `components/user/PersonalTrends.jsx` | Biomarker trend visualization |
| `Insights` | `components/insights/Insights.jsx` | ML visualizations, model metrics |
| `CohortAnalysis` | `components/insights/CohortAnalysis.jsx` | Cohort comparison analysis |
| `Export` | `components/export/Export.jsx` | CSV export functionality |
| `Education` | `components/education/Education.jsx` | Educational content |
| `AdminDashboard` | `components/admin/AdminDashboard.jsx` | Admin panel (users, audit, models) |
| `UserManagement` | `components/admin/UserManagement.jsx` | User CRUD operations |
| `AuditLogViewer` | `components/admin/AuditLogViewer.jsx` | Audit log viewing |
| `ModelTraceability` | `components/admin/ModelTraceability.jsx` | ML model tracking |
| `Sidebar` | `components/layout/Sidebar.jsx` | Navigation sidebar |
| `BiologicalNetwork` | `components/layout/BiologicalNetwork.jsx` | Animated background |
| `ErrorBoundary` | `components/common/ErrorBoundary.jsx` | Error handling wrapper |
| `BiomarkerInput` | `components/common/BiomarkerInput.jsx` | Biomarker input fields |
| `ClusterRecommendations` | `components/common/ClusterRecommendations.jsx` | Cluster-based recommendations |
| `RiskIndicator` | `components/common/RiskIndicator.jsx` | Risk level indicator |
| `PDFExport` | `components/common/PDFExport.jsx` | PDF report generation |
| `SHAPExplanation` | `components/common/SHAPExplanation.jsx` | SHAP feature explanations |
| `ClusterTooltip` | `components/common/ClusterTooltip.jsx` | Cluster info tooltips |

---

## State Management

- **No Redux/Context** — Simple React state + prop drilling
- **Token Storage:** `localStorage.getItem('diana_token')`
- **Refresh Token:** `localStorage.getItem('diana_refresh_token')`
- **User Profile:** Fetched on login, triggers onboarding if incomplete
- **Lazy Loading:** Code splitting with `React.lazy()` and `Suspense`
- **Performance Detection:** Device capability detection for animations

---

## ML Visualizations

The Analytics component fetches from ML server:

```javascript
const ML_BASE = import.meta.env.VITE_ML_BASE || 'http://localhost:5000';

// Fetch metrics
const metricsRes = await fetch(`${ML_BASE}/insights/metrics`);
const metrics = await metricsRes.json();

// Display clinical model accuracy
<p>Clinical Model AUC: {metrics.clinical.best_model.metrics.auc_roc}</p>

// Show visualizations
<img src={`${ML_BASE}/insights/visualizations/roc_curve`} />
```

---

## Role-Based Access

The app supports role-based UI:

| Role | Access |
|------|--------|
| `user` | Dashboard, Profile, Trends, Insights, Export, Education |
| `admin` | All user features + Admin Dashboard |

Role and admin status are extracted from JWT token on login:
```javascript
const payload = JSON.parse(atob(token.split('.')[1]));
setUserRole(payload.role || 'user');
setIsAdmin(payload.is_admin || false);
setUserId(payload.user_id || payload.sub);
```

---

## Performance Optimization

The app includes device capability detection:

```javascript
import { 
  getAnimationNodeCount, 
  shouldDisableHeavyEffects,
  getPerformanceTier 
} from './utils/deviceCapabilities';

// Reduce animations on low-end devices
const animationNodeCount = getAnimationNodeCount();
const disableHeavyEffects = shouldDisableHeavyEffects();
```

---

## Environment

```bash
# frontend/.env.local
VITE_API_BASE=http://localhost:8080   # Go backend
VITE_ML_BASE=http://localhost:5000    # Flask ML server
```

---

## Running

```bash
cd frontend
npm install
npm run dev      # Development (port 4000)
npm run build    # Production build
npm run preview  # Preview production build
```

## E2E Testing

```bash
cd frontend
npx playwright test              # Run all tests
npx playwright test auth.spec.js # Run specific test
npx playwright test --ui         # Open interactive UI
```
