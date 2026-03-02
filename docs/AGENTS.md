# DOCUMENTATION KNOWLEDGE BASE

## OVERVIEW
Centralized documentation hub for system architecture, research defense, and operational guides.

## STRUCTURE
```
docs/
├── 01-architecture/    # System design and request flow diagrams
├── 02-guides/          # Developer handbooks for backend, frontend, and ML
├── 03-ml/              # Model rationale and API contract specifications
├── 04-development/     # Environment setup and API drift prevention
├── 05-planning/        # Feature PRDs and refactoring roadmaps
├── 06-operations/      # Deployment guides and logging strategies
└── 07-research/        # Thesis manuscript updates and clinical biomarker data
```

## KEY DOCS
| Document | Purpose |
|----------|---------|
| `README.md` | Primary index for the documentation hub |
| `02-guides/backend.md` | Handlers, routes, and middleware implementation details |
| `03-ml/api-contract.md` | Request/response formats for ML server integration |
| `03-ml/rationale.md` | Defense-ready justification for ML methodology |
| `04-development/api-drift-prevention.md` | Strategies for keeping Go, SQL, and Python in sync |
| `07-research/biomarkers.md` | Clinical ranges and validation logic for assessments |
| `07-research/paper-requirements.md` | Checklist for thesis defense and manuscript figures |

## PATTERNS
- **Numbered Subdirectories**: Content is organized by lifecycle stage (01-Architecture to 07-Research).
- **Defense-First**: Heavy emphasis on ML rationale and clinical alignment for thesis verification.
- **Drift Awareness**: Documentation includes explicit strategies to prevent schema mismatch between tiers.
- **Agent Instructions**: Guidelines for AI assistance are stored in `04-development/claude-instructions.md`.
