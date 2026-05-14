# DIANA Chapter 3+4 Academic Wording Bank

This file contains copy-paste-ready academic prose for Chapter 3 and Chapter 4 only. The wording follows the formal, procedural tone of the provided draft while preserving the corrected technical facts from `docs/07-research/thesis-drafts/ch3+4.md`. It is a writing aid rather than a second source of truth; tables, figures, exact citations, and final evidence placeholders should still be checked against the canonical Chapter 3+4 draft before manuscript assembly.

---

## Chapter 3: Methodology

### 3.1 Research Design

This study used a quantitative, system-development research design to develop and evaluate DIANA, a predictive model-based web application for Type 2 Diabetes risk screening among postmenopausal women. The quantitative component focused on the construction of a machine learning model using selected metabolic, anthropometric, and lifestyle variables derived from the National Health and Nutrition Examination Survey (NHANES). The system-development component focused on integrating the trained model into a web-based application that presents risk predictions, metabolic subtype context, and explainability outputs.

The methodological design was structured to address two requirements. First, the predictive model had to estimate diabetes risk without using diagnostic biomarkers as predictor variables, thereby preventing circular prediction. Second, the application had to present model outputs in a clinically interpretable format suitable for screening support. To satisfy these requirements, the study combined data preprocessing, leakage validation, supervised classification, weighted clustering, model explainability, web application development, and software quality evaluation.

The research design does not position DIANA as a diagnostic system. Instead, the system is treated as a screening and triage-support tool. A positive or elevated-risk result indicates that a user's profile resembles metabolic patterns associated with prediabetes or diabetes risk in the NHANES-derived cohort. Confirmatory testing and clinical interpretation remain necessary before any diagnostic conclusion can be made.

### 3.2 Research Locale

The primary modeling dataset was obtained from the NHANES public data repository maintained by the Centers for Disease Control and Prevention. NHANES served as the data locale for model construction because it provides standardized demographic, laboratory, examination, and questionnaire data across multiple survey cycles. Six NHANES releases were used: 2009-2010, 2011-2012, 2013-2014, 2015-2016, 2017-2018, and 2021-2023. The 2019-2020 cycle was excluded because field operations were disrupted by the COVID-19 pandemic. The 2021-2023 release was treated as a COVID-adapted three-year release rather than as a regular biennial release.

For planned user acceptance testing, the intended user locale consists of online communities of Filipino women discussing perimenopause and menopause-related health concerns. The source chapter identifies the "Usapang Perimenopause at Menopause" Facebook interest group as the target recruitment setting. This online locale provides access to potential end users who may evaluate the application's usability, clarity, and practical relevance. Formal recruitment and feedback collection should proceed only after administrative permission, consent procedures, and data privacy requirements are satisfied.

### 3.3 Population of the Study

The modeling population consisted of postmenopausal women represented in NHANES. The final analytic cohort contained 1,376 postmenopausal women who satisfied the study's demographic, reproductive-health, and data-availability criteria. The cohort was restricted to female respondents within the target menopausal age range, with postmenopausal indicators derived from reproductive health questionnaire responses. Reproductive health filtering used RHQ031, which identifies respondents who reported no menstrual period during the past 12 months.

The final binary modeling cohort contained 734 at-risk cases and 642 normal cases. At-risk status was defined by combining pre-diabetic and diabetic reference labels into a single screening-positive class. This binary formulation was selected because the system's screening objective is to identify individuals who may benefit from confirmatory testing or clinical review.

The planned user-evaluation population consists of menopausal or postmenopausal women who can interact with the DIANA application and provide structured usability feedback. The planned clinical-evaluation population consists of licensed medical professionals, particularly from endocrinology and obstetrics-gynecology, who can review the plausibility, interpretability, and clinical relevance of the system's risk outputs. Since formal UAT and expert review have not yet been completed, these populations should be described as planned evaluation groups unless empirical data are collected before submission.

### 3.4 Data Gathering Tools and Procedures

The study used secondary data from NHANES. Raw NHANES XPT files were acquired from the CDC public repository and processed through an automated Python pipeline. The collected files included demographic data, glycohemoglobin records, fasting glucose records, total cholesterol records, HDL cholesterol records, triglyceride and LDL records, body-measurement records, reproductive health questionnaire responses, diabetes questionnaire responses, smoking variables, physical activity variables, alcohol-use variables, family-history variables, insulin records where available, and high-sensitivity CRP records where available.

