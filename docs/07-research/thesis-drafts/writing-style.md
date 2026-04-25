oftware Methodology 

Phase 1: Data Acquisition and Biomarker Preparation  

Phase 2: Feature Selection using Information Gain and Entropy  

Phase 3: Cluster-Based Risk Group Identification  

Phase 4: Predictive Model Development and Training  

Phase 5: Model Testing, Evaluation, and Comparison  

Phase 6: Web Application Integration and Visualization Development  

Phase 7: System Testing and Technical Validation  

Phase 8: Doctor’s Evaluation 

The development of the DIANA predictive model is anchored in a rapid prototyping methodology, which empowers iterative improvement based on the active involvement of stakeholders and end-users. This approach allows for the swift creation of functional prototypes, facilitating feedback collection from healthcare professionals, and enabling ongoing refinement of both the computational model and its interface. By systematically advancing through each stage from requirement gathering and data handling to technical and clinical validation the methodology ensures the solution remains responsive to practical healthcare needs, data privacy standards, and clinical effectiveness. The phased structure provides clarity, traceability, and adaptability, guiding the project from inception to real-world readiness. 

Phase 1: Data Acquisition and Biomarker Preparation  

This phase executes the extraction, cleaning, and integration of population-level health survey data from the National Health and Nutrition Examination Survey (NHANES) public repository to construct the foundational dataset for algorithmic training and feature selection. Through an automated acquisition and processing pipeline, the system ingests de-identified records across six survey cycles spanning 2009 to 2023, specifically isolating the target demographic of postmenopausal women aged 45 to 60. 

The automated extraction successfully compiled a cohort of 1,376 patient records containing explicitly documented glycemic and lipid profiles. To guarantee data quality and maintain high epidemiological integrity, the system enforces a definitive inclusion filter. The preprocessing pipeline retains only those records possessing complete core biomarker panels and essential demographic metadata, programmatically discarding any incomplete, missing, or structurally deficient entries. 

Data Acquisition 

The initial phase of the system's development involved the systematic acquisition and preparation of raw data files from the National Health and Nutrition Examination Survey (NHANES) public repository. To ensure efficient and reproducible collection process, an automated Python extraction script was utilized to retrieve the required datasets directly from the Centers for Disease Control and Prevention (CDC) database. 

The compiled dataset spans six distinct survey cycles from 2009 to 2023. This specific timeframe was deliberately selected to encompass the era following the establishment of the American Diabetes Association (ADA) HbA1c diagnostic guidelines in 2010, thereby ensuring consistent clinical diagnostic criteria across all included patient records. 

The 2019-2020 survey cycle was intentionally excluded from the analytical cohort due to significant data collection disruptions caused by the COVID-19 pandemic. Field operations during this period were abruptly suspended in March 2020, resulting in incomplete datasets that posed a high risk of selection bias. To compensate for this operational gap, the subsequent 2021-2023 cycle was incorporated, which had been extended by the CDC to a two-year data collection period to provide a more robust and complete post-pandemic representation. 

Table 4: NHANES Survey Cycles Included 

Cycle 

Years 

File Suffix 

Sample Design 

Notes 

2021-2023 

2-year 

_L 

Covid Adapted 

Most Recent Available- extended due to pandemic 

2017-2018 

2-year 

  _J 

Standard 

Prepandemic baseline 

2015-2016 

2-year 

  _I 

Standard 

 

- 

2013-2014 

2-year 

_H 

Standard 

 

- 

2011-2012 

2-year 

_G 

Standard 

 

- 

2009-2010 

2-year 

_F 

Standard 

 

First cycle post-ADA HBA1c guidelines 

 

NHANES Data Files 

The following NHANES examination and questionnaire files were acquired for each cycle: 

Table 5: NHANES Source Files and Variables Used in the Study 

File Code 

Description 

Key Variables 

DEMO 

Demographics 

Age, biological sex, race/ethnicity (RIDRETH1, RIDRETH3), and statistical survey weights. 

 

GHB 

Glycohemoglobin 

HbA1c (LBXGH) — primary diagnostic biomarker 

 

GLU 

Fasting Glucose 

Fasting plasma glucose (LBXGLU) — secondary diagnostic 
 

TCHOL 

Total Cholesterol 

Total cholesterol (LBXTC) 

 

HDL 

HDL Cholesterol 

HDL-C (LBDHDD) — protective lipid 

 

TRIGLY 

Triglycerides & LDL 

Triglycerides (LBXTR), calculated LDL 

 

BMX 

Body Measures 

BMI (BMXBMI), waist circumference (BMXWAIST) 

 

RHQ 

Reproductive Health 

Menopause status (RHQ060), age at menopause 

 

DIQ 

Diabetes Questionnaire 

Self-reported diagnosis (DIQ010) — primary label source 

 

SMQ 

Smoking 

Smoking status (SMQ020, SMQ040) 

 

PAQ 

Physical Activity 

Activity levels (PAQ605, PAQ650, PAQ665) 

 

ALQ 

Alcohol Use 

Alcohol consumption (ALQ101, ALQ151) 

 

MCQ 

Medical Conditions 

Family history diabetes (MCQ300C) 

 

INS 

Insulin 

Fasting insulin (LBXIN) — subsample only 

HSCRP 

High-sensitivity CRP 

Inflammation marker (LBXCRP) 

 

 

 

Figure 3: NHANES Data Acquisition Flow 

	Data Merging and Feature Derivation 

