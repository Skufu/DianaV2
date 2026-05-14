# Chapter 3: Methodology

### 3.1 Research Design

This study used a quantitative, system-development research design to develop and evaluate DIANA, a web-based screening-support system for Type 2 Diabetes risk stratification among postmenopausal women. The quantitative component focused on constructing and validating a predictive model using metabolic, anthropometric, demographic, and lifestyle variables derived from the National Health and Nutrition Examination Survey (NHANES). The system-development component focused on integrating the trained model into a working web application capable of presenting risk predictions, metabolic pattern context, model traceability, and explainability outputs.

The methodological design was structured around two central requirements. First, the predictive model had to estimate risk without using diagnostic glycemic biomarkers as predictor variables, thereby avoiding circular prediction. HbA1c and fasting blood sugar were used for reference-label construction and clinical interpretation, but they were excluded from the model feature set. Second, the system had to present model outputs in a form appropriate for screening support rather than diagnosis. For this reason, DIANA reports risk probability, risk category, subtype context, and feature-attribution information as decision-support outputs that require confirmatory testing and clinical interpretation.

DIANA is therefore not positioned as a diagnostic device. A screen-positive result indicates that a user's profile resembles metabolic patterns associated with prediabetes or diabetes risk in the NHANES-derived postmenopausal cohort. The result should prompt follow-up discussion, confirmatory laboratory testing, or preventive counseling where appropriate, but it does not establish a clinical diagnosis by itself.

### 3.2 Research Locale

The primary data locale for model development was the NHANES public data repository maintained by the Centers for Disease Control and Prevention. NHANES was selected because it provides standardized demographic, laboratory, examination, and questionnaire data across repeated survey releases. The modeling dataset used six NHANES releases: 2009-2010, 2011-2012, 2013-2014, 2015-2016, 2017-2018, and 2021-2023. The 2019-2020 cycle was excluded because NHANES field operations were disrupted by the COVID-19 pandemic. The 2021-2023 release was treated as a COVID-adapted three-year release rather than as a regular biennial release.

**Table 3.1. NHANES Survey Releases Included in the Study**

| Release | File Suffix | Sample Design | Methodological Use |
|---|---|---|---|
| 2009-2010 | `_F` | Standard 2-year release | Earliest post-2010 glycemic-guideline period used in this study |
| 2011-2012 | `_G` | Standard 2-year release | Temporal validation group |
| 2013-2014 | `_H` | Standard 2-year release | Temporal validation group |
| 2015-2016 | `_I` | Standard 2-year release | Temporal validation group |
| 2017-2018 | `_J` | Standard 2-year release | Pre-pandemic temporal validation group |
| 2021-2023 | `_L` | COVID-adapted 3-year release | Most recent available release after pandemic suspension |

For planned user acceptance testing, the target recruitment locale consists of online communities of Filipino women discussing perimenopause and menopause-related health concerns. The source protocol identifies the "Usapang Perimenopause at Menopause" Facebook interest group as the intended recruitment setting. Formal recruitment should proceed only after permission from group administrators, informed consent, privacy safeguards, and the final testing protocol are completed.

### 3.3 Population of the Study

The modeling population consisted of postmenopausal women represented in NHANES. The final analytic cohort contained 1,376 postmenopausal women who satisfied the study's demographic, reproductive-health, and data-availability criteria. The cohort was restricted to female respondents within the target menopausal age range, with postmenopausal status derived from reproductive-health questionnaire responses. Reproductive-health filtering used RHQ031, which identifies respondents who reported no menstrual period during the past 12 months.

The multiclass reference distribution consisted of 642 normal cases, 457 pre-diabetic cases, and 277 diabetic cases. For the deployed screening model, pre-diabetic and diabetic cases were combined into a single at-risk class. This binary reformulation produced 734 at-risk cases and 642 normal cases. The binary formulation reflects the intended use of DIANA as a screening and triage-support tool: the system is designed to identify individuals who may benefit from confirmatory testing or clinical review rather than to assign a definitive diagnosis.

**Table 3.2. Final Class Distribution**

| Class | Count | Proportion |
|---|---:|---:|
| Normal | 642 | 46.7% |
| Pre-diabetic | 457 | 33.2% |
| Diabetic | 277 | 20.1% |
| Total | 1,376 | 100.0% |
| Binary at-risk class (Pre-diabetic + Diabetic) | 734 | 53.3% |

The planned user-evaluation population consists of menopausal or postmenopausal women who can interact with the DIANA application and provide structured usability feedback. The planned clinical-evaluation population consists of licensed medical professionals, particularly from endocrinology and obstetrics-gynecology, who can review risk-output plausibility, SHAP explanation clarity, and clinical workflow fit. Because formal user acceptance testing and expert review have not yet been completed, these groups are described as planned evaluation populations rather than completed study samples.

### 3.4 Data Gathering Tools and Procedures

This study used secondary data from NHANES. Raw XPT files were acquired from the CDC public repository and processed through an automated Python data pipeline. The collected files included demographic records, glycohemoglobin records, fasting glucose records, total cholesterol records, HDL cholesterol records, triglyceride and LDL records, body-measurement records, reproductive-health questionnaire responses, diabetes questionnaire responses, smoking variables, physical-activity variables, alcohol-use variables, family-history variables, insulin records where available, and high-sensitivity CRP records where available.

**Table 3.3. NHANES File Groups and Key Variables**

| File Group | Description | Key Variables Used |
|---|---|---|
| DEMO | Demographics | Age, sex, race/ethnicity, survey weights |
| GHB | Glycohemoglobin | HbA1c (LBXGH), used for reference-label construction |
| GLU | Fasting glucose | Fasting plasma glucose (LBXGLU), used for clinical interpretation |
| TCHOL | Total cholesterol | Total cholesterol (LBXTC) |
| HDL | HDL cholesterol | HDL cholesterol (LBDHDD) |
| TRIGLY | Triglycerides and LDL | Triglycerides (LBXTR), calculated LDL cholesterol |
| BMX | Body measurements | BMI (BMXBMI), waist circumference (BMXWAIST) |
| RHQ | Reproductive health | Postmenopausal filter using RHQ031 |
| DIQ | Diabetes questionnaire | Self-reported diabetes or borderline diabetes (DIQ010) |
| SMQ | Smoking questionnaire | Smoking status derived from SMQ020 and SMQ040 |
| PAQ | Physical activity questionnaire | Activity categories derived from PAQ605, PAQ650, and PAQ665 |
| ALQ | Alcohol questionnaire | Alcohol-use categories derived from ALQ variables |
| MCQ | Medical conditions | Family history of diabetes where available |
| INS | Insulin | Fasting insulin, available only in subsamples |
| HSCRP | High-sensitivity CRP | Inflammation marker where available |

