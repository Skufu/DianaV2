# Documentation Status Matrix

Status meanings:
- `current`: aligned with canonical docs and current map
- `needs review`: usable but has drift risk, stale details, or unclear authority
- `archive`: historical material intentionally outside primary navigation

Canonical runtime anchors:
- `03-ml/assessment-contract.md`
- `03-ml/api-contract.md`
- `03-ml/feature-documentation.md`
- `03-ml/methodology.md`

| Doc | Status | Notes |
|---|---|---|
| `README.md` | current | Primary map rebuilt and aligned |
| `AGENTS.md` | current | Canonical authority model defined |
| `DOC_STATUS.md` | current | Classification index for second pass |
| `ML_ADVANCED_TECHNIQUES.md` | needs review | Advanced notes; verify references and date against current artifacts |
| `LOCO_implementation_details.md` | needs review | Technical deep-dive; verify line references and current training code paths |
| `00-legacy/codebase-map.md` | archive | Historical map with legacy model naming |
| `00-legacy/known-issues.md` | archive | Historical issue list |
| `01-architecture/overview.md` | needs review | Generally accurate, but references old `train.py` path |
| `01-architecture/detailed-architecture.md` | needs review | Large systems doc; contains legacy/stale behavior notes |
| `01-architecture/layout.md` | current | Rewritten to current structure and boundaries |
| `01-architecture/project-structure.md` | current | Rewritten to current docs/repo tree |
| `02-guides/backend.md` | current | Aligned to canonical normalization boundary |
| `02-guides/frontend.md` | current | Aligned to backend-canonical result usage |
| `02-guides/ml-system.md` | current | Updated: removed missing rationale link and aligned runtime subtype semantics |
| `02-guides/database.md` | needs review | Contains legacy `patients`/schema details that may not match current migrations |
| `02-guides/database-schema-diagram.md` | needs review | Mermaid sections include stale subtype semantics and style issues |
| `02-guides/admin.md` | needs review | Broadly usable; verify dashboard metrics and endpoint coverage |
| `02-guides/security.md` | needs review | Security notes may lag implementation changes |
| `03-ml/assessment-contract.md` | current | Canonical runtime contract |
| `03-ml/api-contract.md` | current | Backend<->ML transport contract aligned to canonical runtime semantics |
| `03-ml/feature-documentation.md` | current | Active screening feature rationale |
| `03-ml/methodology.md` | current | Method narrative aligned to no-HbA1c/FBS screening story |
| `03-ml/api-doc-contract-alignment-inventory.md` | needs review | Useful inventory but time-bound and may include already-fixed issues |
| `03-ml/dataset-gap-analysis.md` | needs review | Action items and feature counts may drift as models evolve |
| `03-ml/cluster_feature_audit_and_fix.md` | needs review | Historical fix narrative; evaluate move to archives later |
| `03-ml/AUC_IMPROVEMENT_ANALYSIS.md` | needs review | Session-specific analysis from Feb 2026 |
| `03-ml/DOCTOR_VALIDATION_GUIDE.md` | needs review | Strong guidance but includes output naming that may diverge from runtime |
| `03-ml/DEFENSIBILITY_OUTPUTS_GUIDE.md` | needs review | Long narrative with versioned metrics; needs periodic refresh |
| `03-ml/defense/diana-evidence-index.md` | needs review | Defense packet; confirm links and evidence paths are current |
| `03-ml/defense/diana-defensibility-eli12.md` | needs review | Defense-facing summary; verify semantics against canonical contract |
| `03-ml/defense/diana-defensibility-memo.md` | needs review | Good framing; verify latest thresholds and model metadata |
| `03-ml/defense/diana-remediation-workplan.md` | needs review | Workplan status likely time-sensitive |
| `03-ml/defense/diana-citations.md` | needs review | Citation narrative should match current runtime semantics |
| `03-ml/archives/ASSESSMENT_FLOW_REAL_ML.md` | archive | Historical contract/version notes |
| `03-ml/archives/CLINICAL_VALIDATION_BRIEF.md` | archive | Historical validation brief |
| `03-ml/archives/CURRENT_STATE_ASSESSMENT.md` | archive | Historical assessment snapshot |
| `03-ml/archives/WHY_THIS_IS_PREDICTIVE.md` | archive | Historical defense context |
| `03-ml/archives/PROFESSOR_RESPONSE_QUICK.md` | archive | Historical response note |
| `03-ml/archives/ELI12_GUIDE.md` | archive | Historical explanatory guide |
| `03-ml/archives/AUDIT_REPORT.md` | archive | Historical audit report |
| `05-planning/backend-refactoring-prd.md` | current | Planning artifact still structurally valid |
| `06-operations/deployment.md` | current | Active deployment reference |
| `06-operations/deployment-internal.md` | current | Internal deployment notes still in-use |
| `06-operations/logging-improvements.md` | current | Operations improvement baseline |
| `07-research/README.md` | current | Research index aligned to available docs |
| `07-research/paper-requirements.md` | current | Updated with runtime-vs-paper subtype distinction |
| `07-research/manuscript-updates.md` | current | Aligned manuscript update text |
| `07-research/ml_algorithms.md` | needs review | Verify performance wording and naming consistency |
| `07-research/metrics.md` | needs review | Verify metric table against latest artifacts |
| `07-research/data_pipeline.md` | needs review | Confirm pipeline assumptions and file names |
| `07-research/diabetes_subgroups.md` | current | Updated with runtime-vs-paper subtype distinction |
| `07-research/ui_requirements.md` | needs review | Requirements doc may include older visualization assumptions |
| `08-fixes/02/18/AUTHENTICATION_AND_SECURITY.md` | archive | Point-in-time fix log |
| `08-fixes/02/18/BUGFIXES_DATE_MODAL.md` | archive | Point-in-time fix log |
| `08-fixes/02/18/CLICKABLE_ASSESSMENTS.md` | archive | Point-in-time fix log |
| `08-fixes/02/18/DASHBOARD_TRENDS_FIXES.md` | archive | Point-in-time fix log |
| `08-fixes/02/18/MODEL_VERSION_FIX.md` | archive | Point-in-time fix log |
| `08-fixes/02/23/FEATURE_CONSTANTS_FIX.md` | archive | Point-in-time fix log |
