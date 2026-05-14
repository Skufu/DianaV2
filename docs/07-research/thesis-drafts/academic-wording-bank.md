# DIANA Academic Wording Bank

Purpose: copy-ready academic paragraphs for Chapter 3 and Chapter 4. This file is a wording aid, not a second source of truth. The canonical chapter remains `docs/07-research/thesis-drafts/ch3+4.md`.

Use rule: copy paragraphs from this file only after checking that the corresponding claim still appears in the canonical chapter.

---

## Chapter 3: Methodology

### Data Acquisition and Study Dataset

The dataset used in this study was derived from the National Health and Nutrition Examination Survey (NHANES), a nationally representative health examination survey administered by the Centers for Disease Control and Prevention. The analytic dataset covers six NHANES survey releases from 2009 to 2023. The 2021-2023 release was treated as a COVID-adapted three-year cycle, while the incomplete 2019-2020 cycle was excluded because data collection was interrupted by the COVID-19 pandemic. This design allowed the study to use post-2010 glycemic interpretation while preserving temporal separation across survey cycles.

Raw NHANES examination, laboratory, demographic, and questionnaire files were merged using SEQN, the unique respondent identifier. Relevant variables were extracted from demographic files, body-measurement files, lipid and glycemic laboratory files, reproductive-health questionnaire files, diabetes questionnaire files, smoking questionnaire files, physical-activity questionnaire files, and alcohol-use questionnaire files. Reproductive health filtering used RHQ031 to identify respondents who reported no menstrual period during the past 12 months, supporting the construction of a postmenopausal analytic cohort.

### Cohort Selection and Outcome Definition

The final cohort was restricted to postmenopausal women with sufficient metabolic and questionnaire data for model development. Reference labels were constructed using a dual-source hierarchy combining self-reported physician diagnosis and biochemical thresholds. The primary diagnostic source was DIQ010, which records whether a respondent had been told by a physician that she had diabetes or borderline diabetes. For respondents without a prior diagnosis, HbA1c thresholds were used to identify undiagnosed glycemic abnormality. HbA1c values of 6.5 percent or higher were labeled diabetic, values from 5.7 to 6.4 percent were labeled pre-diabetic, and values below 5.7 percent were labeled normal.

For the binary screening model, pre-diabetic and diabetic labels were combined into a single at-risk class. This binary formulation reflects the intended purpose of DIANA as an early screening and triage-support tool rather than a definitive diagnostic system. The final binary dataset consisted of 1,376 postmenopausal women, with 734 at-risk cases and 642 normal cases.

### Missing Data Handling

Missing values were handled using a leakage-safe imputation strategy. Exploratory datasets may use broader imputation methods for descriptive analysis, but the defensible training pipeline performs imputation inside the cross-validation workflow. Median imputation is fitted only on the training partition of each fold and then applied to the held-out partition. This prevents information from the validation or test fold from influencing preprocessing parameters, thereby preserving the validity of the model evaluation.

At inference time, the system includes a clinical guardrail for missing waist circumference. When waist circumference is unavailable, the ML service estimates it using a BMI-concordant heuristic derived from the NHANES postmenopausal population. This design avoids rejecting otherwise usable assessments while making the imputation behavior explicit and reproducible.

### Data Leakage Prevention

Data leakage prevention was implemented as a mandatory pre-training gate. The validation process checks for diagnostic biomarkers in feature definitions, detects potential proxy leakage by measuring correlations with diagnostic thresholds, and evaluates information gain across candidate features. Diagnostic biomarkers such as HbA1c and fasting blood sugar are used for reference labeling and clinical confirmation, but they are excluded from the screening model inputs. This separation is essential because including diagnostic markers as predictors would create circular performance estimates and undermine the screening objective.

The leakage-prevention procedure is not merely a conceptual safeguard. It is implemented as executable validation logic that terminates the training process if leakage conditions are detected. This makes leakage control a reproducible part of the model-development pipeline rather than a manual post-hoc claim.

### Candidate Model Selection

