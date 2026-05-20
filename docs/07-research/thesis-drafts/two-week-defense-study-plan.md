# DianaV2 Two-Week Defense Course

## What This Course Is For

This is a targeted two-week reading and practice course for defending DianaV2. It is written to make you ready to explain the project under pressure, not just remember isolated facts.

The goal is that after fourteen days you can:

- Explain the full DianaV2 research pipeline without notes.
- Defend the target label and HbA1c/FBS circularity issue clearly.
- Recite the main model numbers and interpret them honestly.
- Explain why the current model is a screening classifier, not a diagnostic or future-onset predictor.
- Explain clustering and SHAP without overclaiming.
- Draw the frontend/backend/ML architecture from memory.
- State limitations before the panel asks.
- Answer hard questions in short, controlled, examiner-safe language.

## The Defense Position To Memorize

DianaV2 is a full-stack, clinically cautious screening and explainability system for Type 2 Diabetes risk classification in postmenopausal women. It uses a non-circular 9-feature model that excludes HbA1c and fasting blood sugar from prediction because those biomarkers are used to define the ground-truth label. The selected model is Logistic Regression, validated using nested Leave-One-NHANES-Cycle-Out cross-validation, with AUC about 0.737 and sensitivity about 0.748. SHAP is used to explain model behavior, and K-Means clustering is used to describe heuristic metabolic subgroups among at-risk users. The system is not a diagnosis, not causal proof, and not ready for clinical deployment without external and prospective validation.

That paragraph is the center of your defense. Everything else is detail.

## The Project In One Sentence

DianaV2 classifies current biomarker-defined diabetes risk in postmenopausal women using non-circular metabolic and lifestyle features, explains the model output with SHAP, enriches at-risk cases with heuristic metabolic subtypes, and delivers the result through a React, Go, and Python full-stack application.

## The Project In Two Minutes

My thesis focuses on diabetes-risk screening in postmenopausal women, a population where metabolic changes after menopause can increase insulin resistance, adiposity, and cardiometabolic risk. The project uses NHANES data, filtered to postmenopausal women aged 45 to 60, and builds a current-state screening classifier rather than a future disease forecast.

The label is based on ADA-style glycemic criteria using HbA1c and fasting blood sugar, where normal is separated from at-risk status by collapsing prediabetic and diabetic categories into one binary at-risk class. Because HbA1c and fasting blood sugar define the label, the final screening model excludes them from the predictor set. That is the core leakage and circularity defense.

The selected model is Logistic Regression using nine features: BMI, triglycerides, LDL, HDL, age, waist circumference, smoking, physical activity, and alcohol use. It is validated using nested Leave-One-NHANES-Cycle-Out cross-validation with GroupKFold inside the training folds. The main result is AUC about 0.737, with 95% CI about 0.710 to 0.763, sensitivity about 0.748, specificity about 0.590, accuracy about 0.674, and F1 about 0.710.

The system also includes SHAP explanations for feature attribution and K-Means clustering for heuristic metabolic subtype enrichment. These are support tools: SHAP explains model behavior, not causality, and clustering describes data patterns, not validated disease subtypes.

Finally, DianaV2 is implemented as a full-stack application with a React frontend, Go backend, and Python ML service. The backend normalizes assessment results, manages risk score and risk level semantics, and treats the ML service response as part of a controlled application contract. The main limitation is that the model still needs external, prospective, and clinical validation before real-world use.

## Numbers You Must Know

Memorize these exactly enough to say them confidently:

- Population: postmenopausal women, age 45-60, NHANES.
- Task: binary classification, Normal vs At-Risk.
- Positive class: Pre-diabetic + Diabetic collapsed into At-Risk.
- Label source: HbA1c and fasting blood sugar criteria.
- Screening features: 9 non-circular features.
- Excluded from final predictors: HbA1c and fasting blood sugar.
- Selected model: Logistic Regression.
- Validation: Nested LOGO CV, outer Leave-One-NHANES-Cycle-Out, inner GroupKFold.
- Decision threshold: about 0.465.
- AUC: 0.737.
- AUC 95% CI: 0.710 to 0.763.
- Accuracy: 0.674.
- Sensitivity: 0.748.
- Sensitivity 95% CI: 0.717 to 0.776.
- Specificity: 0.590.
- PPV: 0.676.
- NPV: 0.672.
- F1: 0.710.
- Brier score: 0.2087.
- Expected calibration error: 0.0563.
- Clustering: weighted K-Means, K=4 selected for Ahlqvist-style mapping.
- Silhouette result: K=2 was optimal by silhouette, so K=4 must be defended as literature-aligned and heuristic.
- Silhouette score at K=4: 0.1762 (on 734 at-risk samples).
- Samples clustered: 734 (at-risk subset only).
- Metabolic syndrome boost: 3+ ATP III criteria → floor probability to 0.65; 2 criteria → +0.15.
- Confidence threshold: probability < 0.60 → "Indeterminate" (Tanabe et al. 2024).
- FINDRISC benchmark AUC: 0.849 (higher than DIANA — know this and be ready to explain why).
- ADA Risk Test benchmark AUC: 0.589 (lower than DIANA).
- PSI drift thresholds: <0.1 none, 0.1-0.2 low, 0.2-0.25 medium, >0.25 high.

## The Nine Features

The active `binary_v2_no_bp` model uses:

- `bmi`
- `triglycerides`
- `ldl`
- `hdl`
- `age`
- `waist_circumference`
- `smoking_encoded`
- `activity_encoded`
- `alcohol_encoded`

Say this when challenged:

> The final screening model deliberately excludes HbA1c and fasting blood sugar because those define the label. The remaining features are metabolic, anthropometric, age, and lifestyle variables that are plausible screening predictors without directly encoding the diagnostic threshold.

## What Not To Say

Avoid these claims:

- Do not say the model diagnoses diabetes.
- Do not say the model predicts future diabetes onset.
- Do not say SHAP proves biological causation.
- Do not say clusters are validated clinical subtypes.
- Do not say AUC 0.737 is clinically sufficient by itself.
- Do not say the app is deployment-ready for clinical care.
- Do not say the model is leak-proof in a casual way; say the pipeline includes explicit leakage safeguards.

## How To Study Each Day

Each day has the same rhythm:

1. Read the lesson section slowly.
2. Close the document and write the answer from memory.
3. Say the answer aloud in under two minutes.
4. Answer the defense questions without notes.
5. Mark one weak point to fix the next day.

If time is short, do not reread passively. Speak the answers aloud. Defense readiness is a speaking skill.

## Day 1: Research Story And Thesis Identity

### What You Are Learning

Today you learn the story of the project. The panel needs to understand what problem you solved, why the population matters, what the system does, and what you are claiming.

### Read This

DianaV2 stands for Diabetes Intelligent Analysis for Menopausal Women. The project is about Type 2 Diabetes risk classification in postmenopausal women. The word "predictive" must be used carefully. In this thesis, predictive means the model classifies current diabetes-risk status based on available screening features. It does not mean the model forecasts future onset over time.

The target population is postmenopausal women aged 45 to 60. Postmenopause is clinically defined as at least 12 consecutive months without menstruation. This is a useful population because postmenopause creates a more stable hormonal state than perimenopause, where hormone levels fluctuate. The population is also clinically meaningful because estrogen decline is associated with changes in body fat distribution, insulin resistance, lipid metabolism, and cardiometabolic risk.

