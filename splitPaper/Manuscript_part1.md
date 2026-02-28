```
ix
```
<!-- NHANES should now be the data -->
**Definition of Terms
Diabetes Mellitus (DM)**. a metabolic disorder characterized by high blood glucose levels.
It includes several types such as Type 1 Diabetes, Type 2 Diabetes, Maturity-Onset Diabetes of
the Young (MODY), gestational diabetes, neonatal diabetes, and diabetes secondary to other
conditions or factors, such as hormonal disorders or prolonged use of steroids.

**Type 1 Diabetes Mellitus (T1DM).** A sub type of diabetes characterized by the destruction
of pancreatic beta cells, usually caused by an autoimmune process. This destruction leads to little
or no insulin production, resulting in a complete or near-complete lack of insulin in the body.

**Type 2 Diabetes Mellitus (T2DM)**. A sub type of diabetes characterized by a gradual
onset, in which a mismatch between insulin production and insulin sensitivity leads to a functional
insulin deficiency. Insulin resistance, a key feature of T2DM, often arises from multiple factors,
including obesity and aging.

**Pre-diabetic.** A condition in which blood glucose levels are higher than normal but not
high enough to be classified as Type 2 Diabetes. It indicates an increased risk for developing
diabetes and provides an opportunity for early intervention through lifestyle modification and
monitoring of blood glucose

**Hormonal Changes.** alterations in the levels or activity of hormones in the body can affect
various physiological processes. In the context of menopause, hormonal changes primarily refer
to the decline in estrogen and progesterone levels, influencing metabolism, insulin sensitivity, and
overall risk for conditions such as Type 2 Diabetes Mellitus (T2DM).

**Insulin Restistance.** A physiological condition in which the body’s cells respond less
effectively to insulin, reducing glucose uptake from the blood. This leads to higher circulating


```
x
```
blood glucose levels and increased insulin production, often contributing to the development of
Type 2 Diabetes Mellitus (T2DM), particularly in populations with obesity, aging, or hormonal
changes.

**Fasting Blood Sugar (FBS)**. A laboratory test that measures the glucose level in a person’s
blood after an overnight fast, typically 8–12 hours. FBS is used to assess glycemic control and is
a key biomarker in diagnosing and monitoring diabetes mellitus, including Type 2 Diabetes
Mellitus (T2DM).

**Hemoglobin A1c (Hba1C)**. A laboratory test that measures the average blood glucose
levels over the past 2–3 months by determining the percentage of glucose bound to hemoglobin in
red blood cells. HbA1c is commonly used to diagnose and monitor diabetes, providing an indicator
of long-term glycemic control, including in patients with Type 2 Diabetes Mellitus (T2DM).

**Lipid Profiles.** A set of blood tests that measure the levels of specific lipids, including total
cholesterol, high-density lipoprotein (HDL), low-density lipoprotein (LDL), and triglycerides.
Lipid profiles are used to assess cardiovascular health and metabolic risk factors, including the
risk of developing Type 2 Diabetes

**Menopausal.** The stage in a woman’s life marked by the end of menstrual periods for at
least twelve consecutive months, accompanied by hormonal changes, particularly a decline in
estrogen levels. This transition, which includes perimenopause and postmenopause, is associated
with physiological and metabolic changes that can affect insulin sensitivity and increase the risk
of developing conditions such as Type 2 Diabetes Mellitus (T2DM).

**Biomarkers.** Biological indicators, such as Fasting Blood Sugar (FBS) and Hemoglobin
A1c (HbA1c), Lipid Profiles, Age, BMI, Lifestyle, and Menopausal Status that are measurable


```
xi
```
and used to assess the risk, presence, or progression of Type 2 Diabetes in an individual. Key
variables in DIANA predictive model-based application to identify menopausal women at risk of
type 2 diabetes

**Predictive Modeling.** Involves the use of statistical techniques, machine learning
algorithms, or computational methods to analyze historical data and generate predictions about
future outcomes or trends. In healthcare research, it is used to identify patterns, estimate risks, and
forecast the likelihood of developing certain conditions based on measurable variables such as
clinical biomarkers, demographic factors, or medical histories.

**Machine Learning (ML).** A branch of artificial intelligence that enables computer
systems to learn patterns from data and make predictions or decisions without being explicitly
programmed.

