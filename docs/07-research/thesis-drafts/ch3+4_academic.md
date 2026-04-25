# Chapter 3: Methodology

## 3.1 Data Acquisition and Preprocessing Framework

### 3.1.1 NHANES Data Acquisition

The primary training dataset was derived from the National Health and Nutrition Examination Survey (NHANES), a program of studies designed to assess the health and nutritional status of adults and children in the United States. NHANES is conducted by the National Center for Health Statistics (NCHS), a division of the Centers for Disease Control and Prevention (CDC) (CDC/NCHS, 2023). This study utilized data spanning six consecutive survey cycles from 2009 to 2023. This longitudinal range was selected to ensure alignment with the American Diabetes Association (ADA) glycated hemoglobin (HbA1c) diagnostic guidelines established in 2010, thereby maintaining consistent diagnostic criteria across the experimental timeline.

**Table 3.1 — NHANES Survey Cycles and Sample Characteristics**

| Cycle | Duration | Identifier | Sampling Design | Observations |
|-------|-------|-------------|---------------|-------|
| 2021–2023 | 2-year | `_L` | COVID-adapted | Post-pandemic resumption (August 2021) |
| 2017–2018 | 2-year | `_J` | Standard | Baseline pre-pandemic |
| 2015–2016 | 2-year | `_I` | Standard | - |
| 2013–2014 | 2-year | `_H` | Standard | - |
| 2011–2012 | 2-year | `_G` | Standard | - |
| 2009–2010 | 2-year | `_F` | Standard | Initial post-ADA 2010 implementation |

The 2019–2020 NHANES cycle was intentionally excluded from the analytic cohort. This exclusion was necessitated by significant disruptions in field operations during the COVID-19 pandemic, which resulted in truncated data collection and potential selection bias. The 2021–2023 cycle, which resumed in August 2021, was utilized as the most recent representative sample following the suspension.

Data acquisition was performed via an automated computational pipeline that retrieved raw SAS Transport (.XPT) files from the CDC public repository. The following modules were systematically integrated to form the multidimensional clinical profile:

**Table 3.2 — NHANES Examination and Questionnaire Modules**

| Module Code | Domain | Primary Biomarkers and Variables |
|-----------|-------------|---------------|
| DEMO | Demographics | Age, biological sex, race/ethnicity, sampling weights |
| GHB | Glycohemoglobin | Glycated hemoglobin (HbA1c) |
| GLU | Fasting Glucose | Fasting plasma glucose (FPG) |
| TCHOL | Total Cholesterol | Serum total cholesterol |
| HDL | HDL Cholesterol | High-density lipoprotein cholesterol |
| TRIGLY | Triglycerides | Serum triglycerides; calculated LDL |
| BMX | Anthropometry | Body Mass Index (BMI), waist circumference |
| RHQ | Reproductive Health | Menopausal status and associated temporal indicators |
| DIQ | Diabetes Questionnaire | Physician-confirmed diagnosis status |
| SMQ/PAQ/ALQ | Lifestyle Factors | Smoking history, physical activity, alcohol consumption |
| MCQ | Medical History | Family history of diabetes mellitus |

### 3.1.2 Data Integration and Feature Engineering

Raw data files were consolidated using the unique respondent sequence number (SEQN) to form a unified analytic dataset. This integration process involved a multi-stage preprocessing pipeline designed to standardize clinical nomenclature and derive lifestyle indicators from raw questionnaire responses.

**Lifestyle Variable Derivation**

Categorical lifestyle features were engineered using deterministic rule-based logic to transform self-reported survey data into standardized clinical categories:

1.  **Smoking Status:** Participants were classified into four categories (Never, Current, Former, or Unknown) based on lifetime exposure and current consumption frequency.
2.  **Physical Activity:** Levels were stratified as Active, Moderate, or Sedentary. This classification was systematically aligned with the World Health Organization (WHO) physical activity guidelines, which define the active threshold as 150–300 minutes of moderate-intensity aerobic activity per week (Bull et al., 2020).
3.  **Alcohol Consumption:** Intake was quantified into ordinal categories (None, Light, Moderate, or Heavy) based on weekly consumption frequency and volume.

Standardization of clinical variables ensured that NHANES-specific codes were mapped to conventional medical terminology (e.g., LBXGH to HbA1c, BMXBMI to BMI), facilitating interpretability and clinical relevance during subsequent model training and validation.

### 3.1.3 Cohort Selection and Diagnostic Labeling

The study cohort was restricted to a specific demographic to isolate the metabolic characteristics of the menopausal transition. Inclusion criteria required participants to be biologically female, aged between 45 and 60 years, and demonstrate postmenopausal status as indicated by reproductive health questionnaire responses. Furthermore, the cohort was restricted to the fasting subsample (8–12 hours) to ensure the validity of glucose and lipid measurements.

**Ground-Truth Assignment**

Diagnostic labels were constructed using a hierarchical dual-source strategy. The primary criterion was a physician-confirmed diagnosis of diabetes mellitus. For participants without a prior diagnosis, clinical thresholds for HbA1c were applied in accordance with ADA guidelines:

-   **Normal:** HbA1c < 5.7%
-   **Prediabetic:** HbA1c 5.7% – 6.4%
-   **Diabetic:** HbA1c ≥ 6.5% or physician-confirmed diagnosis

