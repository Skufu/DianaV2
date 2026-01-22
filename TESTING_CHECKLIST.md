# User Module - Testing Checklist

**Created:** 2026-01-20

---

## Pre-Test Setup

### Prerequisites
- [x] Frontend server running (confirmed on port 4001)
- [x] Backend server should be running (start with: `cd backend && go run ./cmd/server`)
- [x] Database migrations applied (run: `make db_up`)
- [x] No LSP diagnostics errors on any modified files

---

## Test Scenarios

### 1. Dashboard Navigation Tests

#### Test 1.1: "Log Assessment" Button
- [ ] Click "Log Assessment" button on Dashboard
- [ ] Verify navigation to 'profile' tab occurs
- [ ] Verify sidebar is hidden (isAssessmentOpen = true)
- [ ] Verify profile page loads with back button visible

#### Test 1.2: "View Trends" Button
- [ ] Click "View Trends" button on Dashboard
- [ ] Verify navigation to 'trends' tab occurs
- [ ] Verify PersonalTrends component displays
- [ ] Verify sidebar remains visible

#### Test 1.3: "Export Health Report" Button
- [ ] Click "Export Health Report" button on Dashboard
- [ ] Verify navigation to 'export' tab occurs
- [ ] Verify Export component displays
- [ ] Verify sidebar remains visible

#### Test 1.4: "My Profile" Button
- [ ] Click "My Profile" button on Dashboard
- [ ] Verify navigation to 'profile' tab occurs
- [ ] Verify back button is visible in header

---

### 2. Profile Navigation Tests

#### Test 2.1: Back Button Functionality
- [ ] Click back arrow button in Profile header
- [ ] Verify navigation to 'dashboard' tab occurs
- [ ] Verify sidebar reappears (isAssessmentOpen = false)
- [ ] Verify dashboard displays latest data

#### Test 2.2: Multiple Profile Opens
- [ ] Navigate to Profile from Dashboard
- [ ] Click back button to return to Dashboard
- [ ] Click "My Profile" from Dashboard again
- [ ] Verify Profile opens correctly each time

#### Test 2.3: Profile Form Functionality
- [ ] Edit first name and click "Save Changes"
- [ ] Verify "Profile updated successfully!" alert appears
- [ ] Refresh page to verify changes persist
- [ ] Edit multiple fields and save
- [ ] Verify all changes persist across refresh

---

### 3. Assessment Form Tests

#### Test 3.1: Open Assessment Form
- [ ] Navigate to Profile tab
- [ ] Click "Log Assessment" button in header
- [ ] Verify assessment form appears (not full page reload)
- [ ] Verify form contains all 7 input fields
- [ ] Verify "Cancel" button is visible

#### Test 3.2: Assessment Form Validation
- [ ] Leave HbA1c and FBS empty
- [ ] Click "Log Assessment" button
- [ ] Verify error message: "HbA1c and FBS are required fields"
- [ ] Verify form doesn't submit
- [ ] Fill in HbA1c, leave FBS empty
- [ ] Click "Log Assessment"
- [ ] Verify same error message

#### Test 3.3: Assessment Form Submission - Valid Data
- [ ] Fill in all fields with valid values:
  - HbA1c: 5.7
  - FBS: 95
  - BMI: 24.5
  - Cholesterol: 200
  - Systolic BP: 120
  - Diastolic BP: 80
- [ ] Click "Log Assessment" button
- [ ] Verify loading state: "Saving..."
- [ ] Verify success alert: "Assessment logged successfully!"
- [ ] Verify form closes after success
- [ ] Verify user remains on Profile page

#### Test 3.4: Assessment Form - Cancel Button
- [ ] Click "Log Assessment" to open form
- [ ] Fill in some fields
- [ ] Click "Cancel" button
- [ ] Verify form closes
- [ ] Verify filled data is discarded (form resets on next open)

#### Test 3.5: Assessment Form - Out of Range Values
- [ ] Fill HbA1c with 20.0 (out of range)
- [ ] Fill FBS with valid value
- [ ] Submit form
- [ ] Note: Client-side accepts, but backend should reject
- [ ] Check backend logs for validation errors
- [ ] Test with FBS = 500 (out of range)
- [ ] Verify appropriate error handling

#### Test 3.6: Multiple Assessments
- [ ] Submit first assessment with valid data
- [ ] Click "Log Assessment" again
- [ ] Submit second assessment with different values
- [ ] Verify both submissions succeed
- [ ] Navigate to Dashboard to verify both appear

#### Test 3.7: Assessment Data Types
- [ ] Test with decimal HbA1c: 5.7
- [ ] Test with integer HbA1c: 6
- [ ] Verify both formats work
- [ ] Test with decimal BMI: 24.5
- [ ] Test with integer BMI: 25
- [ ] Verify both formats work

---

### 4. Insights Rate Limiting Tests

#### Test 4.1: Initial Load
- [ ] Navigate to Insights tab
- [ ] Verify data loads on first render
- [ ] Check browser network tab for single `/biomarker-trends` call
- [ ] Verify cluster distribution displays
- [ ] Verify biomarker trends display

#### Test 4.2: Component Re-render
- [ ] While on Insights tab, navigate away and back
- [ ] Click different tabs (Dashboard, Trends, Profile)
- [ ] Return to Insights tab
- [ ] Verify NO additional API calls to `/biomarker-trends`
- [ ] Verify `hasLoadedOnce` prevents duplicate fetches
- [ ] Check network tab to confirm single request

#### Test 4.3: Multiple Rapid Tab Switches
- [ ] Quickly switch between Insights and Dashboard 3-5 times
- [ ] Verify no 429 errors appear in console
- [ ] Verify rate limit not exhausted
- [ ] Verify insights data remains cached and displays instantly