Raw NHANES records were linked through SEQN, the unique respondent identifier. After merging, the pipeline standardized NHANES variable codes into clinically interpretable feature names. For example, LBXGH was mapped to HbA1c, LBXGLU to fasting blood sugar, BMXBMI to BMI, BMXWAIST to waist circumference, LBXTR to triglycerides, LBDHDD to HDL cholesterol, and LBDLDL to LDL cholesterol.

Lifestyle variables were derived through rule-based classification. Smoking status was derived from SMQ020 and SMQ040 and categorized as never, former, current, or unknown. Physical activity was derived from PAQ605, PAQ650, and PAQ665 and categorized as active, moderate, sedentary, or unknown. Alcohol use was derived from ALQ variables and categorized as none, light, moderate, heavy, or unknown. The physical-activity variable was treated as a simplified categorical proxy rather than as an exact measure of weekly guideline adherence because NHANES questionnaire responses do not consistently provide complete minute-level activity records for every respondent.

**Table 3.4. Core Feature Mapping**

| NHANES Code | Clinical Name | Description |
|---|---|---|
| LBXGH | hba1c | Glycated hemoglobin (%) |
| LBXGLU | fbs | Fasting blood sugar (mg/dL) |
| BMXBMI | bmi | Body mass index (kg/m2) |
| BMXWAIST | waist_circumference | Waist circumference (cm) |
| LBXTR | triglycerides | Triglycerides (mg/dL) |
| LBDHDD | hdl | HDL cholesterol (mg/dL) |
| LBDLDL | ldl | LDL cholesterol (mg/dL) |

### 3.5 Reference-Label Construction

Reference labels were constructed using a dual-source hierarchy. The primary source was DIQ010, the NHANES diabetes questionnaire item that records whether a respondent had been told by a physician that she had diabetes or borderline diabetes. Respondents reporting physician-diagnosed diabetes were labeled diabetic, while respondents reporting borderline diabetes were labeled pre-diabetic.

For respondents without self-reported diabetes or borderline diabetes, American Diabetes Association HbA1c thresholds were applied. HbA1c values of 6.5 percent or higher were labeled diabetic, values from 5.7 to 6.4 percent were labeled pre-diabetic, and values below 5.7 percent were labeled normal. A hard override was applied so that any record with HbA1c of 6.5 percent or higher was labeled diabetic regardless of self-reported status. This rule reduced the chance that undiagnosed biochemical diabetes would be mislabeled as normal based only on self-report.

Agreement between DIQ010-derived labels and HbA1c-threshold labels was 94.8 percent, corresponding to 1,304 of 1,376 records. The remaining 5.2 percent reflected discordance between self-report and a single biochemical measurement. These discordant records may represent undiagnosed diabetes, recall error, treatment effects, timing differences, or biological and laboratory variability. The label used in this study should therefore be interpreted as an operational reference label rather than as a perfect diagnostic gold standard.

### 3.6 Data Preparation, Missing Data, and Outlier Handling

NHANES records contain missing values because of non-response, subsample designs, examination skip patterns, and variable availability across cycles. The defensible training pipeline used leakage-safe median imputation within the cross-validation workflow. Imputation parameters were fitted only on training folds and then applied to held-out folds, ensuring that validation or test information did not influence preprocessing. K-nearest-neighbor imputation was restricted to exploratory analysis and was not used for defensible model training because global imputation before cross-validation would allow the imputation procedure to see held-out fold information.

At inference time, missing waist circumference is handled by a separate serving-layer guardrail. During face-validity review, median imputation was found to be problematic for low-BMI users because a training-cohort median waist value of approximately 97 cm could create an implausible visceral-adiposity signal. When waist circumference is unavailable but BMI is present, the ML service estimates waist circumference as BMI multiplied by 3.33. This rule is a pragmatic usability safeguard intended to reduce implausible individual-level substitution; it is not a validated clinical estimator and should be evaluated further through sensitivity analysis.

Outlier handling used clinical plausibility ranges rather than automatic row deletion. Values outside plausible clinical bounds were flagged through a binary outlier indicator, but records were retained. This decision preserved sample size and avoided excluding genuinely extreme metabolic profiles that may be clinically meaningful. In the final cohort, 23 of 1,376 records, or 1.7 percent, had at least one flagged outlier.

### 3.7 Data Leakage Prevention

A three-layer leakage-prevention architecture was implemented before model training. The first layer scanned model feature definitions to confirm that diagnostic markers such as HbA1c, fasting blood sugar, fasting glucose, and related aliases were absent from classifier and clustering feature sets. The second layer performed proxy-leakage detection by computing Pearson correlation between each non-diagnostic candidate feature and the HbA1c diagnostic threshold. Features with absolute correlation greater than 0.95 would be flagged as proxy leakage. The third layer computed Shannon entropy information gain to verify feature relevance while documenting why some high-ranked features were excluded.

This validation was enforced programmatically as a pre-training gate. If diagnostic variables or proxy-leakage conditions were detected, the training sequence would terminate. This made leakage prevention an executable part of the methodology rather than a post-hoc assertion. In the verified final feature set, no diagnostic predictor leakage and no proxy leakage were detected.

### 3.8 Predictive Model Development and Validation

Four candidate algorithms were evaluated under the same nested temporal-validation framework: Logistic Regression, Random Forest, LightGBM, and XGBoost. Logistic Regression served as the interpretable linear baseline. Random Forest provided a non-linear ensemble baseline. LightGBM and XGBoost provided gradient-boosting benchmarks for structured tabular prediction.

**Table 3.5. Hyperparameter Search Space**

| Algorithm | Hyperparameter | Search Space |
|---|---|---|
| Logistic Regression | C | 0.01, 0.1, 0.3, 1.0, 3.0 |
| Random Forest | n_estimators | 200, 300 |
| Random Forest | max_depth | 4, 6, 8 |
| Random Forest | min_samples_leaf | 10, 15, 25 |
| LightGBM | n_estimators | 200, 400 |
| LightGBM | max_depth | 3, 5, 7 |
| LightGBM | learning_rate | 0.05, 0.1 |
| LightGBM | min_child_samples | 20, 30 |
| XGBoost | n_estimators | 200, 300 |
| XGBoost | max_depth | 3, 5 |
| XGBoost | learning_rate | 0.05, 0.1 |