A definitive override mechanism was implemented where an HbA1c measurement ≥ 6.5% resulted in a "Diabetic" classification regardless of self-reported status, prioritizing biochemical evidence over subjective recall. For the binary screening objective, the "Prediabetic" and "Diabetic" classes were consolidated into a single "At-Risk" category (n=734, 53.3%), while the "Normal" class (n=642, 46.7%) served as the negative control. This formulation maximizes the sensitivity required for population-level screening. The final analytic cohort comprised 1,376 postmenopausal women.

### 3.1.4 Missing Data Mitigation Strategy

The NHANES dataset contains inherent missingness resulting from survey non-response, specialized subsample designs, and algorithmic skip patterns. To address these gaps while preserving the statistical integrity of the predictive model, a leakage-safe imputation strategy was implemented within the nested cross-validation framework.

**Selection of Median Imputation**

The selection of median imputation, rather than mean-based or k-nearest neighbor (KNN) methods, was informed by the specific distributional properties of metabolic biomarkers. Clinical variables, particularly serum triglycerides and fasting plasma glucose, frequently exhibit right-skewed distributions where extreme values represent genuine pathological states rather than measurement errors. Median imputation was selected for its robustness to these outliers, as it preserves the central tendency of the distribution without being influenced by pathological extremes. Furthermore, median imputation ensures compatibility with the computational pipeline, as it can be fitted exclusively on training folds during cross-validation, thereby preventing information leakage from the test set.

**Leakage-Safe Implementation**

To ensure methodological rigor, the imputation process was embedded directly into the machine learning pipeline. This configuration guarantees that the imputer is fitted only on the training data within each fold of the cross-validation process. Consequently, the statistical characteristics of the test fold remain entirely isolated from the training phase, satisfying the requirement for unbiased performance estimation.

While KNN imputation was utilized for exploratory data analysis (EDA) to maintain multivariate relationships, it was explicitly excluded from the model training pipeline. Applying KNN imputation globally before cross-validation would constitute data leakage, as the imputation model would incorporate information from the test folds during the training process, leading to overoptimistic results.

### 3.1.5 Inference-Time Physiological Heuristics

During the evaluation of model face validity, a limitation of population-level median imputation was identified regarding waist circumference measurements. In the absence of user-provided data, standard median imputation utilizes the cohort median (~97 cm). However, for individuals with a low Body Mass Index (BMI), this static value is physiologically inaccurate and artificially inflates the predicted metabolic risk.

To mitigate this "imputation penalty," an inference-time clinical guardrail was implemented in the serving layer. In cases where waist circumference is not provided, the system dynamically estimates the measurement using a BMI-concordant heuristic derived from the NHANES postmenopausal population average (Waist ≈ BMI × 3.33). This architectural approach maintains the rigor of the training pipeline while ensuring high specificity and clinical relevance for individual users during real-world application.

### 3.1.6 Machine Learning Pipeline Orchestration

The comprehensive training workflow is managed through an automated orchestration pipeline that enforces standardized verification gates. This six-stage process ensures that each phase of model development—from data processing to artifact validation—meets predefined quality thresholds.

**Table 3.3 — Machine Learning Pipeline Stages**

| Stage | Operation | Primary Objective | Artifact Output |
|------|--------|---------|--------|
| 1 | Data Preprocessing | Cycle integration and feature derivation | `diana_training_data_multi.csv` |
| 2 | Diagnostic Labeling | Construction of ground-truth labels | `diana_dataset_final.csv` |
| 3 | Leakage Validation | Automated detection of diagnostic marker leakage | Verification Status |
| 4 | Classifier Training | Nested cross-validation and hyperparameter tuning | `best_model.joblib` |
| 5 | Subtype Stratification | Weighted K-Means clustering (K=4) | `weighted_kmeans_model.joblib` |
| 6 | Performance Audit | Extraction of metrics and artifact verification | Comprehensive Metrics Report |

## 3.2 Automated Data Leakage Verification

The DIANA framework incorporates a multi-layered leakage detection architecture to ensure the non-circularity of the machine learning design. This validation pipeline operates as a prerequisite to model training, terminating the execution if potential information leakage is identified.

1.  **Static Feature Verification:** Prior to training, the system executes an automated scan of all feature definitions to assert the absolute absence of diagnostic markers (e.g., HbA1c, fasting glucose).
2.  **Proxy Leakage Detection:** Pearson correlation coefficients are computed for all candidate features against the primary diagnostic thresholds. Features exhibiting high correlation (|r| > 0.95) are flagged as potential proxies for diagnostic markers and excluded to prevent overoptimistic performance.
3.  **Information Gain Validation:** Shannon entropy-based information gain is utilized to evaluate the predictive contribution of each feature. This verification ensures that the selected features provide independent predictive value and that the model is not relying on redundant or highly correlated diagnostic information.

This automated architecture addresses the broader reproducibility crisis in machine learning-based clinical research by programmatically enforcing cycle-wise isolation and ensuring that the model's performance estimates are scientifically defensible.

## 3.3 Machine Learning Algorithms and Optimization

