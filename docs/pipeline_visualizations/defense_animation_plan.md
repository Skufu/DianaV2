# DIANA Thesis Defense Animation Plan

## Purpose

Create a new animated HTML slide sequence for the thesis defense. The animation should be a concise defense-facing version of the existing pipeline animation, not a full manuscript reproduction.

Target output file for the animation AI:

`docs/pipeline_visualizations/defense_animation.html`

Reference implementation style:

`docs/pipeline_visualizations/animation.html`

The new animation should keep the same fullscreen p5.js style, keyboard controls, progress bar, and dark clinical AI visual language, but it should use a shorter, clearer defense narrative.

## Source of Truth

Use these sources in this priority order:

1. Current Chapter 3 and Chapter 4 evidence:
   `docs/07-research/thesis-drafts/ch3+4-final-academic-draft.md`

2. Chapter 1 and Chapter 2 framing only:
   `/Users/adriangabriellfrancisco/Downloads/DRAFT CHAP 4-5 - Copy (1).pdf`

3. Existing animation structure and visual pattern:
   `docs/pipeline_visualizations/animation.html`

Important: the PDF contains stale Chapter 3 and Chapter 4 content. Use the PDF only for the Introduction, Background, Objective, Rationale, Scope, Conceptual Framework, and Review of Literature framing. Do not use its Methodology, Results, Conclusion, or Recommendation sections as the factual basis for this animation.

## Core Defense Message

DIANA is a screening-support prototype for identifying current Type 2 Diabetes or prediabetes risk among postmenopausal women. It combines NHANES-derived biomarker and lifestyle data, leakage-safe machine learning, cluster-based subtype context, explainability support, and a working web application.

The strongest methodological claim is not just model accuracy. The strongest claim is that DIANA separates diagnostic label construction from predictor inputs, validates the model across NHANES survey cycles, and presents the result as screening support rather than diagnosis.

## Mandatory Accuracy Guardrails

Use these guardrails in all slide text and narration:

- Say "screening-support system" or "risk stratification support", not "diagnostic system".
- Say "current risk screening" or "current prediabetes/diabetes risk", not "future disease forecasting".
- Do not claim that DIANA predicts how many years before a user develops diabetes.
- Do not say HbA1c or fasting blood sugar are model predictors.
- HbA1c and fasting blood sugar may be described as reference-label or clinical interpretation variables.
- The active screening model excludes diagnostic glycemic predictors to reduce circular prediction.
- Do not claim formal UAT, expert review, accessibility audit, or production load testing as completed.
- Do not present Ahlqvist-inspired subtype labels as validated biological diabetes subtypes.
- Do not present SHAP as causal explanation. It is feature-attribution support.
- Do not claim external clinical validation. The current validation is internal temporal validation across NHANES releases.

## Mandatory Numbers and Facts

Use these exact values where relevant:

- Dataset source: NHANES public data repository
- Included releases: 2009-2010, 2011-2012, 2013-2014, 2015-2016, 2017-2018, and 2021-2023
- Excluded release: 2019-2020, due to NHANES pandemic disruption
- Final analytic cohort: 1,376 postmenopausal women
- Normal cases: 642
- Pre-diabetic cases: 457
- Diabetic cases: 277
- Binary at-risk cases: 734
- Binary at-risk proportion: 53.3%
- Active model: Logistic Regression
- Pooled AUC-ROC: 0.737, or 0.7366 if using four decimals
- AUC 95% CI: 0.710-0.763
- Sensitivity: 0.748
- Sensitivity 95% CI: 0.717-0.776
- Specificity: 0.590
- Optimized threshold: 0.465
- F1 score: 0.710
- Fold AUC range: 0.711-0.788
- Threshold policy: Youden's J in 5 of 6 folds, guardrail nearest feasible in 1 of 6 folds
- At-risk clustering subset: 734 cases
- Clustering method: weighted K-Means, K = 4
- Cluster labels: SIRD-like, SIDD-like, MOD-like, MARD-like
- Functional test evidence: backend Go suite passed, Python ML suite passed with 270 tests, frontend unit and contract suite passed with 232 tests
- Frontend coverage: 71.26% lines/statements, 60.58% branches, 44.24% functions