The core thesis contribution is not only an ML model. It is an end-to-end system that connects data processing, leakage defense, supervised classification, validation, explainability, clustering, backend integration, and frontend presentation. That matters because a thesis defense panel will not only ask "What was your AUC?" They will ask whether the model was constructed fairly, whether the label makes sense, whether the output can be interpreted, whether the system can be used responsibly, and what its limits are.

The safest framing is:

> DianaV2 is a screening-oriented decision-support system. It helps classify current at-risk status and explain the model output. It does not diagnose diabetes, replace a clinician, or prove future disease onset.


### The "Why Not Just a Doctor?" Defense

You may be asked: *"If a doctor can just look at BMI, waist, and age to know risk, why build this ML model?"*

Your defense: DianaV2 is a scalable **triage tool**, not a replacement for clinicians. It is designed to flag individuals who might not realize they need an HbA1c test yet. Furthermore, the heuristic clustering (SIRD-like/MOD-like) provides immediate personalized context that a standard BMI chart does not, making the screening actionable.

### What You Must Be Able To Explain

You must explain why the work matters:

- Diabetes and prediabetes are clinically important because early identification can support lifestyle and medical follow-up.
- Postmenopausal women are a focused population with meaningful metabolic changes.
- A screening classifier can help prioritize attention, but it must be interpreted carefully.
- Explainability matters because users and clinicians need to understand why a model produced a risk output.
- A full-stack system matters because it shows how research output can be translated into an application workflow.

### Memory Script

> My thesis is about DianaV2, a diabetes-risk screening and explainability system for postmenopausal women. It uses NHANES data from women aged 45 to 60 and classifies current at-risk status, where prediabetic and diabetic labels are collapsed into one at-risk class. The final model avoids circularity by excluding HbA1c and fasting blood sugar from the predictors because those biomarkers define the ground truth. Beyond the model, the project includes validation, SHAP explanations, heuristic metabolic clustering, and a full-stack application with React, Go, and Python services. The system is decision support for screening, not diagnosis.

### Active Recall

Write from memory:

- The population.
- The task.
- The label.
- The model type.
- The system layers.
- The limitation.

Then say the whole thesis in 30 seconds, 2 minutes, and 5 minutes.

### Defense Questions

- What is your thesis about?
- Why menopausal women?
- Why postmenopausal only?
- Is this a diagnostic system?
- What is your main contribution?

### Passing Standard

You are ready for Day 2 when you can explain the project in two minutes without notes and without saying "diagnosis" as the main claim.

## Day 2: Dataset, Cohort, And Full Pipeline

### What You Are Learning

Today you learn how raw data becomes a model and then becomes a user-facing prediction.

### Read This

The data source is NHANES, the National Health and Nutrition Examination Survey. The cohort is filtered to postmenopausal women aged 45 to 60. Premenopausal and perimenopausal women are excluded because the thesis is focused on a clearer postmenopausal state.

#### How Raw NHANES Data Becomes Your Dataset

The data processing script (`process_nhanes_multi.py`) pulls from **6 NHANES cycles**: 2021-2023 (L), 2017-2018 (J), 2015-2016 (I), 2013-2014 (H), 2011-2012 (G), and 2009-2010 (F). For each cycle, it merges 13+ SAS Transport (XPT) files: demographics (DEMO), glycohemoglobin (GHB), fasting glucose (GLU), total cholesterol (TCHOL), HDL (HDL), triglycerides (TRIGLY), body measures (BMX), blood pressure (BPX), reproductive health (RHQ), smoking (SMQ), physical activity (PAQ), alcohol (ALQ), and medical conditions (MCQ).

The inclusion filter chain applies four sequential filters:

1. **Female**: `RIAGENDR == 2`
2. **Age 45-60**: `45 ≤ RIDAGEYR ≤ 60`
3. **Postmenopausal**: `RHQ031 == 2` (Reproductive Health Questionnaire: "Have you had a period in the past 12 months?" — answer No)
4. **Complete glycemic data**: `dropna(subset=['LBXGH', 'LBXGLU'])` (requires both HbA1c and fasting glucose)

Lifestyle features are derived from raw NHANES questionnaire codes:
- **Smoking**: SMQ020 (ever smoked 100 cigarettes?) + SMQ040 (do you now smoke?) → Never/Former/Current
- **Physical Activity**: PAQ605/PAQ620/PAQ635/PAQ650/PAQ665 (vigorous/moderate work/recreation) → Sedentary/Moderate/Active
- **Alcohol**: ALQ101 (ever had 12+ drinks?) + ALQ120Q/ALQ120U (frequency) + ALQ130 (average drinks) → None/Light/Moderate/Heavy

If a panelist asks "How did you identify postmenopausal women?", say: **RHQ031 — the NHANES Reproductive Health Questionnaire item asking whether the participant had a menstrual period in the past 12 months. Answer code 2 means No.**

The pipeline has six major steps:

1. Data processing merges NHANES cycles and derives features.
2. Label construction creates the diabetes-risk target using HbA1c and fasting blood sugar criteria.
3. Leakage validation checks that diagnostic markers and proxy leakage are not entering the model.
4. Classifier training trains the binary `binary_v2_no_bp` model.
5. Clustering assigns heuristic metabolic subtype patterns for at-risk users.
6. Artifact validation checks that the trained model, metrics, thresholds, calibration, and clustering outputs are consistent.

The most important idea is separation. The label can use HbA1c and fasting blood sugar because those define glycemic status. The screening model cannot use them as predictors because that would make the model circular. The preprocessing pipeline also needs to avoid leakage by fitting imputation and scaling inside cross-validation, not on the full dataset before splitting.

The user-facing pipeline is:

Raw NHANES data -> cohort filtering -> feature engineering -> label construction -> leakage validation -> nested cross-validation -> trained model artifact -> Python ML service -> Go backend normalization -> React frontend result.


### The Missing Data & Imputation Trap

You must be ready to defend how missing data was handled, specifically for waist circumference. During training, imputation is kept inside the cross-validation pipeline to avoid leakage. During serving, DianaV2 adds a **BMI-concordant waist guardrail** when waist circumference is missing, because blindly inserting a population median waist can make a lean patient look artificially centrally obese. This preserves clinical face validity while keeping the training evaluation leakage-safe.

### What You Must Be Able To Explain

You must be able to draw the pipeline and explain the purpose of each step. The examiner should hear that you understand not only what script ran, but why each stage exists.

Data processing exists to create a consistent modeling table. Label construction exists to create the outcome. Leakage validation exists to prevent circular or contaminated evaluation. Nested validation exists to estimate generalization across NHANES cycles. The ML service exists to serve the trained artifact. The backend exists to enforce application contracts, persistence, and normalized output. The frontend exists to make the result understandable.

### Memory Script

> The pipeline starts with NHANES data filtered to postmenopausal women aged 45 to 60. The data-processing step derives clinical and lifestyle features, then the label is created using ADA-style HbA1c and fasting blood sugar criteria. Before training, the leakage validation step checks that diagnostic markers and strong proxies are not in the feature set. The model is trained with nested Leave-One-NHANES-Cycle-Out cross-validation, and the selected artifact is served by the Python ML service. The Go backend normalizes the prediction into the canonical assessment result, and the React frontend displays the risk score, risk level, explanation, and subtype information where appropriate.

