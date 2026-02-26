# FRONTEND COMPONENTS KNOWLEDGE BASE

**Directory**: `frontend/src/components`
**Generated:** 2026-01-28

## OVERVIEW
Domain-organized React components with lazy loading and tab-based navigation.

## WHERE TO LOOK

| Domain | Folder | Components | Notes |
|--------|--------|-------------|-------|
| Auth | `auth/` | Login, Signup | Authentication flows |
| User | `user/` | Dashboard, Profile, Trends, Onboarding | User-facing features |
| Insights | `insights/` | Insights, CohortAnalysis | ML analytics visualizations |
| Admin | `admin/` | AdminDashboard, UserManagement, AuditLog, ModelTraceability, AuthEventLog | Admin tools |
| Export | `export/` | Export | PDF download |
| Education | `education/` | Education | Health education content |
| Common | `common/` | ErrorBoundary, ErrorFallback, RiskIndicator, BiomarkerInput, PDFExport, Button, CustomCursor, SHAPExplanation | Reusable components |
| Layout | `layout/` | Sidebar, AdminSidebar, BiologicalNetwork | Navigation and background |

## ANIMATION DESIGN SYSTEM (NEW)
Implemented with **Framer Motion v12** for clinical precision.

### Performance Tiering
Managed via `src/utils/deviceCapabilities.js`:
- **LOW Tier**: Animations disabled (`duration: 0`).
- **MEDIUM Tier**: Standard animations.
- **HIGH Tier**: Premium network backgrounds and complex transitions.

### Key Animation Features
- **Route Transitions**: `AnimatePresence` + `mode="wait"` in `App.jsx`.
- **Sidebars**: Spring-based width transitions with `layoutId` synchronization and manual collapse toggle.
- **Forms**: Staggered field entry, breathing loading states, and skeleton transitions for auth.
- **Accessibility**: All animations respect `prefers-reduced-motion` via `useReducedMotion` hook.

### Core Variants (`src/utils/animations.js`)
- `fadeIn`, `slideUp`, `scaleIn`: Basic entry animations.
- `staggerContainer`: Automated orchestration for lists/grids.
- `cardVariants`: Standard physics for dashboard modules.
- `navLabelVariants`: Synchronized label visibility for collapsing sidebars.

## COMPONENT ARCHITECTURE

### Component Pattern
```jsx
// Props-based components
const ComponentName = ({ prop1, prop2, onAction }) => {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAction = async () => {
    try {
      setLoading(true);
      // ... API call or logic
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* JSX with prop values */}
    </div>
  );
};

export default ComponentName;
```

### Loading State Pattern
```jsx
if (loading) {
  return <div className="text-center py-12">Loading...</div>;
}

if (error) {
  return <div className="bg-rose-500/10 text-rose-400">{error}</div>;
}
```

### API Call Pattern
```jsx
import { createAssessmentApi } from '../../api';

const handleSubmit = async (data) => {
  const result = await createAssessmentApi(token, data);
  // Handle result
};
```

## AUTH COMPONENTS

### Login.jsx
- **Purpose**: User authentication with JWT
- **Props**: `onLogin`, `onShowSignup`
- **Features**:
  - Email/password form
  - BiologicalNetwork animated background
  - Error handling with toast messages
  - Loading state with spinner
- **API Call**: `loginApi(email, password)` from `api.js`

### Signup.jsx
- **Purpose**: User registration
- **Props**: `onSignup`
- **Note**: Backend endpoint `/auth/register` NOT IMPLEMENTED

## USER COMPONENTS

### Dashboard_user.jsx
- **Purpose**: User overview and quick actions
- **Props**: `token`, `userId`, `setActiveTab`
- **Features**:
  - Assessment count display
  - Risk level indicator (RiskIndicator)
  - Latest assessment summary
  - Quick action buttons (log assessment, view trends, export)
  - Action cards with icons

### UserProfile.jsx
- **Purpose**: User profile management
- **Features**:
  - Personal information form
  - Medical history checkboxes
  - Consent settings toggles
  - Update profile API call