**Cluster.** A group of data points or individuals that share similar characteristics. In this
study, clustering refers to grouping menopausal women based on their health and biomarker
profiles to identify patterns and risk levels of Type 2 Diabetes.

**Entropy.** A measure of uncertainty or randomness in a dataset. In this study, entropy is
used to quantify the amount of disorder in the biomarker data, helping to determine how
informative each attribute is for predicting Type 2 Diabetes risk.

**Information Gain (IG).** Metrics are used to measure the effectiveness of a feature in
reducing uncertainty in predicting an outcome. In this study, IG is computed for each biomarker
to identify which attributes contribute most to predicting the risk of Type 2 Diabetes among
menopausal women.


# Introduction

Diabetes Mellitus (DM) is a chronic metabolic disorder characterized by persistently
elevated blood glucose levels resulting from inadequate insulin production or decreased insulin
sensitivity (Goyal et al., 2023). Globally, the burden of diabetes continues to rise. According to
the International Diabetes Federation (IDF), more than 500 million adults were affected in 2021,
with projections surpassing 700 million by 2045, reflecting a significant increase from 415 million
in 2015. Among the different types, Type 2 Diabetes Mellitus (T2DM) is the most prevalent and
is primarily associated with insulin resistance and impaired glucose regulation (Dhaliwal, 2025).
The growing incidence of T2DM presents one of the foremost global public health challenges of
the 21st century.

Nevertheless, the period surrounding menopause represents a critical stage in a woman’s
life that introduces an elevated risk for the development of metabolic disorders, including T2DM.
The decline in ovarian function and subsequent decrease in estrogen levels significantly affect
various metabolic processes, leading to changes in body fat distribution, insulin sensitivity, and
lipid metabolism. These physiological alterations collectively contribute to an increased risk of
developing T2DM and related cardiovascular complications among menopausal women compared
to their premenopausal counterparts. The transition to menopause brings about substantial
metabolic and hormonal shifts, including estrogen deficiency that reduces insulin sensitivity,
redistribution of body fat toward visceral deposits that promote inflammation, and weight gain due
to metabolic slowdown and muscle mass reduction. Furthermore, stress-induced hormonal
fluctuations, sleep disturbances, and pre-existing conditions such as polycystic ovary syndrome
(PCOS), gestational diabetes, family history, or premature menopause further elevate the risk (IDF,
2024; Cleveland Clinic, 2024). These factors not only heighten T2DM onset but also complicate


its management, contributing to dyslipidemia, hypertension, atherosclerosis, and genitourinary
complications caused by hyperglycemia.

**Background of the Study**

Diabetes remains an escalating public health concern in the Philippines, with significant
clinical and socioeconomic consequences. According to the International Diabetes Federation
(2024), an estimated 4.2–4.7 million Filipino adults aged 20–79 is currently living with diabetes
predominantly Type 2 Diabetes Mellitus (T2DM). This corresponds to a national prevalence of
approximately 7.5%, a notable rise from the 4.1% reported in earlier national surveys (Azurin et
al., 1986). Alarmingly, more than half of Filipino adults with diabetes remain undiagnosed,
exposing millions to long-term complications such as cardiovascular disease, nephropathy,
neuropathy, and retinopathy (IDF, 2024; Philippine Statistics Authority). Furthermore, with
projections suggesting that cases may reach 7.5 million in the coming years, the urgency for
accessible early-detection tools and preventive strategies continues to intensify.

Globally, T2DM poses a similar threat. The World Health Organization (2023) reports that
the number of adults diagnosed with diabetes has nearly quadrupled in the past three decades. As
a chronic metabolic disorder characterized by persistent hyperglycemia due to insulin resistance
and inadequate insulin secretion, T2DM significantly reduces quality of life and places a heavy
burden on healthcare systems worldwide (American Diabetes Association, 2022). Early detection
remains challenging because many individuals remain asymptomatic for years, allowing the
disease to progress silently before receiving appropriate care (Chen et al., 2023).

Among all demographic groups, menopausal women represent a particularly high-risk
population. Menopause, defined as twelve consecutive months without menstruation (Cleveland


Clinic, 2024), accompanies hormonal fluctuations, most notably the decline in estrogen, which
contributes to insulin resistance. While menopause itself does not directly cause diabetes, it
significantly increases susceptibility to its development (Spencer, 2024). These hormonal changes
amplify existing risk factors such as family history, dyslipidemia, and physical inactivity,
increasing overall vulnerability to T2DM (NIH; Cleveland Clinic, 2023; Diabetes UK, 2023).