### Active Recall

Draw the pipeline three times from memory:

- Research pipeline.
- Model training pipeline.
- Application request pipeline.

### Defense Questions

- Where did your data come from?
- What population did you include and exclude?
- What are the pipeline stages?
- Where can leakage happen?
- How does the model reach the frontend?

### Passing Standard

You are ready for Day 3 when you can draw the pipeline without looking and explain every arrow.

## Day 3: Labeling And Current-State Screening

### What You Are Learning

Today you learn how to explain the outcome label. This must be exact because vague label language creates the biggest defense risk.

### Read This

The target is binary:

- 0 = Normal
- 1 = At-Risk

The At-Risk class collapses prediabetic and diabetic cases into one positive class. The original glycemic categories come from HbA1c and fasting blood sugar criteria:

- Normal: HbA1c below 5.7% and fasting blood sugar below 100 mg/dL.
- Prediabetic: HbA1c 5.7-6.4% or fasting blood sugar 100-125 mg/dL.
- Diabetic: HbA1c at least 6.5% or fasting blood sugar at least 126 mg/dL.

The defense-safe phrase is "current-state screening classification." Do not call it future prediction unless you have longitudinal follow-up and time-to-event design. NHANES is cross-sectional for this purpose, so the system classifies current biomarker-defined status.

The label is clinically meaningful because HbA1c and fasting blood sugar are accepted glycemic markers. The limitation is that the model is tied to that operational definition. It is not a physician diagnosis, not a prospective endpoint, and not a causal disease model.


### The "Why Not Just a Doctor?" Defense

You may be asked: *"If a doctor can just look at BMI, waist, and age to know risk, why build this ML model?"*

Your defense: DianaV2 is a scalable **triage tool**, not a replacement for clinicians. It is designed to flag individuals who might not realize they need an HbA1c test yet. Furthermore, the heuristic clustering (SIRD-like/MOD-like) provides immediate personalized context that a standard BMI chart does not, making the screening actionable.

### What You Must Be Able To Explain

You must explain why collapsing prediabetes and diabetes into At-Risk is acceptable. The screening goal is to identify people who may need follow-up, not to perfectly separate prediabetes from diabetes. For a screening tool, identifying the broader at-risk group can be more useful than a three-class system if the downstream action is clinical review.

### Memory Script

> The outcome is a binary current-state screening label. Normal is coded as 0, while prediabetic and diabetic categories are collapsed into At-Risk coded as 1. The glycemic status is defined using HbA1c and fasting blood sugar thresholds. This is clinically reasonable because those are standard screening biomarkers, but it also means the model's claim is limited to classifying a biomarker-defined state. I do not present it as a future-onset predictor or standalone diagnosis.

### Active Recall

Write three versions of the label explanation:

- One sentence.
- One paragraph.
- One technical answer.

### Defense Questions

- What exactly is your target variable?
- Why did you collapse prediabetes and diabetes?
- Are you predicting future disease?
- Is this a clinical diagnosis?
- What is the weakness of this label?

### Passing Standard

You are ready for Day 4 when you can say "current-state screening classification" naturally and explain why future prediction would require longitudinal data.

## Day 4: HbA1c, FBS, Circularity, And Leakage

### What You Are Learning

Today is the most important methodology day. If you answer this poorly, the whole thesis can sound circular. If you answer it well, it becomes a strength.

### Read This

HbA1c and fasting blood sugar are used to define the ground-truth label. Therefore, the final screening model excludes HbA1c and fasting blood sugar from its predictor features.

This is the key defense:

> The model is not allowed to use the same diagnostic biomarkers that define the label. That is why the active screening feature set uses BMI, triglycerides, LDL, HDL, age, waist circumference, smoking, activity, and alcohol use instead.

Circularity and leakage are related but not identical.

Circularity means the predictor and label overlap conceptually or mathematically. Example: using HbA1c to predict an HbA1c-defined diabetes label.

Leakage means information that should not be available during prediction or evaluation enters the model. Example: fitting preprocessing on the full dataset before cross-validation, using test data for feature selection, or allowing diagnostic markers into a screening feature set.

DianaV2's leakage defense has three layers:

1. Static feature verification checks that diagnostic markers such as HbA1c and fasting blood sugar are absent from feature constants.
2. Proxy leakage detection checks correlations against the HbA1c threshold and flags features with extremely high correlation.
3. Information-gain validation checks whether selected features behave suspiciously compared with excluded features.

The validation gate exits with failure if a rule is violated. That is stronger than saying "we tried to avoid leakage"; it means leakage prevention is implemented as a pre-training control.

### What You Must Be Able To Explain

You must be able to say:

- The concern is valid.
- HbA1c and FBS define the label.
- The final model excludes them.
- The model therefore learns from non-diagnostic screening features.
- It is still limited because the label is biomarker-defined.
- The pipeline includes automated checks, not just manual intent.

### Memory Script

> The circularity concern is valid. If HbA1c or fasting blood sugar define the label and also appear as predictors, the model could simply learn the diagnostic rule. In DianaV2, the final screening model excludes HbA1c and fasting blood sugar from the predictor set. The active model uses nine non-circular features: BMI, triglycerides, LDL, HDL, age, waist circumference, smoking, activity, and alcohol. The pipeline also includes static feature checks, proxy leakage checks, and information-gain validation before training. So the model is best described as a non-circular current-state screening classifier, not a diagnostic shortcut.

### Active Recall

Answer this in writing:

> If HbA1c defines diabetes, why is your model not just detecting HbA1c?

Then answer it aloud in 60 seconds.

### Defense Questions

- Is HbA1c in your feature set?
- Is fasting blood sugar in your feature set?
- What is circularity?
- What is leakage?
- How does your pipeline prevent leakage?
- What would happen if HbA1c stayed in the predictors?

### Passing Standard

You are ready for Day 5 when you can answer the circularity challenge directly without sounding defensive.

## Day 5: Model Choice And Feature Rationale

### What You Are Learning

Today you learn why the selected model and selected features are reasonable.

### Read This

The final model is Logistic Regression. That is not a weakness. For a clinical screening system, interpretability, stable probabilities, fast inference, and clear validation can matter more than using a more complex model.

The nine features have clinical rationale:

- BMI captures general adiposity.
- Waist circumference captures central obesity and metabolic syndrome risk.
- Triglycerides reflect lipid metabolism and insulin-resistance patterns.
- LDL reflects atherogenic cardiovascular risk.
- HDL reflects protective lipid profile; lower HDL often tracks metabolic risk.
- Age captures risk changes within the 45-60 postmenopausal window.
- Smoking captures behavioral cardiometabolic risk.
- Physical activity captures protective insulin-sensitivity behavior.
- Alcohol use captures lifestyle exposure, including heavy-use risk.

The model excludes race to reduce demographic leakage and simplify the screening model. It excludes family history because of severe missingness in recent NHANES cycles. It excludes blood pressure in the no-BP model, which reduces dependency on clinical measurements that may be unavailable or inconsistent.

#### How Class Imbalance Is Handled (No SMOTE)

