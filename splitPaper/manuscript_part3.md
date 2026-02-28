association with metabolic dysfunction and Type 2 Diabetes risk, as identified in the literature
review and validated through consultations with medical experts.
**Non-Blood Biomarkers and Demographic Variables.** In addition to blood biomarkers,
the following non-blood clinical indicators and demographic variables will be extracted from
NHANES records: Age, Body Mass Index (BMI), Menopausal Status, and Family History of Diabetes.
These variables provide essential contextual information that influences diabetes risk and will
serve as supplementary features for the predictive model.
All data will be extracted from NHANES public‑use datasets, which are fully de‑identified and
ethically cleared for research use, ensuring compliance with data privacy regulations and ethical
research standards.

```
Variable Type Coding / Unit Source Missing-Data Rule / Notes
Fasting Blood
Sugar (FBS)
```
```
Continuous mg/dL NHANES lab
dataset
```
```
Records missing FBS are
excluded from model training.
Hemoglobin
A1c (HbA1c)
```
```
Continuous % NHANES lab
dataset
```
```
Records missing HbA1c are
excluded from model training.
Triglycerides
(TG)
```
```
Continuous mg/dL NHANES lab
dataset
```
```
Retained if core glycemic and
lipid fields are complete.
Low-Density
Lipoprotein
(LDL-C)
```
```
Continuous mg/dL NHANES lab
dataset
```
```
Retained if core glycemic and
lipid fields are complete.
```

```
High-Density
Lipoprotein
(HDL-C)
```
```
Continuous mg/dL NHANES lab
dataset
```
```
Retained if core glycemic and
lipid fields are complete.
```
```
Total
Cholesterol
(TC)
```
```
Continuous mg/dL NHANES lab
dataset
```
```
Retained if core glycemic and
lipid fields are complete.
```
```
Age Continuous Years Patient
demographic
record
```
```
Records missing age are
excluded from the final dataset.
```
```
Body Mass
Index (BMI)
```
```
Continuous kg/m² Computed from
height/weight
```
```
Exclude records with missing
or implausible BMI values.
Menopausal
Status
```
```
Categorical Perimenopausal/
Postmenopausal
```
```
Clinical record Only menopausal women (45–
60 years) are retained.
Family History
of Diabetes
```
```
Categorical Yes / No Clinical / family
history
```
```
Records with undocumented
family history are treated as
missing and excluded from
modeling.
Glycemic Class
Label
(Outcome Y)
```
```
Categorical Normal/
At‑Risk (Primary)
```
```
Derived from FBS
& HbA1c (labeling only)
```
Derived using clinical cut-offs
defined in Chapter 2; records
with inconsistent or missing
labels removed.
_Table 3 : Dataset Composition: Blood Biomarkers and Demographic Variables_
In the NHANES dataset used for model development, structured fields are available for blood
biomarkers, age, BMI, menopausal status, and family history of diabetes, which are all included


as predictive features. In contrast, lifestyle-related factors such as detailed diet, physical activity
patterns, and smoking history are primarily discussed in the Review of Related Literature and
medical interviews but are not consistently encoded as structured variables in the NHANES records,
so they are not directly used as input features in the current predictive models.

**Software Methodology**

The development of the DIANA predictive model is anchored in a rapid prototyping
methodology, which empowers iterative improvement based on the active involvement of
stakeholders and end-users. This approach allows for the swift creation of functional prototypes,
facilitating feedback collection from healthcare professionals, and enabling ongoing refinement of
both the computational model and its interface. By systematically advancing through each stage
from requirement gathering and data handling to technical and clinical validation the methodology
ensures the solution remains responsive to practical healthcare needs, data privacy standards, and
clinical effectiveness. The phased structure provides clarity, traceability, and adaptability, guiding
the project from inception to real-world readiness.


_Figure 2 : General Prototyping Model_
**Phase 1: Data Acquisition and Biomarker Preparation**

