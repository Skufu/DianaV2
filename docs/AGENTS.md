# Documentation Knowledge Base

## Overview
This folder contains DIANA V2 documentation for architecture, implementation guides, ML contract and rationale, operations, and research support.

The top-level docs map is maintained in `docs/README.md`.

## Canonical Authority Model
Use one source of truth per domain to avoid drift:

| Domain | Canonical Document | What It Owns |
|---|---|---|
| Assessment result contract | `03-ml/assessment-contract.md` | Backend-normalized result shape, cluster/risk semantics, warning contract, model capability rules |
| ML inference transport | `03-ml/api-contract.md` | HTTP contract between backend and ML service (`/predict`, `/predict/explain`) |
| Feature rationale | `03-ml/feature-documentation.md` | Active no-HbA1c/FBS screening features and engineering rationale |
| Method narrative | `03-ml/methodology.md` | Research-method summary aligned to active implementation |
| Thesis-ready Chapter 3+4 draft | `07-research/thesis-drafts/ch3+4-final-academic-draft.md` | Clean academic manuscript for Chapter 3 methodology and Chapter 4 results/discussion |
| Technical Chapter 3+4 backup | `07-research/thesis-drafts/ch3+4.md` | Expanded implementation evidence and technical backup, not the primary submission draft |
| Chapter 3+4 codebase truth audit | `07-research/thesis-drafts/ch3+4-codebase-truth-audit.md` | Final feature-truth checklist before submission or major thesis edits |
| Backend integration | `02-guides/backend.md` | How backend validates, calls ML, and returns canonical results |
| Frontend integration | `02-guides/frontend.md` | How frontend submits assessments and renders backend contract fields |

Rule: if two docs disagree, align non-canonical docs to the canonical owner above.

## Current Structure
```
docs/
├── 00-legacy/          # Historical references (not part of primary map)
├── 01-architecture/    # System design and boundaries
├── 02-guides/          # Backend/frontend/database/admin/security guides
├── 03-ml/              # ML contracts, methodology, feature documentation
├── 05-planning/        # PRDs and planning notes
├── 06-operations/      # Deployment and logging guides
├── 07-research/        # Manuscript and research support docs
└── 08-fixes/           # Point-in-time fix logs (historical)
```

## Notes For Maintenance
- Keep `docs/README.md` limited to real, current docs only.
- Do not place legacy/fix notes in the primary navigation sections.
- Prefer linking to canonical docs instead of duplicating technical truth in multiple files.
- For thesis Chapter 3+4 work, edit `07-research/thesis-drafts/ch3+4-final-academic-draft.md` as the clean thesis-ready draft. Use `07-research/thesis-drafts/ch3+4.md` only as the detailed technical backup unless the user explicitly says otherwise.
- Use APA-style author-date citations and APA-style reference-list entries for thesis drafts unless the user explicitly requests another citation style.
- Before final submission, prioritize codebase truth over language polishing by checking `07-research/thesis-drafts/ch3+4-codebase-truth-audit.md` and `07-research/thesis-drafts/thesis-readiness-audit.md`.
