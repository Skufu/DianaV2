# Frontend Plan

## Tasks
- [x] Extract UI into reusable components (Button, Sidebar, Dashboard, Login, Analytics, Export, PatientHistory).
- [x] Hook API helpers into components (login, patients, assessments, create patient/assessment, exports) — analytics still placeholder charts.
- [ ] Add loading and error states for patients/assessments and assessment submission.
- [ ] Add search/filter for patient list.
- [ ] Add basic form validation (required fields for new assessment).
- [ ] Add environment wiring (`VITE_API_BASE`) for dev/prod and document it.
- [ ] Optional: Add role-aware UI (hide actions if no token).
- [ ] Optional: Add chart data from backend analytics endpoints.

## Done
- [x] Vite + Tailwind scaffold.
- [x] API helpers (login, patients, assessments create/list, create patient).
- [x] Main App layout matching `.md` styling.
- [x] Auth flow with JWT login.
- [x] Patient list from backend; assessments fetched per patient.
- [x] New assessment form creates patient + assessment via API and shows returned cluster/risk.
- [x] Export links point to backend API base.
- [x] Componentization applied; build passes.

