# FRONTEND SOURCE KNOWLEDGE BASE

**Directory**: `frontend/src`
**Generated:** 2026-01-28
**Updated:** 2026-05-17

## OVERVIEW
React 18 application entry point with custom tab routing, auth orchestration through `api.js` hooks, and Framer Motion transitions.

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
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [userRole, setUserRole] = useState(null);
const [isAdmin, setIsAdmin] = useState(false);
const [userId, setUserId] = useState(null);
const [activeTab, setActiveTab] = useState('dashboard');
const [adminView, setAdminView] = useState('overview');
const [authView, setAuthView] = useState('login');
const [showAssessmentModal, setShowAssessmentModal] = useState(false);

const { data: profile } = useUserProfile(isAuthenticated);
const { data: assessments } = useAssessments(isAuthenticated);
const loginMutation = useLogin();
const logoutMutation = useLogout();
```

#### Routing (Custom Implementation)
No React Router - uses tab-based routing:

```jsx
const renderContent = () => {
  switch(activeTab) {
	case 'dashboard':
	    return <Dashboard_user userId={userId} />;
	case 'profile':
	    return <UserProfile userId={userId} ... />;
	case 'trends':
	    return <PersonalTrends userId={userId} ... />;
	case 'education':
	    return <Education />;
	case 'export':
	    return <Export />;
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
3. `useLogin()` mutation calls POST /auth/login
4. Response received: {access_token, refresh_token, user: {...}}
5. Tokens stored with `setAuthTokens(access_token, refresh_token)`
6. State updated:
   - setIsAuthenticated(true)
   - setUserRole(res.user.role)
   - setIsAdmin(role === 'admin' || role === 'doctor')
   - setUserId(res.user.id)
7. Tokens are saved by api.js:
   - localStorage.setItem('diana_access_token', access_token)
   - localStorage.setItem('diana_refresh_token', refresh_token)
```

### Logout Process
```jsx
1. handleLogout() called
2. clearAuthTokens() clears local auth state and storage
3. React Query user/assessment caches are cancelled and cleared
4. App auth state is cleared:
   - setIsAuthenticated(false)
   - setUserRole(null)
   - setIsAdmin(false)
   - setUserId(null)
5. `useLogout()` mutation attempts POST /auth/logout
```

### Token Refresh
Implemented in `api.js` - automatically refreshes expired tokens.

### Onboarding Check
```jsx
useEffect(() => {
  if (!isAuthenticated) return;
  if (profile && !profileLoading && !profileError) {
    const hasAssessments = assessments && assessments.length > 0;
    setShowOnboarding(!(profile?.onboarding_completed === true || hasAssessments));
  }
}, [profile, profileLoading, profileError, isAuthenticated, assessments, queryClient]);
```

## PERFORMANCE OPTIMIZATION

### Device Detection
Uses `deviceCapabilities.js` indirectly through `utils/animations.js` and `components/layout/BiologicalNetwork.jsx`:

```jsx
const performanceTier = getPerformanceTier();
// Returns: 'HIGH', 'MEDIUM', 'LOW'

const animationNodeCount = getAnimationNodeCount();
// Returns: 40 (HIGH), 20 (MEDIUM), 0 (LOW)

const disableHeavyEffects = shouldDisableHeavyEffects();
// Returns: true for LOW tier
```

### Conditional Rendering
```jsx
// BiologicalNetwork self-disables heavy canvas work on LOW tier
const shouldDisableEffects = shouldDisableHeavyEffects();

// Page transitions use Framer Motion
<AnimatePresence mode="wait">
```

## CODE MAP

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| Dashboard_user | lazy component | App.jsx | - | User dashboard |
| UserProfile | lazy component | App.jsx | - | User profile |
| Onboarding | lazy component | App.jsx | - | Onboarding flow |
| PersonalTrends | lazy component | App.jsx | - | Trend charts |
| Education | lazy component | App.jsx | - | Health education |
| Export | lazy component | App.jsx | - | PDF export |
| AdminDashboard | lazy component | App.jsx | - | Admin dashboard |
| Signup | lazy component | App.jsx | - | User registration |
| LoadingSkeleton | component | App.jsx | - | Loading placeholder |
| App | component | App.jsx | main.jsx | Root component |
| useLogin | hook | api.js | App.jsx | Login mutation |
| useUserProfile | hook | api.js | App.jsx | Profile query |
| useLogout | hook | api.js | App.jsx | Logout mutation |
| useAssessments | hook | api.js | App.jsx | Assessment query |
| getPerformanceTier | func | deviceCapabilities.js | utils/animations, BiologicalNetwork | Detect hardware |
| getAnimationNodeCount | func | deviceCapabilities.js | BiologicalNetwork | Animation count |
| shouldDisableHeavyEffects | func | deviceCapabilities.js | utils/animations, BiologicalNetwork | Disable effects |
| PERF_TIER | const | deviceCapabilities.js | deviceCapabilities | Performance tiers |
| Sidebar | component | layout/ | App.jsx | Navigation sidebar |
| ErrorBoundary | component | common/ | App.jsx | Error wrapper |
## API LAYER (`api.js`)

### Configuration
```javascript
const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';
```

### API Client
```javascript
const apiFetch = async (endpoint, options = {}) => {
  const token = getAuthTokens().accessToken;
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
const mlFetchJson = async (path, options = {}) => {
  // ML requests go through the Go backend proxy under /api/v1/ml,
  // keeping ML API keys server-side.
  return apiFetch(`/ml${path}`, options);
};
```

## ANTI-PATTERNS (THIS PROJECT)

### Critical Issues
- **Archived E2E tests**: Do not use Playwright results as current evidence unless the suite is restored.
- **Research export**: No active frontend route; backend contains a disabled research-export handler method

### Technical Debt
- **No React Router**: Custom tab-based routing instead of standard library
- **Manual JWT decoding**: JWT parsing done manually with `atob`/`JSON.parse`
- **LocalStorage auth**: Bearer tokens are stored in guarded localStorage for cross-origin prototype flow
- **Silent errors**: Some API calls have no error handling (logout)
- **No loading states**: No global loading state management
- **No retry logic**: Failed API calls not retried
- **Partial request caching**: React Query is used for many API hooks, but not every direct API helper is cached

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
│   ├── insights/         # ML analytics components
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
- **User tabs**: `dashboard`, `profile`, `trends`, `education`, `export`
- **Admin area**: `admin` tab with internal `adminView`
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
- **CSRF support**: `api.js` sends `X-CSRF-Token` for non-GET requests when the CSRF cookie exists

## TODO

- [ ] Implement React Router if URL/deep-link behavior becomes required
- [ ] Add Context API for auth state management
- [ ] Use HttpOnly cookies for token storage
- [x] Implement automatic token refresh on 401 in `api.js`
- [ ] Add global loading state management
- [ ] Add request retry logic with exponential backoff
- [x] Add React Query for common API hooks
- [ ] Add request cancelation on component unmount
- [ ] Add error toast/notification system
- [ ] Add 404 page
- [ ] Add loading skeleton screens
- [x] Add transition animations between tabs
- [ ] Add accessibility improvements (ARIA labels, keyboard nav)
