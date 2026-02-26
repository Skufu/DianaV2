# FRONTEND SOURCE KNOWLEDGE BASE

**Directory**: `frontend/src`
**Generated:** 2026-01-28

## OVERVIEW
React 18 application entry point with custom routing, authentication state, and performance optimization.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Application root | `App.jsx` | Main component with routing, auth state, device detection |
| Application entry | `main.jsx` | React 18 entry point with StrictMode |
| API layer | `api.js` | Centralized API client for backend and ML |
| Legacy API | `api_old.js` | Previous version (deprecated) |

## APPLICATION STRUCTURE

### Entry Point (`main.jsx`)
```jsx
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### Root Component (`App.jsx`)

#### State Management
```jsx
// Authentication state
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [token, setToken] = useState(null);
const [refreshToken, setRefreshToken] = useState(null);
const [userRole, setUserRole] = useState(null);
const [isAdmin, setIsAdmin] = useState(false);
const [userId, setUserId] = useState(null);

// Navigation state
const [activeTab, setActiveTab] = useState('dashboard');
const [showOnboarding, setShowOnboarding] = useState(false);
const [showSignup, setShowSignup] = useState(false);

// Performance state (computed)
const performanceTier = useMemo(() => getPerformanceTier(), []);
const animationNodeCount = useMemo(() => getAnimationNodeCount(), []);
const disableHeavyEffects = useMemo(() => shouldDisableHeavyEffects(), []);
```

#### Routing (Custom Implementation)
No React Router - uses tab-based routing:

```jsx
const renderContent = () => {
  switch(activeTab) {
    case 'dashboard':
      return <Dashboard_user token={token} userId={userId} />;
    case 'profile':
      return <UserProfile token={token} userId={userId} />;
    case 'trends':
      return <PersonalTrends token={token} />;
    case 'insights':
      return <Insights token={token} />;
    case 'education':
      return <Education />;
    case 'export':
      return <Export token={token} />;
    case 'admin':
      return isAdmin ? <AdminDashboard ... /> : <Dashboard_user ... />;
    default:
      return <Dashboard_user ... />;
  }
};
```

#### Lazy Loading (Code Splitting)
```jsx
const Dashboard_user = lazy(() => import('./components/user/Dashboard_user'));
const UserProfile = lazy(() => import('./components/user/UserProfile'));
const Onboarding = lazy(() => import('./components/user/Onboarding'));
const PersonalTrends = lazy(() => import('./components/user/PersonalTrends'));
const Insights = lazy(() => import('./components/insights/Insights'));
const Education = lazy(() => import('./components/education/Education'));
const Export = lazy(() => import('./components/export/Export'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const Signup = lazy(() => import('./components/auth/Signup'));
```

## AUTHENTICATION FLOW

### Login Process
```jsx
1. User enters credentials in Login component
2. handleLogin(email, password) called
3. loginApi() called → POST /auth/login
4. Response received: {access_token, refresh_token, user: {...}}
5. JWT decoded → extract role, user_id
6. State updated:
   - setIsAuthenticated(true)
   - setToken(access_token)
   - setRefreshToken(refresh_token)
   - setUserRole(payload.role)
   - setIsAdmin(payload.role === 'admin')
   - setUserId(payload.user_id)
7. Tokens saved to localStorage:
   - localStorage.setItem('diana_token', access_token)
   - localStorage.setItem('diana_refresh_token', refresh_token)
```

### Logout Process
```jsx
1. handleLogout() called
2. logoutApi(refreshToken) called → POST /auth/logout
3. All state cleared:
   - setIsAuthenticated(false)
   - setToken(null)
   - setRefreshToken(null)
   - setUserRole(null)
   - setIsAdmin(false)
   - setUserId(null)
4. localStorage.removeItem('diana_token')
5. localStorage.removeItem('diana_refresh_token')
```

### Token Refresh
Implemented in `api.js` - automatically refreshes expired tokens.

### Onboarding Check
```jsx
useEffect(() => {
  const load = async () => {
    const profile = await getUserProfileApi(token);
    if (profile?.onboarding_completed === true) {
      setShowOnboarding(false);
    } else {
      setShowOnboarding(true);  // Show onboarding if incomplete
    }
  };
  load();
}, [token, userId]);
```

## PERFORMANCE OPTIMIZATION

### Device Detection
Uses `deviceCapabilities.js` for hardware-aware performance:

```jsx
const performanceTier = useMemo(() => getPerformanceTier(), []);
// Returns: 'HIGH', 'MEDIUM', 'LOW'

const animationNodeCount = useMemo(() => getAnimationNodeCount(), []);
// Returns: 40 (HIGH), 20 (MEDIUM), 0 (LOW)

const disableHeavyEffects = useMemo(() => shouldDisableHeavyEffects(), []);
// Returns: true for LOW tier
```

### Global CSS Classes
```jsx
useEffect(() => {
  if (disableHeavyEffects) {
    document.body.classList.add('low-perf');  // Disables animations
  }
  if (performanceTier !== 'HIGH') {
    document.body.classList.add('reduced-motion');  // Reduces motion
  }
  return () => {
    document.body.classList.remove('low-perf', 'reduced-motion');
  };
}, [disableHeavyEffects, performanceTier]);
```

### Conditional Rendering
```jsx
// BiologicalNetwork only rendered on HIGH tier
{animationNodeCount > 0 && (
  <BiologicalNetwork nodeCount={animationNodeCount} ... />
)}

// Layout adjusted based on active tab
<main className={`relative z-10 flex-1 ${isAssessmentOpen ? '' : 'ml-20 lg:ml-72'}`}>
```

## CODE MAP

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| Dashboard_user | lazy component | App.jsx | - | User dashboard |
| UserProfile | lazy component | App.jsx | - | User profile |
| Onboarding | lazy component | App.jsx | - | Onboarding flow |
| PersonalTrends | lazy component | App.jsx | - | Trend charts |
| Insights | lazy component | App.jsx | - | ML insights |
| Education | lazy component | App.jsx | - | Health education |
| Export | lazy component | App.jsx | - | PDF export |
| AdminDashboard | lazy component | App.jsx | - | Admin dashboard |
| Signup | lazy component | App.jsx | - | User registration |
| LoadingSkeleton | component | App.jsx | - | Loading placeholder |
| App | component | App.jsx | main.jsx | Root component |
| loginApi | func | api.js | App.jsx | Login API call |
| getUserProfileApi | func | api.js | App.jsx | Get profile API |
| logoutApi | func | api.js | App.jsx | Logout API call |
| getPerformanceTier | func | deviceCapabilities.js | App.jsx | Detect hardware |
| getAnimationNodeCount | func | deviceCapabilities.js | App.jsx | Animation count |
| shouldDisableHeavyEffects | func | deviceCapabilities.js | App.jsx | Disable effects |
| PERF_TIER | const | deviceCapabilities.js | App.jsx | Performance tiers |
| BiologicalNetwork | component | layout/ | App.jsx | Animated background |
| Sidebar | component | layout/ | App.jsx | Navigation sidebar |
| ErrorBoundary | component | common/ | App.jsx | Error wrapper |
| CustomCursor | component | common/ | App.jsx | Custom cursor |

## API LAYER (`api.js`)

### Configuration
```javascript
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';
const ML_BASE = import.meta.env.VITE_ML_BASE || `http://localhost:${import.meta.env.VITE_ML_PORT || '5001'}`;
```

### API Client
```javascript
const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('diana_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
};
```

### ML Client
```javascript
const mlFetch = async (path) => {
  const response = await fetch(`${ML_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`ML API error: ${response.status}`);
  }
  return response.json();
};
```

## ANTI-PATTERNS (THIS PROJECT)

### Critical Issues
- **Missing backend endpoint**: `Signup.jsx` exists but backend has no `/auth/register` route
- **Admin stats path**: Frontend calls `/admin/stats` but backend route is `/admin/dashboard`
- **Research export**: Frontend has function but backend endpoint commented out

### Technical Debt
- **No React Router**: Custom tab-based routing instead of standard library
- **Manual JWT decoding**: JWT parsing done manually with `atob`/`JSON.parse`
- **No token refresh**: Tokens have expiry but no automatic refresh on 401
- **No error boundary**: Global error handling minimal (only ErrorBoundary around content)
- **Silent errors**: Some API calls have no error handling (logout)
- **No loading states**: No global loading state management
- **No retry logic**: Failed API calls not retried
- **No request caching**: Every API call is fresh fetch

### Anti-Patterns to Avoid
- **Prop drilling**: Pass state via props instead of Context API
- **Direct localStorage access**: Components should get token from props/context
- **Manual authentication checks**: Each component checks `if (!token)`

## NOTES

### Component Organization
```
frontend/src/
├── components/           # Domain-organized components
│   ├── auth/            # Login, Signup
│   ├── user/            # Dashboard, Profile, Trends, Onboarding
│   ├── insights/         # ML analytics
│   ├── admin/            # Admin dashboard, user management
│   ├── education/        # Health education content
│   ├── export/           # PDF export
│   ├── common/           # Reusable components
│   └── layout/           # Sidebar, header, background
├── api.js               # API client (backend + ML)
├── utils/
│   └── deviceCapabilities.js  # Hardware detection
└── index.css             # Global styles
```

### Tab Navigation
- **Tabs**: `dashboard`, `profile`, `trends`, `insights`, `education`, `export`, `admin`
- **Switch**: Active tab determines which component renders
- **Sidebar**: Updates activeTab state
- **URL**: No URL routing - tab state is source of truth

### Performance Tiers
- **HIGH**: 8+ cores, 8GB+ RAM → Full animations, 40 network nodes
- **MEDIUM**: 4-7 cores, 4-7GB RAM → Reduced animations, 20 network nodes
- **LOW**: <4 cores, <4GB RAM → No animations, 0 network nodes

### CSS Classes Applied
- **low-perf**: Disables all animations
- **reduced-motion**: Reduces animation duration/complexity

### Security Notes
- **Token storage**: `localStorage` (not HttpOnly cookies)
- **XSS risk**: JWT in localStorage is vulnerable to XSS attacks
- **CSRF risk**: No CSRF token mechanism

## TODO

- [ ] Implement React Router (replace tab-based routing)
- [ ] Add Context API for auth state management
- [ ] Use HttpOnly cookies for token storage
- [ ] Implement automatic token refresh on 401
- [ ] Add global loading state management
- [ ] Add request retry logic with exponential backoff
- [ ] Add request caching (React Query, SWR, or Zustand Query)
- [ ] Add request cancelation on component unmount
- [ ] Add error toast/notification system
- [ ] Add 404 page
- [ ] Add loading skeleton screens
- [ ] Add transition animations between tabs
- [ ] Add accessibility improvements (ARIA labels, keyboard nav)
