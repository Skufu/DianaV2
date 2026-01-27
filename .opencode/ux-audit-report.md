# UX Audit Report: Diana V2

## 1. UI Flow Map

### Public Access
- **Login Screen**: Primary entry point. Transitions to Dashboard on success, or Signup on user request.
- **Signup Screen**: Registration form. Transitions to Login or Dashboard (automatic login). *Note: Currently a dead-end due to missing backend implementation.*

### Authenticated User (B2C Flow)
- **Onboarding (Forced Overlay)**: Multi-step form triggered if `onboarding_completed` is false.
- **Dashboard (Default Tab)**: Overview of latest assessment and risk status. Quick navigation to other features.
- **Profile & Assessment**:
    - Manage personal details and medical history.
    - Toggle `AssessmentForm` for logging new biomarkers.
- **Health Insights**:
    - **Trends**: Visual history of biomarkers (HbA1c, FBS, etc.).
    - **Insights**: ML-driven data (SHAP values, risk clusters).
- **Resources**:
    - **Education**: Health educational content.
    - **Export**: PDF health report generation.

### Authenticated Admin (B2B/System Flow)
- **Admin Dashboard**: System-wide statistics.
- **User Management**: CRUD operations for system users.
- **System Logs**: Audit trails and ML model run history.

---

## 2. Identified UX Issues

### S2.1.1: Missing/Ambiguous Navigation & Dead-Ends
| Issue ID | Component | Description | Severity |
| :--- | :--- | :--- | :--- |
| **DEAD-END-1** | `Signup.jsx` | The "Sign Up" flow is fully implemented on the frontend but the backend `/auth/register` endpoint is missing. | **Critical** |
| **DEAD-END-2** | `Export.jsx` | "Download" buttons use a double-prefixed path (`/api/v1/api/v1/export/...`), causing 404 errors for all CSV exports. | **High** |
| **NAV-GAP-1** | `App.jsx` | Tab-based routing does not update the URL. Browser "Back" button fails, and deep linking is impossible. | **High** |
| **NAV-GAP-2** | `App.jsx` | Page refresh resets the application to the 'dashboard' tab, losing user context. | **Medium** |

### S2.1.2: Inconsistent or Duplicate Flows
| Issue ID | Component | Description | Severity |
| :--- | :--- | :--- | :--- |
| **FLOW-INC-1** | `Dashboard_user.jsx` | "Log Assessment" button navigates to the 'profile' tab but does not automatically open the assessment form. User must click "Log Assessment" a second time. | **Medium** |
| **FLOW-DUP-1** | `UserProfile.jsx` | The profile page handles both static user data and dynamic assessment logging, leading to a cluttered interface. | **Low** |

### S2.1.3: State & Feedback Issues
| Issue ID | Component | Description | Severity |
| :--- | :--- | :--- | :--- |
| **FEEDBACK-1** | `App.jsx` | Sudden transition from Onboarding to Dashboard with no success confirmation or "Welcome" state. | **Medium** |
| **FEEDBACK-2** | `api.js` | Missing global notification/toast system. Error feedback is fragmented across local component states. | **Medium** |
| **FEEDBACK-3** | `App.jsx` | Logout errors are ignored in the UI, even if the server-side session isn't cleared. | **Low** |

---

## 3. Polish Recommendations (T2.2)

### S2.2.1: Prioritized Fixes
1. **Fix Signup**: Implement the `/auth/register` endpoint in the Go backend to resolve the critical dead-end.
2. **Deep Linking**: Integrate `react-router-dom` to replace the custom tab state, allowing URL-based navigation.
3. **Seamless Assessment**: Update the "Log Assessment" action in `Dashboard_user` to pass a state/flag that automatically opens the `AssessmentForm` upon navigating to the Profile tab.
4. **Global Toasts**: Implement a centralized notification provider (e.g., `react-hot-toast` or `Sonner`) for consistent error/success feedback.

### S2.2.2: Quick Wins vs Deep Redesign
- **Quick Win**: Add a simple "Success!" toast or modal after onboarding completion.
- **Quick Win**: Automatically open the assessment form if navigated from the dashboard "Log Assessment" CTA.
- **Deep Redesign**: Move `AssessmentForm` to its own dedicated tab or a modal accessible from anywhere, decoupling it from the User Profile.
- **Deep Redesign**: Migration to a standard routing library (React Router).
