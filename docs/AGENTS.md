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