#### Test 4.4: Token Change
- [ ] Log out and log back in
- [ ] Navigate to Insights tab
- [ ] Verify new token triggers fresh data fetch
- [ ] Verify `hasLoadedOnce` resets correctly
- [ ] Verify data loads for new user

---

### 5. Integration Tests

#### Test 5.1: End-to-End Assessment Flow
- [ ] Start on Dashboard with no assessments
- [ ] Click "Log Assessment"
- [ ] Navigate to Profile
- [ ] Click "Log Assessment" button (header)
- [ ] Fill and submit valid assessment data
- [ ] Verify success message
- [ ] Click back button
- [ ] Verify on Dashboard
- [ ] Verify new assessment appears in stats

#### Test 5.2: Dashboard Stats Update
- [ ] Submit new assessment
- [ ] Navigate to Dashboard
- [ ] Verify "Assessments" count increments
- [ ] Verify "Latest Assessment" section updates
- [ ] Verify Risk Level indicator changes
- [ ] Verify Cluster label displays

#### Test 5.3: Cross-Tab State Persistence
- [ ] Edit profile information
- [ ] Save changes
- [ ] Navigate to Trends
- [ ] Navigate to Insights
- [ ] Navigate back to Profile
- [ ] Verify profile changes are still saved
- [ ] No data loss across tab navigation

---

### 6. Edge Cases

#### Test 6.1: Network Errors
- [ ] Turn off backend server (or disconnect network)
- [ ] Attempt to navigate to Insights
- [ ] Verify error message displays
- [ ] Attempt to submit assessment
- [ ] Verify error message displays
- [ ] Restart backend
- [ ] Verify functionality recovers

#### Test 6.2: Invalid Token
- [ ] Open browser DevTools
- [ ] Clear `diana_token` from localStorage
- [ ] Attempt to navigate between tabs
- [ ] Verify user is redirected to login (if auth middleware works)
- [ ] Log back in with valid credentials
- [ ] Verify all tabs work again

#### Test 6.3: Concurrent Operations
- [ ] Open assessment form
- [ ] While form open, navigate to Insights
- [ ] Verify form closes automatically
- [ ] No stuck UI states
- [ ] All tabs remain functional

---

## Backend Verification

### 7. API Endpoint Tests

#### Test 7.1: Assessment Creation
- [ ] Check backend logs for `POST /api/v1/users/me/assessments`
- [ ] Verify ML predictor is called (if MODEL_URL is set)
- [ ] Verify response includes risk_score and cluster
- [ ] Verify data is saved to database

#### Test 7.2: Insights Endpoints
- [ ] Check backend logs for `GET /api/v1/insights/biomarker-trends`
- [ ] Verify SQL query executes correctly
- [ ] Verify response format matches frontend expectations
- [ ] Check rate limiting logs (if any)

#### Test 7.3: Profile Updates
- [ ] Check backend logs for `PUT /api/v1/users/me/profile`
- [ ] Verify database updates execute
- [ ] Verify response returns updated user object

---

## Browser Console Checks

### Error Monitoring
- [ ] Open browser DevTools Console
- [ ] Verify no React warnings
- [ ] Verify no unhandled promise rejections
- [ ] Verify no 429 rate limit errors
- [ ] Verify no CORS errors
- [ ] Verify no 401 Unauthorized errors (unless logged out)

### Performance Monitoring
- [ ] Monitor initial page load time (< 3 seconds)
- [ ] Monitor tab switch response time (< 500ms)
- [ ] Monitor assessment submission time (< 2 seconds)
- [ ] Verify no memory leaks (Chrome DevTools Memory tab)

---

## Success Criteria

All tests pass when:
- [ ] Dashboard buttons all work correctly
- [ ] Back button navigation works from Profile
- [ ] Assessment form opens, validates, submits successfully
- [ ] Insights loads without rate limit errors
- [ ] No console errors or warnings
- [ ] Data persists correctly across page refreshes
- [ ] All navigation flows complete without errors
- [ ] Backend logs show successful API calls
- [ ] UX is smooth and responsive

---

## Test Results Log

**Date:** _______
**Tester:** _______

| Test # | Status | Notes |
|--------|--------|-------|
| 1.1 Dashboard - Log Assessment | [ ] | |
| 1.2 Dashboard - View Trends | [ ] | |
| 1.3 Dashboard - Export | [ ] | |
| 1.4 Dashboard - Profile | [ ] | |
| 2.1 Profile - Back Button | [ ] | |
| 2.2 Profile - Multiple Opens | [ ] | |
| 2.3 Profile - Form Save | [ ] | |
| 3.1 Assessment - Open Form | [ ] | |
| 3.2 Assessment - Validation | [ ] | |
| 3.3 Assessment - Valid Submit | [ ] | |
| 3.4 Assessment - Cancel | [ ] | |
| 3.5 Assessment - Out of Range | [ ] | |
| 3.6 Assessment - Multiple | [ ] | |
| 3.7 Assessment - Data Types | [ ] | |
| 4.1 Insights - Initial Load | [ ] | |
| 4.2 Insights - Re-render | [ ] | |
| 4.3 Insights - Rapid Switches | [ ] | |
| 4.4 Insights - Token Change | [ ] | |
| 5.1 Integration - E2E Flow | [ ] | |
| 5.2 Integration - Dashboard Update | [ ] | |
| 5.3 Integration - State Persistence | [ ] | |

**Overall Result:** PASSED / FAILED / PARTIAL

**Issues Found:** ____________________________________________________

**Recommendations:** ____________________________________________________