This phase focuses on collecting, cleaning, and preparing NHANES data to build the dataset used
for feature selection and model development. Records of postmenopausal women aged 45–60 are
filtered from NHANES 2009–2023, targeting a final cohort of approximately 1,376 records. Only
records with complete core biomarkers and key demographic fields are retained to ensure data
quality.

The dataset will include metabolic biomarkers and non‑blood variables used by the screening
model (BMI, triglycerides, LDL‑C, HDL‑C, age, systolic/diastolic blood pressure, waist
circumference) with engineered features such as TG/HDL ratio and metabolic syndrome score.
HbA1c and FBS are retained only for ground‑truth labeling, not as input features for the primary
screening model. Each variable is classified by data type, checked for outliers and unit
inconsistencies, and evaluated for completeness. Variables with at least 70% non‑missing values
are prioritized for feature selection and model training, while highly incomplete lifestyle fields are
used only for descriptive context.

A glycemic status label (normal, pre‑diabetic, diabetic) will be assigned to each record using
established FBS and HbA1c cut‑offs summarized in Chapter 2. This label supports feature
selection and enables the optional 3‑class clinician output, while the primary screening model
reformulates the outcome to binary At‑Risk vs Normal. Records with inconsistent or missing
information for defining this label will be removed from the analytic dataset.
Continuous predictors will then be discretized into clinically meaningful categories (for example,
normal, borderline, and high ranges for FBS, HbA1c, lipids, and BMI) to support entropy and
Information Gain computation.

Using the cleaned and discretized dataset, entropy and Information Gain will be applied to
rank all candidate attributes according to how strongly they help distinguish the glycemic classes.
The procedure is as follows:

1. Compute the overall entropy _H_ ( _Y)_ of the class label using the full dataset.

## 2. For each attribute Xj , compute the conditional entropy H(Y ∣ Xj) based on its

```
discrete categories or bins.
```

## 3. Calculate the Information Gain IG(Y,Xj)=H(Y)−H(Y ∣ Xj) and rank attributes

```
from highest to lowest IG.
```
4. Use the top‑ranking attributes as the core feature set for Phase 2 model training
    and for generating “risk factor importance” visualizations in the DIANA
    Analytics tab.

```
Figure 3 : Data Acquisition and Biomarker Preparation Phase Flow
```

**Phase 2a: Model Development and Training**

```
This phase focuses on building the predictive model using the prepared dataset from Phase
```
1. The process begins with feature selection using entropy and Information Gain to identify the
most informative attributes from clinical biomarkers and demographic variables. The selected
features, which include key blood biomarkers such as Fasting Blood Sugar (FBS), Hemoglobin
A1c (HbA1c), lipid profiles, and non-blood variables like age, BMI, and menopausal status, serve
as inputs to machine learning algorithms.

Supervised classification models including Logistic Regression and Random Forest are trained
using the selected features. Model development uses Nested Leave‑One‑Cycle‑Out validation
across NHANES cycles to ensure temporal generalization. Within each outer fold, GroupKFold
is used to tune hyperparameters and compare algorithms, and a sensitivity‑biased decision
threshold is applied to prioritize screening recall. Model training emphasizes techniques that
balance predictive accuracy with clinical interpretability and computational efficiency to facilitate
practical integration into medical decision‑making tools.


_Figure 4 : Model Development and Training_
**Phase 2b: Model Testing, Evaluation, and Comparison**

Phase 2b emphasizes the rigorous validation and comparison of trained models to ensure
clinical relevance and reliability. Models are evaluated using standard metrics such as accuracy,
precision, recall, F1-score, and Area Under the Receiver Operating Characteristic Curve (AUC-
ROC). Special focus is placed on AUC-ROC, given its importance in balancing sensitivity and
specificity in a medical context where accurate discrimination between at-risk and non-risk
patients is critical, making it a widely used and clinically relevant metric in medical machine
learning.


Beyond statistical performance, models are also assessed for clinical interpretability and
feasibility of implementation in healthcare settings. The final model selection considers a
combination of predictive performance, ease of interpretation by clinicians, and computational
efficiency for real-time application. The testing procedures include evaluation on held-out datasets
and cross-validation to ensure consistent performance across different patient subgroups.