The data collection focused on variables relevant to metabolic health in postmenopausal women. HbA1c and fasting blood sugar were collected for reference-label construction and clinical interpretation but were excluded from the predictive feature set. This distinction was essential to prevent the model from learning the same diagnostic thresholds used to define the outcome. The final screening predictors were non-diagnostic metabolic, anthropometric, and lifestyle features, including triglycerides, HDL cholesterol, LDL cholesterol, BMI, waist circumference, age, smoking status, physical activity, and alcohol use.

Raw NHANES records were linked using SEQN, the unique respondent identifier. After merging, the pipeline standardized variable names into clinically interpretable terms. For example, LBXGH was mapped to HbA1c, LBXGLU to fasting blood sugar, BMXBMI to BMI, BMXWAIST to waist circumference, LBXTR to triglycerides, LBDHDD to HDL cholesterol, and LBDLDL to LDL cholesterol. Lifestyle features were derived from questionnaire items through rule-based classification. Smoking status was classified using SMQ020 and SMQ040, physical activity using PAQ605, PAQ650, and PAQ665, and alcohol use using ALQ variables.

The physical activity variable was treated as a simplified categorical proxy rather than a complete measurement of guideline adherence. This limitation exists because NHANES questionnaire responses do not consistently provide complete minute-by-minute activity records for all respondents. Therefore, the variable was used to represent broad lifestyle activity categories, not exact World Health Organization weekly activity thresholds.

### 3.5 Ground-Truth Label Construction

Ground-truth labels were constructed using a dual-source hierarchy. The primary criterion was DIQ010, the NHANES diabetes questionnaire item that records whether a respondent had been told by a physician that she had diabetes or borderline diabetes. Respondents reporting physician-diagnosed diabetes were labeled diabetic, while respondents reporting borderline diabetes were labeled pre-diabetic.

For respondents without self-reported diabetes or borderline diabetes, American Diabetes Association HbA1c thresholds were applied. HbA1c values of 6.5 percent or higher were labeled diabetic, values from 5.7 to 6.4 percent were labeled pre-diabetic, and values below 5.7 percent were labeled normal. A hard override was applied so that any record with HbA1c of 6.5 percent or higher was labeled diabetic regardless of self-reported status. This rule reduced the likelihood that undiagnosed biochemical diabetes would be mislabeled as normal.

The agreement between DIQ010-derived labels and HbA1c-threshold labels was 94.8 percent, corresponding to 1,304 of 1,376 records. The remaining 5.2 percent reflected discordance between self-report and a single biochemical measurement. These discordant records may represent undiagnosed cases, recall error, treatment effects, timing differences, or biological and laboratory variability. For this reason, the study label is best interpreted as an operational reference label rather than as a perfect clinical diagnosis.

### 3.6 Software Methodology

The development of DIANA followed an iterative, phase-based software methodology. This structure allowed the study to move systematically from raw data acquisition to model development, application integration, technical validation, and planned clinical/user evaluation. The methodology was designed to maintain traceability between the dataset, the trained model, the deployed service, and the user-facing application.

The software methodology was organized into the following phases:

Phase 1: Data Acquisition and Biomarker Preparation.

Phase 2: Automated Data Leakage Prevention and Feature Validation.

Phase 3: Predictive Model Development and Training.

Phase 4: Clinical Threshold Optimization.

Phase 5: Cluster-Based Risk Group Identification.

Phase 6: Model Explainability and Clinical Decision Support.

Phase 7: Web Application Development and System Integration.

Phase 8: System Testing and Technical Validation.

Phase 9: User Acceptance Testing, Accessibility Readiness, and Expert Feedback.

Each phase produced a defined output. The early phases produced the analytic dataset and validated feature set. The middle phases produced the binary classifier, threshold policy, weighted clustering artifact, explainability workflow, and performance metrics. The later phases produced the integrated web application, test evidence, and planned user and clinical evaluation framework.

### 3.7 Phase 1: Data Acquisition and Biomarker Preparation

This phase executed the extraction, cleaning, integration, and standardization of NHANES records. The automated pipeline acquired six survey releases from 2009 to 2023, excluding the incomplete 2019-2020 cycle and treating 2021-2023 as a COVID-adapted three-year release. The raw files were merged by SEQN to form a unified respondent-level dataset.