Three candidate algorithms were evaluated to determine the optimal balance between predictive performance and clinical interpretability. Each model was subjected to identical nested Leave-One-Group-Out (LOGO) cross-validation and hyperparameter optimization.

1.  **Logistic Regression (LR):** Utilized for its high degree of interpretability and clinically relevant probability outputs. The model's coefficients map directly to log-odds ratios, providing transparency for clinicians regarding the relative impact of each biomarker.
2.  **Random Forest (RF):** Selected for its ability to capture non-linear interactions among biomarkers and its inherent robustness to multicollinearity. This is particularly relevant given the physiological correlations present within metabolic lipid profiles.
3.  **Light Gradient Boosting Machine (LightGBM):** A state-of-the-art gradient boosting implementation optimized for tabular datasets. LightGBM was configured to handle class imbalance through the `is_unbalance=True` parameter, ensuring the equitable treatment of the minority class (Normal) relative to the majority class (At-Risk).
4.  **XGBoost:** Integrated to evaluate whether additional regularization and tree-pruning strategies would enhance performance on the temporal validation scheme. XGBoost utilizes a regularization term (lambda and alpha) specifically designed to prevent overfitting in clinical datasets with restricted sample sizes.

**Table 3.4 — Hyperparameter Optimization Grids**

| Algorithm | Hyperparameter | Search Space |
|-----------|----------------|--------------|
| Logistic Regression | Regularization Strength (C) | [0.01, 0.1, 0.3, 1.0, 3.0] |
| Random Forest | Estimators / Depth | [200, 300] / [4, 6, 8] |
| LightGBM | Learning Rate / Depth | [0.05, 0.1] / [3, 5, 7] |
| XGBoost | Learning Rate / Depth | [0.05, 0.1] / [3, 5] |

Hyperparameter selection was performed via `GridSearchCV` utilizing mean Area Under the Receiver Operating Characteristic Curve (AUC-ROC) as the primary optimization metric.

## 3.4 Temporal Generalization via Nested LOGO Validation

To ensure the model's reliability in a clinical environment, a Leave-One-Group-Out (LOGO) cross-validation scheme was employed using NHANES survey cycles as the grouping variable. In each outer fold, an entire survey cycle (e.g., 2021–2023) was reserved as the independent test set, while the remaining cycles were utilized for training. This design simulates the deployment of the model on future patient cohorts, enforcing temporal generalization.

The resulting performance metrics, such as the aggregate AUC-ROC of 0.72, represent conservative estimates of temporal generalization rather than standard k-fold cross-validation figures. In clinical prediction literature, standard random splits frequently yield optimistically biased performance estimates due to temporal correlation and data leakage (Futoma et al., 2020). By prioritizing mean fold AUC across LOGO groups, the DIANA framework ensures consistent performance across diverse temporal cohorts.

## 3.5 Asymmetric Threshold Optimization

Screening tools in public health must prioritize the detection of potential cases, leading to an asymmetric cost of misclassification. Consequently, a sensitivity-biased decision threshold was selected by evaluating three distinct strategies on out-of-fold probabilities:

1.  **Youden’s J Index:** Maximizes the sum of sensitivity and specificity, providing balanced discrimination.
2.  **Screening-Optimized Strategy:** Enforces minimum constraints for sensitivity (≥ 0.80) and specificity (≥ 0.40) to prioritize case-finding in a population-level screening context.
3.  **Geometric Mean (G-Mean):** Balances sensitivity and specificity multiplicatively to prevent extreme asymmetry.

The final threshold of **0.478** was selected based on a composite clinical score that prioritized sensitivity (0.35 weight) and specificity (0.30 weight). This downward adjustment from the default 0.50 threshold aligns with epidemiological principles, where the clinical cost of a false negative (a missed diagnosis) significantly outweighs that of a false positive (which results in low-cost confirmatory testing).

## 3.6 Physiological Outlier Management

A dual-method approach was implemented to differentiate genuine physiological extremes from data entry errors. Outliers were identified using the more conservative bound derived from Interquartile Range (IQR) analysis and clinically established plausibility ranges (e.g., BMI 10.0–100.0 kg/m², HbA1c 3.5–15.0%).

Critically, outlier records (1.7% of the cohort) were flagged but retained in the analytic dataset. This decision acknowledges that extreme values in clinical populations often represent genuine pathological states. Sensitivity analyses confirmed that the inclusion of these outliers did not significantly alter the model's AUC, demonstrating the robustness of the predictive architecture to metabolic extremes.

## 3.7 Hierarchical Triage and Phenotypic Stratification

The DIANA framework utilizes a two-stage hierarchical architecture that mirrors conventional clinical triage workflows, separating the initial screening objective from subsequent phenotypic stratification.

### 3.7.1 Stage 1: Binary Screening Gatekeeper

All participants are initially evaluated by the logistic regression screening classifier, which serves as the primary gatekeeper. This stage identifies individuals with sufficient metabolic risk based on an optimized decision threshold of 0.478. Only individuals classified as "At-Risk" proceed to the second stage of the pipeline, ensuring that phenotypic stratification is performed only on the target pathological population.

### 3.7.2 Stage 2: Weighted K-Means Subtyping

Participants classified as "At-Risk" are subjected to weighted K-Means clustering (K=4) to identify metabolic heterogeneity. This hierarchical approach is methodologically essential, as clustering is intended to stratify the diversity within the at-risk population rather than separate at-risk individuals from healthy controls.