### Onboarding.jsx
- **Purpose**: Multi-step user onboarding
- **Steps**:
  1. Personal information
  2. Menopause status
  3. Medical history
  4. Consent preferences
- **API**: `completeOnboardingApi(token, data)`

### PersonalTrends.jsx
- **Purpose**: Biomarker trend visualization
- **Chart Library**: Recharts
- **Features**:
  - Line charts for HbA1c, FBS, cholesterol trends
  - Date range filtering
  - Interactive tooltips

## INSIGHTS COMPONENTS

### Insights.jsx
- **Purpose**: ML analytics dashboard
- **Features**:
  - Cluster distribution visualization
  - Risk score trends
  - SHAP explanations (via SHAPExplanation component)
- **API**: `fetchClusterDistributionApi(token)`

### SHAPExplanation.jsx
- **Purpose**: Feature importance visualization for ML models
- **Chart Library**: Recharts
- **Features**:
  - Horizontal bar chart of SHAP values
  - Feature importance ranking
  - Waterfall plot image (from ML server)
  - Base value and final prediction display
- **API**: `mlFetch('/explain?model_type=clinical')`

### CohortAnalysis.jsx
- **Purpose**: Comparative analysis across users
- **Features**:
  - Age group breakdown
  - Cluster comparison charts
  - Statistical distributions

## ADMIN COMPONENTS

### AdminDashboard.jsx
- **Purpose**: System overview and statistics
- **API**: `fetchAdminDashboardApi(token)`
- **Features**:
  - Total users count
  - Active assessments count
  - Cluster distribution stats
  - Recent activity summary

### UserManagement.jsx
- **Purpose**: User CRUD operations
- **APIs**:
  - `adminListUsersApi(token, page, pageSize)`
  - `createAdminUserApi(token, user)`
  - `updateAdminUserApi(token, userId, user)`
  - `deactivateAdminUserApi(token, userId)`
- **Features**:
  - Paginated user list
  - Create new user form
  - Edit user modal
  - Deactivate/activate toggle
  - Search/filter functionality

### AuditLogViewer.jsx
- **Purpose**: View admin audit events
- **API**: `fetchAuditLogsApi(token, page, pageSize)`
- **Features**:
  - Paginated audit log table
  - Event type filtering
  - Date range filtering
  - Actor, action, target details

### AuthEventLogViewer.jsx
- **Purpose**: View authentication events
- **API**: Fetch auth events (from store)
- **Features**:
  - Event timeline
  - User identification
  - Timestamp display

### ModelTraceability.jsx
- **Purpose**: Track ML model runs and versions
- **API**: `fetchModelRunsApi(token, page, pageSize)`
- **Features**:
  - Model version history
  - Dataset hash tracking
  - Run timestamp logging

## COMMON COMPONENTS

### ErrorBoundary.jsx
- **Purpose**: Catch and display React errors
- **Props**: `section`, `children`
- **Features**:
  - Try/catch wrapper around children
  - Fallback UI per section
  - Error logging to console

### ErrorFallback.jsx
- **Purpose**: Error display component
- **Features**:
  - User-friendly error messages
  - Retry action buttons
  - Suggestion text

### RiskIndicator.jsx
- **Purpose**: Visual risk level display
- **Props**: `riskScore`
- **Visual**:
  - Low risk (<30): Green
  - Medium risk (30-69): Yellow/Orange
  - High risk (≥70): Red

### BiomarkerInput.jsx
- **Purpose**: Formatted biomarker input with validation
- **Props**: Label, value, onChange, unit, min, max
- **Features**:
  - Unit display
  - Input validation
  - Warning indicator for out-of-range values

### Button.jsx
- **Purpose**: Reusable button component
- **Variants**: Primary, secondary, danger
- **Features**:
  - Loading state
  - Disabled state
  - Icon support
  - Click handler
  - **Animations**: `whileHover`, `whileTap`, `whileFocus` with spring physics