_Figure 5 : Model Testing, Evaluation and Comparison_
**Phase 3: Web Application Integration and Visualization Development**

This phase focuses on integrating the trained predictive model into a web-based application
using a suitable web framework. The application will feature an interactive dashboard for risk
prediction, biomarker visualization, and patient history tracking. Core functionalities will include


a patient management system, risk prediction interface with probability outputs, and data
visualization tools to display biomarker trends and risk levels. Secure authentication and role-
based access control will also be implemented to ensure data confidentiality and appropriate
system access for healthcare professionals.

_Figure 6 : Web Application Integration and Visualization Development Phase Flow_
**Phase 4: Technical Testing and Validation**

This phase encompasses comprehensive evaluation of the system's technical performance
and reliability. Functional testing will verify feature accuracy and system performance.
Performance testing will measure response times and system stability under typical usage


conditions. Additionally, the predictive model accuracy will be validated using the test dataset
reserved during Phase 2, ensuring the system meets required standards for clinical deployment.

_Figure 7 : Technical and Validation Phase Flow_
**Phase 5: Doctor's Evaluation**

This phase involves conducting evaluation sessions with licensed physicians to assess the
clinical appropriateness of the model's risk predictions and the usability of the web application.
Feedback will be gathered regarding the accuracy of risk categorization, interpretability of
visualizations, and compatibility with clinical workflows. Based on this feedback, necessary


refinements will be implemented to enhance the application's effectiveness and relevance for
clinical use. This iterative process ensures the system aligns with real-world healthcare needs.

_Figure 8 : Doctor’s Evaluation Phase Flow_
**Data Analysis**

The data analysis phase will involve training and evaluating machine learning algorithms
to develop a predictive classification model for identifying menopausal women at risk of Type 2


Diabetes. The collected biomarker data will be processed, split into training and testing sets, and
used to compare the performance of multiple supervised learning algorithms.

**Feature Selection using Entropy and Information Gain.** Before training the predictive
models, the study will perform feature selection to identify which biomarkers and related variables
are most informative for classifying current glycemic status among menopausal women. Using the
cleaned and discretized dataset from Phase 1, entropy and Information Gain will be computed for
each candidate attribute that meets the predefined completeness threshold of at least 70%
non‑missing values.

Let _Y_ denote the _class_ label (non‑diabetic, prediabetic, diabetic) and let C be the set of
possible classes. The entropy of _Y_ is defined as

_Equation 1 : Entropy of Y_
where _p_ ( _c_ ) is the proportion of records belonging to class _c_. For a given attribute _X_ with
discrete values or bins _V_ , the conditional entropy of _Y_ given _X_ is

_Equation 2 : The Conditional Entropy of Y given X_
Where _p_ ( _v_ ) is the proportion of records with 𝑋=𝑣 _,_ and 𝐻(𝑌∣𝑋=𝑣) _is_ the entropy of
the class labels within that subset. The Information Gain of _X_ with respect to _Y_ is then

# 𝑰𝑮 (𝒀,𝑿)=𝑯(𝒀)−𝑯(𝒀|𝑿)


# Equation 3 : Information Gain of X with Respect to Y

Which measures how much knowing the value of _X_ reduces uncertainty about the glycemic
class.

In this study, Information Gain will be computed for each biomarker and non‑blood
variable (e.g., Fasting Blood Sugar, HbA1c, lipid parameters, age, BMI, menopausal status, family
history, and any sufficiently complete lifestyle fields). The analysis will proceed as follows:

1. Compute using the overall distribution of glycemic classes in the dataset.
2. For each attribute 𝑋𝑗, compute the conditional entropy 𝐻(𝑌∣𝑋𝑗) and then the
    Information Gain 𝐼𝐺(𝑌,𝑋𝑗)=𝐻(𝑌)−𝐻(𝑌∣𝑋𝑗).
3. Rank all attributes from highest to lowest 𝐼𝐺(𝑌,𝑋𝑗).
4. Use the top‑ranking attributes as the core feature set for model training in Phase
    2 and as the basis for the risk‑factor importance visualizations in the DIANA
    Analytics tab.
