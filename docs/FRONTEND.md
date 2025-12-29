# Frontend Guide (React/Vite)

## Directory Structure

```
frontend/
├── src/
│   ├── App.jsx           # Main app, routing, auth state
│   ├── api.js            # API wrapper functions
│   ├── main.jsx          # React entry point
│   ├── index.css         # Global styles
│   └── components/
│       ├── auth/         # Login, Register
│       ├── dashboard/    # Dashboard widgets
│       ├── patients/     # Patient list, details
│       ├── analytics/    # ML visualizations
│       └── export/       # CSV export
├── index.html
├── vite.config.js
└── package.json
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

  // Auth state
  const handleLogin = async (email, password) => {
    const data = await loginApi(email, password);
    localStorage.setItem('diana_token', data.access_token);
    setToken(data.access_token);
  };

  // Render based on tab
  return (
    <div className="app">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'patients' && <PatientList />}
      {activeTab === 'analytics' && <Analytics />}
    </div>
  );
}
```

---

## Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Dashboard` | `components/dashboard/` | Overview stats, charts |
| `PatientList` | `components/patients/` | CRUD patients |
| `PatientHistory` | `components/patients/` | Assessment history |
| `Analytics` | `components/analytics/` | ML visualizations |
| `Export` | `components/export/` | CSV download |

---

## State Management

- **No Redux/Context** — Simple prop drilling for small app
- **Token Storage:** `localStorage.getItem('diana_token')`
- **Refresh Logic:** `attemptTokenRefresh()` in `api.js`

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
```