Hyperparameter optimization used grid search with AUC-ROC as the scoring metric. The inner loop used grouped cross-validation so that NHANES survey-cycle boundaries were respected during model selection. The outer loop used Leave-One-Group-Out validation, holding out one entire NHANES release at a time. This nested LOGO design estimated whether a model trained on prior survey groups could generalize to a distinct temporal cohort. It is more conservative than random k-fold validation because observations from the same survey period are not split across training and testing.

The final model was selected based on mean fold AUC rather than pooled aggregate AUC alone. This selection rule favored models that performed consistently across temporal groups. Logistic Regression was selected for deployment because it achieved the strongest mean fold AUC while preserving interpretability, stable probability outputs, and efficient inference.

NHANES survey weights were not incorporated into model training. Survey weights are essential for population-level prevalence estimation and nationally representative descriptive inference, but their role in prediction-model training depends on the target deployment population and modeling objective. In this study, unweighted training was treated as a design choice for learning risk patterns in the analytic cohort. Weighted sensitivity analysis remains an appropriate future extension.

### 3.9 Clinical Threshold Optimization and Serving Guardrails

The final classifier outputs a probability that must be converted into a binary screening classification. Because DIANA is intended for early risk identification, thresholding was optimized for a screening context rather than defaulting to 0.50. Three threshold strategies were evaluated using out-of-fold probabilities: Youden's J, a screening-optimized rule, and the geometric mean of sensitivity and specificity. A composite clinical score was then used to select the fold-specific strategy:

`Clinical Score = 0.35 * Sensitivity + 0.30 * Specificity + 0.25 * F1 + 0.10 * Accuracy`

The final mean threshold was 0.478. This downward adjustment from 0.50 reflects the screening objective of detecting at-risk cases while preserving acceptable specificity. A deterministic guardrail was also implemented to reduce specificity collapse under temporal prevalence shift. If a selected threshold produced high sensitivity but inadequate specificity, the algorithm searched for a feasible threshold satisfying minimum operating constraints or reverted toward a safer operating point. In the final Logistic Regression model, guardrail arbitration was activated in 2 of 6 LOGO folds.

The serving layer also includes a rule-based Metabolic Syndrome risk guardrail. This rule evaluates triglycerides of at least 150 mg/dL, HDL cholesterol below 50 mg/dL, BMI of at least 25, and waist circumference of at least 80 cm. When three or more criteria are met, the at-risk probability is raised to at least 0.65. When two criteria are met, the at-risk probability is increased by 0.15 and capped at 0.95. This rule should be interpreted as an engineered safety heuristic for reducing implausibly low risk estimates in metabolically concordant high-risk profiles, not as an independently validated clinical rule.

### 3.10 Cluster-Based Risk Group Identification

DIANA uses a two-stage inference structure. The first stage classifies a user as normal or at risk using the Logistic Regression screening model. Only users classified as at risk proceed to the weighted K-Means subtyping stage. This gating mechanism prevents the system from assigning disease-pattern subtype labels to users classified as normal.

Weighted K-Means clustering was trained exclusively on the at-risk subset of 734 cases. The clustering features were BMI, triglycerides, LDL cholesterol, HDL cholesterol, age, and waist circumference. Feature weights were applied before Euclidean distance computation to emphasize clinically relevant dimensions. LDL received the highest weight as an atherogenic lipid differentiator. Triglycerides and waist circumference were strongly weighted because of their relationship to lipid dysregulation, central adiposity, and insulin-resistance patterns. BMI served as an obesity-pattern anchor, HDL as an inverse lipid marker, and age as a baseline variable.

**Table 3.6. Weighted K-Means Feature Weights**

| Feature | Weight | Interpretation |
|---|---:|---|
| LDL cholesterol | 2.5 | Atherogenic lipid differentiator |
| Triglycerides | 2.0 | Lipid dysregulation and insulin-resistance-related signal |
| Waist circumference | 2.0 | Central adiposity signal |
| BMI | 1.5 | Obesity-pattern anchor |
| HDL cholesterol | 1.2 | Inverse lipid-risk marker |
| Age | 1.0 | Baseline demographic variable |

Cluster centroids were inverse-transformed from standardized space into raw clinical units before interpretation. The resulting labels were Ahlqvist-inspired proxy labels: SIRD-like, SIDD-like, MOD-like, and MARD-like. These labels are heuristic descriptions of metabolic pattern similarity. They are not validated biological subtype diagnoses, they do not replace clinical judgment, and they should not be used as treatment directives.

The SIDD-like label requires particular caution. True SIDD classification requires beta-cell function markers such as HOMA2-B or C-peptide, which were unavailable in the NHANES feature set used by DIANA. In this study, SIDD-like is therefore interpreted as an atherogenic or lipid-driven proxy label based primarily on elevated LDL patterns rather than as a true insulin-deficiency subtype diagnosis.

### 3.11 Model Explainability and Clinical Decision Support

Although Logistic Regression provides coefficient-level interpretability, DIANA also uses SHapley Additive exPlanations (SHAP) to provide patient-level feature attribution. SHAP values indicate how each feature pushes a prediction toward or away from the at-risk class. The explainability workflow supports both cohort-level interpretation, through summary visualizations, and patient-level interpretation, through waterfall-style feature-contribution displays.

Detailed SHAP outputs are generated through the explainability endpoint and displayed in the frontend when available. They are not persisted as JSONB fields in the assessment table. The database stores prediction metadata such as risk score, predicted status, model version, dataset hash, and subtype context, while detailed SHAP values remain transient explanation artifacts.

The implementation includes graceful degradation when SHAP output is unavailable. In that case, the frontend displays an explanation-unavailable panel and states that no feature-level SHAP values are shown in fallback mode. This behavior preserves the screening result while avoiding fabricated feature attributions.

### 3.12 System Architecture and Implementation

DIANA was implemented as a four-tier architecture consisting of a React frontend, a Go backend API, a Python ML inference service, and a PostgreSQL data layer with Redis caching. The frontend uses React 18 and Vite. The backend uses Go 1.25 with Gin. The ML service uses Python 3.12 with Flask. The database layer uses NeonDB PostgreSQL 16, while Redis 7 supports cached trend, analytics, and cluster-distribution data. Rate limiting is implemented separately through Go token-bucket middleware.

**Table 3.7. Technology Stack**

| Component | Technology | Rationale |
|---|---|---|
| Frontend | React 18 + Vite | Component-based UI, efficient rendering, and fast development workflow |
| Backend | Go 1.25 + Gin | Concurrent request handling, static typing, and compiled deployment |
| ML Service | Python 3.12 + Flask | Access to scikit-learn, SHAP, and ML tooling |
| Database | NeonDB PostgreSQL 16 | ACID-compliant persistence for user and assessment records |
| Cache | Redis 7 | TTL-based caching and targeted invalidation for repeated read queries |
| Authentication | JWT (HS256) | Stateless authentication with access and refresh token support |
| Deployment | Vercel + Render | Managed HTTPS deployment for frontend, backend, and ML service |
| Charts | Recharts + Plotly | Interactive biomarker trends and explainability visualizations |