Type 2 Diabetes Mellitus (T2DM) continues to pose a significant public health challenge
globally, with its prevalence steadily increasing across diverse populations. According to the
World Health Organization (2023), the number of adults living with diabetes has nearly
quadrupled over the past three decades. This chronic metabolic condition manifests with
persistently high blood glucose levels due to insulin resistance and inadequate insulin secretion
(International Diabetes Federation, 2023). The consequences of T2DM are profound, leading to
complications such as cardiovascular diseases, kidney failure, neuropathy, and retinopathy
conditions that drastically reduce quality of life and place heavy financial strain on healthcare
systems worldwide (American Diabetes Association, 2022).

One of the major difficulties in managing T2DM is its silent progression. Many individuals
remain undiagnosed for years because early symptoms are often subtle or absent, allowing the
disease to advance before effective intervention occurs (Chen et al., 2023). This delayed detection
underscores the need for innovative and precise predictive strategies, particularly among high-risk
populations.

Despite this evidence, existing screening protocols rarely incorporate menopause-specific
physiological changes when assessing diabetes risk. This leads to potential underestimation of


T2DM susceptibility in menopausal women and highlights a critical diagnostic gap that must be
addressed.

In response, machine learning (ML) has emerged as a promising solution for precision risk
detection. ML algorithms can analyze complex, multi-dimensional health data, capture subtle
biomarker patterns, and improve predictive accuracy compared to traditional statistical methods
(Alvarez et al., 2023). Recent studies demonstrate the effectiveness of ML models in
distinguishing between normoglycemic, prediabetic, and high-risk individuals, reinforcing their
potential for early detection (Patil et al., 2023). When applied to menopausal women, ML-driven
predictive tools can incorporate hormonal, metabolic, and demographic factors to generate
personalized risk profiles and support preventive care.

These clusters differ in progression rates, biomarker patterns, and risks for complications.
Traditional screening methods rarely distinguish among these patterns, which leads to
underdiagnosis or misclassification—particularly in populations undergoing physiological
transitions. This complexity strengthens the need for advanced predictive technologies capable of
recognizing subtle, cluster-specific biomarkers.

Moreover, beyond clinical settings, Filipino adults increasingly turn to social media
particularly Facebook groups to seek health information, connect with peers, and share personal
health experiences. In fact, Isip-Tan et al. (2020) demonstrate that Filipinos actively use Facebook
communities to discuss health concerns and exchange advice, especially for chronic conditions
such as diabetes. Likewise, Facebook has been described as a communication lifeline in the
Philippines, enabling users to form supportive online communities centered on shared experiences
(Congjuico, 2018). In addition, analyses of Filipino Facebook groups reveal that these spaces


function as modern social communities where members provide emotional support, shared
knowledge, and collective understanding (Lapitan & Doromal, 2015).

Given this digital behavior, Facebook interest groups for menopausal women serve as
accessible spaces where members openly discuss symptoms, share experiences, and seek guidance
regarding menopause-related health concerns. These interactions offer meaningful insights into
the lived experiences, risk factors, and health behaviors of menopausal women, making such
groups a contextually relevant environment for gathering user-centered data.

Furthermore, a selected Facebook interest group named _Usapang Perimenopause at
Menopause_ and other interest groups were used as part of the study’s research locale. This
Facebook group, founded on April 20, 2023, serves as a space where members share experiences
and knowledge to support one another in understanding the difficulties and challenges associated
with the menopausal stage. Additionally, the group functions as a support community focused on
menopause-related discussions, making it contextually suitable for gathering data on blood
biomarkers, lifestyle patterns, and health awareness (Usapang Perimenopause at Menopause,
2023). By understanding the needs and health concerns expressed in these online communities,
the study ensures that DIANA, a predictive model-based application, is grounded in real user
context and responds directly to the population it aims to serve.

Given these challenges and opportunities, this study proposes DIANA: A Predictive
Model-Based Application Using Selected Blood Biomarkers for Cluster-Based Identification of
Type 2 Diabetes Risk in Menopausal Women. By incorporating information gain, clustering, and
interactive visualization, DIANA model supports early identification of T2DM risk among


menopausal women and provides clinicians with an accessible, interpretable, and user-centered
digital tool for preventive healthcare.