Four candidate algorithms were evaluated under the same nested temporal-validation framework: Logistic Regression, Random Forest, LightGBM, and XGBoost. Logistic Regression was included because of its interpretability and clinically meaningful probability outputs. Random Forest was included to test whether non-linear interactions among metabolic variables improved discrimination. LightGBM and XGBoost were included as gradient-boosting methods suitable for structured tabular data and class-imbalanced prediction problems.

All candidate models were evaluated under the same feature set and validation strategy to support a fair comparison. Hyperparameter tuning was performed within the inner cross-validation loop, while final performance was estimated on held-out NHANES survey cycles in the outer loop.

### Nested Leave-One-Group-Out Validation

Model performance was estimated using nested Leave-One-Group-Out cross-validation, with NHANES survey cycle treated as the grouping variable. In each outer fold, one complete survey cycle was held out for testing, while the remaining cycles were used for model training and hyperparameter tuning. This temporal validation design reduces optimistic bias that can occur when samples from the same survey period appear in both training and test sets.

The use of NHANES cycle as the grouping variable reflects the intended deployment question: whether a model trained on prior cohorts can generalize to a later or distinct population sample. This design provides a stronger test of temporal robustness than random k-fold cross-validation, although it remains internal to NHANES and does not replace external prospective validation.

### Threshold Optimization

The classification threshold was selected using a screening-oriented strategy rather than the default probability cutoff of 0.5. Because DIANA is intended for early risk identification, false negatives carry greater clinical concern than false positives. The threshold-selection process therefore considered sensitivity, specificity, Youden's J statistic, and screening-oriented operating points. The final operating threshold reflects a balance between detecting at-risk individuals and avoiding excessive false-positive referrals.

This thresholding approach is consistent with the role of screening tools in clinical triage. DIANA is not intended to diagnose diabetes independently; instead, it identifies individuals who may benefit from confirmatory testing, clinical review, or preventive counseling.

### Outlier Handling

Outlier handling used biomarker-specific clinical plausibility ranges rather than removing physiologically extreme observations by default. Values outside plausible clinical limits were flagged, but rows were retained in the analytic dataset. This conservative approach preserves sample size and recognizes that extreme biomarker values may represent genuine clinical risk rather than data-entry error.

The outlier flag supports later sensitivity analyses, but row exclusion is not part of the active preprocessing output. This decision is methodologically appropriate for clinical prediction because excluding high-risk metabolic profiles could artificially narrow the training distribution and reduce relevance for real users.

### Metabolic Subtyping

DIANA implements a two-stage modeling approach. The first stage estimates binary at-risk status, and the second stage assigns at-risk cases to heuristic metabolic subtype patterns using weighted K-Means clustering. Clustering was performed only on the at-risk subset and used clinically prioritized features including triglycerides, LDL cholesterol, HDL cholesterol, BMI, waist circumference, and age.

The subtype labels are Ahlqvist-inspired proxy labels rather than validated biological subtype diagnoses. They should be interpreted as descriptive metabolic patterns that support explanation and discussion, not as treatment directives or definitive classifications. The system therefore uses outward-facing labels such as SIRD-like, SIDD-like, MOD-like, and MARD-like to emphasize the heuristic nature of the clustering output.

### Explainability

The study uses SHapley Additive exPlanations (SHAP) to support patient-level interpretability. SHAP explanations provide feature-attribution values that indicate how individual biomarkers contribute to an at-risk or normal prediction. In DIANA, SHAP is used to make model outputs more transparent and clinically discussable, especially for users and clinicians who need to understand which metabolic factors are driving a risk estimate.

SHAP values are generated through the explainability flow and are not persisted as JSONB fields in assessment records. This distinction is important because the assessment table stores prediction metadata and model lineage, while detailed explainability is requested separately when needed.

### System Architecture

DIANA uses a four-tier architecture consisting of a React frontend, a Go backend API, a Python ML inference service, and a PostgreSQL database. The Go backend is implemented with Go 1.25 and Gin, while the ML service uses Python 3.12 and Flask. This separation allows the application to isolate computationally heavier ML inference and explanation tasks from routine API operations such as authentication, dashboard retrieval, assessment history, and profile management.