The Go backend and Python ML service were decoupled to isolate ML inference and explanation tasks from routine API operations. The backend validates assessment input, forwards the model-relevant payload to the ML service, receives prediction and lineage metadata, persists the assessment, invalidates affected cache keys, and returns the result to the frontend. If `MODEL_URL` is unset during local development, the router can select a mock predictor. In production-oriented flows, prediction failures are propagated as structured errors rather than hidden behind undocumented fallback behavior.

The implemented API surface supports authenticated user workflows, assessment management, exports, privacy-oriented self-service operations, model explanations, administrative user management, audit review, model traceability, and analytics. Core user routes include profile retrieval and update, onboarding, consent settings, trend retrieval, account deletion, assessment creation, assessment retrieval, assessment update, and assessment deletion under `/api/v1/users/me`. Additional self-service privacy routes support data export, deletion requests, consent history, consent withdrawal, and processing-information retrieval. Administrative routes support dashboard summaries, audit-log review, user-management actions, model traceability, drift-status review, and authentication-event streaming. The ML proxy exposes health, information-gain, clustering, visualization, and explainability routes, with detailed SHAP explanation requested through `/api/v1/ml/predict/explain`.

**Table 3.8. Selected API Surface**

| Route Group | Selected Routes | Purpose |
|---|---|---|
| Authentication | `/api/v1/auth/{login,register,refresh,logout}` | User authentication and token lifecycle |
| Health and observability | `/api/v1/{healthz,livez,metrics}`, `/swagger/*any` | Runtime health checks, metrics exposure, and generated API documentation |
| User profile | `/api/v1/users/me/{profile,onboarding,consent,trends,account}` | User profile, consent, trends, and account deletion |
| Privacy self-service | `/api/v1/users/me/privacy/{export/data,delete,consent/history,consent/withdraw,processing-info}` | User data export, deletion workflow, consent history, withdrawal, and processing information |
| Assessments | `/api/v1/users/me/assessments`, `/api/v1/users/me/assessments/:assessmentID` | Create, list, retrieve, update, and delete assessments |
| Export | `/api/v1/users/me/export/pdf` | Generate user health report |
| Insights and analytics | `/api/v1/insights/{cluster-distribution,biomarker-trends,cohort}`, `/api/v1/analytics/summary` | Aggregate cohort, biomarker, subtype, and summary analytics |
| ML proxy | `/api/v1/ml/{health,insights/metrics,insights/information-gain,insights/clusters,insights/visualizations/:name,predict/explain}` | ML health, model insights, visualizations, and SHAP explanation |
| Admin dashboard and audit | `/api/v1/admin/{dashboard,audit}`, `/api/v1/admin/events/stream` | Administrative summaries, audit-log review, and authentication-event monitoring |
| Admin users | `/api/v1/admin/users`, `/api/v1/admin/users/:id`, `/api/v1/admin/users/:id/activate` | Administrative user management |
| Admin models | `/api/v1/admin/models`, `/api/v1/admin/models/{active,drift,drift/alerts,sync}` | Model traceability and drift-related administration |

The database schema links assessments directly to authenticated users. This design supports user-owned health records and allows cascade behavior when user records are removed. SQLC-generated queries provide type-safe data access and reduce the risk of runtime query mismatch. Prediction metadata stored with assessments includes risk score, risk label, predicted status, model version, dataset hash, and subtype fields where applicable. The deployed screening model is identified as `binary_v2_no_bp`, and lineage metadata is surfaced through the active-model and drift-status administration routes.

### 3.13 Security, Authorization, and Quality Evaluation

DIANA implements JWT-based authentication, role-based access control, request-size limiting, rate limiting, security headers, CORS filtering, and password hashing with bcrypt. Three main roles are recognized: user, doctor, and admin. Users can create assessments, view their own predictions, export reports, and review personal trends. Doctors are treated as a testing and validation role with model-locked assessment creation using `binary_v2_no_bp`. Administrators can access system administration functions such as user management, audit logs, model traceability, and dashboard summaries.

**Table 3.9. Security Controls**

| Control | Implementation | Purpose |
|---|---|---|
| Token signing | HMAC-SHA256 JWT | Preserve token integrity |
| Password hashing | bcrypt cost 10 | Protect credentials at rest |
| RBAC | Middleware enforcement | Apply least-privilege access |
| Rate limiting | Go native token bucket | Reduce brute-force and denial-of-service risk |
| CORS | Whitelist enforcement | Restrict cross-origin access |
| TLS | Managed HTTPS | Protect transport confidentiality |

Software quality evaluation followed ISO/IEC 25010-informed characteristics. Functional suitability was evaluated through endpoint tests, model-serving tests, and frontend unit tests. Performance efficiency was evaluated through inference benchmarks and planned load-testing methodology. Security was evaluated through authentication, RBAC, rate-limiting, and middleware tests. Maintainability was supported through modular architecture, generated database access, and separated frontend/backend/ML services. Formal usability, accessibility, expert face-validity, and reliability results require separate UAT and expert-review execution.

### 3.14 User Acceptance Testing and Expert Review Methodology

The planned user evaluation follows an ISO/IEC 25010-informed usability framework. The protocol evaluates appropriateness recognizability, learnability, operability, user error protection, interface aesthetics, accessibility, and user confidence. Planned user participants will complete core tasks such as logging in, navigating the dashboard, submitting an assessment, and interpreting prediction results.

The planned user cohort consists of approximately 30 menopausal or postmenopausal Filipino women recruited from the target online community, subject to approval and consent procedures. The planned clinical expert cohort consists of two licensed medical professionals, preferably one endocrinologist and one obstetrics-gynecology specialist, with experience in menopausal and metabolic health. Expert review will evaluate risk-output plausibility, SHAP explanation clarity, clinical workflow fit, and perceived utility. Because formal UAT and expert review have not yet been completed, SUS scores, task success rates, expert ratings, and expert quotations must remain placeholders until empirical evidence is collected.

---

# Chapter 4: Results and Discussion

### 4.1 Binary Screening Model Performance

The final Logistic Regression screening model demonstrated acceptable discrimination under nested LOGO validation, achieving an AUC-ROC of **0.727** (95% CI: **0.700-0.753**) and a sensitivity of **0.711** (95% CI: **0.680-0.741**) at the optimized screening threshold of **0.478**. Specificity was **0.629**, and the F1 score of **0.699** indicates a moderate precision-recall trade-off at the selected threshold.

