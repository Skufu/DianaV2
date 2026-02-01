# PRD: Manuscript File Merger

> **Purpose**: Merge split manuscript files into a unified document with AI-friendly structure and comments.

## Overview

Merge three manuscript parts (Manuscript_part1.md, manuscript_part2.md, manuscript_part3.md) and Transcript.md into a single clean `manuscript.md` file in the root directory. The merged file should be properly formatted with AI-friendly comments while preserving all original content without detail changes.

## Background

- **Context**: Current manuscript is split across 4 files (3 parts + transcript), making AI referencing difficult. User needs a unified document for better context and cross-referencing.
- **Completed**: All split files have been read and reviewed. NHANES comment added to split files.
- **Scope**: Merge 4 markdown files into 1 unified document with structure preservation.

## Goals

1. Create `manuscript.md` in root directory with all merged content
2. Add clear section comments (e.g., `<!-- SECTION: Introduction -->`) for AI navigation
3. Preserve all original content details without modification
4. Maintain logical flow from manuscript_part1 → part2 → part3 → transcript
5. Fix markdown formatting issues (inconsistent code blocks, broken tables)

## Technical Context

### Stack
- **Files**: Markdown (.md)
- **Content**: Academic manuscript (Introduction, Literature Review, Methodology, Data Analysis, References)
- **Format**: Plain text with markdown formatting

### Files to Merge
- `splitPaper/Manuscript_part1.md` (549 lines)
- `splitPaper/manuscript_part2.md` (586 lines)
- `splitPaper/manuscript_part3.md` (586 lines)
- `splitPaper/Transcript.md` (675 lines)
- **Target**: `manuscript.md` (root)

## Constraints

- [ ] Do NOT modify or delete any content details
- [ ] Fix markdown formatting ONLY (code blocks, tables, lists)
- [ ] Preserve all citations and references exactly as written
- [ ] Keep original splitPaper/ files as backup
- [ ] Add NHANES comment at top of merged file
- [ ] Use HTML comments `<!-- -->` for AI navigation markers

## Success Criteria

- [ ] Single `manuscript.md` file created in root directory
- [ ] All 4 source files' content included in correct order
- [ ] Clear section comments added (e.g., `<!-- SECTION: Review of Literature -->`)
- [ ] NHANES comment included at top
- [ ] Markdown formatting issues resolved (broken code blocks, tables)
- [ ] No content details changed or omitted
- [ ] Total line count ≈ sum of all 4 files (allowing for formatting cleanup)

## Reference

```markdown
<!-- NHANES should now be the data -->

# SECTION: Front Matter
[Title, abstract, table of contents if present]

# SECTION: Introduction
[Content from Manuscript_part1.md]

# SECTION: Review of Literature
[Content from Manuscript_part2.md]

# SECTION: Methodology
[Content from Manuscript_part3.md]

# SECTION: Transcript: Medical Expert Interviews
[Content from Transcript.md]

# SECTION: References
[Bibliography from all parts]
```

---

> **Note to AI**: Read this file first. Then read `task_list.md`. Complete tasks in order. Mark `[x]` when verified.