### Animation Patterns
- **Entrance**: Use `staggerContainer` for parent and `fadeIn` or `slideUp` for children.
- **Micro-interactions**: Use `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}` for buttons.
- **Transitions**: Wrap multi-step forms in `AnimatePresence` with `mode="wait"`.
- **Accessibility**: Always check `useReducedMotion()` from `utils/animations.js`.
- **Performance**: Use `shouldDisableHeavyEffects()` to skip heavy animations on low-tier devices.

### PDFExport.jsx
- **Purpose**: Download health report PDF
- **API**: `exportPDFApi(token)`
- **Features**:
  - Download button with loading state
  - Progress indicator
  - File name with timestamp

### SHAPExplanation.jsx
- **Purpose**: ML feature importance visualization
- **Library**: Recharts
- **API**: `mlFetch('/explain?model_type=clinical')`

### CustomCursor.jsx
- **Purpose**: Custom mouse cursor for branding
- **Features**:
  - DIANA logo cursor
  - Smooth transitions
  - Hover effects

## LAYOUT COMPONENTS

### Sidebar.jsx
- **Purpose**: Main navigation sidebar
- **Props**: `activeTab`, `setActiveTab`, `onLogout`, `onStartAssessment`, `userRole`, `isAdmin`
- **Features**:
  - Tab navigation (dashboard, profile, trends, insights, education, export)
  - User role display
  - Admin-specific options
  - Logout button
  - Active tab highlighting

### AdminSidebar.jsx
- **Purpose**: Admin-specific navigation
- **Features**:
  - Admin user management
  - Audit logs
  - Model tracking
  - System settings

### BiologicalNetwork.jsx
- **Purpose**: Animated network background
- **Props**: `nodeCount`, `connectionDistance`, `speed`
- **Features**:
  - Canvas-based animation
  - Responsive node connections
  - Particle effects
  - **Disabled on low-performance devices**

## CODE MAP

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| Login | component | auth/Login.jsx | App.jsx | Login form |
| Signup | component | auth/Signup.jsx | App.jsx | Registration form |
| Dashboard_user | component | user/Dashboard_user.jsx | App.jsx | User dashboard |
| UserProfile | component | user/UserProfile.jsx | App.jsx | Profile management |
| Onboarding | component | user/Onboarding.jsx | App.jsx | Onboarding flow |
| PersonalTrends | component | user/PersonalTrends.jsx | App.jsx | Trend charts |
| Insights | component | insights/Insights.jsx | App.jsx | ML insights |
| CohortAnalysis | component | insights/CohortAnalysis.jsx | Insights | Cohort analysis |
| SHAPExplanation | component | common/SHAPExplanation.jsx | Insights | Feature importance |
| AdminDashboard | component | admin/AdminDashboard.jsx | App.jsx | Admin overview |
| UserManagement | component | admin/UserManagement.jsx | AdminDashboard | User CRUD |
| AuditLogViewer | component | admin/AuditLogViewer.jsx | AdminDashboard | Audit log viewer |
| AuthEventLogViewer | component | admin/AuthEventLogViewer.jsx | AdminDashboard | Auth event viewer |
| ModelTraceability | component | admin/ModelTraceability.jsx | AdminDashboard | Model tracking |
| Export | component | export/Export.jsx | App.jsx | PDF download |
| Education | component | education/Education.jsx | App.jsx | Health education |
| ErrorBoundary | component | common/ErrorBoundary.jsx | App.jsx | Error catching |
| ErrorFallback | component | common/ErrorFallback.jsx | ErrorBoundary | Error display |
| RiskIndicator | component | common/RiskIndicator.jsx | Dashboard_user | Risk visualizer |
| BiomarkerInput | component | common/BiomarkerInput.jsx | UserProfile | Formatted input |
| Button | component | common/Button.jsx | Multiple | Reusable button |
| PDFExport | component | common/PDFExport.jsx | Export | Download handler |
| CustomCursor | component | common/CustomCursor.jsx | App.jsx | Custom cursor |
| Sidebar | component | layout/Sidebar.jsx | App.jsx | Navigation |
| AdminSidebar | component | layout/AdminSidebar.jsx | AdminDashboard | Admin navigation |
| BiologicalNetwork | component | layout/BiologicalNetwork.jsx | App.jsx | Animated background |

