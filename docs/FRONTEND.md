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
│       ├── analytics/            # ML visualizations
│       │   ├── Analytics.jsx
│       │   └── CohortAnalysis.jsx
│       ├── auth/
│       │   └── Login.jsx         # Login forms
│       ├── clinic/
│       │   └── ClinicDashboard.jsx
│       ├── common/               # Reusable UI components
│       │   ├── Button.jsx
│       │   ├── ClusterTooltip.jsx
│       │   ├── CustomCursor.jsx
│       │   ├── ErrorBoundary.jsx
│       │   ├── ErrorFallback.jsx
│       │   └── SHAPExplanation.jsx
│       ├── dashboard/
│       │   └── Dashboard.jsx     # Overview stats, charts
│       ├── education/
│       │   └── Education.jsx     # Educational content
│       ├── export/
│       │   └── Export.jsx        # CSV download
│       ├── layout/
│       │   ├── Sidebar.jsx       # Navigation sidebar
│       │   ├── BiologicalNetwork.jsx
│       │   └── MouseGlow.jsx
│       └── patients/
│           ├── PatientHistory.jsx  # Patient list & assessment history
│           └── RiskTrendChart.jsx
│
├── e2e/                          # Playwright E2E tests
│   ├── auth.spec.js
│   ├── assessment.spec.js
│   └── analytics.spec.js
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
export const fetchPatientsApi = (token) => apiFetch('/api/v1/patients', {...});
export const createAssessmentApi = (token, patientId, data) => apiFetch(...);
```

### 2. `App.jsx` — Main Component

```jsx
function App() {
  const [token, setToken] = useState(localStorage.getItem('diana_token'));
  const [patients, setPatients] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState(null);

  // Lazy-loaded route components for code splitting
  const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
  const PatientHistory = lazy(() => import('./components/patients/PatientHistory'));
  const Analytics = lazy(() => import('./components/analytics/Analytics'));
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
| `Dashboard` | `components/dashboard/Dashboard.jsx` | Summary stats, overview charts |
| `PatientHistory` | `components/patients/PatientHistory.jsx` | Patient list & assessment history |
| `RiskTrendChart` | `components/patients/RiskTrendChart.jsx` | Risk trend visualization |
| `Analytics` | `components/analytics/Analytics.jsx` | ML visualizations, model metrics |
| `CohortAnalysis` | `components/analytics/CohortAnalysis.jsx` | Cohort comparison analysis |
| `Export` | `components/export/Export.jsx` | CSV export functionality |
| `Education` | `components/education/Education.jsx` | Educational content for clinicians |
| `AdminDashboard` | `components/admin/AdminDashboard.jsx` | Admin panel (users, audit, models) |
| `UserManagement` | `components/admin/UserManagement.jsx` | User CRUD operations |
| `AuditLogViewer` | `components/admin/AuditLogViewer.jsx` | Audit log viewing |
| `ModelTraceability` | `components/admin/ModelTraceability.jsx` | ML model tracking |
| `ClinicDashboard` | `components/clinic/ClinicDashboard.jsx` | Clinic-specific dashboard |
| `Sidebar` | `components/layout/Sidebar.jsx` | Navigation sidebar |
| `BiologicalNetwork` | `components/layout/BiologicalNetwork.jsx` | Animated background |
| `ErrorBoundary` | `components/common/ErrorBoundary.jsx` | Error handling wrapper |
| `SHAPExplanation` | `components/common/SHAPExplanation.jsx` | SHAP feature explanations |
| `ClusterTooltip` | `components/common/ClusterTooltip.jsx` | Cluster info tooltips |

---

## State Management

- **No Redux/Context** — Simple React state + prop drilling
- **Token Storage:** `localStorage.getItem('diana_token')`
- **Refresh Token:** `localStorage.getItem('diana_refresh_token')`
- **Lazy Loading:** Code splitting with `React.lazy()` and `Suspense`
- **Performance Detection:** Device capability detection for animations

---

## ML Visualizations

The Analytics component fetches from ML server:

```javascript
const ML_BASE = import.meta.env.VITE_ML_BASE || 'http://localhost:5000';

// Fetch metrics
const metricsRes = await fetch(`${ML_BASE}/analytics/metrics`);
const metrics = await metricsRes.json();

// Display clinical model accuracy
<p>Clinical Model AUC: {metrics.clinical.best_model.metrics.auc_roc}</p>

// Show visualizations
<img src={`${ML_BASE}/analytics/visualizations/roc_curve`} />
```

---

## Role-Based Access

The app supports role-based UI:

| Role | Access |
|------|--------|
| `clinician` | Dashboard, Patients, Analytics, Export, Education |
| `admin` | All clinician features + Admin Dashboard |

Role is extracted from JWT token on login:
```javascript
const payload = JSON.parse(atob(token.split('.')[1]));
setUserRole(payload.role || 'clinician');
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
npm run dev      # Development (port 5173)
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