Following record integration, the preprocessing pipeline derived the target postmenopausal cohort and standardized clinical feature names. The pipeline retained variables needed for label construction, predictive modeling, clustering, and system display. HbA1c and fasting blood sugar were preserved for label construction but were not included as predictor inputs. This distinction established the foundation for the study's non-circular prediction design.

Missing values were handled using a leakage-safe strategy. Median imputation was embedded inside the cross-validation pipeline, ensuring that imputation parameters were fitted only on training folds. K-nearest-neighbor imputation was restricted to exploratory analysis and was not used for model training because global imputation before cross-validation would expose information from validation or test folds.

At inference time, missing waist circumference was handled by a separate serving-layer guardrail. When waist circumference was unavailable but BMI was present, the ML service estimated waist circumference as BMI multiplied by 3.33. This rule was introduced to reduce the face-validity problem created when population-median imputation assigns an implausibly high waist value to a low-BMI user. Because this rule creates a train-serving difference, it should be presented as a pragmatic usability safeguard rather than as a validated clinical estimator.

Outlier handling used clinical plausibility ranges rather than automatic row deletion. Values outside plausible clinical bounds were flagged through an outlier indicator, but records were retained. This approach preserved genuine extreme metabolic profiles that may be clinically meaningful. In the final cohort, 23 of 1,376 records, or 1.7 percent, had at least one flagged outlier.

### 3.8 Phase 2: Automated Data Leakage Prevention and Feature Validation

This phase enforced the computational safeguards required to protect the validity of the predictive modeling pipeline. Before classifier training, the system executed a three-layer leakage validation procedure. The first layer scanned feature definitions to confirm that diagnostic markers such as HbA1c, fasting blood sugar, fasting glucose, or related aliases were absent from the classifier and clustering feature sets. If any diagnostic feature was detected, the training sequence would terminate.

The second layer performed proxy leakage detection. For each non-diagnostic candidate feature, the pipeline computed its Pearson correlation with the HbA1c diagnostic threshold. Features with absolute correlation greater than 0.95 would be flagged as proxy leakage because they could indirectly encode the diagnostic outcome. In the verified feature set, no proxy leakage was detected.

The third layer computed Shannon entropy information gain as a feature-relevance check. This step helped identify which variables contributed discriminatory information toward the binary at-risk outcome. The information-gain results were not treated as an automatic inclusion rule. Variables such as derived ratios, composite scores, incomplete subsample variables, or less accessible clinical measurements were reviewed and excluded when they conflicted with the study's goals of non-redundancy, accessibility, and non-circularity.

### 3.9 Phase 3: Predictive Model Development and Training

This phase trained and evaluated candidate binary screening classifiers. Four algorithms were evaluated under the same nested temporal-validation framework: Logistic Regression, Random Forest, LightGBM, and XGBoost. Logistic Regression served as the interpretable linear baseline. Random Forest provided a non-linear ensemble baseline. LightGBM and XGBoost provided gradient-boosting benchmarks for structured tabular prediction.

Hyperparameter optimization was performed using grid search with AUC-ROC as the scoring metric. The inner loop used grouped cross-validation so that NHANES survey-cycle boundaries were respected during model selection. The outer loop used Leave-One-Group-Out validation, holding out one complete survey cycle at a time. This design prevented the model from training and testing on data from the same survey period and provided a conservative estimate of temporal generalization.

The final model was selected based on mean fold AUC across LOGO folds rather than relying only on pooled aggregate performance. This criterion favored models that performed consistently across survey cycles. Logistic Regression was selected for deployment because it achieved the strongest mean fold AUC while preserving interpretability, stable probability outputs, and efficient inference.

NHANES survey weights were not incorporated into model training. The survey weights are designed primarily for population-level prevalence estimation and nationally representative descriptive inference, whereas this study trained a prediction model for an analytic postmenopausal cohort. This decision should be reported explicitly as a methodological choice rather than omitted. Future weighted sensitivity analyses remain appropriate because deployment performance may differ when the target population differs from the analytic cohort.

### 3.10 Phase 4: Clinical Threshold Optimization

