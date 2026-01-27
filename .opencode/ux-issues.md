# UX Flow Issues & recommendations

## Milestone 2: UX Flow Issues & Polish

### 1. Missing/Ambiguous Transitions & Dead-ends (S2.1.1)
- **Signup Logic Check**: `Signup.jsx` attempts to call `signupApi`, but `AGENTS.md` notes this route is missing in the backend. If true, the "Sign Up" flow is a dead-end.
- **Deep Linking**: Since the app uses state-based routing (`activeTab`), refreshing the page always returns the user to the dashboard (or login). There is no way to share a link to a specific assessment or the trends page.
- **Back Button Support**: Browser back/forward buttons do not work for navigating between tabs, leading to user frustration if they expect standard web behavior.

### 2. Inconsistent/Duplicate Flows (S2.1.2)
- **Log Assessment Trigger**: 
    - `Dashboard_user.jsx`: Changes tab to `profile`.
    - `UserProfile.jsx`: Opens a modal (`AssessmentForm`).
    - `Sidebar.jsx`: Changes tab to `profile`.
    - *Issue*: The user might expect the same action to always perform the same UI transition. Mixing tab-switching and modal-opening for the same goal is confusing.
- **Admin Sub-views**: Admin navigation is handled via a separate `adminView` state, while users use `activeTab`. While consistent internally, the "Overview" button in `AdminSidebar` is the only one that doesn't map to a specific named component, instead calling a helper function `renderOverview()`.

### 3. State/Feedback Issues (S2.1.3)
- **Export Data Loading**: CSV downloads use `window.open`. This provides no feedback if the download fails or takes a long time. It also lacks a loading state on the button itself (unlike the PDF generator).
- **Onboarding Progress**: The 5-step onboarding wizard lacks a progress indicator (e.g., "Step 2 of 5"). Users have no sense of how long the process will take.
- **Error Handling Consistency**: Some components like `Dashboard_user` have a nice "Retry" button, while others like `UserProfile` just use a standard `alert()` or a static error message.
- **Delete Account Confirmation**: `UserProfile` uses both a custom modal and a native `confirm()`. Native confirms are inconsistent with the app's "Glassmorphism" aesthetic.

### 4. Prioritized Recommendations (S2.2.1)
- **High Priority**:
    1. **Implement React Router**: Transition from `activeTab` state to URL-based routing to support back button, deep linking, and page refreshes.
    2. **Verify/Fix Signup**: Ensure the `/auth/register` endpoint exists and is correctly called.
    3. **Unify Assessment Flow**: Decide between a dedicated "Assessment" tab or a persistent modal. Recommended: Dedicated tab with a clear multi-step form.
- **Medium Priority**:
    1. **Onboarding Progress Bar**: Add a visual stepper to the onboarding flow.
    2. **Consistent Error UI**: Move away from `alert()` and `confirm()` to custom toast notifications and modal components.
    3. **Export Feedback**: Use a proper file download pattern that allows for progress tracking and error handling.

### 5. Quick Wins vs. Redesign (S2.2.2)
- **Quick Win**: Add "Step X of 5" text to `Onboarding.jsx`.
- **Quick Win**: Replace `alert()` in `UserProfile.jsx` with a temporary success message in the UI.
- **Deeper Redesign**: Migrating to `react-router-dom` and `TanStack Router` for more robust state management.