## STYLING CONVENTIONS

### Tailwind CSS
- **Utility-first**: Use Tailwind classes over custom CSS
- **Responsive**: Mobile-first with `md:`, `lg:` prefixes
- **Dark mode**: Slate color palette for medical theme

### Common Classes
- **Background**: `bg-slate-900`, `bg-slate-800/50`, `bg-gradient-to-r`
- **Text**: `text-white`, `text-slate-300`, `text-teal-400`
- **Borders**: `border-slate-700/50`, `border-teal-500/50`
- **Shadows**: `shadow-lg`, `shadow-teal-500/25`
- **Rounded**: `rounded-xl`, `rounded-2xl`, `rounded-3xl`
- **Glass effect**: `backdrop-blur-sm bg-slate-800/50 border-slate-700/50`

### Color Scheme
- **Primary**: Teal/Cyan gradient (`from-teal-500 to-cyan-500`)
- **Success**: Green (`text-emerald-400`)
- **Warning**: Amber/Orange (`text-amber-400`, `text-orange-400`)
- **Error**: Rose/Red (`text-rose-400`, `bg-rose-500/10`)
- **Info**: Blue (`text-blue-400`)
- **Neutral**: Slate/Gray (`text-slate-400`)

## ANTI-PATTERNS (THIS PROJECT)

### Critical Issues
- **No index exports**: Components organized in folders but no index.jsx re-exports
- **Mixed responsibilities**: Some components handle both API calls and UI logic
- **No global state**: Auth state duplicated across multiple components (from App.jsx props)

### Technical Debt
- **No Context API**: Auth state passed via props to all children (prop drilling)
- **Manual JWT parsing**: JWT decoded manually in each component that needs user info
- **No error boundary around API calls**: Try/catch only in some components
- **No loading skeletons**: Missing proper loading states for async operations
- **No form validation**: Client-side validation minimal (relies on backend)

### Anti-Patterns to Avoid
- **Inline styles**: Use Tailwind classes instead of style={{...}}
- **Magic numbers**: Hardcoded values should be constants
- **Nested ternaries**: Avoid complex inline conditionals
- **Duplicate API calls**: Cache results where appropriate
- **Direct DOM manipulation**: Avoid `document.getElementById` - use React state

## NOTES

### Tab Navigation vs React Router
**Current**: Custom tab-based routing (state-driven)
**Pros**: Simple, no external dependencies
**Cons**: No URL management, back button doesn't work, no deep linking
**Recommendation**: Consider React Router v6 for production

### Authentication State
**Current**: Managed in App.jsx, passed to all components via props
**Issues**: Prop drilling, state synchronization problems
**Recommendation**: Use Context API or React Query for auth state

### Performance Optimization
**Current**: Device detection disables animations on low-end hardware
**Implementation**:
- BiologicalNetwork disabled on LOW tier
- Animation count adjusted (HIGH=40, MEDIUM=20, LOW=0)
- Reduced motion class applied on non-HIGH tiers

### Error Handling
**Current**: ErrorBoundary around top-level content
**Limitations**:
- No global error state
- No error logging service
- No retry mechanism for failed API calls
- No user-friendly error messages for all error types

### Accessibility
**Current**: Limited accessibility features
**Recommendations**:
- Add ARIA labels to form inputs
- Add keyboard navigation support
- Add screen reader announcements
- Add focus management for modals
- Test with screen reader

## TODO

- [ ] Add index.jsx exports for each domain folder
- [ ] Implement Context API for authentication state
- [ ] Add proper form validation with error messages
- [ ] Add loading skeletons for all async operations
- [ ] Add transition animations between tabs
- [ ] Implement React Router v6 or React Navigation
- [ ] Add ARIA labels and roles throughout
- [ ] Add keyboard navigation support
- [ ] Add toast/notification system
- [ ] Add error logging service
- [ ] Add request retry logic
- [ ] Test with screen readers
- [ ] Add internationalization (i18n) support
- [ ] Add unit tests for components
- [ ] Add Storybook for component documentation