This phase established the decision threshold used to convert predicted probabilities into binary screening classifications. The threshold was optimized for a screening context rather than defaulting to the conventional 0.50 probability boundary. Because missed at-risk cases may delay confirmatory testing, the thresholding strategy prioritized sensitivity while maintaining a minimum specificity constraint.

Three threshold strategies were evaluated using out-of-fold probabilities: Youden's J, a screening-optimized rule, and the geometric mean of sensitivity and specificity. A composite clinical score was then used to select the fold-specific strategy. The final mean threshold was 0.478. This downward adjustment from 0.50 reflected the screening objective of early case identification.

A deterministic guardrail was implemented to prevent specificity collapse under temporal prevalence shift. If a selected threshold produced high sensitivity but inadequate specificity, the algorithm searched for a feasible threshold satisfying minimum operating constraints or reverted toward a safer threshold. In the final Logistic Regression model, guardrail arbitration was activated in 2 of 6 LOGO folds.

The serving layer also includes a rule-based Metabolic Syndrome risk guardrail. The rule evaluates triglycerides of at least 150 mg/dL, HDL cholesterol below 50 mg/dL, BMI of at least 25, and waist circumference of at least 80 cm. When three or more criteria are met, the at-risk probability is raised to at least 0.65. When two criteria are met, the at-risk probability is increased by 0.15 and capped at 0.95. This rule should be described as an engineered safety heuristic for preventing implausibly low risk estimates in metabolically concordant high-risk profiles, not as an independently validated clinical rule.

### 3.11 Phase 5: Cluster-Based Risk Group Identification

This phase implemented the second stage of the DIANA inference pipeline. The first stage classifies a user as normal or at risk. Only users classified as at risk proceed to the weighted K-Means subtyping stage. This gating mechanism prevents the system from assigning disease-pattern subtype labels to users classified as normal.

Weighted K-Means clustering was trained exclusively on the at-risk subset of 734 cases. The clustering features included triglycerides, LDL cholesterol, HDL cholesterol, BMI, waist circumference, and age. Feature weights were applied before distance computation to emphasize clinically relevant dimensions. LDL received the highest weight as an atherogenic lipid differentiator. Triglycerides and waist circumference were strongly weighted because of their relationship to insulin resistance and central adiposity. BMI served as an obesity-pattern anchor, HDL as an inverse lipid-risk marker, and age as a baseline variable.

Cluster centroids were inverse-transformed from standardized space back to raw clinical units before interpretation. This ensured that subtype labels were assigned using clinically meaningful values. The resulting subtype labels were Ahlqvist-inspired proxy labels: SIRD-like, SIDD-like, MOD-like, and MARD-like. These labels are heuristic descriptions of metabolic pattern similarity and should not be interpreted as validated biological subtype diagnoses or treatment directives.

### 3.12 Phase 6: Model Explainability and Clinical Decision Support

This phase added explainability to the prediction workflow. Although Logistic Regression provides coefficient-level interpretability, the system also uses SHapley Additive exPlanations (SHAP) to provide patient-level feature attribution. SHAP values indicate how each feature pushes the prediction toward or away from the at-risk class.

The explainability workflow supports both cohort-level and patient-level interpretation. Cohort-level plots summarize the relative influence of features across the dataset. Patient-level waterfall plots show the contribution of individual biomarkers and lifestyle variables to a specific prediction. This design helps convert a numeric probability into a clinically discussable explanation.

SHAP explanations are generated through the explainability endpoint and displayed in the frontend when available. They are not persisted as JSONB fields in the assessment table. The database stores prediction metadata, including risk score, predicted status, model version, dataset hash, and subtype context, while detailed SHAP outputs remain transient explanation artifacts.

The implementation also includes graceful degradation when detailed SHAP output is unavailable. In that case, the frontend displays an explanation-unavailable panel and states that no feature-level SHAP values are shown in fallback mode. This behavior preserves the screening result while avoiding fabricated feature attributions.

### 3.13 Phase 7: Web Application Development and System Integration

This phase integrated the predictive model into the DIANA web application. The system was implemented as a four-tier architecture consisting of a React frontend, a Go backend API, a Python ML inference service, and a PostgreSQL data layer with Redis caching. The frontend uses React 18 and Vite. The backend uses Go 1.25 with Gin. The ML service uses Python 3.12 with Flask. The database layer uses NeonDB PostgreSQL 16, while Redis 7 supports cached trend, analytics, and cluster-distribution data. Rate limiting is implemented separately through Go token-bucket middleware.