The training pipeline does **not** use SMOTE or any synthetic resampling. Instead, every model in the training registry uses `class_weight="balanced"` (or equivalent). This tells scikit-learn to upweight the minority class in the loss function without creating synthetic biomarker profiles. This is important because SMOTE can distort clinical distributions and can require additional post-hoc calibration before probabilities are interpretable. With `class_weight="balanced"`, calibration still has to be measured, but the pipeline avoids synthetic samples.

If asked "Why not SMOTE?", say: **`class_weight='balanced'` improves class balance in the loss function without generating synthetic patients. SMOTE can be useful in some ML tasks, but for clinical probabilities it can distort prevalence and would require careful post-hoc calibration.**

### What You Must Be Able To Explain

You must defend simplicity:

> Logistic Regression is appropriate because the thesis prioritizes defensibility, interpretability, and deployability. More complex models may improve performance in some settings, but they can also make explanation, calibration, and clinical trust harder.

### Memory Script

> Logistic Regression was selected because it performed competitively under the nested LOGO validation design while remaining interpretable and fast for deployment. The feature set is clinically plausible and deliberately non-circular. It includes metabolic, anthropometric, age, and lifestyle variables but excludes HbA1c and fasting blood sugar because they define the label. Class imbalance is handled via class_weight='balanced', not SMOTE, while calibration is evaluated separately.

### Active Recall

Create a feature rationale card for each of the nine features:

- Feature name.
- What it measures.
- Why it may relate to diabetes risk.
- What limitation it has.

### Defense Questions

- Why Logistic Regression?
- Why not a more complex model?
- Why these features?
- Why remove HbA1c and FBS?
- Why remove race or family history?
- How did you handle class imbalance? Why not SMOTE?

### Passing Standard

You are ready for Day 6 when you can defend Logistic Regression as a deliberate clinical engineering choice, not a fallback.

## Day 6: Metrics, Thresholds, And Clinical Interpretation

### What You Are Learning

Today you learn the main numbers and what they mean.

### Read This

The selected model performance:

- AUC: 0.7366, about 0.737.
- AUC 95% CI: 0.710 to 0.763.
- Accuracy: 0.674.
- Sensitivity: 0.748.
- Sensitivity 95% CI: 0.717 to 0.776.
- Specificity: 0.590.
- PPV: 0.676.
- NPV: 0.672.
- F1: 0.710.
- Decision threshold: 0.465.

AUC measures discrimination: how well the model ranks at-risk cases above normal cases across thresholds. An AUC around 0.737 means moderate discrimination, not excellent clinical certainty.

Sensitivity measures how many actual at-risk cases are caught. DianaV2 has sensitivity around 74.8%, which fits a screening orientation because missing at-risk users is costly.

Specificity measures how many normal cases are correctly identified. DianaV2 has specificity around 59.0%, meaning false positives remain a concern.

Accuracy is not enough because the class distribution and clinical costs matter. A model can have decent accuracy while missing too many at-risk users or generating too many false positives.

F1 balances precision and recall. PPV tells how many predicted at-risk cases are actually at risk. NPV tells how many predicted normal cases are actually normal.

#### How The Decision Threshold Is Selected (Not 0.50)

The threshold of 0.465 is **not the default 0.50**. It is selected through a multi-strategy optimization system with guardrail arbitration:

1. **Youden's J**: Maximizes (sensitivity + specificity - 1). Finds the best tradeoff point.
2. **Screening**: Maximizes 0.60×sensitivity + 0.40×F1, requiring specificity ≥ 0.40 and sensitivity ≥ 0.80.
3. **G-Mean**: Maximizes √(sensitivity × specificity). Geometric balance.

After all three strategies compute their thresholds, a **composite scoring function** (0.35×sens + 0.30×spec + 0.25×F1 + 0.10×accuracy) ranks them. The system then applies **guardrail arbitration**: if the best strategy has specificity below 0.45 while sensitivity is above 0.85, it detects "specificity collapse" and falls back to the next-best strategy that meets both floors. This prevents the optimizer from selecting unstable low thresholds under temporal prevalence shift between NHANES cycles.

The production model selected the **Youden** strategy with threshold 0.465. The guardrail nearest-feasible arbitration triggered in 1 out of 6 folds.

If asked "Why not just use 0.50?", say: **0.50 is arbitrary. In screening, we want to optimize the sensitivity-specificity tradeoff, not use a mathematical convenience. Our threshold is empirically selected per fold and averaged, with safety guardrails to prevent specificity collapse.**

### What You Must Be Able To Explain

You need to interpret numbers as evidence with limits:

> The model shows moderate discrimination suitable for research-level screening exploration, but not enough to justify standalone clinical decisions. The confidence interval and calibration results are important because they show uncertainty and probability reliability.

### Memory Script

> The selected Logistic Regression model achieved AUC about 0.737 with a 95% confidence interval from about 0.710 to 0.763. Accuracy was about 0.674, sensitivity about 0.748, specificity about 0.590, and F1 about 0.710. I interpret this as moderate screening performance. It is not strong enough for standalone clinical diagnosis, but it is meaningful because the model deliberately excludes HbA1c and fasting blood sugar to avoid circularity.

### Active Recall

Say each metric in this format:

> Metric, value, plain meaning, clinical caveat.

Example:

> Sensitivity, 0.748. The model catches about 75% of at-risk cases. That supports screening, but it still misses some at-risk users, so it cannot be used alone.

### Defense Questions

- What was your AUC?
- What does AUC mean?
- Why is accuracy insufficient?
- Which matters more, sensitivity or specificity?
- What does the threshold mean?
- Are these results clinically strong?

### Passing Standard

You are ready for Day 7 when you can recite the main numbers and interpret them without exaggeration.

## Day 7: Validation Design And Confidence Intervals

### What You Are Learning

Today you learn why the validation design is defensible and what uncertainty means.

### Read This

DianaV2 uses nested validation:

- Outer validation: Leave-One-NHANES-Cycle-Out.
- Inner validation: GroupKFold inside the training cycles.

The purpose of outer LOGO validation is to test whether the model generalizes across NHANES cycles. Each fold holds out one cycle as a test group. This is stronger than a random split because random splitting can mix very similar survey-cycle distributions into both train and test sets.

The purpose of inner GroupKFold is model selection and tuning without touching the held-out outer test cycle. This prevents test-cycle information from influencing model selection.

Confidence intervals matter because a single point estimate hides uncertainty. The AUC is about 0.737, but the interval is about 0.710 to 0.763. That means the true performance estimate is uncertain within that range. The lower bound is still near the acceptable screening range, but it also shows this is moderate rather than high performance.

Calibration matters because risk scores should match observed frequencies. DianaV2 reports Brier score 0.2087 and expected calibration error 0.0563. Lower is better. These values suggest calibration is part of the evaluation, but calibration should still be strengthened before clinical use.

### What You Must Be Able To Explain

You must explain validation as a protection against fooling yourself:

> Nested LOGO validation keeps model selection separate from final evaluation and tests generalization across NHANES cycles.

### Memory Script

> The validation strategy uses Leave-One-NHANES-Cycle-Out cross-validation as the outer loop, with GroupKFold inside the training data for model selection. This is important because it tests whether the model generalizes across survey cycles rather than only across random rows. The confidence interval around AUC, about 0.710 to 0.763, shows moderate performance with uncertainty. It supports screening research, but it does not prove clinical deployment readiness.