The reported confidence intervals were computed using 1,000 bootstrap resamples, the percentile method, and a fixed random seed of 42. Bootstrap samples containing fewer than two outcome classes were excluded from confidence-interval computation. This procedure provides distribution-free uncertainty estimates appropriate for the modest sample size and the temporal validation design.

**Table 4.1. Headline Binary Screening Performance**

| Metric | Value |
|---|---:|
| AUC-ROC | 0.7267 |
| 95% CI for AUC-ROC | 0.700-0.753 |
| Optimized threshold | 0.478 |
| Sensitivity | 0.7112 |
| 95% CI for sensitivity | 0.680-0.741 |
| Specificity | 0.629 |
| Positive predictive value | 0.687 |
| Negative predictive value | 0.656 |
| F1 score | 0.699 |

**Table 4.1.1. Confidence Interval Summary**

| Metric | Point Estimate | 95% CI Lower | 95% CI Upper | Target |
|---|---:|---:|---:|---|
| Sensitivity | 0.7112 | 0.680 | 0.741 | >= 0.70 |
| AUC-ROC | 0.7267 | 0.700 | 0.753 | >= 0.70 |

The fold-level AUC range of **0.703-0.776** across the six held-out NHANES survey releases indicates that no single temporal fold collapsed below the acceptable discrimination target. The result supports the interpretation that the classifier learned repeatable metabolic risk patterns across NHANES releases. However, because the evaluation remains internal to NHANES, the result should be interpreted as temporal validation rather than external clinical validation.

**Table 4.2. Per-Fold LOGO Validation Results for Logistic Regression**

| Fold | Test Release | AUC-ROC | Sensitivity | Specificity | Threshold | Strategy |
|---:|---|---:|---:|---:|---:|---|
| 1 | 2009-2010 | 0.717 | 0.735 | 0.600 | 0.46 | Guardrail shift floor |
| 2 | 2011-2012 | 0.703 | 0.607 | 0.744 | 0.50 | Youden's J |
| 3 | 2013-2014 | 0.733 | 0.659 | 0.606 | 0.48 | Youden's J |
| 4 | 2015-2016 | 0.776 | 0.699 | 0.736 | 0.50 | Youden's J |
| 5 | 2017-2018 | 0.730 | 0.727 | 0.657 | 0.47 | Youden's J |
| 6 | 2021-2023 | 0.724 | 0.839 | 0.510 | 0.46 | Guardrail shift floor |
| Mean | - | 0.731 | 0.711 | 0.642 | 0.48 | - |

The sensitivity point estimate exceeded the pre-specified screening target of 0.70, but the lower bound of the 95 percent confidence interval was 0.680. This should be reported transparently. The result is defensible as an exploratory screening-support model because the point estimate meets the target, but the below-target lower bound indicates uncertainty under adverse temporal variation and supports the need for external or prospective validation.

At the threshold-policy level, Youden's J was selected in 4 of 6 LOGO folds, while guardrail shift-floor arbitration was activated in 2 of 6 folds. This distribution indicates that the final threshold policy was not a simple default cutoff. It combined conventional discrimination-based selection with a safety mechanism for folds vulnerable to specificity collapse.

**Table 4.2.1. Threshold Mode Distribution**

| Threshold Mode | Occurrence (6 folds) | Interpretation |
|---|---:|---|
| Youden's J | 4/6 | Primary strategy balancing sensitivity and specificity |
| Guardrail Shift Floor | 2/6 | Safety fallback preventing specificity collapse under temporal shift |

**Figure 4.1 Placeholder. ROC Curve for the Logistic Regression Screening Model**
[PLACEHOLDER: insert verified ROC figure from `models/binary_v2_no_bp/visualizations/roc_curve.png`.]

### 4.2 Feature Relevance and Feature-Selection Results

Information Gain analysis was used to examine feature relevance before final model interpretation. The final model retained triglycerides, HDL cholesterol, LDL cholesterol, BMI, waist circumference, age, smoking status, physical activity, and alcohol use. Several excluded variables had high information gain, including fasting insulin, TG/HDL ratio, blood pressure variables, and metabolic syndrome score. These variables were reviewed but excluded for methodological reasons.

**Table 4.3. Information Gain Feature Rankings**

| Rank | Feature | Type | IG | IG% | In Model? |
|---:|---|---|---:|---:|---|
| 1 | Fasting Insulin | Numeric | 0.378539 | 37.98% | No |
| 2 | TG/HDL Ratio | Numeric | 0.259632 | 26.05% | No |
| 3 | Triglycerides | Numeric | 0.244786 | 24.56% | Yes |
| 4 | HDL | Numeric | 0.090256 | 9.05% | Yes |
| 5 | Waist Circumference | Numeric | 0.084017 | 8.43% | Yes |
| 6 | Systolic BP | Numeric | 0.080274 | 8.05% | No |
| 7 | Diastolic BP | Numeric | 0.061783 | 6.20% | No |
| 8 | BMI | Numeric | 0.058757 | 5.89% | Yes |
| 9 | Metabolic Syndrome Score | Numeric | 0.058490 | 5.87% | No |
| 10 | LDL | Numeric | 0.044970 | 4.51% | Yes |
| 11 | BMI Category | Numeric | 0.034278 | 3.44% | No |
| 12 | Total Cholesterol | Numeric | 0.028459 | 2.86% | No |
| 13 | Age | Numeric | 0.004261 | 0.43% | Yes |
| 14 | Smoking Status (encoded) | Ordinal | 0.004023 | 0.40% | Yes |
| 15 | Physical Activity (encoded) | Ordinal | 0.002738 | 0.27% | Yes |
| 16 | Alcohol Use (encoded) | Ordinal | 0.000000 | 0.00% | Yes |

Derived variables such as TG/HDL ratio and metabolic syndrome score were excluded because they duplicate information already present in selected features. Including both composites and their component variables could distort interpretation and inflate apparent feature importance. Blood pressure variables were excluded to preserve the self-screening accessibility goal of the system. This feature-selection process prioritized non-circularity, interpretability, accessibility, and practical deployment.

Alcohol use had zero univariate Information Gain in the discretized validation output but remains in the deployed feature contract because coefficient analysis and clinical covariate rationale treat lifestyle exposure as a controlled behavioral predictor rather than as a standalone selector. This should be interpreted cautiously and should not be used to infer a causal protective effect.

### 4.3 Model Comparison