The decoupled ML service design supports performance isolation, technology specialization, and independent scaling. Python provides mature libraries for scikit-learn modeling, SHAP explainability, and MLflow tracking, while Go provides a strongly typed and efficient API layer for user-facing workflows. Prediction failures are returned as structured errors in production-oriented flows, while local development can use mock behavior when `MODEL_URL` is unset.

### Data Persistence and Traceability

Assessment records are persisted in PostgreSQL with prediction metadata such as risk score, risk label, predicted status, model version, dataset hash, and subtype information. This design supports traceability by linking stored predictions to the model and dataset artifacts used to generate them. Detailed SHAP explanations remain transient outputs requested through the explainability endpoint rather than permanent database fields.

### API and Security

The backend exposes RESTful endpoints for authentication, user management, assessment submission, assessment retrieval, exports, and administrative workflows. User-facing endpoints are protected by authentication middleware, while administrative endpoints use role-based access control. Generated Swagger documentation is stored under `backend/docs`, and the repository does not currently contain a separate OpenAPI 3.0 file at `docs/api-spec.yaml`.

---

## Chapter 4: Results and Discussion

### Binary Screening Performance

The final binary screening model achieved an AUC-ROC of 0.7267 under nested Leave-One-Group-Out validation. This level of discrimination is consistent with an early screening model that intentionally excludes diagnostic glycemic biomarkers from its input features. The model is therefore best interpreted as a risk stratification tool that identifies individuals who may benefit from confirmatory testing, not as a standalone diagnostic instrument.

The sensitivity and specificity results reflect the tradeoff inherent in screening design. DIANA prioritizes case-finding while maintaining acceptable specificity, recognizing that the downstream action for a positive screen is clinical review or confirmatory testing rather than direct diagnosis or treatment.

### Temporal Generalization

The fold-level AUC range across held-out NHANES cycles indicates that model performance did not collapse in any single temporal fold. This supports the claim that the model captures repeatable metabolic patterns across survey cycles. However, because all evaluation remains within NHANES, external validation in an independent clinical cohort is still required before making stronger deployment-level claims.

Nested cycle-wise validation should therefore be interpreted as evidence of internal temporal robustness, not proof of generalizability to all clinical settings or demographic groups.

### Model Comparison

Among the evaluated algorithms, Logistic Regression was selected as the final screening model because it provided competitive discrimination while preserving interpretability and stable probability outputs. Although more complex models can capture non-linear relationships, the clinical context favors a model whose behavior can be explained and defended. For a screening-support tool, transparency and reproducibility are central methodological requirements.

The selection of Logistic Regression also supports easier communication of risk factors and model rationale to clinicians and users. This is particularly important because DIANA is intended to support shared decision-making rather than function as an opaque diagnostic authority.

### Calibration

Calibration analysis was used to evaluate whether predicted probabilities corresponded reasonably to observed risk patterns. Calibration is important because a model with acceptable discrimination may still produce probabilities that are too high or too low in absolute terms. For DIANA, calibration results should be interpreted alongside discrimination metrics and threshold behavior because the system uses screening-oriented operating points rather than a default 0.5 cutoff.

### Clustering Results

Weighted K-Means clustering was applied to the at-risk subset of 734 cases. Internal clustering metrics were used to evaluate compactness and separation, while centroid profiles were inspected to assign heuristic metabolic subtype labels. The cluster analysis is descriptive and hypothesis-generating; it provides clinically interpretable metabolic patterns but does not establish biological subtype validity.

The distribution of subtype labels demonstrates that at-risk cases are not metabolically homogeneous. Some clusters show stronger lipid-related patterns, while others show obesity-related or age-related profiles. This supports the value of presenting risk as a structured metabolic pattern rather than a single undifferentiated probability.

### Leakage Validation Results

Leakage validation confirmed that diagnostic glycemic variables were not included as predictive features in the screening model. This result is essential because the study's main methodological claim depends on separating diagnostic label construction from screening feature inputs. By excluding HbA1c and fasting blood sugar as predictors, DIANA avoids the circularity that would occur if the model simply learned the diagnostic criteria used to define the outcome.

