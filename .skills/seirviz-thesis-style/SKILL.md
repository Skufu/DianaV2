---
name: seirviz-thesis-style
description: Rewrites thesis and methodology chapters in a formal, citation-driven academic style modeled on the SEIRViz paper without copying text verbatim.
risk: low
source: local
date_added: '2026-03-19'
---

# seirviz-thesis-style

Use this skill to restyle existing thesis prose so it reads like a formal academic manuscript with steady transitions, citation-backed claims, and explicitly structured methodology writing.

## Use this skill when

- Rewriting `METHODOLOGY.md` or related thesis chapters
- Converting technical notes into chapter-ready academic prose
- Making methodology sections sound more like a polished manuscript
- Preserving factual content while upgrading tone, cohesion, and presentation

## Do not use this skill when

- The user wants exact imitation or sentence-level copying from the source paper
- The source content is missing citations or factual support
- The task is to invent methods, results, or references that do not exist
- The task is casual writing, UI copy, or non-academic documentation

## Style fingerprint

### Voice and tone
- Formal, thesis-like, and explanatory
- Confident but not flashy
- Written in third-person academic voice
- Emphasizes justification: state what was done, then why it is appropriate

### Sentence behavior
- Prefer medium-to-long sentences with clear logical flow
- Frequently use transition-led openings such as: `Furthermore,`, `Moreover,`, `In addition,`, `Consequently,`, `Overall,`, `This phase`, `This study`, `The dataset`
- Use appositive explanations and clarifying dependent clauses
- Keep claims explicit rather than implied

### Paragraph behavior
- Start with a topic sentence naming the concept, phase, or procedure
- Follow with 2-4 supporting sentences explaining rationale, inputs, or implications
- End by tying the method back to study objectives, interpretability, or clinical usefulness

### Section organization
- Prefer clear chapter/subsection labels such as `Research Design`, `Research Locale`, `Population of the Study`, `Phase 1`, `Phase 2a`
- Introduce each phase or subsection before listing detailed mechanics
- When a process is multi-step, narrate the pipeline before or after the enumerated steps

### Figures and tables
- Introduce visuals explicitly in prose before or after they appear
- Refer to visuals by functional purpose, not only by number
- Explain what the figure/table demonstrates for the methodology

### Citation behavior
- Anchor factual or clinical claims with citations in parentheses
- Citations usually appear near the end of the relevant sentence
- Do not overload every sentence; cite the claim-heavy ones

## Non-negotiable safeguards

1. Never copy distinctive phrases or full sentences from the reference paper.
2. Preserve the user's factual content, data, and structure unless asked to change them.
3. If the source chapter lacks evidence for a claim, flag it instead of fabricating a citation.
4. Keep domain accuracy above stylistic similarity.
5. Improve grammar and coherence, but do not change the scientific meaning.

## Rewrite workflow

1. Read the target chapter section.
2. Identify the section's factual spine: objective, inputs, procedure, outputs, validation.
3. Rewrite in a formal academic voice using the style fingerprint above.
4. Add transitions only where they improve flow.
5. Keep headings, numbering, figures, and tables aligned with the existing chapter unless asked otherwise.
6. After rewriting, run this check:
   - Does the section sound thesis-like and citation-aware?
   - Did any sentence become too close to the source paper's wording?
   - Did the meaning remain identical?

## Output requirements

- Produce clean Markdown
- Preserve headings unless instructed to restructure
- Prefer concise academic paragraphs over bullet-heavy explanation, except for criteria, steps, or evaluation rules
- If citations are placeholders or missing, mark them clearly instead of inventing sources

## Recommended prompt pattern

`Rewrite this methodology section using the seirviz-thesis-style skill. Preserve all facts, structure, tables, and figures. Upgrade only the prose, transitions, and academic tone. Do not copy wording from the source paper. Flag unsupported claims instead of inventing citations.`
