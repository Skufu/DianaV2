# PRD Summary: Manuscript File Merger

> **Document Purpose**: Extracted requirements and constraints for merging split manuscript files into a unified document.

---

## Project Overview

**Objective**: Merge three manuscript parts (Manuscript_part1.md, manuscript_part2.md, manuscript_part3.md) and Transcript.md into a single clean `manuscript.md` file in the root directory. The merged file should be properly formatted with AI-friendly comments while preserving all original content without detail changes.

---

## Source Files

| File | Lines | Content Section |
|------|-------|-----------------|
| `splitPaper/Manuscript_part1.md` | 549 | Introduction |
| `splitPaper/manuscript_part2.md` | 586 | Review of Literature |
| `splitPaper/manuscript_part3.md` | 586 | Methodology |
| `splitPaper/Transcript.md` | 675 | Expert Interviews |
| **Total** | **≈2396** | **All sections** |

**Target File**: `manuscript.md` (root directory)

---

## Functional Requirements

### 1. Content Requirements
- ✅ Merge all 4 source files into single document
- ✅ Maintain logical flow: part1 → part2 → part3 → transcript
- ✅ Consolidate references from all parts
- ✅ Preserve all original content details without modification
- ✅ Keep original splitPaper/ files as backup

### 2. Structure Requirements
- ✅ Add NHANES comment at top: `<!-- NHANES should now be the data -->`
- ✅ Add AI-friendly section comments: `<!-- SECTION: [Section Name] -->`
- ✅ Use section dividers (`---`) between major sections
- ✅ Maintain heading hierarchy consistency

### 3. Formatting Requirements
- ✅ Fix broken code blocks (proper ```markdown fences)
- ✅ Fix table formatting (correct pipe separators and alignment)
- ✅ Normalize heading levels (#, ##, ###)
- ✅ Fix list formatting (consistent bullet points and numbering)

---

## Critical Constraints

### Content Constraints
- ❌ **DO NOT modify or delete any content details**
- ❌ **DO NOT change citations or references**
- ❌ **DO NOT paraphrase or reword content**
- ✅ Fix markdown formatting ONLY

### Formatting Constraints
- ✅ Use HTML comments `<!-- -->` for AI navigation markers
- ✅ Preserve original line count (±100 lines acceptable)
- ✅ Maintain original content order

### File Constraints
- ✅ Create target file in root directory (`manuscript.md`)
- ✅ Preserve all source files in `splitPaper/` directory
- ✅ No file deletion operations

---

## Output Structure Template

```markdown
<!-- NHANES should now be the data -->

---

<!-- SECTION: Front Matter -->
[Title, abstract, table of contents if present]

---

<!-- SECTION: Introduction -->
[Content from Manuscript_part1.md]

---

<!-- SECTION: Review of Literature -->
[Content from Manuscript_part2.md]

---

<!-- SECTION: Methodology -->
[Content from Manuscript_part3.md]

---

<!-- SECTION: Transcript: Medical Expert Interviews -->
[Content from Transcript.md]

---

<!-- SECTION: References -->
[Bibliography from all parts]
```

---

## Success Criteria

| Criterion | Verification Method |
|-----------|-------------------|
| Single `manuscript.md` file created | File exists in root directory |
| All 4 source files' content included | Line count ≈ 2396 lines |
| Clear section comments added | Search for `<!-- SECTION: -->` markers |
| NHANES comment at top | First line contains comment |
| Markdown formatting resolved | No broken code blocks or tables |
| No content details changed | Compare with source files |
| Renderable markdown | Visual inspection valid |

---

## Section Order

1. Front Matter (if present in Part 1)
2. Introduction (from Manuscript_part1.md)
3. Review of Literature (from manuscript_part2.md)
4. Methodology (from manuscript_part3.md)
5. Expert Interviews (from Transcript.md)
6. References (consolidated from all parts)

---

## Technical Notes

- **Format**: Plain text with markdown formatting
- **Comment Style**: HTML comments `<!-- -->` (not visible in rendered output)
- **Section Dividers**: Horizontal rules `---` between major sections
- **Target Audience**: AI systems needing cross-referencing capabilities

---

## Risk Considerations

| Risk | Mitigation |
|------|------------|
| Content loss | Compare line counts before/after merge |
| Format corruption | Use HTML comments (not markdown headers) |
| Reference duplication | Consolidate references manually |
| Heading conflicts | Review and normalize hierarchy |

---

## Verification Checklist

- [ ] Target file `manuscript.md` created in root
- [ ] All source files remain intact in `splitPaper/`
- [ ] NHANES comment present as first line
- [ ] All 4 sections marked with `<!-- SECTION: -->`
- [ ] Section dividers (`---`) present between sections
- [ ] No broken code blocks (verify ``` fences)
- [ ] No broken tables (verify pipe formatting)
- [ ] Line count within acceptable range (2300-2500)
- [ ] All citations preserved exactly
- [ ] No content details modified

---

**Generated**: 2026-01-31
**From**: ralph/manuscript-merge/PRD.md