The candidate algorithms were compared under the same nested LOGO validation framework. Logistic Regression achieved the highest mean fold AUC at 0.731. Random Forest achieved an AUC of 0.714, LightGBM achieved 0.703, and XGBoost achieved 0.708. Although some non-linear models produced higher sensitivity, they generally did so at the expense of specificity.

**Table 4.4. Model Comparison Under LOGO Validation**

| Algorithm | AUC-ROC | AUC 95% CI | Sensitivity | Sens 95% CI | Specificity | F1 | Mean Threshold |
|---|---:|---|---:|---|---:|---:|---:|
| Logistic Regression | 0.731 | 0.700-0.753 | 0.711 | 0.680-0.741 | 0.642 | 0.699 | 0.478 |
| Random Forest | 0.714 | 0.689-0.746 | 0.738 | 0.706-0.768 | 0.593 | 0.704 | 0.482 |
| LightGBM | 0.703 | 0.681-0.726 | 0.760 | 0.740-0.799 | 0.537 | 0.699 | 0.455 |
| XGBoost | 0.708 | 0.689-0.724 | 0.766 | 0.734-0.795 | 0.549 | 0.709 | 0.637 |

Logistic Regression was selected because it provided the most appropriate balance of performance and interpretability for a screening-support system. Its coefficients can be interpreted more directly than those of ensemble models, and its probability outputs are suitable for threshold optimization and SHAP-based explanation. It also demonstrated efficient inference: LR inference averages **1.08 ms** in the benchmarked environment, compared with **40.74 ms** for RF and **1.40 ms** for LightGBM. These timing results should be interpreted as local inference benchmarks rather than production load-test results.

### 4.4 Calibration Analysis

Calibration analysis assessed whether predicted probabilities aligned with observed outcomes. The Logistic Regression model produced a Brier score of 0.2082, an expected calibration error of 0.0624, and a Hosmer-Lemeshow statistic of 21.40 in the evaluated calibration subset of 1,047 samples. These results indicate moderate probability alignment rather than perfect calibration.

**Table 4.5. Calibration Metrics**

| Metric | Value | Interpretation |
|---|---:|---|
| Brier Score | 0.2082 | Moderate combined calibration/discrimination loss |
| Expected Calibration Error (ECE) | 0.0624 | Approximately six percentage-point average calibration gap |
| Hosmer-Lemeshow χ² | 21.40 | Moderate calibration fit, sensitive to binning and sample size |
| Calibration subset size | 1,047 | Number of records used in calibration analysis |
| Calibration subset positives | 578 | Positive class count in calibration subset |

The calibrated probabilities should therefore be communicated as approximate risk-support estimates. A high predicted probability should prompt confirmatory testing, clinical review, or preventive counseling, but it should not be interpreted as a confirmed diagnosis or exact individualized disease probability.

### 4.5 Clustering Validation and Subtype Distribution

Weighted K-Means clustering with K = 4 was evaluated on the at-risk subset of 734 cases. The clustering produced a silhouette score of 0.1740, Davies-Bouldin index of 1.6331, and Calinski-Harabasz index of 152.75. These metrics indicate modest separation, which is expected in overlapping metabolic phenotypes.

**Table 4.6. Internal Clustering Validation Metrics**

| Metric | Value | Interpretation |
|---|---:|---|
| Silhouette score | 0.1740 | Weak-to-moderate separation |
| Davies-Bouldin index | 1.6331 | Moderate distinctness |
| Calinski-Harabasz index | 152.75 | Moderate between/within variance ratio |
| K selected | 4 | Retained for Ahlqvist-inspired four-pattern interpretation |
| K optimal by silhouette | 2 | Indicates that K = 4 sacrifices separation for interpretive granularity |

The K = 4 solution was retained to preserve the Ahlqvist-inspired four-pattern interpretation. This decision prioritized clinically interpretable subtype context rather than maximizing internal clustering metrics alone. The modest silhouette score must be acknowledged as a limitation because it indicates overlapping cluster boundaries.

**Table 4.7. At-Risk Cluster Distribution and Centroids**

| Subtype | Count | Percentage | BMI | TG | LDL | HDL | Age | Waist |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| SIRD-like | 70 | 9.5% | 31.85 | 322.77 | 116.47 | 42.10 | 53.89 | 106.60 |
| SIDD-like | 202 | 27.5% | 28.78 | 140.88 | 166.05 | 53.37 | 55.19 | 98.21 |
| MOD-like | 222 | 30.2% | 42.23 | 117.36 | 112.37 | 51.54 | 54.31 | 124.04 |
| MARD-like | 240 | 32.7% | 28.73 | 99.67 | 100.90 | 60.88 | 55.33 | 95.97 |

The cluster distribution demonstrates metabolic heterogeneity within the at-risk class. MARD-like was the largest cluster, followed by MOD-like, SIDD-like, and SIRD-like. The MOD-like centroid had a BMI of approximately 42.23, indicating severe obesity in this cohort rather than moderate obesity. The SIRD-like centroid was characterized by high triglycerides and waist circumference, while the SIDD-like centroid was distinguished by elevated LDL cholesterol. Because assignments are based on weighted distance to centroids, subtype outputs should be understood as geometric pattern assignments rather than rule-based clinical diagnoses.

**Figure 4.2 Placeholder. Cluster Distribution and Centroid Profiles**
[PLACEHOLDER: insert verified clustering figures from `models/binary_v2_no_bp/visualizations/cluster_distribution.png` and `models/binary_v2_no_bp/visualizations/cluster_profiles.png`, if available.]

### 4.6 Leakage Validation Results

The leakage validation pipeline confirmed that diagnostic glycemic variables were absent from the classifier and clustering feature lists. It also confirmed that no retained non-diagnostic feature exceeded the proxy-leakage threshold of absolute r greater than 0.95 with the HbA1c diagnostic threshold. The highest observed proxy correlation was triglycerides at r = 0.3241, which remained far below the leakage threshold.

This result supports the central methodological claim of the study. DIANA's discrimination was not produced by using HbA1c or fasting blood sugar as predictors. Instead, the model estimated at-risk status from metabolic, anthropometric, and lifestyle variables that were separate from the diagnostic markers used in label construction.

### 4.7 Functional Testing Results

Functional testing verified the implemented system across backend, ML service, and frontend layers. The backend Go test suite passed in the current verification run and covered configuration, caching, HTTP handlers, middleware, ML integration, models, services, PDF generation, and store behavior. Assessment handler tests verified critical clinical guardrails, including target age-boundary enforcement, missing waist-circumference acceptance for ML imputation, out-of-range HbA1c warning behavior, and successful assessment creation.