**Machine Learning Algorithms.** The study will apply supervised machine learning
algorithms to develop a predictive classification model for identifying menopausal women at
current risk of Type 2 Diabetes. Each model will be trained using the feature set selected through
the entropy and Information Gain procedure, ensuring that only the most informative biomarkers
and related variables are used as inputs. The cleaned dataset is evaluated using a nested
Leave‑One‑Group‑Out (LOGO) strategy that holds out NHANES cycles for temporal
generalization, with GroupKFold used for inner cross‑validation and hyperparameter tuning.

Candidate algorithms include Logistic Regression and Random Forest only. Logistic Regression is
included for its interpretability and clinically meaningful probability outputs, while Random Forest
captures nonlinear relationships and interactions among biomarkers. Each algorithm is trained on
the IG‑selected attributes and evaluated using accuracy, precision, recall (sensitivity), F1‑score,
and AUC‑ROC. These metrics are used to select the final classifier for integration into the DIANA
web application based on predictive performance, clinical interpretability, and computational
efficiency.

**Clustering Analysis.** In addition to supervised classification, the study will apply
clustering to group menopausal women into risk‑related profiles based on the same feature set
selected through the entropy and Information Gain procedure. This unsupervised analysis aims to
reveal patterns in biomarkers and related attributes that may not be captured by classification alone
and to support more interpretable risk stratification in the DIANA web application.

The primary clustering technique will be k‑means, applied to standardized versions of the
selected features. Several candidate values of _k_ will be examined using the elbow method and
silhouette scores to identify several clusters that provide a good balance between within‑cluster
compactness and between‑cluster separation. The final clustering solution will be profiled in terms
of average biomarker values and class label distributions, and these cluster profiles will be


visualized in the DIANA Analytics tab to help clinicians compare risk groups and relate them to
the supervised model’s predictions.

The distance metric most commonly employed in K-means is the Euclidean distance.
Formally, let 𝑋={𝑥 1 ,𝑥 2 ,...,𝑥𝑛} denote the set of _n_ data points in a _d_ - dimensional space, and let
{𝜇 1 ,𝜇 2 ,...,𝜇𝑘 _}_ represent the centroids of the _k_ clusters. The assignment of each data point _xi_ to a
cluster _Cj_ is determined by minimizing the Euclidean distance:

_Equation 4 : Euclidean Distance Formula_
where:

- 𝑥𝑖=(𝑥𝑖 1 ,𝑥𝑖 2 ,...,𝑥𝑖𝑑) is the 𝑖𝑡ℎ data point,
- 𝜇𝑗=(𝜇𝑗 1 ,𝜇𝑗 2 ,...,𝜇𝑗𝑑) is the centroid of the 𝑗𝑡ℎ cluster.

At each iteration, the K-means algorithm operates in two main steps:

1. **Assignment Step:** Each data point _xi_ is assigned to the cluster _Cj_ whose centroid _μj_ is
    nearest, as measured by 𝑑(𝑥𝑖,𝜇𝑗):

```
Equation 5 : Assignment Step Formula
This means for each point, choose the cluster whose centroid is the closest (usually Euclidean
distance).
```

2. **Update Step:** The centroid _μj_ of each cluster is recalculated as the mean of all points
    assigned to that cluster:

_Equation 6 : Update Step Formula_
This means the new centroid is the mean of all points assigned to that cluster.
The objective of K-means is to minimize the total within-cluster sum of squared errors (SSE),
also referred to as the inertia or the objective function _J_ :

```
Equation 7 : Inertia or Objective Function J Formula
where ∥𝑥𝑖−𝜇𝑗∥ 2 denotes the squared Euclidean distance between xi and its corresponding
cluster centroid 𝜇𝑗.
```
**Model Performance Metrics.** These metrics collectively serve as the model selection
criteria for choosing the final classifier to be deployed in DIANA, balancing overall accuracy,
classification error, and the correct identification of menopausal women at higher risk for
undiagnosed Type 2 Diabetes or prediabetes. The performance of each trained model will be
assessed using standard machine learning evaluation metrics. Accuracy will measure the overall
proportion of correct predictions, and the Classification Error Rate (calculated as 1 − Accuracy)