Nevertheless, several gaps persist in current research and predictive tools. Predictive tools
for assessing diabetes risk among menopausal women remain underexplored, and existing models
show notable limitations in both visualization and implementation. This raises the general research
question: How can DIANA, a predictive model-based application utilizing selected blood
biomarkers, effectively identify cluster-based risk levels of Type 2 Diabetes among menopausal
women through biomarker analysis, clustering techniques, and user-friendly visualizations?
Notably, there are three critical gaps:

**Limited identification of key biomarkers for predicting Type 2 Diabetes risk in
menopausal women, as current models often overlook critical indicators such as Fasting
Blood Sugar (FBS), Hemoglobin A1c (HbA1c), and lipid profiles.** Given the need for improved
tools in predicting Type 2 Diabetes risk, there is an evident limited identification of key biomarkers
that can significantly contribute to risk assessment in menopausal women. Current predictive
models often fail to utilize critical indicators such as Fasting Blood Sugar (FBS), Hemoglobin A1c
(HbA1c), and lipid profiles, which are essential for early detection and intervention. Several
studies emphasize the importance of these biomarkers in menopausal populations. Cybulska et al.
(2025) highlight that adiponectin, which correlates with FBS, HbA1c, and triglycerides, is
underutilized in existing risk prediction models for postmenopausal women. Similarly, Sharma et.
al., (2020) report that insulin resistance and associated glycemic and lipid abnormalities increase
after menopause, underlining the need for their inclusion in predictive modeling. A study of
Tamakoshi at. al., (2006), further demonstrate that menopause is an independent risk factor for
elevated fasting plasma glucose, while Liu et. al., (2023), show strong associations between insulin


resistance and key biomarkers during the menopausal transition. A study of Malti and
Gopalakrishnan (2007) confirm correlations between serum adiponectin, blood lipids, and HbA1c
in type 2 diabetic postmenopausal women. Integrating these biomarkers into a predictive model,
such as DIANA, could fill current gaps, providing more accurate risk assessment and personalized
preventive strategies for menopausal women.

**Lack of predictive modeling approaches that can classify menopausal women into
meaningful clusters and accurately predict both their cluster membership and likelihood of
developing Type 2 Diabetes.** The current tools for monitoring Type 2 Diabetes risk among
menopausal women remain insufficient, particularly in terms of risk profiling and visualization.
Existing predictive models rarely classify individuals by risk categories or apply clustering
techniques capable of revealing hidden subgroups within the population. Instead, many systems
rely on static tables or basic charts, limiting the ability of healthcare providers and patients to
interpret patterns, assess risk, and make informed decisions. Futhermore, several studies show that
clustering combined with interactive visualization significantly enhances the understanding of
heterogeneous health profiles. Kavakiotis et al. (2017) demonstrated that machine learning models
employing clustering can uncover subgroups with different diabetes risk levels, thus improving
early detection strategies. Similarly, Weng et al. (2017) emphasized that visual tools such as
heatmaps and interactive plots help clinicians interpret complex predictive outputs more
effectively, supporting personalized and targeted interventions. Given these limitations, the
integration of clustering and interactive visualization into the DIANA predictive model-based
application addresses the gap by enabling more accurate risk stratification, identifying high-risk
subgroups, and supporting timely, evidence-based preventive care.


**Absence of accessible and interactive web-based tools that present predictive
outcomes and clustering results through clear visualizations such as bar charts, heatmaps,
and cluster plots.** Many existing predictive tools lack accessible web-based platforms capable of
presenting risk predictions and clustering results through user-friendly, interactive visuals. Instead,
most systems focus primarily on predictive accuracy while overlooking usability, user engagement,
and real-world applicability. As a result, even technically accurate models may fail to be utilized
in actual clinical or community settings due to poor user experience and limited interpretability.
The need for usability evaluation in health applications is well-documented. A study of Maramba,
et. al., (2019) reported that digital health tools without structured usability testing often struggle to
achieve adoption, regardless of their technical quality. Likewise, Tubaishat et al. (2021)
emphasized that incorporating Likert-scale surveys and user feedback mechanisms provides
essential insights into usability, satisfaction, and engagement, leading to more effective and user-
centered system design. By evaluating the DIANA model through a Likert-scale survey, the
developed web application is not only scientifically robust but also practical, accessible, and user-
friendly for both healthcare providers and menopausal women at risk of Type 2 Diabetes.

**Objective of the Study**