### Functional Testing Results

Backend, frontend, and ML test suites provide evidence that the implemented system supports the core assessment workflow. Backend tests verify API behavior, middleware, repository logic, and service-level functionality. ML tests verify model-serving behavior, validation paths, and explainability-related functionality. Frontend unit and contract tests verify user-interface behavior and API integration assumptions.

The frontend unit test suite passes, but the coverage-threshold run currently fails because global coverage requirements are not met. This should be reported honestly as a remaining technical readiness gap unless additional tests are added or the coverage policy is recalibrated.

### UI Workflow Integration

The implemented user workflow follows a structured path from authentication to assessment submission, model inference, result display, explainability, and longitudinal trend visualization. The result interface presents risk status, probability, subtype information when applicable, and explanatory context. SHAP explanations are requested separately when detailed feature attribution is available.

[PLACEHOLDER: insert verified screenshot of the dashboard, assessment form, result modal, SHAP explanation, and trends page after capturing them from the running application.]

### System Performance

The decoupled architecture is designed to prevent ML inference and SHAP explanation generation from blocking routine backend operations. ML inference is handled by the Python service, while the Go backend manages authentication, persistence, and API orchestration. This design supports clearer operational boundaries and allows the ML layer to be scaled or optimized independently.

[TBD: insert final production or local benchmark numbers only after measuring the exact deployed configuration used for evaluation.]

### User Acceptance Testing

The UAT protocol evaluates usability, task completion, user confidence, and expert face validity. Planned participants include menopausal women from the target user group and clinical experts from endocrinology and obstetrics-gynecology. The evaluation instruments include the System Usability Scale, task-completion metrics, open-ended feedback, and clinical face-validity ratings.

[TBD after UAT data collection: insert SUS score, task success rates, time-on-task results, error rates, and participant feedback themes.]

### Expert Feedback

Expert review is intended to assess risk-output plausibility, SHAP explanation clarity, workflow fit, and overall perceived utility. Because expert feedback has not yet been collected, the thesis should not report ratings or quotes as completed evidence. The expert-review table should remain a template until signed or documented evaluator feedback is available.

[QUOTE TBD after signed expert review.]

### Accessibility Readiness

The interface applies accessibility-oriented design choices such as text labels alongside color-coded risk indicators, ARIA labels for interactive elements, and keyboard-accessible controls. However, formal automated accessibility and contrast testing must be completed before claiming WCAG conformance.

[TBD: insert automated contrast-test results, accessibility audit tool, date tested, minimum observed contrast ratio, and any unresolved issues.]

### External Benchmarking

External benchmark comparisons should be interpreted as internal reconstructions rather than definitive clinical head-to-head validation. Some published screening tools rely on variables that are not fully available in NHANES or require proxies. For this reason, benchmark results are useful for contextualizing DIANA's performance, but they should not be overclaimed as proof of superiority.

### Limitations

This study has several limitations. First, all model development and validation were conducted within NHANES, so external prospective validation remains necessary. Second, the reference label combines self-reported physician diagnosis with single-measurement biochemical thresholds, which may introduce label noise. Third, the subtype module uses heuristic weighted K-Means clusters and should not be interpreted as validated biological subtype diagnosis. Fourth, several clinical guardrails require ablation, calibration, and expert review before being treated as validated clinical rules. Finally, UAT, expert feedback, accessibility testing, and production performance evaluation remain pending where explicitly marked.

### Closing Results Paragraph

Overall, DIANA demonstrates a technically implemented and methodologically defensible screening-support workflow for diabetes risk stratification among postmenopausal women. Its strongest contributions are the separation of diagnostic labels from screening features, temporal cycle-wise validation, model traceability, and explainability-oriented user workflow. At the same time, the system should be presented as a screening and triage-support tool, not as a diagnostic device. Further work should focus on external validation, formal usability testing, expert clinical review, accessibility testing, and prospective evaluation in real-world settings.