The Python ML service test suite passed with 270 tests. These tests covered clustering behavior, leakage prevention, feature parity, prediction behavior, server endpoints, API authentication, drift scheduling, SHAP background behavior, threshold optimization, and clinical scenario validation. The frontend unit and contract tests passed with 214 tests.

**Table 4.8. Functional Test Summary**

| Layer | Test Evidence | Current Status |
|---|---|---|
| Backend Go suite | Configuration, cache, handlers, middleware, ML integration, services, store | PASS |
| Assessment handler guardrails | Age boundaries, missing waist handling, HbA1c warning propagation, successful create | PASS |
| Python ML suite | 270 tests covering prediction, leakage, clustering, SHAP, drift, clinical scenarios | PASS |
| Frontend unit and contract tests | 214 tests across API contracts, auth flows, forms, and UI components | PASS |
| Frontend coverage threshold | Global coverage thresholds configured at 70% | FAIL: 33.56% lines/statements and 36.7% functions |
| Redis integration tests | Require running Redis service | Environment dependent |

The frontend coverage-threshold run remains a technical readiness gap. The tests pass, but the configured global coverage thresholds are not currently met. This gap should be reported honestly unless additional frontend tests are added or the coverage policy is formally recalibrated.

### 4.8 UI Workflow Integration

The implemented DIANA workflow begins with user authentication and proceeds to dashboard review, biomarker data entry, prediction generation, result display, explainability review, trend visualization, and report export. The dashboard presents recent assessments and risk summaries. The assessment form collects demographics, biomarkers, anthropometric measures, lifestyle variables, and family-history context.

After form submission, the backend validates the request, sends the relevant assessment payload to the ML service, receives prediction and lineage metadata, persists the assessment, invalidates affected cache keys, and returns the result to the frontend. The result display presents risk probability, risk category, subtype context when available, model version, and dataset lineage. SHAP explanations are requested separately and displayed only when explanation outputs are available.

The result interface presents outputs in a layered hierarchy. The first layer shows binary screening classification through risk score, risk category, and threshold context. The second layer shows metabolic subtype context only for at-risk predictions. The third layer presents SHAP explanation when available. Normal predictions receive neutral subtype semantics so that disease-pattern labels are not assigned to users classified as normal.

**Figure 4.3 Placeholder. Main Dashboard Interface**
[PLACEHOLDER: insert verified screenshot captured from the running application.]

**Figure 4.4 Placeholder. Assessment Form With Real-Time Validation**
[PLACEHOLDER: insert verified screenshot captured from the running application.]

**Figure 4.5 Placeholder. ML Result Modal With SHAP Explanation**
[PLACEHOLDER: insert verified screenshot captured from the running application. Do not use synthetic SHAP values.]

**Figure 4.6 Placeholder. Personal Trends Visualization**
[PLACEHOLDER: insert verified screenshot captured from an account with sufficient historical assessments.]

This workflow demonstrates that the model was not evaluated only as an isolated algorithm. It was integrated into a functioning screening-support application with authentication, persistence, visualization, explainability, trends, and report-generation capabilities.

### 4.9 System Performance and Deployment Readiness

The system architecture separates routine API operations from ML inference and explanation generation. The Go backend manages authentication, validation, persistence, caching, and response orchestration, while the Python ML service performs prediction, clustering, explainability, and monitoring-related functions. This separation reduces the risk that computationally heavier ML operations will degrade ordinary application interactions.

Pure model inference benchmarks indicate that Logistic Regression averages approximately 1.08 ms per prediction in the benchmarked environment, while Random Forest averages approximately 40.74 ms and LightGBM averages approximately 1.40 ms. The current source measurements also document approximate service interaction and explanation-related overhead of 205 ms in the measured environment. These measurements support interactive feasibility, but they do not replace production load testing.

Production performance claims should therefore remain qualified. Concurrent load testing with authenticated users, database writes, cache invalidation, ML requests, and frontend rendering has not yet been completed. The final manuscript should avoid claiming production-scale readiness until load-test evidence is collected.

### 4.10 User Acceptance Testing and Expert Feedback

The UAT protocol and expert review framework were defined but had not yet been executed at the time of manuscript preparation. The planned user evaluation follows ISO/IEC 25010 usability characteristics, including appropriateness recognizability, learnability, operability, user error protection, interface aesthetics, accessibility, and user confidence.

Planned user tasks include login and dashboard navigation, assessment submission, and interpretation of ML results and SHAP explanation. Planned expert review will evaluate risk-output plausibility, explanation clarity, workflow fit, and perceived utility. Since formal data collection has not yet been completed, SUS scores, task success rates, expert ratings, and expert quotations should remain marked as pending rather than reported as completed findings.

**Table 4.9. Planned UAT and Expert Review Metrics**

| Metric | Target | Measurement Status |
|---|---:|---|
| System Usability Scale score | > 70 | [TBD after UAT data collection] |
| Task 1 success rate: login/navigation | > 90% | [TBD after UAT data collection] |
| Task 2 success rate: submit assessment | > 90% | [TBD after UAT data collection] |
| Task 3 success rate: interpret results | > 85% | [TBD after UAT data collection] |
| Average time to submit assessment | < 2 minutes | [TBD after UAT data collection] |
| Clinical face-validity: risk-output plausibility | >= 4.0/5.0 | [TBD after expert review] |
| Clinical face-validity: SHAP clarity | >= 4.0/5.0 | [TBD after expert review] |
| Error rate | < 5% | [TBD after UAT data collection] |
| User confidence score | >= 3.5/5.0 | [TBD after UAT data collection] |

**Table 4.10. UAT Test Case Specifications**

| Test ID | Test Case | Expected Result | Status |
|---|---|---|---|
| UAT-01 | User registration | Account created and user redirected to login | Protocol defined; not executed |
| UAT-02 | User login | JWT issued and user redirected to dashboard | Protocol defined; not executed |
| UAT-03 | Dashboard rendering | Risk summary, trend chart, and quick actions rendered | Protocol defined; not executed |
| UAT-04 | Submit full assessment | Assessment created, risk result displayed, SHAP available when supported | Protocol defined; not executed |
| UAT-05 | Submit minimal assessment | Assessment created with waist imputation and risk result displayed | Protocol defined; not executed |
| UAT-06 | Submit below age range | HTTP 400 age policy error displayed | Protocol defined; not executed |
| UAT-07 | View historical trends | Biomarker trends and risk-score history displayed | Protocol defined; not executed |
| UAT-08 | SHAP explanation interaction | Waterfall plot or clinician-friendly fallback displayed | Protocol defined; not executed |
| UAT-09 | Profile update | Profile updated and confirmation shown | Protocol defined; not executed |
| UAT-10 | Admin user management | User list displayed and status action applied | Protocol defined; not executed |
| UAT-11 | Assessment export | CSV or report export generated with expected content | Protocol defined; not executed |
| UAT-12 | Rate-limit enforcement | HTTP 429 returned after configured threshold | Protocol defined; not executed |