**Literature-Derived Feature Weighting**

Feature weights were derived through a systematic synthesis of clinical literature to amplify the influence of the most discriminative biomarkers for Type 2 Diabetes Mellitus (T2DM) subtyping. These weights function as scaling multipliers within the Euclidean distance calculation, injecting domain knowledge into the unsupervised learning process.

**Table 3.5 — Clinical Feature Weights and Methodological Rationale**

| Feature | Weight | Clinical Significance | Key Evidence |
|---|---|---|---|
| **LDL Cholesterol** | 2.5 | Principal lipid differentiator | OR = 1.12 per SD (Huang et al., 2023) |
| **Triglycerides** | 2.0 | Primary insulin resistance surrogate | 75% of IR cases attributed to TG (Bi et al., 2019) |
| **Waist Circumference** | 2.0 | Indicator of independent central adiposity | Correlation with HOMA-IR (Ahmed et al., 2021) |
| **BMI** | 1.5 | Anchor for obesity-related phenotypes | ΔFasting glucose 0.112 per SD |
| **HDL Cholesterol** | 1.2 | Protective/inverse metabolic signal | OR = 0.69 per mmol/L (Wei et al., 2024) |
| **Age** | 1.0 | Demographic baseline | Baseline — compressed variance in menopausal cohort |

**Ahlqvist-Inspired Phenotypic Proxies**

The resulting clusters were assigned heuristic proxy labels inspired by the Ahlqvist et al. (2018) subtyping framework. Given the absence of specialized insulin assays (e.g., C-peptide, HOMA2-B) in the NHANES dataset, these labels represent phenotypic approximations rather than definitive biological diagnoses:

1.  **SIRD-like (Severe Insulin-Resistant Diabetes Proxy):** Identified by the highest Lipid Accumulation Product (LAP) score, a validated surrogate for insulin resistance in US adult populations (Wang et al., 2024).
2.  **SIDD-like (Atherogenic/Lipid-Driven Proxy):** Characterized by elevated LDL cholesterol levels. This classification serves as a proxy for the atherogenic dyslipidemia phenotype, rather than the original Ahlqvist definition of beta-cell failure.
3.  **MOD-like (Mild Obesity-Related Diabetes Proxy):** Defined by the highest BMI centroid within the at-risk cohort.
4.  **MARD-like (Mild Age-Related Diabetes Proxy):** A residual category representing individuals with milder metabolic dysfunction relative to the other identified subtypes.

Centroids were inverse-transformed from standardized space back into raw clinical units prior to label assignment. This ensures that the classification logic reflects clinically meaningful biomarker values and facilitates the interpretation of results in a medical context.

## 3.8 Interpretability Framework and Clinical Decision Support

To move beyond traditional "black-box" predictive modeling, the DIANA framework integrates SHapley Additive exPlanations (SHAP) to provide patient-level interpretability. This transformation is critical for establishing clinical trust and supporting targeted interventions.

### 3.8.1 SHAP Implementation

The system generates two primary visualization modalities for clinical decision support:

1.  **Cohort-Level Distribution (Beeswarm Plots):** These plots visualize the global distribution of feature impacts across the training cohort, ranking biomarkers by their mean absolute SHAP value to identify dominant risk drivers.
2.  **Individual Feature Attribution (Waterfall Plots):** For individual assessments, waterfall plots display the additive contribution of each biomarker to the specific risk score. This allows clinicians to identify the specific physiological factors driving an "At-Risk" classification.

### 3.8.2 Fault-Tolerant Graceful Degradation

In production environments where SHAP computation may be unavailable due to infrastructure constraints or model incompatibility, the system implements a graceful degradation mechanism. In such instances, a fallback panel is presented to the clinician, explicitly stating the unavailability of feature-level attributions while preserving the primary risk score and classification output. This design ensures that partial system failures do not result in a total loss of clinical utility, maintaining scientific integrity through transparent reporting of system state.

## 3.9 System Architecture and Engineering Methodology

The DIANA platform implements a four-tier layered architecture with a decoupled machine learning (ML) inference service. This design methodology separates concerns across distinct functional layers—Presentation, Business Logic, ML Inference, and Data Persistence—enabling performance isolation and technology-specific optimization.

### 3.9.1 Architectural Design Rationale

The separation of the Go-based backend from the Python-based ML execution environment follows established microservice architecture patterns. This decoupling is essential for managing the computational intensity of ML inference and SHapley Additive exPlanations (SHAP) generation, which typically requires ~200–500ms per request. By isolating these operations in a dedicated Python service, the Go backend maintains sub-50ms response times for non-ML operations, such as user profile management and assessment history retrieval.

**Table 3.6 — Technology Stack and Engineering Justification**

| Component | Technology | Rationale |
|-----------|------------|---------------------------|
| **Frontend** | React 18 + Vite | Component reusability and efficient virtual DOM rendering |
| **Backend** | Go 1.24 + Gin | Goroutine-based concurrency and native performance |
| **ML Service** | Python 3.12 + Flask | Integration with the scikit-learn and SHAP ecosystem |
| **Database** | PostgreSQL 16 (Neon) | ACID compliance and relational integrity for medical data |
| **Caching** | Redis 7 | Sub-millisecond latency for session and trend data |

