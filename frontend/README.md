# Frontend - React/Vite Client Application

> **Purpose**: Web client for DIANA diabetes risk assessment application  
> **Framework**: React 18 + Vite | **Styling**: Tailwind CSS  
> **Port**: 5173 (dev)

---

## Quick Search Index

| Topic | File Location |
|-------|---------------|
| App Entry | `src/App.jsx` |
| API Layer | `src/api.js` |
| Dashboard | `src/components/dashboard/Dashboard.jsx` |
| Patient List | `src/components/patients/PatientList.jsx` |
| Analytics | `src/components/analytics/Analytics.jsx` |
| Auth (Login) | `src/components/auth/Login.jsx` |
| Export | `src/components/export/Export.jsx` |
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
│       ├── analytics/
│       │   └── Analytics.jsx     # ML metrics, visualizations
│       ├── auth/
│       │   └── Login.jsx         # Login/register forms
│       ├── common/
│       │   └── *.jsx             # Reusable UI components
│       ├── dashboard/
│       │   └── Dashboard.jsx     # Overview stats, charts
│       ├── export/
│       │   └── Export.jsx        # CSV download functionality
│       ├── layout/
│       │   └── *.jsx             # Navigation, sidebar
│       └── patients/
│           └── PatientList.jsx   # Patient CRUD, assessment history
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
| `Dashboard` | `components/dashboard/Dashboard.jsx` | Summary stats, overview charts |
| `PatientList` | `components/patients/PatientList.jsx` | Patient CRUD operations |
| `Analytics` | `components/analytics/Analytics.jsx` | ML visualizations, model metrics |
| `Export` | `components/export/Export.jsx` | CSV export functionality |

---

## API Layer (`src/api.js`)

### Core Functions
| Function | Purpose | Endpoint Called |
|----------|---------|-----------------|
| `loginApi(email, password)` | User login | `POST /api/v1/auth/login` |
| `registerApi(data)` | Create account | `POST /api/v1/auth/register` |
| `fetchPatientsApi(token)` | List patients | `GET /api/v1/patients` |
| `createPatientApi(token, data)` | Add patient | `POST /api/v1/patients` |
| `fetchAssessmentsApi(token, patientId)` | Get history | `GET /api/v1/patients/:id/assessments` |
| `createAssessmentApi(token, patientId, data)` | New assessment | `POST /api/v1/patients/:id/assessments` |
| `fetchAnalyticsApi(token)` | Dashboard stats | `GET /api/v1/analytics/summary` |

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
| `patients` | `App.jsx` | Patient list cache |
| `activeTab` | `App.jsx` | Current navigation tab |
| `selectedPatient` | `PatientList.jsx` | Currently selected patient |

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
npm run dev           # Development server (port 5173)
npm run build         # Production build → dist/
npm run preview       # Preview production build
```

---

## Search Keywords

`React` `Vite` `Tailwind` `components` `authentication` `login` `register` `token` `JWT` `patients` `assessments` `dashboard` `analytics` `export` `CSV` `API` `fetch` `state management` `ML visualizations` `charts`
