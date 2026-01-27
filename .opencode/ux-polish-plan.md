# UX Polish Plan & Priorities

## Milestone 2: UX Flow Issues & Polish

### 1. High Priority Fixes (S2.2.1)
| Issue | Rationale | File References |
|-------|-----------|-----------------|
| **React Router Migration** | State-based routing lacks back-button support and deep linking. | `App.jsx`, `Sidebar.jsx`, `AdminSidebar.jsx` |
| **Assessment Flow Unification** | Mixed modal/tab triggers for assessment logging create confusion. | `Dashboard_user.jsx`, `UserProfile.jsx` |
| **Token-Aware Downloads** | `window.open` for CSVs doesn't handle auth headers properly, relying on cookies which may fail. | `Export.jsx` |

### 2. Medium Priority Fixes (S2.2.1)
| Issue | Rationale | File References |
|-------|-----------|-----------------|
| **Onboarding Visual Stepper** | 5 steps without progress indicators lead to high drop-off rates. | `Onboarding.jsx` |
| **Standardized Feedback UI** | Inconsistent error/success patterns (some components use `alert`, others use UI cards). | `UserProfile.jsx`, `Login.jsx` |
| **Native confirm() removal** | Native browser dialogs break the "Glassmorphism" aesthetic of the platform. | `UserProfile.jsx`, `UserManagement.jsx` |

### 3. Quick Wins (S2.2.2)
- **Status Text in Onboarding**: Add "Step X of 5" to the header of `Onboarding.jsx`.
- **Inline Success States**: Replace `alert('Profile updated')` in `UserProfile.jsx` with a temporary `CheckCircle` icon or green text near the Save button.
- **Loading State for CSV**: Add a `spinner` icon to the "Download" button in `Export.jsx` while the request is pending.

### 4. Long-Term Redesigns (S2.2.2)
- **Full TanStack Suite Integration**: Combine `React Router` with `React Query` more tightly for optimistic UI updates during user/assessment creation.
- **Comprehensive Notification Service**: Implement a global toast provider (e.g., `react-hot-toast`) to handle all feedback across the app.
- **Mobile-First Layout Review**: Ensure the 72px/ml-20 LG sidebar logic works seamlessly on tablet and fold-out devices.