### 3.9.2 Clinical Safety Mechanisms

The inference architecture incorporates a rule-based clinical override for metabolic syndrome (MetS) based on WHO Asia-Pacific guidelines. If a patient meets multiple criteria (e.g., elevated BMI, triglycerides, and waist circumference), the system enforces a probability floor (0.65) to prevent the underestimation of risk that might occur in a purely linear predictive space. This hybrid architecture ensures that clinical heuristics provide a safety net for compounding metabolic risk factors.

## 3.10 Software Development Lifecycle and Quality Assurance

DIANA follows an iterative software development lifecycle (SDLC) that emphasizes continuous integration (CI) and automated verification of architectural integrity.

1.  **Multi-Language Continuous Integration:** Automated CI pipelines execute parallel testing suites for the Go, Python, and React codebases. This ensures that modifications to the ML service or the frontend do not introduce regressions in the backend business logic.
2.  **API Consistency Verification:** A specialized alignment script validates the structural consistency between the database schema, the Go data models, and the frontend components. This prevent "schema-code drift," ensuring that diagnostic fields remain synchronized across the four architectural tiers.
3.  **Audit and Traceability:** Every risk assessment and ML prediction is recorded within an atomic database transaction, including metadata such as the model version and dataset hash. This provides full traceability for clinical auditing and longitudinal tracking of model performance.

This engineering methodology ensures that the DIANA platform is not only scientifically valid but also architecturally robust and maintainable within a clinical production environment.

## 3.11 Authentication, Authorization, and Data Isolation

The DIANA platform implements a three-tier Role-Based Access Control (RBAC) system enforced via JSON Web Token (JWT) middleware within the Go backend. This architecture ensures secure, stateless session management while maintaining strict data isolation standards required for health informatics systems.

### 3.11.1 User-Centric Data Sovereignty

The system operates on a direct-to-consumer architecture where users maintain sovereignty over their personal health data. Unlike traditional clinical management systems, DIANA is designed for independent self-screening. Access to assessment records is strictly filtered at the database level, ensuring that users can only retrieve data associated with their unique authenticated identifier.

### 3.11.2 Security Controls and Cryptographic Integrity

To safeguard sensitive clinical information, several security controls are implemented:

-   **Stateless Authentication:** Session integrity is maintained via HMAC-SHA256 signed JWTs, which include claims for user identification and role-based permissions.
-   **Credential Protection:** User passwords are secured using the `bcrypt` adaptive hashing algorithm with a computational cost factor of 10, protecting against brute-force and rainbow table attacks.
-   **Traffic Regulation:** A native token-bucket algorithm enforces rate limiting (100 requests per minute per user) to prevent denial-of-service attacks and API abuse.
-   **Transport Security:** All data transmission is encrypted via TLS/SSL, with Cross-Origin Resource Sharing (CORS) whitelisting enforced to prevent unauthorized cross-site requests.

## 3.12 Cloud-Native Deployment Architecture

The DIANA application is deployed as a distributed system utilizing containerized microservices to ensure scalability and operational resilience.

-   **Frontend Presentation:** Hosted on a global Content Delivery Network (CDN) to ensure low-latency access to the React-based user interface.
-   **Backend and ML Services:** Deployed as independent Docker containers, allowing for separate resource allocation and scaling based on computational demand.
-   **Serverless Persistence:** Utilizes a serverless PostgreSQL instance, providing ACID-compliant storage that scales compute resources dynamically in response to varying clinical usage patterns.

## 3.13 Software Quality Evaluation Framework (ISO/IEC 25010)

The evaluation of DIANA’s software quality is aligned with the ISO/IEC 25010:2011 System and Software Quality Requirements and Evaluation (SQuaRE) standard. This framework provides a multi-dimensional assessment of the system across several key characteristics:

1.  **Functional Suitability:** Evaluated through a use-case coverage matrix to ensure the system satisfies all clinical workflow requirements for diabetes screening.
2.  **Performance Efficiency:** Benchmarked against response time targets (<50ms for administrative operations and <500ms for ML-assisted predictions).
3.  **Reliability:** Assessed through error-recovery mechanisms and the implementation of a mock predictor fallback for resilient operation during service interruptions.
4.  **Maintainability:** Supported by modular architectural boundaries and comprehensive technical documentation (e.g., directory-level knowledge bases).

## 3.14 User Acceptance and Reliability Analysis Methodology

To validate the clinical utility and perceived usability of the platform, a structured questionnaire methodology was developed using 5-point Likert-scale items. This survey instrument assesses four primary domains: Perceived Utility, Usability, Reliability, and Overall Satisfaction.

The internal consistency of the survey results is evaluated using **Cronbach’s alpha (α)**, a statistical measure of reliability. An alpha coefficient of ≥ 0.70 is established as the threshold for acceptable reliability, ensuring that the instrument consistently measures the underlying constructs of user satisfaction and system efficacy. Furthermore, item-total correlation analysis is performed to identify and refine any ambiguous or redundant survey items.

## 3.15 API Architectural Contract