## Visual Style

Use the existing `animation.html` as the visual base:

- Fullscreen p5.js canvas
- Dark navy or near-black background
- Clinical cyan, blue, teal, green, amber, and restrained red accents
- Glowing but readable nodes and data paths
- Large text suitable for projector display
- Minimal paragraph text
- Strong visual hierarchy
- Scene counter and progress bar
- Controls: Space to pause, left and right arrows to navigate, R to restart

Avoid:

- Generic purple gradient startup style
- Dense manuscript text
- Long bullet lists
- Overly decorative medical icons
- Claims that cannot fit on screen or be defended verbally

## Recommended Scene Count

Use 10 scenes. The existing `animation.html` has 16 scenes, but the defense version should be tighter.

Suggested total runtime if auto-played manually:

- 60 to 90 seconds
- 6 to 10 seconds per scene

## Scene 1: Opening Title

### Purpose

Establish the thesis topic and the clinical-computing contribution.

### On-screen text

Title:

`DIANA`

Subtitle:

`A screening-support application for Type 2 Diabetes risk among postmenopausal women`

Small line:

`NHANES data | Leakage-safe ML | Cluster context | Explainable web workflow`

### Visual idea

Start with a dark field and subtle biomarker particles. Particles form the word `DIANA`, then separate into four streams labeled data, model, subtype, and system.

### Speaker point

"DIANA is positioned as a screening-support prototype, not a diagnostic device."

## Scene 2: Problem Context

### Purpose

Use Chapter 1-2 framing to explain why the study matters.

### On-screen text

Main claim:

`T2DM risk often develops silently, while menopausal transition changes metabolic risk.`

Three short labels:

- `Insulin resistance`
- `Central adiposity`
- `Lipid changes`

### Visual idea

Show a simple silhouette or abstract patient profile. Animate three metabolic signals moving around it: glucose regulation, body composition, and lipid profile. Do not over-medicalize the visual.

### Speaker point

"The literature frames menopause as a metabolic transition that can increase vulnerability, especially when combined with lifestyle and cardiometabolic risk factors."

## Scene 3: Research Gap

### Purpose

Convert Chapter 1-2 gaps into a clear defense problem.

### On-screen text

Heading:

`Gap addressed by DIANA`

Three cards:

- `Menopause-focused risk modeling is limited`
- `Risk tools often do not expose subgroup patterns`
- `Predictive outputs need clear visual decision support`

### Visual idea

Show three incomplete panels fading in. A DIANA pipeline line connects them into one continuous workflow.

### Speaker point

"The study integrates biomarker-based modeling, subtype context, and user-facing visualization in one implemented system."

## Scene 4: Study Objective

### Purpose

Summarize the objective without copying the long objective section.

### On-screen text

Heading:

`Objective`

Body:

`Develop DIANA to classify current Type 2 Diabetes or prediabetes risk among postmenopausal women and present interpretable risk context through a web application.`

Three objective chips:

- `Feature relevance`
- `Risk screening and clustering`
- `Visualization and reporting`

### Visual idea

Three objective chips lock into a central DIANA node.

### Speaker point

"The system turns patient-entered metabolic and lifestyle data into risk screening output, subtype context when applicable, and visual interpretation."

## Scene 5: Updated Methodology Pipeline

### Purpose

Show the current Chapter 3 methodology, not the stale PDF methodology.

### On-screen text

Heading:

`Methodological flow`

Pipeline labels:

1. `NHANES releases`
2. `Postmenopausal cohort`
3. `Reference labels`
4. `Leakage-safe preprocessing`
5. `Nested LOGO validation`
6. `Model selection`
7. `Web integration`

Key number:

`Final analytic cohort: n = 1,376`

### Visual idea

Use a horizontal or curved flow. Show six NHANES cycle nodes entering a cohort filter, then narrowing to `1,376`.