The general objective of this study is to develop DIANA, a predictive model-based
application that utilizes selected blood biomarkers to identify cluster-based risk levels of Type 2
Diabetes among menopausal women. This study aims to develop a system that analyzes biomarker
patterns, predicts individual risk through clustering techniques, and presents results through user-
friendly visualizations. By doing so, DIANA supports menopausal women in understanding their


health status, assists clinicians in interpreting key risk-contributing factors, and bridges the gap
between data-driven prediction and practical clinical decision-making.

Specifically, this study aims to:

**1. Determine the most informative biomarker attributes by computing Information**
    **Gain (IG) and analyzing the entropy of the dataset to select features that significantly**
    **contribute to predicting Type 2 Diabetes risk among menopausal women.**
       The study will develop a predictive model utilizing a machine learning techniques
    trained on the identified blood biomarkers which are the Fasting Blood Sugar (FBS),
    Hemoglobin A1c (HBA1C), Lipid Profiles and the non-blood biomarkers which are the
    Age, Weight, BMI and Lifestyle associated with type 2 diabetes in menopausal women.
    Unlike the traditional risk assessment that relies on limited statistical correlations, machine
    learning can capture complex and nonlinear interactions among biomarkers through
    algorithms such as logistic regression and random forest. The model will
    identify patterns that enhance prediction accuracy. This data-driven approach enables a
    more personalized and precise risk evaluation offering healthcare professionals a tool for
    early detection and targeted prevention compared to conventional methods
**2. Cluster users based on biomarker, demographic, and lifestyle data, and develop a**
    **predictive modeling approach that determines their cluster membership while**
    **estimating their likelihood of Type 2 Diabetes risk using machine learning techniques**
    **applied to NHANES biomarker data.**
       The DIANA predictive model-based application will function as an advanced
    platform designed to develop a predictive modeling approach that classifies users into
    distinct clusters and predicts both their cluster membership and likelihood of Type 2


```
Diabetes risk. This modeling framework will employ machine learning techniques that
integrate biomarker data, demographic profiles, and lifestyle factors from NHANES. By processing
these multidimensional inputs, the system will generate
precise and individualized risk classifications specifically tailored for menopausal women.
This will generate structured, personalized data summaries that consolidate
biomarker readings, demographic characteristics, and relevant lifestyle information into a
coherent clinical profile. By integrating predictive modeling results with these detailed user
profiles, the system converts raw clinical data into actionable, evidence-based insights.
This enables healthcare practitioners to recognize deviations, risk elevations, or emerging
metabolic concerns more effectively
Through this platform, healthcare professionals including physicians,
endocrinologists, and clinical researchers will have access to comprehensive predictive
outputs that reflect the user’s overall metabolic status. HbA1c and FBS are used for ground‑truth
labeling, while the primary screening model uses non‑circular metabolic features. The clustering
mechanism helps identify patterns or subgroups within the menopausal population, supporting
targeted clinical interpretation.
```
**3. Visualization of risk predictions and clustering outputs will be enabled through a**
    **web-based application that integrates the developed predictive model and presents**
    **results using bar charts, heatmaps, and cluster plots.**


```
This serve as an interactive platform designed to develop a predictive modeling
approach that classifies users into clusters and predicts both their cluster membership and
likelihood of Type 2 Diabetes risk, using machine learning techniques applied to biomarker,
demographic, and lifestyle data gathered from interest groups. Through this system,
healthcare professionals such as physicians and endocrinologists will be able to visualize
individualized risk levels among menopausal women based on selected blood biomarkers.
Designed with a user-centered approach, the platform aims to strengthen the
capacity of medical practitioners to detect at-risk individuals at earlier stages. In doing so,
the DIANA system supports improved preventive care, encourages timely intervention
strategies, and promotes proactive health management specifically tailored for the needs of
menopausal women.
Additionally, the web application will offer personalized data summaries, enabling
healthcare professionals to monitor trends in key biomarkers such as Hemoglobin A1c
(HbA1c), Fasting Blood Sugar (FBS), and lipid profiles. By integrating clustering results
with predictive indicators, the DIANA system bridges the gap between raw diagnostic data
and actionable clinical insights. Its user-friendly interface will further support practitioners
in identifying high-risk individuals earlier, promoting preventive care and proactive health
management for menopausal women.
```
**Rationale of the Study**