Internal walkthroughs identified several areas for improvement, including visibility of medical-history fields, SHAP legend clarity, mobile assessment-form usability, and explanation of Ahlqvist-inspired proxy subtype labels. These findings reflect development review rather than formal UAT results.

**Table 4.11. Expert Feedback Summary Template**

| Expert | Specialty | Clinical Experience | Risk Accuracy Rating | SHAP Clarity Rating | Workflow Integration | Overall Utility | Key Observations |
|---|---|---:|---:|---:|---:|---:|---|
| Expert A | [TBD] | [TBD years] | [TBD]/5.0 | [TBD]/5.0 | [TBD]/5.0 | [TBD]/5.0 | [QUOTE TBD after signed review] |
| Expert B | [TBD] | [TBD years] | [TBD]/5.0 | [TBD]/5.0 | [TBD]/5.0 | [TBD]/5.0 | [QUOTE TBD after signed review] |

### 4.11 UI/UX Design and Accessibility Readiness

The interface applies visual organization principles to support comprehension of clinical information. Related fields are grouped together, risk categories use consistent visual styling, and charts present longitudinal patterns through continuous visual trends. Risk status is communicated through both color and text labels to reduce dependence on color alone.

The application includes accessibility-oriented features such as ARIA labels, keyboard-accessible controls, responsive layouts, visible status text, and device-aware performance tiering. High-capability devices receive full animations and richer chart behavior, while lower-capability devices receive reduced visual complexity. However, formal automated contrast testing and assistive-technology testing have not yet been completed. Therefore, this section should be framed as accessibility readiness rather than WCAG conformance certification.

**Table 4.12. Accessibility and UI Readiness Items**

| Area | Current Evidence | Status |
|---|---|---|
| Color and text risk labels | Risk states use both visual color and text labels | Implemented |
| Keyboard-accessible controls | Core interactive controls support keyboard interaction | Implemented; formal audit pending |
| ARIA labels and status text | Alerts, dialogs, and navigation controls include accessibility-oriented labels | Implemented; formal audit pending |
| Responsive layout | Tailwind breakpoints support mobile, tablet, laptop, and desktop layouts | Implemented |
| Device-aware tiering | Lower-capability devices receive reduced visual complexity | Implemented |
| Contrast ratios | Automated contrast-test result not yet collected | [TBD after accessibility testing] |
| Assistive-technology testing | Screen-reader and assistive workflow testing not yet completed | [TBD after accessibility testing] |

### 4.12 External Benchmark Comparison

DIANA was compared with reconstructed screening baselines under the same NHANES cohort, binary outcome definition, and LOGO validation framework where sufficient variables were available. The FINDRISC-like upper-bound comparator achieved the highest AUC at 0.849, but this implementation used an elevated-glucose or HbA1c proxy for the history-of-high-blood-glucose component. This makes the FINDRISC-like result an optimistic, partially circular upper-bound comparator rather than a faithful non-circular validation.

**Table 4.13. Internal Benchmark Reconstruction Results**

| Tool | AUC-ROC | Sensitivity | Specificity | Interpretation |
|---|---:|---:|---:|---|
| FINDRISC-like upper-bound | 0.849 (±0.034) | 0.818 | 0.729 | Optimistic comparator using glycemic proxy |
| DIANA | 0.727 [0.700-0.753] | 0.711 | 0.629 | Non-circular and optimized for NHANES postmenopausal cohort |
| OmniRisk (Approximated) | 0.688 (±0.025) | 0.931 | 0.278 | Very high sensitivity with low specificity |
| Simple Clinical Model | 0.677 (±0.021) | 0.944 | 0.222 | Minimal feature model with low specificity |
| ADA Risk Test reconstruction | 0.589 (±0.028) | 0.918 | 0.203 | Limited discrimination under this reconstruction |

Compared with OmniRisk, the Simple Clinical model, and the ADA Risk Test reconstruction, DIANA showed a more balanced sensitivity-specificity profile. Several comparator tools achieved high sensitivity but very low specificity, which would increase false-positive referrals in a screening workflow. These benchmark results should be interpreted as internal contextual comparisons, not as proof of superiority over published tools. Some published tools require variables unavailable in NHANES or require approximation. Therefore, the benchmark analysis supports contextual interpretation but does not replace external head-to-head validation.

### 4.13 Study Limitations

Several limitations constrain interpretation of the study. First, all model development and validation were conducted within NHANES. Although LOGO validation provides evidence of temporal robustness across survey cycles, it does not replace validation in an independent clinical cohort or prospective deployment setting. Second, the reference label is operational rather than a definitive diagnostic gold standard because it combines self-reported physician diagnosis with single-measurement glycemic thresholds.

Third, the subtype module uses weighted K-Means clustering and Ahlqvist-inspired labels as heuristic descriptions rather than validated biological subtypes. True biological subtype validation would require additional biomarkers, longitudinal outcomes, and independent clinical datasets. Fourth, deployment guardrails such as waist-circumference imputation and metabolic syndrome risk floors are engineered safeguards requiring ablation, calibration, and clinical review before being treated as validated clinical rules.

Fifth, formal UAT, expert face-validity review, accessibility testing, and production load testing remain incomplete. These sections should remain framed as protocol, readiness, or pending evidence until data collection is completed. For these reasons, DIANA should be presented as a screening-support prototype with promising internal validation, not as a clinically validated diagnostic system.

### 4.14 Chapter Synthesis

The results demonstrate that DIANA provides a technically implemented and methodologically conservative screening-support workflow for diabetes risk stratification among postmenopausal women. Its strongest methodological contribution is the separation of diagnostic label construction from predictor inputs, supported by an automated leakage validation pipeline. The final Logistic Regression model achieved acceptable discrimination under conservative temporal validation while preserving interpretability and deployment simplicity.

The weighted clustering module and SHAP explainability layer add clinical context to the binary risk output, but both require careful interpretation. The subtype labels are heuristic and hypothesis-generating, and SHAP values support transparency rather than causal explanation. Overall, DIANA should be understood as a triage-support system that can help identify users who may benefit from confirmatory testing and clinical review. Future work should prioritize external validation, prospective evaluation, formal UAT, expert clinical review, accessibility assessment, production load testing, and calibration in the intended deployment population.