The Go backend and Python ML service were decoupled to isolate ML inference and explanation tasks from routine API operations. The backend forwards validated assessment input to the ML service, receives prediction and lineage metadata, persists the result, invalidates affected cache entries, and returns the response to the frontend. If `MODEL_URL` is unset during local development, the router can select a mock predictor. In production-oriented flows, prediction failures are propagated as structured errors rather than hidden behind an undocumented fallback.

The implemented API surface supports the assessment workflow through authenticated user, assessment, export, and administrative routes. Core user routes include profile retrieval and update, onboarding, consent settings, trend retrieval, account deletion, assessment creation, assessment retrieval, assessment update, and assessment deletion under `/api/v1/users/me`. Administrative user-management routes under `/api/v1/admin/users` support listing, creation, retrieval, update, deactivation, and reactivation of users. The ML proxy exposes health, information-gain, clustering, visualization, and explainability routes, with detailed SHAP explanation requested through `/api/v1/ml/predict/explain`.

The frontend workflow includes authentication, dashboard review, assessment entry, result display, SHAP explanation, trend visualization, and export support. The assessment form collects demographic, biomarker, anthropometric, lifestyle, and family-history inputs. The result modal displays risk probability, risk label, subtype context when applicable, model version, and dataset lineage. The trend view allows users to review longitudinal biomarker and risk-score changes across assessments.

### 3.14 Phase 8: System Testing and Technical Validation

This phase verified the system across backend, ML service, and frontend layers. Backend tests covered configuration, caching, HTTP handlers, middleware, ML integration, data models, services, PDF generation, and data access behavior. Table-driven assessment handler tests validated age-boundary enforcement, missing-waist handling for ML imputation, advisory warnings for out-of-range HbA1c, and successful end-to-end assessment creation.

The ML service test suite covered clustering behavior, leakage prevention, prediction endpoints, API authentication, drift utilities, SHAP-related functionality, threshold optimization, and clinical scenario checks. The frontend Vitest suite covered API contracts, assessment form behavior, authentication flows, and selected UI components. The test results support the claim that the implemented system performs the core screening workflow, while the frontend coverage-threshold failure remains a readiness gap.

### 3.15 User Evaluation and Expert Review Methodology

The planned user evaluation follows an ISO/IEC 25010-informed usability framework. The evaluation protocol includes appropriateness recognizability, learnability, operability, user error protection, interface aesthetics, accessibility, and user confidence. Planned user participants will complete core tasks such as logging in, navigating the dashboard, submitting an assessment, and interpreting prediction results.

The planned expert review will ask licensed clinical evaluators to assess risk-output plausibility, SHAP explanation clarity, clinical workflow fit, and perceived utility. The expert review is intended to evaluate face validity rather than to establish diagnostic effectiveness. Because formal UAT and expert review have not yet been completed, the manuscript should not report SUS scores, task success rates, expert ratings, or expert quotations as completed empirical results.

---

## Chapter 4: Results and Discussion

### 4.1 Binary Screening Model Performance

The final Logistic Regression screening model demonstrated acceptable discrimination under nested LOGO validation. The model achieved an AUC-ROC of 0.727 with a 95 percent confidence interval of 0.700 to 0.753. At the optimized screening threshold of 0.478, sensitivity was 0.711 with a 95 percent confidence interval of 0.680 to 0.741, specificity was 0.629, and F1 score was 0.699.

The reported confidence intervals were computed using 1,000 bootstrap resamples, the percentile method, and a fixed random seed of 42. Bootstrap samples containing fewer than two outcome classes were excluded from confidence-interval computation. This procedure provides distribution-free uncertainty estimates appropriate for the modest sample size and the temporal validation design.

The fold-level AUC values ranged from 0.703 to 0.776 across the six held-out NHANES survey cycles. This range indicates that no single temporal fold collapsed below the acceptable discrimination target. The result supports the interpretation that the classifier learned repeatable metabolic risk patterns across NHANES releases. However, because the evaluation remains internal to NHANES, the result should be treated as temporal validation rather than external clinical validation.