In recent years, the increasing prevalence of Type 2 Diabetes Mellitus (T2DM) has posed
a growing challenge to public health, particularly among menopausal women who experience
hormonal and metabolic changes that heighten their risk of developing the disease. Despite


advancements in diagnostics, current screening methods such as Fasting Blood Sugar (FBS) and
Hemoglobin A1c (HbA1c), primarily serve as a reactive function identifying diabetes only after
its onset (IDF, 2024). As a result, there is a pressing need for predictive tools that enable early
detection and prevention of T2DM before severe complications arise.

Recent studies have shown the potential of machine learning-based predictive modeling in
healthcare, allowing for the identification of hidden patterns within biomedical data that traditional
diagnostic methods often overlook (Kopitar et al., 2020; Mohd Rizal et al., 2024). However, many
existing models lack population-specific considerations and effective visualization tools that can
help healthcare professionals interpret risk levels more efficiently.

The proposed study addresses this gap through the development of DIANA: A Predictive
Model-Based Application Using Selected Blood Biomarkers for Cluster-Based Identification of
Type 2 Diabetes Risk in Menopausal Women. DIANA predictive model-based application aims
to integrate traditional diagnostic markers with novel blood biomarkers to provide a more
comprehensive and individualized risk assessment. Additionally, the inclusion of an interactive
dashboard and visualization feature allows healthcare professionals to easily monitor, interpret,
and act upon predictive results. The groups what will benefit from this study are:

**Healthcare providers:** including medical professionals will benefit from this study. With
DIANA, they can review and validate the predictive results generated by the web application,
allowing them to better assess patient risk, interpret biomarker patterns, and support informed
clinical decision-making.

**Hospitals and clinics:** will also benefit as the application enhances patient care and
monitoring systems. By integrating predictive analytics into their operations, healthcare facilities
can reduce diagnostic delays, improve preventive care strategies, and strengthen patient record
management, particularly in populations that are traditionally underserved in risk assessments.

**Menopausal women:** are the primary beneficiaries of this study. Through personalized
risk assessments and improved record management, they can gain better awareness of their health
status. This allows for timely lifestyle modifications, preventive measures, and early medical
interventions, ultimately lowering the likelihood of developing Type 2 Diabetes and its
complications.

**Public Health Sector:** This will gain from this study’s contribution to targeted disease
prevention efforts. By addressing a vulnerable group, the study supports strategies aimed at
reducing the prevalence and burden of diabetes at both community and national levels. In the
context of the Philippines, where diabetes remains a growing concern, this study offers an
innovative tool that aligns with public health initiatives to strengthen early detection and
prevention strategies.

Moreover, this study leverages the use of predictive modeling techniques and data
visualization to create a robust tool for identifying early risks of Type 2 Diabetes in menopausal
women including T2DM Subgroups clustering. By doing so, DIANA serves as a valuable decision-
support system that enhances clinical judgment, promotes preventive care, and assists in timely
intervention. The application also enables medical practitioners to translate complex biomarker
data into understandable insights that support early diagnosis and lifestyle-based risk management.

In alignment with the United Nations Sustainable Development Goal (SDG) 3: Good
Health and Well-Being, this study contributes to the promotion of healthier lives and the
prevention of noncommunicable diseases such as diabetes. By developing DIANA, the researchers


aim to support healthcare professionals and empower menopausal women through technology-
driven early detection, improved monitoring, and informed clinical decision-making ultimately
fostering a healthier and more proactive healthcare system in the Philippines.

**Scope and Delimitations of the Study**

This study focuses on the development of DIANA, a predictive model-based application
that utilizes selected _blood biomarkers_ to classify current diabetes risk in menopausal women
(T2D).

```
This study has the following scope:
```
- _Identification and Selection of Blood Biomarkers_ **:** The identification and selection
    of blood biomarkers will focus on determining those significantly associated with
    current Type 2 Diabetes status among menopausal women. This process will
    involve evaluating clinically accessible biomarkers such as Fasting Blood Sugar
    (FBS) and Hemoglobin A1c (HbA1c), which are known to play vital roles in
    glucose metabolism and hormonal regulation during menopause. In addition, the
    study will consider biomarkers that have shown relevance in distinguishing
    between the established clustering of T2DM subgroups such as Severe Insulin-
    Deficient Diabetes (SIDD), Severe Insulin-Resistant Diabetes (SIRD), Mild
    Obesity-Related Diabetes (MOD), and Mild Age-Related Diabetes (MARD) as
    identified in recent diabetes stratification research (Prasad et al., 2018;Veelen et al.,
    2021 ; Yang et al., 2025). By acknowledging these subgroup clusters, the selection
    process ensures that the biomarkers reflect not only general diabetes indicators but
    also the heterogeneity of T2DM presentations.