To construct the analytical dataset, the raw epidemiological data files acquired from the NHANES repository were systematically consolidated utilizing the unique respondent sequence number (SEQN) as the primary linkage key. Following this precise record integration, the aggregated data was subjected to a  multi-stage computational pipeline designed to formulate the final analytical cohort. 

 

Figure 4: Data Merging and Feature Derivation 

 

 

 

 

Lifestyle Feature Derivation 

Beyond objective clinical biomarkers and demographic data, the dataset was augmented with categorical lifestyle features derived directly from the NHANES questionnaire responses. To translate the raw survey data into clinically meaningful inputs, these features were formulated using a systematic, rule-based classification approach. The derivation process captured three primary behavioral indicators critical to metabolic health: smoking status, physical activity levels, and alcohol consumption. 

The categorization of physical activity levels within the dataset was systematically aligned with the World Health Organization's (WHO) baseline recommendations. Under these standardized guidelines, individuals were classified as active if their survey responses indicated they met the threshold of 150 to 300 minutes of moderate-intensity aerobic activity per week (Bull et al., 2020). This rigorous standardization ensures that the lifestyle derivations utilized within the system remain highly consistent with prevailing epidemiological definitions and global health metrics. 

The specific conditional logic utilized to map the raw alphanumeric questionnaire codes to their respective categorical health behaviors is detailed in the table below. 

Table 6: Behavioral Risk Features and Categorization Rules 

Feature 

Source Variables 

Categories 

Derivation Logic 

Smoking Status 

SMQ020, SMQ040 

Never, Current, Former, Unknown 

Assigns Never IF SMQ020=2;  

 

Assigns Current IF SMQ020=1 and SMQ040 is 1 or 2;  

 

Assigns Former if SMQ02 0=1 and SMQ040 == 3. 

 

Physical Activity 

PAQ605, PAQ650, PAQ665 

Active, Moderate, Sedentary, Unknown 

Classified as Active for any vigorous activity;  

 

Moderate for any moderate activity;  

Sedentary if all activity responses are negative. 

 

 

 

Alcohol Use 

ALQ101, ALQ151 

Current, Former, Never, Unknown 

Classified as Current if ALQ101=1 with recent use;  

 

Former if ALQ101=1 with no recent use; 

 

Never if ALQ101=2. 

 

Column Standardization 

To ensure clarity and maintain clinical relevance during the subsequent phases of analysis, the raw, alphanumeric variable codes native to the NHANES repository were systematically standardized. Each feature was mapped and renamed from its original survey designation to a universally recognized clinical term. This nomenclature standardization process was essential not only to facilitate seamless interpretability across the machine learning pipeline but also to ensure that the variables remain easily identifiable and medically intuitive for downstream evaluation and model explainability. 

Table 7: Clinical Biomarker Variables and NHANES Codes 

NHANES Code 

Clinical Name 

Description 

LBXGH 

hba1c 

Glycated hemoglobin (%) 

LBXGLU 

fbs 

Fasting blood sugar (mg/dL) 

BMXBMI 

bmi 

Body mass index (kg/m²) 

BMXWAIST 

waist_circumference 

Waist circumference (cm) 

LBXTR 

triglycerides 

Triglycerides (mg/dL) 

LBDHDD 

hdl 

HDL cholesterol (mg/dL) 

LBDLDL 

ldl 

LDL cholesterol (mg/dL) 

 

Cohort Selection and Label Construction 

Following the initial data consolidation, the dataset was filtered to isolate the specific target demographic required for the study. The cohort selection criteria retained female participants aged 45 years and older who exhibited confirmed postmenopausal indicators based on their reproductive health questionnaire responses. Furthermore, the dataset was restricted to individuals who participated in the 8-to-12-hour fasting subsample to ensure the physiological validity of their glucose and lipid measurements. Participants with missing values for the required core biomarkers were excluded. This rigorous filtering process resulted in a final, robust analytical cohort comprising 1,376 postmenopausal women. 

Ground-Truth Label Construction 

Ground-truth labels were established using a dual-source hierarchy designed to ensure clinical validity and systematically capture previously undiagnosed cases within the cohort. The primary classification criterion relied on the self-reported physician diagnosis obtained from the NHANES questionnaire. Participants who reported, a confirmed diabetes diagnosis from a medical professional were immediately classified as Diabetic, while those advised of a borderline condition were classified as Pre-diabetic. For individuals who reported no prior diagnosis, a secondary objective evaluation was applied using the established American Diabetes Association (ADA) glycemic thresholds. 

Under this secondary evaluation, individuals lacking a self-reported diagnosis were classified based on their Glycated Hemoglobin (HbA1c) levels. Participants with an HbA1c level of 6.5% or higher were classified as Diabetic, those with levels between 5.7% and 6.4% as Pre-diabetic, and those below 5.7% as Normal. To ensure the highest degree of clinical accuracy, a definitive hard override mechanism was enforced across the entire dataset. Any patient record exhibiting an HbA1c level equal to or exceeding the 6.5% threshold was categorized as Diabetic, regardless of their self-reported questionnaire status. This stringent rule aligns with ADA diagnostic criteria, which maintain that objective biochemical evidence inherently supersedes subjective patient recall. 

To quantify the reliability and potential noise within this labeling process, the agreement between the self-reported diagnoses and the biomarker-derived classifications was computed. Within the final analytical cohort of 1,376 patient records, a high agreement rate of 94.8% was achieved. The remaining 5.2% disagreement rate primarily represented cases of undiagnosed diabetes, where objective biochemical screening successfully detected the condition despite the patient's lack of self-reported awareness. 