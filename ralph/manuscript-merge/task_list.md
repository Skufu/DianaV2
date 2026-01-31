# Task List: Manuscript File Merger

> **Format**: Each task must be a single `- [ ]` line with a verifiable outcome or file creation.

---

## Prerequisites
- [x] Subtask: Read ralph/manuscript-merge/PRD.md - Verify file exists and is readable
- [x] Subtask: Verify PRD.md contains key requirements - Check for target file name, section order, line count requirements
- [x] Subtask: Document requirements summary - Create ralph/manuscript-merge/prd_summary.md with extracted constraints
- [x] Verify all source files exist: splitPaper/*.md

---

## Phase 1: Content Extraction & Analysis (CRITICAL)

- [x] Extract full content from splitPaper/Manuscript_part1.md - Read complete file
- [ ] Extract full content from splitPaper/manuscript_part2.md - Read complete file
- [ ] Extract full content from splitPaper/manuscript_part3.md - Read complete file
- [ ] Extract full content from splitPaper/Transcript.md - Read complete file
- [ ] Identify markdown formatting issues in all files - Note broken code blocks, tables

---

## Phase 2: Structured Merging (HIGH)

- [ ] Create manuscript.md with NHANES comment header - Add `<!-- NHANES should now be the data -->`
- [ ] Merge Manuscript_part1.md content - Add with `<!-- SECTION: Introduction -->` comment
- [ ] Merge manuscript_part2.md content - Add with `<!-- SECTION: Review of Literature -->` comment
- [ ] Merge manuscript_part3.md content - Add with `<!-- SECTION: Methodology -->` comment
- [ ] Merge Transcript.md content - Add with `<!-- SECTION: Expert Interviews -->` comment
- [ ] Consolidate References section - Merge all references from all parts

---

## Phase 3: Formatting Cleanup (HIGH)

- [ ] Fix broken code blocks - Ensure proper ```markdown fences
- [ ] Fix table formatting - Correct pipe separators and alignment
- [ ] Normalize heading levels - Ensure consistent #, ##, ### hierarchy
- [ ] Fix list formatting - Ensure consistent bullet points and numbering
- [ ] Add section dividers - Use `---` between major sections

---

## Phase 4: Verification (MEDIUM)

- [ ] Verify all content from source files included - Check line counts match
- [ ] Verify section comments are present - All sections marked with <!-- SECTION: Name -->
- [ ] Verify NHANES comment at top - First line of manuscript.md
- [ ] Verify no content details changed - Compare with source files
- [ ] Verify markdown renders correctly - Check with markdown linter if available

---

## Final

- [ ] Verify manuscript.md exists in root directory - File created successfully
- [ ] Total lines ≈ 2400 (sum of all source files) - Acceptable range: 2300-2500 lines
- [ ] All sections properly commented - AI-friendly navigation markers present

---

## Reference

```markdown
# Section Comments Format
<!-- SECTION: [Section Name] -->

# NHANES Comment (must be first line)
<!-- NHANES should now be the data -->

# Major Section Dividers
---

# File Locations
Source: splitPaper/
Target: manuscript.md (root directory)

# Content Order
1. Front Matter (if any)
2. Introduction (Part 1)
3. Review of Literature (Part 2)
4. Methodology (Part 3)
5. Expert Interviews (Transcript)
6. References (consolidated from all parts)
```

---

> **Task Format Rules**:
> 1. Each task MUST start with `- [ ]`
> 2. Include specific file names for verification
> 3. Keep descriptions under 80 chars
> 4. Use `[x]` for complete, `[BLOCKED]` for blocked
> 5. Mark verifiable outcomes (file creation, specific fixes)