The platform exposes a RESTful API designed in accordance with OpenAPI 3.0 standards. The communication between the Go backend and the Python ML service is governed by a strict architectural contract, ensuring that biomarker data is transmitted, validated, and processed with numerical consistency. This decoupled approach allows the ML inference engine to be updated or retrained without requiring modifications to the primary business logic layer, supporting a modular and evolvable system design.

# Chapter 4: Results and Discussion

## 4.1 Binary Screening Model Performance

The logistic regression screening model demonstrated clinically acceptable discriminative performance under nested Leave-One-Group-Out (LOGO) validation. The model achieved an Area Under the Receiver Operating Characteristic Curve (AUC-ROC) of **0.727** (95% CI: 0.700–0.753). At the optimized screening threshold of **0.478**, the system exhibited a sensitivity of **0.711** (95% CI: 0.680–0.741) and a specificity of **0.629**. The F1 score of **0.699** indicates a balanced precision-recall trade-off at the selected operating point.

The fold-level AUC range of **0.703–0.776** confirms stable temporal generalization across the six NHANES survey cycles (2009–2023). This consistency suggests that the model effectively captures robust metabolic patterns that generalize across demographic shifts and temporal health trends. In the context of clinical literature, an AUC-ROC in the 0.70–0.80 range is considered "acceptable" discrimination for non-invasive diabetes risk models, comparable to validated instruments such as the American Diabetes Association (ADA) and Centers for Disease Control and Prevention (CDC) risk scores.

### 4.1.1 Information Gain and Feature Importance

Univariate feature importance was evaluated using Shannon Entropy Information Gain (IG) to validate the discriminatory power of the selected biomarkers.

**Table 4.1 — Shannon Entropy Information Gain Rankings**

| Rank | Feature | Type | Information Gain | IG% | Included? |
|------|---------|------|------------------|-------|-----------|
| 1 | Triglycerides | Numeric | 0.2447 | 24.56% | Yes |
| 2 | HDL Cholesterol | Numeric | 0.0902 | 9.05% | Yes |
| 3 | Waist Circumference | Numeric | 0.0840 | 8.43% | Yes |
| 4 | BMI | Numeric | 0.0587 | 5.89% | Yes |
| 5 | LDL Cholesterol | Numeric | 0.0449 | 4.51% | Yes |
| 6 | Alcohol Use | Ordinal | 0.0125 | 1.26% | Yes |
| 7 | Age | Numeric | 0.0042 | 0.43% | Yes |
| 8 | Smoking Status | Ordinal | 0.0040 | 0.40% | Yes |
| 9 | Physical Activity | Ordinal | 0.0027 | 0.27% | Yes |

Triglycerides and HDL cholesterol emerged as the most significant predictors, collectively accounting for over 33% of the target's entropy. The exclusion of higher-ranked features, such as the TG/HDL ratio and systolic blood pressure, was a deliberate design decision to minimize multicollinearity and ensure the screening tool remains accessible for self-administration in non-clinical settings.

### 4.1.2 Threshold Arbitration and Temporal Robustness

The point estimate sensitivity of 0.711 meets the pre-specified screening target (≥ 0.70). The 95% bootstrap confidence interval lower bound of 0.680 reflects the temporal variability inherent in the LOGO validation design. To mitigate the risk of specificity collapse under temporal prevalence shift, the threshold policy activated a "Guardrail Shift Floor" in 2 of the 6 LOGO folds. This mechanism intervened when the primary optimization strategy yielded unstable operating points, selecting the nearest feasible threshold that satisfied a minimum specificity constraint (≥ 0.40).

## 4.2 Probability Calibration and Clinical Utility

For a clinical decision support system, the calibration of predicted probabilities is as critical as discriminative power. The model achieved a **Brier Score of 0.2082** and an **Expected Calibration Error (ECE) of 0.0624**. The ECE suggests that, on average, the predicted risk probabilities deviate from the observed frequencies by only 6.24 percentage points. This level of calibration indicates that the risk scores generated by DIANA are clinically meaningful and can be utilized for direct patient communication and risk-benefit discussions.

## 4.3 Algorithmic Comparison

A comparative analysis was performed between Logistic Regression (LR), Random Forest (RF), LightGBM, and XGBoost to identify the optimal deployment model.

**Table 4.2 — Comparative Performance of Candidate Algorithms**

| Algorithm | AUC-ROC | AUC 95% CI | Sensitivity | Sens 95% CI | Specificity | F1 Score |
|-----------|---------|------------|-------------|-------------|-------------|----------|
| **Logistic Regression** | **0.727** | 0.700-0.753 | 0.711 | 0.680-0.741 | **0.642** | 0.699 |
| Random Forest | 0.714 | 0.689-0.746 | 0.738 | 0.706-0.768 | 0.593 | 0.703 |
| LightGBM | 0.703 | 0.681-0.726 | 0.760 | 0.740-0.799 | 0.537 | 0.699 |
| XGBoost | 0.708 | 0.689-0.724 | **0.766** | 0.734-0.795 | 0.549 | 0.709 |

While gradient-boosted models (LightGBM, XGBoost) achieved higher sensitivity, Logistic Regression was selected for final deployment due to its superior AUC-ROC, computational efficiency (1.08ms inference latency), and inherent interpretability. The direct mapping of LR coefficients to log-odds ratios provides a transparent framework for clinical validation that is often absent in complex ensemble models.