The sensitivity estimate is clinically relevant but should be interpreted cautiously. The point estimate exceeded the screening target of 0.70, but the lower bound of the confidence interval was 0.680. This means that the central estimate supports the screening objective, while the interval still reflects uncertainty under temporal variation. This limitation strengthens the need for prospective and external validation.

At the threshold-policy level, Youden's J was selected in 4 of 6 LOGO folds, while guardrail shift-floor arbitration was activated in 2 of 6 folds. This distribution indicates that the final threshold policy was not a simple default cutoff; it combined conventional discrimination-based selection with a safety mechanism for folds vulnerable to specificity collapse.

### 4.2 Information Gain and Feature Relevance

Information Gain analysis was used to examine feature relevance before final model interpretation. The final model retained triglycerides, HDL cholesterol, LDL cholesterol, BMI, waist circumference, age, smoking status, physical activity, and alcohol use. Several excluded variables had high information gain, including fasting insulin, TG/HDL ratio, blood pressure variables, and metabolic syndrome score. These variables were reviewed but excluded for methodological reasons.

Derived variables such as TG/HDL ratio and metabolic syndrome score were excluded because they duplicate information already present in selected features. Including both composites and their component variables could distort interpretation and inflate apparent feature importance. Blood pressure variables were excluded to preserve the self-screening accessibility goal of the system. This feature-selection process prioritized non-circularity, interpretability, accessibility, and practical deployment.

### 4.3 Model Comparison

The candidate algorithms were compared under the same nested LOGO validation framework. Logistic Regression achieved the highest mean fold AUC at 0.731. Random Forest achieved an AUC of 0.714, LightGBM achieved 0.703, and XGBoost achieved 0.708. Although some non-linear models produced higher sensitivity, they generally did so at the expense of specificity.

Logistic Regression was selected because it provided the most appropriate balance of performance and interpretability for a screening-support system. Its coefficients can be interpreted more directly than those of ensemble models, and its probability outputs are suitable for threshold optimization and SHAP-based explanation. This made Logistic Regression more defensible for a health-related decision-support workflow than a more complex model with only marginal performance differences.

### 4.4 Calibration Analysis

Calibration analysis assessed whether predicted probabilities aligned with observed outcomes. The Logistic Regression model produced a Brier score of 0.2082, an expected calibration error of 0.0624, and a Hosmer-Lemeshow statistic of 21.40 in the evaluated calibration subset of 1,047 samples. These results indicate moderate probability alignment rather than perfect calibration.

The calibrated probabilities should therefore be communicated as approximate risk-support estimates. A high predicted probability should prompt confirmatory testing, clinical review, or preventive counseling, but it should not be interpreted as a confirmed diagnosis or exact individualized disease probability.

### 4.5 Clustering Validation and Subtype Distribution

Weighted K-Means clustering with K = 4 was evaluated on the at-risk subset of 734 cases. The clustering produced a silhouette score of 0.1740, Davies-Bouldin index of 1.6331, and Calinski-Harabasz index of 152.75. These metrics indicate modest separation, which is expected in overlapping metabolic phenotypes.

The K = 4 solution was retained to preserve the Ahlqvist-inspired four-pattern interpretation. This decision prioritized clinically interpretable subtype context rather than maximizing internal clustering metrics alone. The modest silhouette score must be acknowledged as a limitation because it indicates overlapping cluster boundaries.

The cluster distribution showed metabolic heterogeneity within the at-risk class. MARD-like was the largest cluster with 240 cases, or 32.7 percent of the at-risk subset. MOD-like contained 222 cases, or 30.2 percent. SIDD-like contained 202 cases, or 27.5 percent. SIRD-like contained 70 cases, or 9.5 percent, and had the highest diabetic proportion at 57.1 percent. These findings suggest that at-risk participants were not metabolically uniform, although longitudinal progression cannot be inferred from the cross-sectional dataset.

Centroid analysis further clarified subtype interpretation. The MOD-like centroid had a BMI of approximately 42.23, indicating severe obesity in this cohort rather than moderate obesity. The SIRD-like centroid was characterized by high triglycerides and waist circumference, while the SIDD-like centroid was distinguished by elevated LDL cholesterol. Since assignments are based on weighted distance to centroids, subtype outputs should be understood as geometric pattern assignments rather than rule-based clinical diagnoses.

### 4.6 Leakage Validation Results