will quantify the proportion of incorrect predictions while Precision will evaluate the model's
ability to correctly identify women at risk (positive cases) among all predicted positive cases.
Recall (Sensitivity) will assess the model's ability to detect all actual positive cases, minimizing
false negatives, which is critical in healthcare applications where missing at-risk individuals can
have serious consequences. The F1-Score, which balances precision and recall, will provide a
single metric for comparing models. Additionally, the Area Under the ROC Curve (AUC-ROC)
will be calculated to evaluate the model's ability to discriminate between diabetic/prediabetic and
non-diabetic cases across varying probability thresholds. A model with an AUC above 0.80 will
be considered acceptable for clinical applications.

These probability scores, ranging from 0 to 1 and displayed as 0–100% in the application,
represent the model’s estimated confidence that a given menopausal patient currently has
undiagnosed Type 2 Diabetes or prediabetes based on her biomarker profile. All final performance
metrics (accuracy, classification error rate, precision, recall, F1-score, and AUC-ROC) will be
computed on this unseen 30% test set, providing an unbiased estimate of the model’s real-world
performance and the reliability of DIANA’s risk predictions.

𝑨𝒄𝒄𝒖𝒓𝒂𝒄𝒚= (^) 𝛴 (𝑇𝑃𝛴+^ (𝑇𝑁𝑇𝑃++𝑇𝑁𝐹𝑃)+𝐹𝑁)
𝑷𝒓𝒆𝒄𝒊𝒔𝒊𝒐𝒏= (^) 𝛴 (𝑇𝑃𝛴^ 𝑇𝑃+𝐹𝑃)
𝑹𝒆𝒄𝒂𝒍𝒍= (^) 𝛴 (𝑇𝑃𝛴^ 𝑇𝑃+𝐹𝑁)


𝑭𝟏 𝑺𝒄𝒐𝒓𝒆= (^) 𝛴 ( 2 𝑇𝑃𝛴+^2 𝐹𝑃𝑇𝑃+𝐹𝑁)

### 𝑨𝑼𝑪= ∑(𝑋𝑖+^1 −𝑋𝑖)× 2 )^ (𝑌𝑖+𝑌𝑖+^1 )

```
𝑛− 1
```
```
𝑖= 1
```
_Equation 8 : Formulas for Model Performance Evaluation_
**Model Selection and Validation.** The final model will be selected based on a combination
of predictive accuracy, clinical interpretability, and computational efficiency. Models will be
compared using the metrics described above, and the best-performing algorithm will be chosen for
integration into the DIANA web application. To ensure robustness and prevent overfitting, cross-
validation techniques will be applied during training, allowing the model to be tested on multiple
subsets of the data. This approach ensures that the selected model generalizes well to unseen data
and maintains reliable performance in real-world clinical scenarios.

**Initial Cluster Labeling.** The initial cluster labels (SOIRD, SIDD, MARD, MIDD) were
identified based on relevant research and literature. These assignments reflect commonly
recognized subgroups in diabetes stratification. For this study, the clusters will be further checked


and validated by the licensed physicians and endocrinologists we interviewed, ensuring each label
accurately matches clinical patterns seen in our target population.

```
Cluster Label Defining Features
SOIRD Severe Obesity-Related
and Insulin-Resistant
Diabetes
```
```
Highest BMI, highest HOMA-β, highest HOMA-IR;
moderate HbA1c; youngest age at diagnosis
```
```
SIDD Severe Insulin-
Deficient Diabetes
```
```
Highest HbA1c, lowest HOMA-β; relatively high
HOMA-IR; moderate BMI and age
MARD Mild Age-Associated
Diabetes Mellitus
```
```
Oldest age at diagnosis; moderate BMI and HbA1c;
moderate insulin release and resistance
MIDD Mild Insulin-Deficient
Diabetes
```
Lowest BMI, HbA1c, HOMA-IR; moderate age and
HOMA-β
_Table 4 : Initial Clustering Label_
**Variable Definitions and Metadata for the DIANA Study Dataset.** The following table
presents a proposed list of variables and their definitions for potential inclusion in the DIANA
Machine Learning dataset. These variables represent key clinical, demographic, and behavioral
measures of interest considered relevant to the research's aims. Please note that this is not the final
dataset, but rather a compilation of variables under consideration for collection and analysis in
future phases of the study.