### Speaker point

"The current methodology uses six NHANES releases and a conservative validation design by survey cycle."

## Scene 6: Leakage Prevention

### Purpose

Make the strongest methodological safety point visually memorable.

### On-screen text

Heading:

`Leakage prevention`

Left side:

`Used for labels and clinical interpretation`

Items:

- `HbA1c`
- `Fasting blood sugar`

Right side:

`Excluded from predictors`

Items:

- `No circular glycemic prediction`
- `No diagnostic shortcut`
- `Proxy-leakage check passed`

Bottom line:

`Highest proxy correlation: triglycerides r = 0.3241, below the 0.95 leakage threshold`

### Visual idea

Animate HbA1c and FBS entering the label construction box, then a gate blocks them from entering the predictor feature set. Non-diagnostic features pass through.

### Speaker point

"DIANA's performance was not obtained by giving the model the same diagnostic glycemic markers used to define the label."

## Scene 7: Validation Strategy

### Purpose

Explain Leave-One-Group-Out validation in a defense-friendly way.

### On-screen text

Heading:

`Nested temporal validation`

Body:

`Train on five NHANES releases, test on one unseen release. Repeat until every release is held out once.`

Six cycle labels:

- `2009-2010`
- `2011-2012`
- `2013-2014`
- `2015-2016`
- `2017-2018`
- `2021-2023`

### Visual idea

Show six cycle nodes. Five turn green as training data, one turns red as held-out test data. Rotate the red test node across releases.

### Speaker point

"This is more conservative than random splitting because the model must generalize across survey periods."

## Scene 8: Model Results

### Purpose

Present the core Chapter 4 results plainly.

### On-screen text

Heading:

`Selected screening model: Logistic Regression`

Metric cards:

- `AUC-ROC 0.737`
- `Sensitivity 0.748`
- `Specificity 0.590`
- `Threshold 0.465`

Small line:

`AUC 95% CI: 0.710-0.763 | Fold AUC range: 0.711-0.788`

Threshold badge:

`Youden's J: 5/6 folds | Guardrail: 1/6 fold`

### Visual idea

Animate six small fold bars, then aggregate them into four metric cards. The 2021-2023 fold can show an amber guardrail marker.

### Speaker point

"Logistic Regression was selected because it gave the best balance of discrimination, interpretability, threshold behavior, and efficient inference."

## Scene 9: Two-Stage Screening and Subtype Context

### Purpose

Clarify that subtype assignment is gated and cautious.

### On-screen text

Heading:

`Two-stage output`

Flow:

`Assessment input -> Binary screening -> If at-risk only -> Weighted K-Means subtype context`

Subtype labels:

- `SIRD-like`
- `SIDD-like`
- `MOD-like`
- `MARD-like`

Caution line:

`Subtype labels are Ahlqvist-inspired context, not biological diagnoses.`

### Visual idea

Show a decision node: normal outputs stop with "no disease-pattern subtype"; at-risk outputs continue into four cluster regions.

### Speaker point

"The system avoids assigning disease-pattern labels to users classified as normal."

## Scene 10: Integrated System and Closing Claim

### Purpose

End with the implemented system and the exact defensible claim.

### On-screen text

Heading:

`Implemented screening-support workflow`

Architecture labels:

- `React frontend`
- `Go API`
- `Python ML service`
- `PostgreSQL`

Output labels:

- `Risk probability`
- `Risk category`
- `Subtype context`
- `Model lineage`
- `Explanation when available`
- `Trends and PDF report`

Final claim:

`DIANA is a technically implemented screening-support prototype with promising internal temporal validation.`

Final caution:

`External validation, formal UAT, expert review, accessibility audit, and load testing remain future work.`

### Visual idea

Animate a user assessment flowing through the four-tier architecture and returning a layered result card. End with the final claim centered on screen.

### Speaker point

"The contribution is an implemented, conservative, explainable screening-support workflow, not a standalone diagnostic replacement."

## Optional Backup Scene: Testing Evidence