The leakage validation pipeline confirmed that diagnostic glycemic variables were absent from the classifier and clustering feature lists. It also confirmed that no retained non-diagnostic feature exceeded the proxy-leakage threshold of |r| > 0.95 with the HbA1c diagnostic threshold. The highest observed proxy correlation was triglycerides at r = 0.3241, which remained far below the leakage threshold.

This result supports the central methodological claim of the study. DIANA's discrimination was not produced by using HbA1c or fasting blood sugar as predictors. Instead, the model estimated at-risk status from metabolic, anthropometric, and lifestyle variables that were separate from the diagnostic markers used in label construction.

### 4.7 Functional Testing Results

Functional testing verified the implemented system across backend, frontend, and ML service layers. The backend Go test suite passed in the current verification run and covered configuration, caching, HTTP handlers, middleware, ML integration, models, services, PDF generation, and store behavior. Assessment handler tests verified critical clinical guardrails, including target age-boundary enforcement, missing waist-circumference acceptance for ML imputation, out-of-range HbA1c warning behavior, and successful assessment creation.

The Python ML service test suite passed with 270 tests. These tests covered clustering, leakage prevention, feature parity, prediction behavior, server endpoints, API authentication, drift scheduling, SHAP background behavior, threshold optimization, and clinical scenario validation. The frontend unit and contract tests passed with 214 tests.

The frontend coverage-threshold run remains a technical readiness gap. The tests pass, but the configured global coverage thresholds are not currently met. The coverage report showed 33.56 percent lines/statements and 36.7 percent functions against configured 70 percent thresholds. This gap should be reported honestly unless additional frontend tests are added or the coverage policy is formally recalibrated.

### 4.8 UI Workflow Integration

The implemented DIANA workflow begins with user authentication and proceeds to dashboard review, biomarker data entry, prediction generation, result display, explainability review, trend visualization, and report export. The dashboard presents recent assessments and risk summaries. The assessment form collects demographics, biomarkers, anthropometric measures, lifestyle variables, and family-history context.

After form submission, the backend validates the request, sends the relevant assessment payload to the ML service, receives prediction and lineage metadata, persists the assessment, invalidates affected cache keys, and returns the result to the frontend. The result display presents risk probability, risk category, subtype context when available, model version, and dataset lineage. SHAP explanations are requested separately and displayed only when explanation outputs are available.

This workflow demonstrates that the model was not evaluated only as an isolated algorithm. It was integrated into a functioning screening-support application with authentication, persistence, visualization, and report-generation capabilities.

For the final manuscript, this section should be paired with verified screenshots captured from the running application. Candidate figures include the dashboard, assessment form with validation, result modal with SHAP explanation, SHAP waterfall detail, and personal trends visualization. Synthetic screenshots or fabricated SHAP values should not be inserted.

### 4.9 System Performance and Deployment Readiness

The system architecture separates routine API operations from ML inference and explanation generation. The Go backend manages authentication, validation, persistence, caching, and response orchestration, while the Python ML service performs prediction, clustering, explainability, and monitoring-related functions. This separation reduces the risk that computationally heavier ML operations will degrade ordinary application interactions.

The documented performance measurements indicate that pure model inference is approximately 1.1 ms, while service interaction and explanation-related overhead produce an approximate end-to-end latency of 205 ms in the measured environment. These values support the feasibility of interactive use. However, production load testing with concurrent users has not yet been completed, so stronger claims about deployment-scale performance should remain pending.

### 4.10 User Acceptance Testing and Expert Feedback

The UAT protocol and expert review framework were defined but had not yet been executed at the time of manuscript preparation. The planned user evaluation follows ISO/IEC 25010 usability characteristics, including appropriateness recognizability, learnability, operability, user error protection, interface aesthetics, accessibility, and user confidence.

The planned user tasks include login and dashboard navigation, assessment submission, and interpretation of ML results and SHAP explanation. The planned expert review will evaluate risk-output plausibility, explanation clarity, workflow fit, and perceived utility. Since formal data collection has not yet been completed, SUS scores, task success rates, expert ratings, and expert quotations should remain marked as pending rather than reported as completed findings.

Internal walkthroughs identified several areas for improvement, including the visibility of medical-history fields, SHAP legend clarity, mobile assessment-form usability, and explanation of Ahlqvist-inspired proxy subtype labels. These findings reflect development review rather than formal UAT results.

