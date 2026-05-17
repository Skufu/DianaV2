# Thesis Draft Guidance

## Canonical Chapter 3+4 File

Use `ch3+4-final-academic-draft.md` as the clean thesis-ready Chapter 3+4 manuscript.

Treat `ch3+4.md` as the detailed technical backup. It can retain deeper implementation notes, expanded verification details, code-level evidence, and appendix-style material, but it should not be treated as the primary submission draft.

## Editing Rules

- When improving the thesis narrative, citations, formula placement, or final methodology wording, update `ch3+4-final-academic-draft.md` first.
- Mirror changes into `ch3+4.md` only when the technical backup would otherwise become misleading or materially inconsistent.
- Do not re-promote `ch3+4.md` as the canonical thesis-ready file unless the user explicitly asks for that reversal.
- Use APA-style author-date in-text citations and APA-style reference-list entries for thesis drafts unless the user explicitly requests another style.
- Keep formula definitions in the methodology portion of the clean draft and use Chapter 4 primarily for reported metrics, thresholds, and interpretation.
- Keep empirical placeholders clearly marked as pending until actual evidence exists, especially UAT results, expert review, accessibility testing, screenshots, and load testing.
- Do not reintroduce clinic/clinics functionality into the thesis methodology. Legacy clinic routes and queries still exist in the repository, but they are not part of the active thesis workflow; describe users, assessments, refresh tokens, audit/auth events, and model-run records instead.
- Before submission or major thesis edits, use `ch3+4-codebase-truth-audit.md` and `thesis-readiness-audit.md` as the codebase-truth checklist. Do not polish language while stale or unsupported feature claims remain.