Use only if the defense slide sequence can support 11 scenes.

### On-screen text

Heading:

`Technical verification`

Cards:

- `Backend Go suite: PASS`
- `Python ML suite: 270 tests PASS`
- `Frontend suite: 232 tests PASS`
- `Coverage gates: PASS`

Readiness caveat:

`Redis integration, formal UAT, accessibility audit, expert review, and production load testing remain pending.`

### Visual idea

Show three system layers receiving check marks, then a separate "pending evidence" queue.

## Data Constants for Animation Code

The animation AI can embed these values directly.

```js
const cycles = [
  "2009-2010",
  "2011-2012",
  "2013-2014",
  "2015-2016",
  "2017-2018",
  "2021-2023"
];

const foldData = [
  { cycle: "2009-2010", auc: 0.711, sensitivity: 0.761, specificity: 0.581, threshold: 0.47, strategy: "Youden's J" },
  { cycle: "2011-2012", auc: 0.713, sensitivity: 0.634, specificity: 0.718, threshold: 0.49, strategy: "Youden's J" },
  { cycle: "2013-2014", auc: 0.736, sensitivity: 0.727, specificity: 0.567, threshold: 0.47, strategy: "Youden's J" },
  { cycle: "2015-2016", auc: 0.788, sensitivity: 0.772, specificity: 0.679, threshold: 0.48, strategy: "Youden's J" },
  { cycle: "2017-2018", auc: 0.738, sensitivity: 0.735, specificity: 0.637, threshold: 0.47, strategy: "Youden's J" },
  { cycle: "2021-2023", auc: 0.731, sensitivity: 0.856, specificity: 0.449, threshold: 0.41, strategy: "Guardrail nearest feasible" }
];

const headlineMetrics = {
  auc: 0.7366,
  aucCI: "0.710-0.763",
  sensitivity: 0.748,
  sensitivityCI: "0.717-0.776",
  specificity: 0.590,
  threshold: 0.465,
  f1: 0.710
};

const cohort = {
  total: 1376,
  normal: 642,
  prediabetic: 457,
  diabetic: 277,
  atRisk: 734,
  atRiskPercent: "53.3%"
};

const clusters = [
  { label: "SIRD-like", count: 77, percent: "10.5%" },
  { label: "SIDD-like", count: 199, percent: "27.1%" },
  { label: "MOD-like", count: 226, percent: "30.8%" },
  { label: "MARD-like", count: 232, percent: "31.6%" }
];
```

## Suggested AI Prompt

Use this prompt when asking another AI to create the animation:

```text
Create a new self-contained HTML animation file at docs/pipeline_visualizations/defense_animation.html.

Use docs/pipeline_visualizations/animation.html as the implementation and visual reference. Keep the p5.js fullscreen canvas style, dark clinical theme, keyboard controls, scene counter, and progress bar.

Build a shorter 10-scene thesis-defense animation using docs/pipeline_visualizations/defense_animation_plan.md as the content source. Use the current Chapter 3-4 facts from docs/07-research/thesis-drafts/ch3+4-final-academic-draft.md and use the PDF only for Chapter 1-2 problem framing.

Do not claim DIANA is diagnostic. Do not claim future forecasting. Do not claim completed UAT, expert review, accessibility audit, or production load testing. Do not use stale Chapter 3-4 content from the PDF.

The animation should be readable on a projector, fit all content inside the viewport, and communicate the core defense story in 60-90 seconds.
```

## Final Quality Checklist

Before using the animation in defense:

- All text fits at 1920x1080 and 1280x720.
- Text remains readable on projector scale.
- Keyboard navigation works.
- `Space`, `Left`, `Right`, and `R` controls work.
- The animation can be opened as a local HTML file.
- No stale PDF Chapter 3-4 claims appear.
- No diagnostic or future-forecasting claim appears.
- Results match the current Chapter 3-4 markdown.
- Pending evaluation items are clearly framed as pending.
- Subtype labels are described as contextual and Ahlqvist-inspired, not validated diagnoses.