### Active Recall

Draw nested validation:

Outer fold: one NHANES cycle held out -> inner folds tune model on remaining cycles -> evaluate once on held-out cycle.

Explain why the held-out cycle must not influence feature selection, preprocessing, threshold selection, or hyperparameter tuning.

### Defense Questions

- Why use Leave-One-Group-Out?
- What is nested cross-validation?
- What happens in the inner loop?
- What happens in the outer loop?
- What does the AUC confidence interval mean?
- Why does calibration matter?

### Passing Standard

You are ready for Day 8 when you can explain nested validation to a non-ML examiner.

## Day 8: Benchmarks And Defending Moderate Performance

### What You Are Learning

Today you learn how to defend the model when benchmark results are stronger or simpler tools look competitive.

### Read This

DianaV2's AUC is about 0.737. Some benchmark tools or comparator models may show higher AUC depending on inputs, thresholding, or included diagnostic information. You should not try to hide this.

The strongest defense is:

> DianaV2's screening model intentionally excludes HbA1c and fasting blood sugar. That makes the task harder but more defensible. A model that includes label-defining biomarkers may achieve much higher performance, but that does not mean it is a better screening model if the goal is to avoid circularity.

Moderate performance can still be meaningful if the model is honest, interpretable, and non-circular. However, you must not argue that moderate AUC is enough for clinical deployment. The right conclusion is that the system is a research prototype and decision-support framework that needs external validation.

You should also be ready to say that if a simpler benchmark performs similarly, that is important. Clinical ML should prefer simpler models when they perform similarly because they are easier to validate, explain, and maintain.

### What You Must Be Able To Explain

You must distinguish performance from defensibility:

- A circular model may perform better but be scientifically weaker.
- A non-circular model may perform lower but be more honest.
- A screening system needs sensitivity, calibration, workflow integration, and explainability, not AUC alone.

### Memory Script

> The AUC is moderate, not exceptional. I do not present it as a finished clinical-grade model. The important point is that the final model is non-circular because it excludes HbA1c and fasting blood sugar. Higher benchmark performance may be possible when diagnostic markers or simpler rules are included, but the thesis prioritizes a defensible screening setup. The contribution is the combination of leakage-aware modeling, validation, explainability, clustering, and full-stack delivery.

### Active Recall

Answer this:

> If another model has higher AUC, why is your work still valuable?

Use three points:

- Non-circular design.
- Full-stack explainability.
- Honest limitations and validation.

### Defense Questions

- Did your model beat all baselines?
- Is 0.737 AUC good enough?
- Why not use a simple clinical tool?
- Why not include HbA1c to improve performance?
- What is the real contribution if performance is moderate?

### Passing Standard

You are ready for Day 9 when you can defend moderate performance without making excuses.

## Day 9: Clustering And Metabolic Subtypes

### What You Are Learning

Today you learn how to explain clustering as useful but heuristic.

### Read This

