# DIANA Admin Module: Clinical Governance & UI Enhancements

## Core Frontend Mandate
DIANA's frontend administrative interface is not a generic dashboard; it is a **Clinical Governance Portal**. It is designed to provide immediate, high-fidelity oversight over system access, model traceability, and clinical usage. The UI is built to ensure every administrative action and security event is surfaced with absolute clarity, preventing unauthorized access and ensuring continuous compliance, while maintaining a strict, medically professional aesthetic.

## 1. Clinical Telemetry & Security Surveillance (New)
*Status: Implemented via `AuthEventLogViewer.jsx`*

We replaced static, passive tables with a live, continuous telemetry stream to detect and mitigate unauthorized access in real-time. Generic tables are unacceptable for tracking security in a clinical environment.

**Frontend Engineering & Capabilities**:
- **Live SSE Integration**: Maintains a persistent Server-Sent Events connection, actively buffering incoming payloads in 100ms batches to guarantee a zero-lag UI experience even during high-volume auth events.
- **In-Memory Retention**: The client state intentionally caches the last 200 high-fidelity events, ensuring administrators can instantly filter and investigate recent anomalies without invoking redundant API round-trips.
- **Network Resilience Architecture**: Clinical Wi-Fi is notoriously unstable. The UI explicitly handles connection state, surfacing clear connection badges (`Wifi` / `WifiOff` icons) and enforcing a strict 5-second auto-reconnection loop without requiring user intervention.
- **Adverse Event Triage**: Granular, client-side data slicing (filtering by `failed_login`, `token_refresh`, specific clinical emails, or temporal blocks) allows security admins to immediately isolate compromised footprints.
- **Forensic Drill-Down**: Expandable detail rows extract and format critical metadata (IP, User Agent, Device Location) from the raw stream payload for immediate threat assessment.
- **Regulatory Export**: Immediate client-side CSV generation out of the active event buffer for instant HIPAA/compliance audit fulfillment.

**UI/UX Design Decisions**:
- **Cognitive Load Reduction**: High-contrast visual tagging for critical events. A `Failed Login` (Red `AlertCircle`) immediately draws the eye, while routine `Token Refresh` (Blue `RefreshCw`) or `Login` (Green `CheckCircle` ) recede into the background.
- **Event Fluidity**: Smooth animated event ingestion and forced auto-scrolling guarantee the administrator is never passively viewing stale telemetry, unless the stream is intentionally frozen.

## 2. Integrated Clinical Overview
*Status: Implemented via `AdminDashboard.jsx`*

**Frontend Engineering & Capabilities**:
- **Aggressive Code-Splitting**: The new telemetry module (`AuthEventLogViewer`) is strictly lazy-loaded. The core clinical dashboards must retain sub-second Time-To-Interactive (TTI) benchmarks; security features cannot degrade primary clinic load times.
- **Navigational Hierarchy**: The new "Auth Events" tab is deliberately slotted into the governance flow (Overview → Users → Audit Logs → **Auth Events** → Model Tracking), enforcing a natural progression from population demographics to strict system security.
- **Micro-interactions**: Glass-card styling and responsive layouts align the new modules with the premium, certified aesthetic of the DIANA suite.

## 3. Clinical Identity & Audit Governance
*Status: Existing Features Contextualized (`UserManagement.jsx`, `AuditLogViewer.jsx`)*

**Frontend Engineering & Capabilities**:
- **Immediate Revocation UI**: Action modals engineered for the instantaneous deactivation of compromised or offboarded clinical staff. Strict visual segregation between `admin` and `clinician` roles to prevent privilege escalation.
- **Immutable Audit UI**: Expandable, color-coded JSON inspector views are built directly into the UI, allowing administrators to visually parse the exact payloads of potentially dangerous state-altering actions (e.g., `user.create`, `user.deactivate`) without needing database access.

## 4. Model Defensibility UI
*Status: Existing Feature Contextualized (`ModelTraceability.jsx`)*

For a clinical decision support (CDS) system, knowing *what* model is running is a legal requirement.

**Frontend Engineering & Capabilities**:
- **Artifact Lineage Visuals**: Explicit status indicators visually lock the difference between the active clinical model and deprecated historical versions.
- **Cryptographic Transparency**: Surface-level display of NHANES dataset hashes and training dates. The UI explicitly proves to the administrator the exact mathematical validation backing the active predictions.

## Frontend Testing & Performance Milestones
- ✓ **Micro-Footprint Module**: The compiled `AuthEventLogViewer` is rigorously optimized to **9.88 kB (3.08 kB gzipped)**.
- ✓ **Zero Fault Tolerances**: No TypeScript or ESLint errors permitted in the governance modules.
- ✓ **Graceful Degradation**: Error boundaries and connection state handlers ensure the UI never white-screens, even during total backend SSE failure.