- _Development of Predictive Model Using Machine Learning:_ Using the selected
    biomarkers, the researchers will develop a predictive classification model
    employing machine learning algorithms to classify the current diabetes risk status
    of menopausal women_._ The study will explore models such as logistic regression,
    random forest, or support vector machines to determine which approach yields the
    most accurate predictive performance. Model training and validation will be
    performed using available biomarker datasets. Statistical evaluation methods such
    as accuracy, sensitivity, specificity, and AUC (Area Under the Curve) will be
    applied to measure the model’s performance and reliability.
- _Integration into a Web Application_ **:** The study will integrate the developed
    predictive model into a web-based application named DIANA, which will be
    designed exclusively for use by healthcare professionals, particularly doctors
    specializing in endocrinology or internal medicine. The web application will serve
    as a decision-support tool, allowing physicians to input relevant biomarker data
    from menopausal patients and receive a predictive assessment of Type 2 Diabetes
    risk. The system will focus on assisting in clinical evaluation and preventive care
    planning rather than providing automated medical diagnoses or treatment
    recommendations. To enhance usability, the interface will include visual
    representations such as graphs, charts, and color-coded indicators to support clear
    interpretation and facilitate evidence-based decision-making in clinical settings.
- _Evaluation of Model Accuracy and Application Usability:_ The predictive model’s
    performance will be assessed using computational evaluation metrics such as
    accuracy, sensitivity, specificity, and Area Under the Curve (AUC) to determine its


```
predictive reliability. Meanwhile, the usability of the DIANA web application will
be evaluated through a structured usability test involving selected healthcare
professionals. The assessment will focus on key factors such as system
functionality, ease of navigation, clarity of risk presentation, and reliability of
results. Feedback gathered from participating medical professionals will serve as
the basis for refining the application’s interface and ensuring that it effectively
supports clinical decision-making in the early identification of Type 2 Diabetes risk
among menopausal women.
```
- _Web Application Functionalities:_ The DIANA predictive model will be
    incorporated into a dedicated web application designed solely for healthcare
    professionals particularly Doctors. This system will operate within secure medical
    networks and be accessible only to authorized users. By entering patient biomarker
    data in a prescribed format, doctors can obtain real-time diabetes risk assessments
    for menopausal women. The web application will feature multiple sections that
    provide key functions, including data input, result visualization, and risk analysis,
    ensuring an efficient and user-friendly experience for clinical use.
       o _Dashboard Tab_ – serves as the central overview interface of the DIANA
          application. It provides a real-time summary of all patient-related data
          stored in the system. At the top of the dashboard, users can view the total
          number of registered patients, recent additions, and summary statistics that
          reflect the system’s current data load. Below these key metrics will be
          showing the graphical representations of the collective blood biomarker
          levels gathered from all patient entries. These graphs visualize the overall


trends in biomarkers such as fasting plasma glucose, HbA1c, and Estradiol,
among others. This allows the user to observe trends across their patient
population and detect potential increases in diabetes risk prevalence among
menopausal women. This feature supports data-driven monitoring and
decision-making.
o _Patient history Tab_ – acts as archive of the stored data and organizes all
patient records systematically. Each record entry includes essential details
such as the patient's name, age, and the date of the latest added assessment.
When user clicks or hovers over a patient record, the interface opens a
detailed profile view displaying the patient's full information. This includes
the complete name, historical biomarker readings, and a line graph that
overlays previous biomarker results with the most recent assessment. This
visual overlay provides an immediate comparison between the patient's
historical biomarker readings and current assessment (e.g., changes in FPG
or HbA1c values), enabling the clinician to contextualize current diabetes
risk within the patient's biomarker trend. Furthermore, this tab presents the
risk assessment result generated by the DIANA model showing the current
probability score (0–100%) for At‑Risk screening, with optional 3‑class detail
available for clinician mode.
This enables clinicians to prioritize diagnostic confirmation and early
intervention.
o _Analytics Tab_ – provides an interactive visualization interface that allows
the users to interpret predictive insights derived from the patient data