```
Field Name Type Description
FBS Integer Fasting Blood Sugar (mg/dL). Value represents the participant’s
fasting plasma glucose measured after at least 8 hours of fasting.
```

HbA1c Integer Glycated Hemoglobin (HbA1c, %). Value represents the average
blood glucose control over the past 2–3 months.
Triglycerides Integer Serum Triglycerides (mg/dL). Value represents the
concentration of triglycerides in blood after overnight fasting.
LDL-C Integer Low-Density Lipoprotein Cholesterol (mg/dL). Value indicates
calculated LDL cholesterol, an atherogenic lipid fraction.
HDL-C Integer High-Density Lipoprotein Cholesterol (mg/dL). Value
represents protective HDL cholesterol levels.
Total Cholesterol Integer Total Serum Cholesterol (mg/dL). Value represents the sum of
all cholesterol types in blood.
BMI Integer Body Mass Index (kg/m²). Value calculated as weight in
kilograms divided by the square of height in meters.
AGE Integer Age (years) of participant at the time of study enrollment.
Menopausal
Status

Binary Menopausal status: 0 = premenopausal, 1 = postmenopausal.
Indicates if participant has ceased having menstrual periods for
12 consecutive months.
Family History of
Diabetes

Binary Has any biological parent or sibling been diagnosed with
diabetes? 0 = no, 1 = yes.
Smoking_History Binary Have you smoked at least 100 cigarettes in your entire life? 0 =
no, 1 = yes.
Hypertension Binary Has a healthcare provider ever told you that you have
hypertension or high blood pressure? 0 = no, 1 = yes.


Heart_disease Binary Have you ever been diagnosed with coronary heart disease,
angina, or myocardial infarction? 0 = no, 1 = yes.
PhysActivity Binary Physical activity in the past 30 days not including job-related
activity: 0 = no, 1 = yes.
_Table 5 : Data Dictionary_


```
References
```
Ahlqvist, E., et. al., (2018). Novel subgroups of adult-onset diabetes and their association with
outcomes: a data-driven cluster analysis of six variables. _The Lancet Diabetes &
Endocrinology_ , _6_ (5), 361–369. https://doi.org/10.1016/s2213-8587(18)30051- 2

Anklam, C. et. al. (2021, September 16). Oxidative and Cellular Stress Markers
in Postmenopause Women with Diabetes: The Impact of Years of Menopause. _Journal of
Diabetes Research_. Doi: 10.1155/2021/3314871.
Ao, N. et. al., (2025). Clinical and laboratory characteristics of novel diabetes subgroups: A
systematic review and meta-analysis. _Scientific Reports_ , _15_ (1), 38585.
https://doi.org/10.1038/s41598- 025 - 22556 - 4

Auro, K. et. al. (2014). A metabolic view on menopause and ageing. _Nature Communications, 5_ ,

4708. https://doi.org/10.1038/ncomms5708

Azurin, J.C, et. al. (1986). Diabetes mellitus survey in the Philippines. _Philippine Journal of
Public Health, 24(1)_ , 1- 29

Bi, Y. et. al. (2012). Advanced research on risk factors of type 2 diabetes. _Diabetes/Metabolism
Research and Reviews_. _28:2_. 32-39. Doi: https://doi.org/10.1002/dmrr.2352

Campugan, M. P., & Aguaras, J. L. (2025). _Predictive modeling for diabetes classification using
clinical biomarkers among Filipino adults_. Philippine Journal of Health Informatics,
14(2), 45–57.