The final manuscript should retain placeholders for the UAT date, participant count, System Usability Scale score, task success rates, time-on-task results, error rate, user confidence score, clinical face-validity ratings, and signed expert observations until those data have been collected. Reporting these values before formal collection would overstate the evidence base.

### 4.11 UI/UX Design and Accessibility Readiness

The interface applies visual organization principles to support comprehension of clinical information. Related fields are grouped together, risk categories use consistent visual styling, and charts present longitudinal patterns through continuous visual trends. Risk status is communicated through both color and text labels to reduce dependence on color alone.

The application includes accessibility-oriented features such as ARIA labels, keyboard-accessible controls, responsive layouts, and visible status text. However, formal automated contrast testing and assistive-technology testing have not yet been completed. Therefore, this section should be framed as accessibility readiness rather than WCAG conformance certification.

The frontend also applies device-aware performance tiering. High-capability devices receive full animations and richer chart behavior, while lower-capability devices receive reduced visual complexity. This adaptation supports broader usability across desktop and mobile hardware.

### 4.12 External Benchmark Comparison

DIANA was compared with reconstructed screening baselines under the same NHANES cohort, binary outcome definition, and LOGO validation framework where sufficient variables were available. The FINDRISC-like upper-bound comparator achieved the highest AUC at 0.849, but this implementation used an elevated-glucose or HbA1c proxy for the history-of-high-blood-glucose component. This makes the FINDRISC-like result an optimistic, partially circular upper-bound comparator rather than a faithful non-circular validation.

DIANA achieved an AUC-ROC of 0.727, sensitivity of 0.711, and specificity of 0.629. Compared with OmniRisk, which achieved an AUC-ROC of 0.688, sensitivity of 0.931, and specificity of 0.278, DIANA showed a more balanced sensitivity-specificity profile. The Simple Clinical comparator achieved an AUC-ROC of 0.677, sensitivity of 0.944, and specificity of 0.222, while the ADA Risk Test reconstruction achieved an AUC-ROC of 0.589, sensitivity of 0.918, and specificity of 0.203. These tools identified many at-risk cases but did so with substantially lower specificity, which would increase the number of false-positive referrals in a screening workflow.

These benchmark results should be interpreted as internal contextual comparisons, not as proof of superiority over published tools. Some published tools require variables unavailable in NHANES or require approximation. Therefore, the benchmark analysis supports contextual interpretation but does not replace external head-to-head validation.

### 4.13 Study Limitations

Several limitations constrain interpretation of the study. First, all model development and validation were conducted within NHANES. Although LOGO validation provides evidence of temporal robustness across survey cycles, it does not replace validation in an independent clinical cohort or prospective deployment setting. Second, the reference label is operational rather than a definitive diagnostic gold standard because it combines self-reported physician diagnosis with single-measurement glycemic thresholds.

Third, the subtype module uses weighted K-Means clustering and Ahlqvist-inspired labels as heuristic descriptions rather than validated biological subtypes. Fourth, deployment guardrails such as waist-circumference imputation and metabolic syndrome risk floors require further ablation, calibration, and clinical review. Fifth, formal UAT, expert face-validity review, accessibility testing, and production load testing remain incomplete.

For these reasons, DIANA should be presented as a screening-support prototype with promising internal validation, not as a clinically validated diagnostic system.

### 4.14 Chapter Synthesis

The results demonstrate that DIANA provides a technically implemented and methodologically conservative screening-support workflow for diabetes risk stratification among postmenopausal women. Its strongest methodological contribution is the separation of diagnostic label construction from predictor inputs, supported by an automated leakage validation pipeline. The final Logistic Regression model achieved acceptable discrimination under conservative temporal validation while preserving interpretability and deployment simplicity.

The weighted clustering module and SHAP explainability layer add clinical context to the binary risk output, but both require careful interpretation. The subtype labels are heuristic and hypothesis-generating, and SHAP values support transparency rather than causal explanation. Overall, DIANA should be understood as a triage-support system that can help identify users who may benefit from confirmatory testing and clinical review. Future work should prioritize external validation, prospective evaluation, formal UAT, expert clinical review, accessibility assessment, production load testing, and calibration in the intended deployment population.
