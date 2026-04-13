# Methodology style workflow

This workflow applies the local `seirviz-thesis-style` skill to `ch3+4.md` without copying text from the reference paper.

## Objective

Retain the DIANA chapter's factual content, phase structure, tables, figures, and methodological claims while shifting the prose toward a more polished, citation-aware, thesis-manuscript tone.

## Recommended use

Rewrite the chapter one subsection at a time instead of regenerating the full document in one pass.

Suggested order:

1. Phase introductions
2. Section lead paragraphs
3. Subsection rationale paragraphs
4. Figure/table lead-ins
5. Criteria lists and evaluation paragraphs

## Section rewrite prompt

Use this prompt for each section:

> Rewrite the following section using the `seirviz-thesis-style` skill. Preserve all facts, headings, numbering, tables, figures, and technical meaning. Improve only the academic tone, transitions, paragraph cadence, and methodological framing. Do not copy wording from the source paper. If a sentence makes a claim that needs citation support, flag it instead of inventing a citation.

## Mapping to `ch3+4.md`

The current chapter already has strong phase-based organization. The most valuable style upgrades are:

- opening paragraphs under each `## Phase` heading
- rationale paragraphs under each `###` and `####` subsection
- narrative lead-ins before figures, tables, and bullet lists
- transitions between method choice and justification

## Editing rules

- Preserve all numbers, thresholds, counts, filenames, and implementation references unless separately verified
- Preserve Mermaid blocks exactly unless the user asks for diagram changes
- Preserve tables unless only prose around them is being refined
- Prefer paragraph rewrites over structural reorganization

## Quality check before accepting a rewrite

- The rewritten section reads more like formal thesis prose
- The meaning is unchanged
- The prose does not sound copied from SEIRViz
- Citations were preserved or clearly flagged as needed
- No technical detail from DIANA was lost

## Candidate prompt for the full chapter

> Apply `seirviz-thesis-style` to `ch3+4.md` section by section. Preserve the entire methodological content of DIANA, including phases, figures, tables, thresholds, references to implementation files, and evaluation rules. Rewrite only the prose to sound more like a polished academic methodology chapter. Avoid verbatim reuse from SEIRViz and flag unsupported claims instead of inventing citations.