## 4.4 Phenotypic Stratification and Cluster Validation

Weighted K-Means clustering (K=4) was evaluated on the at-risk cohort (n=734) using internal validation metrics to assess cluster separation and distinctness.

**Table 4.3 — Clustering Validation Metrics**

| Metric | Value | Interpretation |
|--------|-------|----------------|
| **Silhouette Score** | 0.1740 | Weak-to-moderate cluster separation (Range: -1.0 to 1.0) |
| **Davies-Bouldin Index** | 1.6331 | Moderate cluster distinctness (Lower is better) |
| **Calinski-Harabasz Index** | 152.75 | Moderate between/within variance ratio (Higher is better) |

Although silhouette analysis indicated that K=2 was mathematically optimal (Silhouette = 0.20), K=4 was selected to maintain alignment with the clinically established Ahlqvist et al. (2018) subtype framework. The modest silhouette score at K=4 reflects the inherent metabolic overlap within the menopausal population, a finding that underscores the complexity of metabolic stratification in this demographic.

## 4.5 Metabolic Subtype Distribution and Characteristics

The analysis of cluster assignments confirms that the subtyping logic identifies metabolic patterns that are orthogonal to glycemic severity (HbA1c levels), as each cluster contains both pre-diabetic and diabetic participants in varying proportions.

**Table 4.4 — Distribution and Clinical Profiles of Metabolic Subtypes (n=734)**

| Subtype | n | At-Risk Proportion | Mean Age | % Pre-diabetic | % Diabetic | Clinical Phenotype Proxy |
|---------|---|--------------------|----------|----------------|------------|-------------------------|
| **MARD-like** | 240 | 32.7% | 55.3 | 65.0% | 35.0% | Mild Age-Related Diabetes |
| **MOD-like** | 222 | 30.2% | 54.3 | 55.0% | 45.0% | Mild Obesity-Related Diabetes |
| **SIDD-like** | 202 | 27.5% | 55.2 | 73.8% | 26.2% | Atherogenic/Lipid-Driven |
| **SIRD-like** | 70 | 9.5% | 53.9 | 42.9% | 57.1% | Severe Insulin-Resistant |

### 4.5.1 Data-Driven Centroid Analysis

The cluster centroids were inverse-transformed to raw clinical units to facilitate clinical interpretation. This analysis revealed that the "MOD-like" cluster corresponds to severe obesity (Class III), with a mean BMI of 42.23 kg/m², rather than moderate obesity.

**Table 4.5 — inverse-Transformed Cluster Centroids (Raw Clinical Units)**

| Subtype | BMI (kg/m²) | TG (mg/dL) | LDL (mg/dL) | HDL (mg/dL) | WC (cm) |
|---------|-------------|------------|-------------|-------------|---------|
| **SIRD-like** | 31.85 | **322.77** | 115.44 | 42.10 | 106.67 |
| **SIDD-like** | 28.77 | 144.56 | **166.05** | 53.37 | 98.15 |
| **MOD-like** | **42.23** | 117.20 | 112.15 | 51.53 | **124.49** |
| **MARD-like** | 28.69 | 93.96 | 99.49 | 61.38 | 95.73 |

The SIRD-like phenotype exhibited the highest proportion of diabetic cases (57.1%), reflecting the aggressive nature of severe insulin resistance. Conversely, the SIDD-like (atherogenic) phenotype showed the highest proportion of pre-diabetic individuals (73.8%), suggesting that lipid-driven metabolic dysfunction may manifest early in the disease progression before advancing to clinical diabetes.

### 4.5.2 Weighted Geometric Assignment Mechanism

At the inference stage, participants are assigned to the nearest centroid in a weighted standardized space. The weighting scheme prioritizes LDL (2.5x) and Triglycerides (2.0x), reflecting their established clinical significance in cardiometabolic risk. This data-driven approach ensures that phenotypic assignment is based on multi-dimensional metabolic profiles rather than arbitrary univariate thresholds.

## 4.6 Feature Leakage and Non-Circularity Verification

A critical requirement for the DIANA platform is the maintenance of "non-circular" predictive logic. To ensure that the model does not rely on diagnostic outcomes (e.g., HbA1c or FBS) to predict risk, a multi-layer leakage validation pipeline was executed prior to training:

1.  **Direct Feature Audit:** Confirmed that no diagnostic biomarkers (HbA1c, FBS) or their direct proxies were included in the input feature set for either the binary classifier or the clustering algorithm.
2.  **Proxy Correlation Analysis:** Verified that no selected biomarker exhibited a Pearson correlation coefficient of |r| > 0.95 with the diagnostic target. The highest observed correlation was for triglycerides (r = 0.3241), which is within the acceptable range for non-diagnostic predictors.
3.  **Information Gain Verification:** Confirmed that all nine selected features provided meaningful information gain relative to the target, with the lowest-ranked feature (physical activity) contributing 0.27% of target entropy.

These checks computationally verify that the DIANA platform provides a genuine screening signal based on metabolic markers rather than a redundant echo of diagnostic tests.

## 4.7 Integrated System Testing and Functional Verification

The integrated DIANA platform was subjected to comprehensive functional testing across its three primary language ecosystems (Go, Python, and React).