DianaV2 uses **custom Weighted K-Means** clustering (not sklearn's KMeans) with six features:

- BMI (weight 1.5)
- Triglycerides (weight 2.0)
- LDL (weight **2.5** — highest, because atherogenic dyslipidemia is the strongest differentiator)
- HDL (weight 1.2)
- Age (weight 1.0 — lowest, because age alone does not distinguish metabolic subtypes)
- Waist circumference (weight 2.0)

The custom `WeightedKMeans` class (282 lines in `common/weighted_kmeans.py`) uses **weighted Euclidean distance**: `sum(weight_i × (x_i - center_i)²)` instead of standard Euclidean distance. This ensures that clinically important features (like LDL and triglycerides) have more influence on cluster assignment than less discriminative features (like age). The weights are described as "expert-elicited" — domain-informed rather than algorithmically tuned.

K=4 is selected to align with Ahlqvist-style subtype mapping. The **subtype label assignment** uses a deterministic waterfall applied to inverse-transformed cluster centroids (real clinical units, not Z-scores):

1. **SIRD** (Severe Insulin-Resistant): Assigned to the cluster with the **highest LAP score** = `(waist_circumference - 58) × triglycerides`. LAP (Lipid Accumulation Product) is a proxy for insulin resistance when HOMA-IR is unavailable.
2. **SIDD** (Atherogenic/Lipid-Driven): Among remaining clusters, assigned to the one with the **highest LDL**. This is an adaptation from Ahlqvist — since HOMA2 is unavailable in NHANES, LDL serves as a proxy for atherogenic dyslipidemia (per Tanabe et al. 2024).
3. **MOD** (Mild Obesity-Related): Among remaining clusters, assigned to the one with the **highest BMI** (≥25 using Asia-Pacific WHO cutoff).
4. **MARD** (Mild Age-Related): Whatever cluster is left. By elimination, this cluster has the mildest metabolic profile.

The output labels use the **"-like" suffix** (SIRD-like, SIDD-like, etc.) to communicate that these are proxy subtypes, not validated clinical diagnoses.

The clustering results themselves show why you must be careful. K=4 was chosen for literature alignment, but silhouette analysis suggested K=2. The K=4 silhouette score is **0.1762** (on 734 at-risk samples), which is quantitatively poor. That means the clusters should be interpreted as exploratory patterns, not firm biological groups. Defend this by saying: **"A silhouette of 0.1762 is expected for high-dimensional clinical data with overlapping metabolic profiles. We chose K=4 for clinical interpretability via Ahlqvist mapping, not for maximal statistical separation."**

#### The Metabolic Syndrome Boost (Post-Prediction Clinical Guard)

After the model produces its raw probability, the `ClinicalPredictor` applies a **metabolic syndrome probability boost** based on ATP III criteria:

- Criteria: TG ≥ 150 mg/dL, HDL < 50 mg/dL, BMI ≥ 25, Waist ≥ 80 cm
- **3+ criteria met**: Probability is **floored to 0.65** (overrides any lower model output)
- **2 criteria met**: Probability is **boosted by +0.15** (capped at 0.95)
- **0-1 criteria**: No boost applied

This is a deliberate architectural decision: the ML model may underestimate risk for patients with clear metabolic syndrome because the model only sees individual features, not the clinical syndrome pattern. The boost acts as a clinical safety net. It can flip a "Normal" prediction to "At-Risk" — and that is intentional for a screening tool.

#### The Confidence Threshold ("Indeterminate" Predictions)

If the model's maximum class probability is **below 0.60**, the prediction is flagged as **"Indeterminate"** with a note: "Low confidence prediction. Consider clinical follow-up." This is inspired by **Tanabe et al. (2024) Diabetologia** — the concept of an "undecidable cluster" where the model honestly reports it cannot make a confident assignment. This is a safety feature: rather than forcing a binary answer, the system admits uncertainty.

The backend/frontend contract also treats subtypes carefully. Clustering enrichment only applies to At-Risk predictions. Normal predictions should not carry subtype meanings.


### The "Why Not Just a Doctor?" Defense

You may be asked: *"If a doctor can just look at BMI, waist, and age to know risk, why build this ML model?"*

Your defense: DianaV2 is a scalable **triage tool**, not a replacement for clinicians. It is designed to flag individuals who might not realize they need an HbA1c test yet. Furthermore, the heuristic clustering (SIRD-like/MOD-like) provides immediate personalized context that a standard BMI chart does not, making the screening actionable.

### What You Must Be Able To Explain

You must explain why clustering exists:

- It does not improve binary prediction performance.
- It adds interpretability and personalization after prediction.
- It helps describe dominant metabolic patterns.
- It is not causal and not externally validated.

### Memory Script

> The clustering stage is a post-prediction enrichment step for at-risk users. It uses weighted K-Means over metabolic features such as BMI, triglycerides, LDL, HDL, age, and waist circumference. K=4 was chosen to align with Ahlqvist-style subtype categories, but the clusters are reported as SIRD-like, SIDD-like, MOD-like, and MARD-like because they are heuristic patterns, not validated clinical subtypes. The silhouette result suggests limited separation, so I interpret clustering as exploratory support for explanation, not as diagnostic evidence.

### Active Recall

For each subtype, say:

- Name.
- Main pattern.
- Possible treatment focus.
- Limitation.

### Defense Questions

- Why did you use clustering?
- Why K=4?
- Why did silhouette suggest K=2?
- Are these real diabetes subtypes?
- Does clustering affect prediction performance?
- Why only cluster at-risk users?

### Passing Standard

You are ready for Day 10 when you can say "heuristic subtype enrichment" clearly and defend its limits.

## Day 10: SHAP And Explainability

### What You Are Learning

Today you learn how to explain SHAP without turning it into causal biology.

### Read This

SHAP explains how the trained model used input features to produce a prediction. A SHAP value estimates how much a feature pushed the model output upward or downward relative to a baseline. This can be shown globally, across the dataset, or locally, for one user.

Global explanation answers:

> Which features generally influence the model most?

Local explanation answers:

> For this specific prediction, which features pushed risk up or down?

SHAP does not answer:

> What biologically caused this person's diabetes risk?

That distinction is critical. SHAP explains model behavior. It does not prove that changing a feature would causally change disease risk. It also depends on the training data, model structure, feature correlations, and background distribution.

The value of SHAP in DianaV2 is transparency. It lets the frontend show why the model produced a risk output, which can support clinician review, user education, and model auditing. But the explanation must be framed as model attribution.

#### How SHAP Is Computed (LinearExplainer, Not KernelExplainer)

The explainability module uses a **3-tier cascade** to select the right SHAP algorithm:

1. **Auto-detect the model type** by unwrapping any Pipeline wrapper to find the inner estimator.
2. If the estimator is **LogisticRegression** → use `shap.LinearExplainer` (exact, fast).
3. If it's a tree model → use `shap.TreeExplainer`.
4. Fallback → use `shap.KernelExplainer` (approximate, slow).

Since the production model is Logistic Regression, DianaV2 uses **LinearExplainer**, which computes **mathematically exact** SHAP values — not an approximation. This is a strong defense point: the SHAP explanations are provably correct for the model architecture, not sampled estimates.

If asked "How reliable are your SHAP values?", say: **"They are exact. LinearExplainer decomposes the linear model coefficients into per-feature contributions. Unlike KernelExplainer, which approximates via sampling, LinearExplainer has zero approximation error for linear models."**


### Explainability vs. Actionability

While SHAP doesn't prove causal biology, it *is* highly useful for actionability. By highlighting modifiable lifestyle factors (like physical activity, smoking, or alcohol use), SHAP makes the tool actionable for the user. It gives them specific topics to discuss with their clinician, rather than just delivering a black-box percentage.

### What You Must Be Able To Explain

You must be able to give both a technical answer and a patient-safe answer.

Technical:

> SHAP decomposes the model prediction into feature contributions relative to a baseline expectation.

Patient-safe:

> These features influenced the model's risk estimate. They are not a diagnosis and do not prove causation.

### Memory Script

> SHAP is used to explain the model's prediction by estimating how each feature contributed to the output. In DianaV2, it supports transparency by showing which factors pushed the risk estimate higher or lower. But SHAP explains the trained model, not the biological cause of diabetes. So I treat SHAP as an interpretability layer for model behavior, not as causal evidence.

### Active Recall

Explain one hypothetical user:

- High BMI pushes risk up.
- High triglycerides push risk up.
- Higher HDL may push risk down.
- Activity may push risk down.
- The explanation is about the model, not causality.

### Defense Questions

- What is SHAP?
- What is the difference between global and local SHAP?
- Why use SHAP?
- Does SHAP prove causality?
- How could SHAP mislead users?

### Passing Standard

You are ready for Day 11 when you can explain SHAP to both a clinician and a software engineer.

## Day 11: Backend, Frontend, And ML Service Architecture

### What You Are Learning

Today you learn the full application architecture.

### Read This

DianaV2 has three main runtime layers:

- React frontend.
- Go backend.
- Python ML service.

The React frontend collects assessment data and displays risk results, explanations, warnings, and subtype information. It should use centralized API functions rather than raw fetch calls.

The Go backend is the application authority. It handles authentication, authorization, request validation, persistence, audit behavior, and response normalization. It also owns the canonical frontend-facing assessment result shape.

The Python ML service owns model loading, inference, model-specific preprocessing, SHAP explanation outputs, and metabolic subtype assignment.

The key architectural principle is that the backend normalizes the ML response before the frontend uses it. The frontend should treat the backend result as the source of truth, not reconstruct clinical meanings by itself.

Canonical fields include:

- `risk_score`: integer 0-100.
- `risk_level`: low, medium, high, or unknown.
- `predicted_status`: Normal or At-Risk.
- `at_risk_probability`: probability from 0.0 to 1.0.
- `cluster`: subtype code or blank for normal.
- `cluster_description`: narrative subtype explanation.
- `treatment_focus`: suggested clinical focus.
- `model_version`: deployed artifact identifier.
- `validation_status`: warning status.

Risk level thresholds:

- Less than 30: low.
- 30 to 69: medium.
- 70 or higher: high.

#### Safety Guards Built Into The Backend

Two critical safety mechanisms are enforced at the **API level** (not just the frontend):

1. **Doctor Model-Type Locking**: Doctors are restricted to only the `binary_v2_no_bp` model. If a doctor account attempts to use any other model type, the backend returns **HTTP 403 Forbidden**. This prevents clinicians from accidentally using an untested or experimental model variant. The constant `doctorLockedModelType = "binary_v2_no_bp"` is synchronized across backend and frontend.

2. **Age Restriction Guard (45-60 Hard Lock)**: The backend enforces `canonicalAssessmentMinAge = 45` and `canonicalAssessmentMaxAge = 60`. Any assessment request with a patient outside this range is **rejected at the API level** with an error: "Age must be between 45-60 years for postmenopausal women." This prevents the model from being applied to populations it was not trained on — a common clinical ML deployment failure.

If asked "What stops someone from misusing the model on a 30-year-old?", say: **"The Go backend hard-rejects any assessment outside the 45-60 age range at the API level. It's not just a frontend warning — the request is rejected before it ever reaches the ML service."**


### The "Why Full-Stack?" Engineering Defense

A computer science panel may ask: *"This is a data science problem. Why did you build a Go backend and a React frontend instead of keeping it as a notebook prototype?"*

Your defense: A model is incomplete if it cannot be delivered through a controlled workflow. The Go backend enforces validation, authentication, persistence, API contracts, and canonical result normalization. The frontend consumes the normalized backend contract and presents risk, warnings, explanations, and subtype information in a user-facing format. By building a full-stack system, you demonstrate how the model can move from offline training into a safer decision-support workflow.

### What You Must Be Able To Explain

You must explain the request flow:

1. User enters assessment data in React.
2. Frontend submits request to Go backend.
3. Backend validates user, age, and clinical input.
4. Backend calls Python ML service.
5. ML service returns prediction, probability, explanation, and subtype if at risk.
6. Backend normalizes response into canonical fields.
7. Backend persists and returns result.
8. Frontend displays risk and explanation cautiously.

### Memory Script

> The architecture separates product concerns from model-serving concerns. The React frontend handles user interaction and visualization. The Go backend handles authentication, validation, persistence, and canonical result normalization. The Python ML service handles model inference, SHAP explanations, and clustering. This separation allows the model artifact to evolve without forcing the frontend to understand raw ML-service details.

### Active Recall

Draw this from memory:

React frontend -> Go backend -> Python ML service -> model artifact -> ML response -> backend normalized contract -> frontend result.

Add failure points:

- Invalid age or missing field.
- Unauthorized user.
- Out-of-range biomarker warning.
- ML service unavailable.
- Unknown cluster.
- Model artifact mismatch.

### Defense Questions

- Why three layers?
- Why not put the model directly in the frontend?
- What does the backend normalize?
- What happens if ML returns `N/A` for cluster?
- Where are risk levels computed?
- What happens if the ML service fails?

### Passing Standard

You are ready for Day 12 when you can draw the architecture from memory and explain the boundary between backend and ML service.

## Day 12: Limitations, Risks, And What Would Break

### What You Are Learning

Today you learn to state weaknesses before the panel uses them against you.

### Read This

Your limitations are not small details. They are part of the scientific honesty of the thesis.

Main limitations:

- The model classifies current biomarker-defined status, not future diabetes onset.
- The label depends on HbA1c and fasting blood sugar thresholds.
- The final model excludes those biomarkers, which makes the task harder but more defensible.
- The data is NHANES-based and may not represent all postmenopausal women.
- The system needs external validation outside NHANES.
- It needs prospective validation before clinical claims.
- Calibration needs further clinical evaluation.
- SHAP explains model behavior, not causality.
- Clusters are heuristic and not validated subtypes.
- The frontend must avoid making risk scores look like diagnoses.
- Workflow safety, clinician acceptance, privacy, governance, and monitoring are future work.

You should also be ready to say what would likely break:

- A different population may shift feature distributions.
- Missing lifestyle variables may reduce reliability.
- NHANES cycle differences can affect performance.
- Overconfident UI wording can cause misuse.
- Misinterpreting clusters as diagnosis can mislead users.
- Updating the model without version tracking can break traceability.

### What You Must Be Able To Explain

You must sound calm when stating limitations. Limitations do not destroy the thesis. They show you know the boundary of your evidence.

### Memory Script

> The biggest limitation is that DianaV2 is a current-state screening classifier, not a prospective diabetes prediction model. The labels are derived from HbA1c and fasting blood sugar, so the model's claim is tied to that operational definition. The final feature set excludes those biomarkers to avoid circularity, but the system still needs external validation, prospective evaluation, calibration assessment, and clinical workflow testing before deployment. SHAP and clustering improve interpretability, but they do not prove causality or validated subtypes.

### Active Recall

Write your top five limitations from memory. Then say them without apologizing.

Use this format:

> Limitation, why it matters, how future work would address it.

### Defense Questions

- What is the biggest weakness?
- What would you improve first?
- Can this be used clinically now?
- What evidence is missing?
- What would invalidate your findings?
- How could users misunderstand the app?

### Passing Standard

You are ready for Day 13 when you can state limitations directly and still defend the value of the work.

## Day 13: Mock Defense Round 1

### What You Are Learning

Today you stop studying and start performing.

### Setup

Do a 45-minute mock defense. Use no notes. Record yourself if possible. After every answer, score it:

- 2 = clear, concise, accurate.
- 1 = mostly right but too long or missing caveat.
- 0 = unclear, wrong, or overclaimed.

### Question Set

Answer all of these:

- Give me a two-minute overview of your thesis.
- What problem are you solving?
- Why postmenopausal women?
- Why age 45 to 60?
- What is NHANES?
- What exactly is your target label?
- Are you predicting future diabetes?
- Why did you collapse prediabetes and diabetes?
- Is this a diagnostic tool?
- What are your nine features?
- Why did you exclude HbA1c and fasting blood sugar?
- What is circularity?
- What is leakage?
- What does your leakage gate check?
- Why Logistic Regression?
- What was your AUC?
- What was your sensitivity?
- What was your specificity?
- What does the AUC confidence interval mean?
- Why is accuracy insufficient?
- What does calibration mean?
- Why use clustering?
- Are your clusters clinically validated?
- Why K=4 if silhouette suggested K=2?
- What is SHAP?
- Does SHAP prove causality?
- Walk me through the architecture.
- What does the backend do?
- What does the ML service do?
- What does the frontend display?
- What are your top three limitations?
- What would you do next?

### Required Output

After the mock defense, create:

- Five weakest questions.
- One sentence explaining why each was weak.
- A corrected 60-second answer for each.

### Passing Standard

You are ready for Day 14 when no answer scores 0 and your two-minute overview is stable.

## Day 14: Mock Defense Round 2

### What You Are Learning

Today you make your answers shorter and stronger.

### Rules

Use strict timing:

- Thesis overview: 2 minutes.
- Label and leakage answers: 90 seconds.
- Metrics answers: 60 seconds.
- Architecture answer: 2 minutes.
- Limitation answer: 60 seconds.


#### Hostile "Curveball" Questions

Be prepared for these direct attacks:

- **"Your accuracy is 67%. A coin flip is 50%. Did you really spend months building a system that's only 17% better than guessing?"**
  *Defense:* Accuracy is the wrong metric here due to class imbalance and clinical costs. Missing an at-risk patient (false negative) is worse than a false positive in screening. That is why we optimize for Sensitivity (74.8%) and use AUC (0.737) to measure discrimination.

- **"You excluded Race and Family History. Doesn't that make the model worse for minorities or those with genetic predispositions?"**
  *Defense:* Family history suffered from severe missingness in recent NHANES cycles, making it technically unviable. Race was excluded to reduce demographic leakage and algorithmic bias, ensuring the model focuses purely on metabolic and lifestyle screening factors rather than penalizing demographic groups.

### High-Risk Questions

Repeat these until they are automatic:

- Is your model just detecting HbA1c indirectly?
- Why should we trust AUC 0.737?
- Why not include HbA1c and get better performance?
- Is this a medical diagnosis?
- Does SHAP show what causes diabetes?
- Are the clusters real clinical subtypes?
- If K=2 was better by silhouette, why use K=4?
- What is the strongest argument against your thesis?
- What is the strongest contribution?

### Final Answer Templates

#### HbA1c Circularity

> The concern is valid. If HbA1c or fasting blood sugar define the label and also appear as inputs, the model can become circular. The final DianaV2 screening model excludes both from the predictors and uses nine non-circular metabolic and lifestyle features instead. I still describe the output as current-state screening classification, not diagnosis or future prediction.

#### Moderate AUC

> The AUC is about 0.737, so I interpret it as moderate discrimination. It is not enough for standalone clinical deployment. Its value is that it is achieved under a non-circular screening design with nested cycle-based validation, and it is paired with explainability and a full-stack implementation.

#### SHAP

> SHAP explains how the trained model used features to produce a prediction. It helps transparency, but it does not prove that a feature causes diabetes risk. In my thesis, SHAP is model explanation, not causal biology.

#### Clustering

> Clustering is post-prediction enrichment. It gives at-risk users a heuristic metabolic pattern, such as SIRD-like or MOD-like. These are not validated clinical subtype diagnoses. K=4 was chosen for literature alignment, while the silhouette result suggests the grouping should be interpreted cautiously.

#### Clinical Use

> DianaV2 is not ready to replace clinical judgment. It is a screening-oriented decision-support prototype. Before clinical deployment, it needs external validation, prospective validation, calibration review, usability testing, and governance around model updates.

#### Contribution

> The contribution is not only model performance. It is a defensible end-to-end system that combines non-circular diabetes-risk screening, cycle-based validation, SHAP explanations, heuristic subtype enrichment, and full-stack delivery with explicit clinical limitations.

### Required Output

At the end of Day 14, you must have:

- A memorized two-minute thesis overview.
- A pipeline diagram from memory.
- An architecture diagram from memory.
- A metric interpretation script.
- A circularity answer.
- A limitations answer.
- A contribution answer.


## Advanced Defense Traps (Master-Level)

If you get these questions, the panel is testing your engineering maturity.

### 1. The "Why Go AND Python?" Question
- **The Question:** *"You have a Python ML service, a Go backend, and a React frontend. Why not use one Python API for everything?"*
- **The Defense:** *"The separation follows the system boundary. Python is the natural environment for model artifacts, SHAP, and ML libraries. Go owns the application backend: authentication, authorization, persistence, request validation, audit behavior, and canonical API contracts. This lets the ML model evolve behind a service boundary without forcing the frontend or database layer to depend on model-specific implementation details."*

### 2. The "Where Is Blood Pressure?" Question
- **The Question:** *"Metabolic syndrome is tied to hypertension. Your active model is called `binary_v2_no_bp`. Why did you drop blood pressure?"*
- **The Defense:** *"It was a deliberate model variant. Excluding blood pressure reduces dependence on a measurement that may be missing, inconsistently captured, or affected by context. The trade-off is that the no-BP model may lose some signal, but it improves accessibility and keeps the final screening feature set simpler and easier to reproduce."*

### 3. The "Data Drift" Question
- **The Question:** *"You trained this on past NHANES cycles. How do you know the model remains relevant if population health changes?"*
- **The Defense:** *"The validation design already tests generalization across NHANES cycles, and the service layer includes drift-monitoring infrastructure. The drift monitor can compare incoming feature distributions against reference data using PSI and KS-style checks. That does not prove the model will stay valid forever, but it creates an operational signal for when retraining or review may be needed."*

### 4. The Privacy And Data Ownership Question
- **The Question:** *"If a patient uses this and gets a high risk score, who owns that data and how is it protected?"*
- **The Defense:** *"The current architecture moved away from a clinician-owned patient table toward user-owned health records. That is an important privacy posture, but it is not a complete legal or deployment answer by itself. A real clinical deployment would still need consent flows, access controls, retention policies, audit logging, and compliance review."*

### 5. The Frontend Performance Question
- **The Question:** *"Do the SHAP visualizations and animations make the application too heavy for lower-end devices?"*
- **The Defense:** *"The frontend includes device capability detection and can reduce expensive visual effects on lower-tier hardware. The goal is to preserve the core clinical information first: risk result, warnings, and explanation. Animation is secondary and should degrade gracefully."*

## Final Cheat Sheet

### The Safest Thesis Claim

DianaV2 is a current-state screening and explainability system for diabetes-risk classification in postmenopausal women.

### The Most Dangerous Overclaim

The model predicts future diabetes or diagnoses diabetes.

### The Strongest Methodology Defense

The final model excludes HbA1c and fasting blood sugar because they define the label, and the pipeline includes automated leakage checks before training.

### The Main Model Result

Logistic Regression, 9 features, nested LOGO validation, AUC about 0.737, sensitivity about 0.748, specificity about 0.590.

### The Main Limitation

The system needs external and prospective clinical validation before real-world deployment.

### The Main Contribution

An end-to-end, leakage-aware, explainable screening system that connects ML validation with deployable software architecture.

## Final Readiness Checklist

You are ready when you can do all of this without notes:

- Explain DianaV2 in one sentence.
- Explain DianaV2 in two minutes.
- Draw the research pipeline.
- Draw the application architecture.
- List the nine features.
- State which features were excluded and why.
- Explain Normal vs At-Risk.
- Explain HbA1c/FBS circularity.
- Recite AUC, sensitivity, specificity, accuracy, F1, and threshold.
- Interpret the AUC confidence interval.
- Explain nested LOGO validation.
- Explain SHAP without causality — and know it uses LinearExplainer (exact, not approximate).
- Explain clustering without subtype overclaiming.
- Explain the Weighted K-Means distance formula and the six feature weights.
- Explain the Ahlqvist waterfall: LAP→SIRD, LDL→SIDD, BMI→MOD, remainder→MARD.
- Explain the metabolic syndrome boost (3+ criteria → 0.65 floor, 2 → +0.15).
- Explain the confidence threshold (< 0.60 → "Indeterminate").
- Explain the threshold optimization (3 strategies + guardrail arbitration).
- Explain how class imbalance is handled (class_weight='balanced', not SMOTE).
- Explain the NHANES pipeline (6 cycles, RHQ031==2, 4 inclusion filters).
- Explain the safety guards (doctor model lock, age 45-60 hard rejection).
- Explain drift detection (PSI thresholds, KS-test).
- Know that FINDRISC beats DIANA on AUC (0.849 vs 0.737) and explain why.
- State five limitations.
- Answer whether the system is clinically deployable today.

## Daily Recitation Page

Read this page every morning during the two weeks:

> DianaV2 is a current-state diabetes-risk screening and explainability system for postmenopausal women aged 45 to 60. It uses NHANES data and classifies Normal versus At-Risk, where At-Risk collapses prediabetic and diabetic glycemic categories. HbA1c and fasting blood sugar define the label, so the final screening model excludes them from the feature set. The selected model is Logistic Regression using nine non-circular features: BMI, triglycerides, LDL, HDL, age, waist circumference, smoking, activity, and alcohol. It is validated using nested Leave-One-NHANES-Cycle-Out cross-validation, with AUC about 0.737, sensitivity about 0.748, specificity about 0.590, and accuracy about 0.674. SHAP explains model behavior, not causality. K-Means clustering provides heuristic subtype enrichment for at-risk users, not validated clinical subtype diagnosis. The React frontend, Go backend, and Python ML service form a full-stack decision-support prototype. The system is not a diagnosis and requires external, prospective, and clinical validation before deployment.