### 4.7.1 Backend API and Data Access Layer

The Go backend test suite, comprising 117 unit tests across 10 packages, validated the full application stack including configuration loading, HTTP handlers, authentication middleware, ML integration, data models, PDF report generation, business logic services, and the SQLC-based data access layer. All packages achieved 100% pass rates on functional unit tests.

### 4.7.2 ML Service and Prediction Integrity

The Python ML service was validated through 269 test cases, covering:
-   **Ahlqvist Subtype Labeling:** Verified the deterministic centroid-based assignment for all four metabolic phenotypes.
-   **Clinical Scenario Evaluation:** 34 end-to-end vignettes were processed to ensure the predictor handles diverse patient profiles accurately.
-   **Numerical Stability:** Edge cases involving missing data and extreme biomarker values were tested to ensure the imputer and scaler remain robust under physiological extremes.

## 4.8 User Interface Workflow and Accessibility

The DIANA frontend implements a five-stage user journey designed to maximize the accessibility of clinical insights for non-expert users.

1.  **Dashboard Overview:** Provides a high-level summary of risk distribution using Gestalt-based color coding (Emerald/Amber/Rose).
2.  **Validated Data Entry:** Implements real-time clinical range checks and BMI auto-calculation to minimize data entry errors.
3.  **ML Result Modal:** Presents risk scores, phenotypic assignments, and SHAP-based feature attributions in a layered hierarchy.
4.  **Longitudinal Trend Tracking:** Visualizes biomarker evolution over time using interactive line charts, facilitating patient-clinician communication.
5.  **Clinical Report Export:** Generates structured PDF summaries that bridge the gap between self-led screening and formal clinical consultation.

The interface incorporates device-aware performance tiering, adjusting animation complexity based on the user's hardware capabilities to ensure a consistent experience across diverse mobile and desktop devices.

## 4.9 External Benchmark Comparison

To contextualize DIANA’s performance, the platform was compared against established clinical screening instruments under identical evaluation conditions (NHANES 2009–2023 cohort).

**Table 4.6 — External Benchmark Comparison Results**

| Instrument | AUC-ROC | Sensitivity | Specificity | Nature of Tool |
|------------|---------|-------------|-------------|----------------|
| **FINDRISC** | 0.849 | 0.818 | 0.729 | Circular (Includes HbA1c) |
| **DIANA** | **0.727** | 0.711 | 0.629 | **Non-Circular** |
| **OmniRisk** | 0.688 | 0.931 | 0.278 | Non-Circular |
| **ADA Risk Test** | 0.589 | 0.918 | 0.203 | Non-Circular (Survey-based) |

While the FINDRISC tool achieved a higher AUC-ROC (0.849), it relies on the inclusion of elevated blood glucose (HbA1c) as a predictor, which introduces circularity in a screening context. Among non-circular instruments, DIANA (0.727) outperformed both OmniRisk (0.688) and the ADA Risk Test (0.589), demonstrating the superior discriminative power of its nine-feature metabolic panel for US-based menopausal populations.

## 4.10 User Acceptance and Expert Validation Framework

A structured User Acceptance Testing (UAT) protocol was developed to evaluate DIANA’s clinical utility and perceived usability.

-   **Clinical Expert Evaluation:** Licensed specialists (endocrinology and OB-GYN) assessed the platform on four dimensions: risk prediction accuracy, SHAP explanation clarity, clinical workflow integration, and overall utility.
-   **User Interaction Metrics:** A cohort of participants (n=30) performed observed tasks, including assessment submission and result interpretation. Preliminary internal reviews identified key improvement areas, such as enhancing SHapley value legends and implementing mobile-responsive collapsible form sections.
-   **System Usability Scale (SUS):** The UAT framework utilizes the SUS questionnaire to quantify subjective satisfaction, with a target score of > 70 established for acceptable clinical utility.

The qualitative feedback collected during internal walkthroughs underscored the value of the "Ahlqvist-inspired" subtyping framing, which provides clinicians with a phenotypic starting point for metabolic triage rather than a definitive diagnosis.

# Chapter 5: Conclusion

The DIANA platform represents a significant advancement in the development of non-invasive, non-circular diabetes screening tools tailored for the menopausal population. By integrating high-fidelity machine learning (Logistic Regression) with data-driven phenotypic stratification (Weighted K-Means), the system successfully identifies individuals at risk for Type 2 Diabetes Mellitus with a scientifically defensible AUC-ROC of 0.727.

The hierarchical architecture addresses a critical gap in contemporary screening methodologies by separating binary risk detection from the subsequent identification of metabolic subtypes (e.g., SIRD-like, SIDD-like). This approach, supported by patient-level SHAP explainability, transforms a standard risk calculator into a robust Clinical Decision Support System (CDSS) capable of informing targeted metabolic interventions.

While the model exhibits strong temporal generalization across fourteen years of NHANES data, future research should focus on prospective clinical validation and the expansion of the phenotypic framework to include longitudinal outcome data. Ultimately, DIANA provides a scalable, accessible, and interpretable framework for proactive metabolic health management, empowering both patients and clinicians to address the asymmetric costs of delayed diabetes diagnosis.

# References

[Selected Bibliography as provided in the Methodology and Results chapters]









