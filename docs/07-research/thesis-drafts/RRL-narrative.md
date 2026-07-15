# Review of Related Literature

The development of the Diabetes Risk Assessment and Stratification Platform (DIANA) is situated at the intersection of menopausal metabolic health, machine learning-based risk screening, and human-centered clinical visualization. DIANA is designed as a non-diagnostic, non-glycemic diabetes-risk screening and metabolic-risk stratification platform for postmenopausal women. Its rationale draws on evidence linking earlier natural menopause and adverse cardiometabolic changes with elevated Type 2 Diabetes Mellitus (T2DM) risk, while recognizing that these associations are influenced by age, adiposity, lifestyle, and other clinical factors. This chapter reviews the theoretical foundations, clinical guidelines, and empirical studies that justify the targeting of postmenopausal women, the selection of laboratory-assisted non-glycemic biomarkers, the application of unsupervised clustering, and the design of explainable risk communication interfaces.

---

## 1. Menopausal Transition and Metabolic Diabetes Risk

Natural menopause represents a major biological milestone characterized by the permanent cessation of ovarian function and a subsequent decline in circulating estrogen levels. This hormonal transition triggers profound physiological shifts, particularly in insulin sensitivity, lipid metabolism, and body fat distribution. As estrogen levels diminish, its protective role in pancreatic beta-cell function and insulin action is compromised, leading to elevated systemic insulin resistance (Carr, 2003). 

However, it is critical to avoid implying that estrogen decline alone causes T2DM. Menopause is associated with adverse cardiometabolic shifts—such as changes in visceral adiposity, lipid profiles, and glucose homeostasis—but these relationships are heavily influenced and confounded by chronological aging, baseline adiposity, physical inactivity, reproductive history, medication use, and socioeconomic factors. In a foundational review of these metabolic interactions, Carr (2003) outlined the increased prevalence of metabolic syndrome around menopause (pp. 2404–2411), demonstrating that menopause-associated changes in body fat distribution—specifically the accumulation of visceral adiposity—serve as key clinical mediators of insulin resistance.

To quantify these cardiometabolic risks, large prospective epidemiological studies have examined the relationship between the menopausal transition and diabetic incidence. In a prospective cohort study of 3,639 postmenopausal women who were free of diabetes at baseline, Muka et al. (2017) recorded 348 incident cases of T2DM over a median follow-up of 9.2 years. Their adjusted analysis demonstrated that, compared with women experiencing menopause at age 55 or older, the adjusted T2DM hazard ratios (HR) were 3.7 (95% CI: 1.8–7.7) for premature menopause (before age 40) and 2.4 (95% CI: 1.3–4.3) for early menopause (between ages 40 and 44). Crucially, Muka et al. (2017) reported a 4% lower hazard of T2DM per one-year older age at menopause (HR 0.96; 95% CI: 0.94–0.98). 

These longitudinal findings are supported by a 2024 meta-analysis by Yazdkhasti et al. (2024), which reported that early menopause was associated with significantly higher odds and hazards of T2DM; however, estimates varied across study designs and substantial heterogeneity was reported. The European prospective EPIC-InterAct cohort study (Brand et al., 2013) further documented this risk, tracking 3,691 incident cases and establishing a hazard ratio of 1.32 (95% CI: 1.04–1.69) for women experiencing menopause before age 45.

Similarly, population-specific analyses using the National Health and Nutrition Examination Survey (NHANES) cycles have validated these metabolic associations. Xing, Kirby, and Alman (2022) analyzed NHANES 2011–2018 cycles, demonstrating that younger age at menopause is a robust, independent predictor of elevated T2DM prevalence among U.S. postmenopausal women. The clinical presentation of this risk frequently manifests as metabolic syndrome. Marjani, Moghadamnia, and Esmaeelinejad (2012) observed in their clinical evaluation of postmenopausal cohorts that abdominal adiposity and low high-density lipoprotein cholesterol (HDL-C) represent the most prevalent manifestations of metabolic syndrome during this transition. 

This shift towards an atherogenic lipid profile is driven by hormonal and aging transitions; as Russo et al. (2010) demonstrated, the menopausal transition independently alters lipid and lipoprotein metabolism, leading to elevated triglycerides and diminished cardioprotective HDL-C subfractions. Reflecting these metabolic threats, clinical practice guidelines from the Endocrine Society (Stuenkel et al., 2018) advocate for targeted screening and early risk stratification to mitigate long-term cardiometabolic morbidity during the menopausal transition, while the World Health Organization (2024) emphasizes natural menopause as a critical intervention window.

---

## 2. Biomarkers and Predictor Feature Justification

The clinical diagnosis of T2DM is defined by glycemic parameters, such as a fasting plasma glucose (FPG) level of at least 126 mg/dL or a glycated hemoglobin (A1C) level of at least 6.5%, with confirmatory testing generally required in the absence of unequivocal hyperglycemia (American Diabetes Association [ADA], 2026). While these markers are indispensable for diagnostic confirmation, obtaining them requires laboratory-based blood draws, which are invasive, costly, and less suitable for primary screening. To address this limitation, research has focused on predicting risk using accessible, non-glycemic clinical biomarkers.

Because lipid markers (triglycerides, HDL-C, and LDL-C) require a blood test, DIANA is designed as a laboratory-assisted, non-glycemic risk-screening tool rather than a fully non-invasive, no-test self-screening tool. In Southeast Asian cohorts, the feasibility of using non-glycemic indicators for diabetes risk screening has been explored. Campugan and Aguaras (2025) demonstrated that anthropometric and lipid markers—specifically BMI, triglycerides, and LDL-C—exhibit predictive significance in binomial logistic regression models, supporting the potential predictive contribution of these variables in non-glycemic screening models. 

Moreover, metabolic risk is better captured when anthropometric and lipid measurements are combined. Kahn (2005) introduced the Lipid Accumulation Product (LAP)—a composite metric calculated as $(\text{waist circumference} - 58) \times \text{triglycerides}$ for women—and demonstrated that it performs better than BMI alone in recognizing metabolic and cardiovascular risk. This index was subsequently validated on a large scale by Wang, Wang, and Zeng (2024) using NHANES cycles spanning 1999–2018, confirming that LAP serves as a highly sensitive predictor of prediabetes and diabetes.

To establish operational thresholds, clinical screening tools rely on standardized cardiovascular and metabolic criteria. The International Diabetes Federation (IDF, 2006) and the National Cholesterol Education Program Expert Panel (NCEP ATP III, 2001) define metabolic syndrome thresholds as triglycerides $\ge$150 mg/dL and HDL-C $<$50 mg/dL for women, which underpins the metabolic-risk guardrails in screening systems. Additionally, while a BMI of at least 25 kg/m² is commonly used as an Asia-Pacific operational obesity threshold, observed-risk cutoffs vary across Asian groups, as noted by the World Health Organization (2000) expert consultation on redefining obesity. 

Further support for these non-glycemic biomarkers is provided by Cybulska et al. (2023, 2025), whose evaluations of menopausal cohorts verified that surrogate indices of insulin resistance, such as the Triglyceride-Glucose (TyG) index and LAP, successfully discriminate between diabetic states. Ultimately, these biological risks are compounded by behavioral factors; as Bi et al. (2012) and Wu et al. (2014) point out, physical inactivity and nutritional imbalances alter glucose disposal rates, making lifestyle attributes essential covariates in screening models.

---

## 3. Unsupervised Clustering and Subtype Heterogeneity

For decades, Type 2 Diabetes has been treated as a monolithic disease. However, clinical observations reveal substantial heterogeneity in disease progression, complication profiles, and treatment responses. To capture this variation, researchers have turned to unsupervised machine learning to identify data-driven patient subgroups.

The foundational taxonomy for diabetes subtyping was proposed by Ahlqvist et al. (2018). By performing clustering on six clinical variables (GAD antibodies, age at diagnosis, BMI, HbA1c, HOMA2-B, and HOMA2-IR) across newly diagnosed, adult-onset diabetic cohorts, they identified five distinct subtypes:
1. **SAID** (Severe Autoimmune Diabetes)
2. **SIDD** (Severe Insulin-Deficient Diabetes)
3. **SIRD** (Severe Insulin-Resistant Diabetes)
4. **MOD** (Mild Obesity-Related Diabetes)
5. **MARD** (Mild Age-Related Diabetes)

Because Ahlqvist's clusters were developed among individuals already diagnosed with diabetes and utilized glycemic and insulin secretion estimates, they do not directly validate clustering in a non-diabetic risk-screening population that excludes glycemic measurements. In the DIANA platform, these five clusters serve as a conceptual basis for metabolic heterogeneity, guiding the identification of distinct "risk strata" or "metabolic profiles" rather than validated biological subtypes. 

To determine the therapeutic utility of this subtyping, Dennis et al. (2019) evaluated the clusters using clinical trial data, demonstrating that subgroups differ in their rate of disease progression and response to specific glucose-lowering drugs. However, the authors also cautioned that simpler models based on baseline clinical features could achieve similar predictive performance for treatment response, suggesting that data-driven subtypes should be used as heuristic guides rather than absolute diagnostic truths. Longitudinal validation was further provided by Zaharia et al. (2019) in a 5-year follow-up study that confirmed distinct, reproducible complication trajectories across the Ahlqvist clusters.

Furthermore, the generalizability of these subgroups has been extensively evaluated across diverse geographic and ethnic populations. In a systematic review and meta-analysis, Ao et al. (2025) synthesized diabetes clustering studies, suggesting partial reproducibility of diabetes clusters across populations, though differences in variable selection, scaling, and cluster assignment affect replication. Similarly, a systematic review by Taurbekova et al. (2025) examining 41 clustering studies highlighted the methodological robustness of K-means and hierarchical clustering for patient stratification in diabetes research. 

This generalizability is particularly relevant for non-European cohorts; Danquah et al. (2023) successfully replicated the Ahlqvist subgroups in a Ghanaian population using data-driven cluster analysis, validating the transportability of these metabolic phenotypes to African settings. Finally, the biological reality of these clinical phenotypes is supported by molecular and therapeutic research. Schrader et al. (2022) identified distinct epigenetic and DNA methylation profiles across the subgroups, while Veelen et al. (2021) outlined precision medication strategies tailored to the specific insulin-resistant or insulin-deficient pathways characteristic of each subgroup.

---

## 4. Machine Learning Validation and Methodological Standards

Developing a defensible predictive model for clinical screening and stratification requires rigorous validation protocols to avoid overfitting, data leakage, and optimistic bias. It is essential to distinguish between the different validation and evaluation tasks required:

### Prediction Model Validation
To prevent optimistic bias in limited sample sizes, Vabalas et al. (2019) demonstrate that performing feature selection, scaling, imputation, resampling, or hyperparameter tuning prior to cross-validation splits leads to severe overestimation of model performance. Consequently, all data preprocessing and threshold optimization steps must be conducted strictly within the resampling loops (e.g., within nested cross-validation training folds) rather than on the entire dataset. In DIANA, this is addressed via a nested Leave-One-Group-Out (LOGO) cross-validation framework for model selection and tuning. 

Models utilize tree-based ensemble methods such as Random Forest (Breiman, 2001), LightGBM (Ke et al., 2017), and XGBoost (Chen & Guestrin, 2016), which are standard for capturing non-linear feature interactions and are compared against regularized linear models (Kopitar et al., 2020; Mohd Rizal et al., 2024). Feature selection is optimized through Information Gain and entropy audits, as evaluated by Kaliappan et al. (2024) and Sreehari and Babu (2024). For survey-based datasets like NHANES, complexity is further compounded by survey weights; Lumley (2010) cautions that while sampling weights are necessary for population prevalence estimation, they can distort model training and validation splits if not managed carefully.

### External Validation
While internal cross-validation is vital for tuning, it is widely recognized that external validation using a separate temporal, geographic, or institutionally distinct dataset provides much stronger evidence of generalizability and is the clinical standard before model adoption.

### Clustering Validation
Clustering validation cannot rely solely on internal silhouette metrics. Defensible clustering requires evaluating resampling stability, silhouette and other internal indices (Rousseeuw, 1987), clinical-profile coherence, and, ideally, replication in an independent dataset. 

In the unsupervised clustering phase, standard K-means is often limited because it weights all features equally, which can allow irrelevant or noisy features to degrade cluster quality. To address this, Krishnamoorthy and Jaganathan (2025) optimized weighted K-means clustering using gradient-based methods, demonstrating that incorporating feature-specific weights significantly improves cluster stability, clinical interpretability, and silhouette scores, providing the mathematical justification for domain-weighted clustering.

### Calibration Assessment
In terms of model calibration, the Brier score (Brier, 1950) serves as an appropriate measure of overall predictive accuracy. However, because the commonly used Hosmer-Lemeshow goodness-of-fit test is highly sensitive to sample size, it should not be the sole calibration assessment. A robust evaluation should incorporate the calibration intercept, calibration slope, and a visual calibration plot (Van Calster et al., 2019).

### Clinical Utility
Crucially, discrimination (AUC-ROC) and calibration alone do not demonstrate whether a screening tool improves decisions. Assessing clinical utility requires decision-curve analysis or net benefit calculations to weigh the benefits of true-positive screening against the harms of false-positive referrals. To optimize the decision threshold of the screening model, researchers rely on performance metrics that balance sensitivity and specificity. Youden's J statistic (Youden, 1950) is widely used to identify the optimal cutoff on the ROC curve by maximizing the difference between the true positive rate and the false positive rate. To handle class imbalance, Luque et al. (2019) demonstrate the superiority of the G-Mean metric over raw accuracy. Standard diagnostic accuracies (sensitivity, specificity, PPV) are defined by Shreffler and Huecker (2023), while F1-score optimization is utilized to maximize the harmonic mean of precision and recall (Powers, 2011).

---

## 5. Explainable AI, Visualization, and Usability

For a predictive screening tool to be clinically useful, its predictions must be transparent to clinicians and patients. In the context of "black-box" machine learning, this is achieved through explainable artificial intelligence (XAI) and user-centered visualization interfaces.

Model explanations are foundational to clinical trust. Lundberg and Lee (2017) introduced SHAP (SHapley Additive exPlanations), a game-theoretic approach that assigns each feature an importance value for a specific prediction, ensuring local accuracy and consistency. 

To communicate these explanations effectively, interfaces must follow empirical visualization guidelines. Ajani et al. (2021) demonstrated that "decluttering and focusing" design guidelines—which minimize visual noise and highlight key features—significantly improve graphic comprehension and decision-making accuracy. This is supported by a systematic review by Park et al. (2022), which showed that structured data visualization in public health settings reduces tracking errors and improves clinical decision-making. Moreover, Zerlik et al. (2024) conducted a scoping review that maps visualization approaches for single-patient data and can inform visualization selection, supporting the broader proposition that user-centered visualizations can reduce cognitive burden and aid clinical decisions.

For explaining risk, patient-specific contribution charts and color-coded risk indicator bars (Van Belle & Van Calster, 2015) enhance model transparency. 

Interactive visualization frameworks further enhance interpretability by allowing users to explore relationships between model inputs and outputs. Cheng et al. (2021) developed VBridge, a clinical visual analytics system that connects interactive feature explanations with raw patient records, enabling clinicians to inspect model reasoning. Similarly, preprint evidence by Rojo et al. (2024) on the Petal-X system demonstrates that interactive, human-centered visual explanations of modifiable risk factors can improve risk communication and encourage patient engagement. 

Finally, the usability of such systems is evaluated using the System Usability Scale (SUS) (Brooke, 1996), a standard industry questionnaire validated by Bangor, Kortum, and Miller (2008) for determining technology acceptance, alongside accessibility compliance with WCAG 2.2 guidelines (World Wide Web Consortium, 2023).

---

## 6. Security, Quality, and Governance

The deployment of clinical software requires strict adherence to security protocols, software quality standards, and ethical AI governance.

Authentication and data protection are standard requirements for clinical web applications. Jones, Bradley, and Sakimura (2015) define the JSON Web Token (JWT) standard for secure, state-independent session management, while Provos and Mazieres (1999) introduce the bcrypt adaptive hashing algorithm for protecting user credentials from brute-force attacks. 

For evaluating overall system quality, the ISO/IEC 25010:2023 product quality model (International Organization for Standardization, 2023) defines eight characteristics—including security, usability, and maintainability—that serve as the framework for prototype verification.

From a statistical perspective, model validation is supported by robust confidence estimation. Efron and Tibshirani (1993) outline the bootstrap methodology used to construct non-parametric confidence intervals for performance metrics. 

Finally, the ethical deployment of health-AI technologies is governed by the World Health Organization (2021), which establishes guidelines for artificial intelligence in health. The WHO framework emphasizes that predictive tools must function as screening support systems with human-in-the-loop oversight rather than as standalone, diagnostic decision-makers.

---

## References

* **ADA** (American Diabetes Association Professional Practice Committee). (2026). 2. Diagnosis and classification of diabetes: Standards of Care in Diabetes—2026. *Diabetes Care, 49*(Supplement 1), S27-S49. https://doi.org/10.2337/dc26-S002
* **Ahlqvist, E.**, Storm, P., Karajamaki, A., et al. (2018). Novel subgroups of adult-onset diabetes and their association with outcomes: A data-driven cluster analysis of six variables. *The Lancet Diabetes & Endocrinology, 6*(5), 361-369. https://doi.org/10.1016/S2213-8587(18)30051-2
* **Ajani, K.**, Lee, E., Xiong, C., Nussbaumer Knaflic, C., Kemper, W., & Franconeri, S. (2021). Declutter and focus: Empirically evaluating design guidelines for effective data communication. *IEEE Transactions on Visualization and Computer Graphics, 28*(10), 3351–3364. https://doi.org/10.1109/TVCG.2021.3068337
* **Ao, N.**, Li, J., Wang, Q., Du, J., Jin, S., & Yang, J. (2025). Clinical and laboratory characteristics of novel diabetes subgroups: A systematic review and meta-analysis. *Scientific Reports, 15*, 38585. Published November 2025. https://doi.org/10.1038/s41598-025-22556-4
* **Bangor, A.**, Kortum, P. T., & Miller, J. T. (2008). An empirical evaluation of the System Usability Scale. *International Journal of Human-Computer Interaction, 24*(6), 574-594. https://doi.org/10.1080/10447310802205776
* **Bi, Y.**, et al. (2012). Advanced research on risk factors of type 2 diabetes. *Diabetes/Metabolism Research and Reviews, 28*(2), 32-39. https://doi.org/10.1002/dmrr.2352
* **Brand, J. S.**, van der Schouw, Y. T., Onland-Moret, N. C., Sharp, S. J., Ong, K. K., Khaw, K.-T., ... Chirlaque, M.-D. (2013). Age at menopause, reproductive life span, and type 2 diabetes risk: The EPIC-InterAct study. *Diabetes Care, 36*(4), 1012-1019. https://doi.org/10.2337/dc12-1020
* **Breiman, L.** (2001). Random forests. *Machine Learning, 45*, 5-32. https://doi.org/10.1023/A:1010933404324
* **Brier, G. W.** (1950). Verification of forecasts expressed in terms of probability. *Monthly Weather Review, 78*(1), 1-3. https://doi.org/10.1175/1520-0493(1950)078<0001:VOFEIT>2.0.CO;2
* **Brooke, J.** (1996). SUS: A quick and dirty usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester, & I. L. McClelland (Eds.), *Usability Evaluation in Industry* (pp. 189-194). Taylor & Francis.
* **Campugan, J. E.**, & Aguaras, M. G. (2025). Predictive modeling of diabetes classification using binomial logistic regression on biomedical indicators. *Journal of Interdisciplinary Perspectives*. https://ejournals.ph/article.php?id=28832
* **Carr, M. C.** (2003). The emergence of the metabolic syndrome with menopause. *The Journal of Clinical Endocrinology & Metabolism, 88*(6), 2404–2411. https://doi.org/10.1210/jc.2003-030242
* **Chen, T.**, & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. *Proceedings of the 22nd ACM KDD*, 785-794. https://doi.org/10.1145/2939672.2939785
* **Cheng, F.**, Liu, D., Du, F., Lin, Y., Zytek, A., Li, H., Qu, H., & Veeramachaneni, K. (2021). VBridge: Connecting the dots between features and data to explain healthcare models. *IEEE Transactions on Visualization and Computer Graphics, 28*(1), 378–388. https://doi.org/10.1109/TVCG.2021.3114838
* **Cybulska, A. M.**, Schneider-Matyka, D., & Grochans, E. (2025). Predictive biomarkers for cardiometabolic risk in postmenopausal women: Insights into visfatin, adropin, and adiponectin. *Frontiers in Endocrinology, 16*, Article 1527567. https://doi.org/10.3389/fendo.2025.1527567
* **Cybulska, A. M.**, Schneider-Matyka, D., Wieder-Huszla, S., Jurczak, A., Szkup, M., & Grochans, E. (2023). Diagnostic markers of insulin resistance to discriminate between prediabetes and diabetes in menopausal women. *European Review for Medical and Pharmacological Sciences, 27*(6), 2453–2468. https://doi.org/10.26355/eurrev_202303_31779
* **Danquah, I.**, Mank, I., Hampe, C. S., Meeks, K. A. C., Agyemang, C., Owusu-Dabo, E., ... Rolandsson, O. (2023). Subgroups of adult-onset diabetes: A data-driven cluster analysis in a Ghanaian population. *Scientific Reports, 13*(1), Article 10756. https://doi.org/10.1038/s41598-023-37494-2
* **Dennis, J. M.**, Shields, B. M., Henley, W. E., Jones, A. G., & Hattersley, A. T. (2019). Disease progression and treatment response in data-driven subgroups of type 2 diabetes compared with models based on simple clinical features: An analysis using clinical trial data. *The Lancet Diabetes & Endocrinology, 7*(6), 442-451. https://doi.org/10.1016/S2213-8587(19)30087-7
* **Efron, B.**, & Tibshirani, R. J. (1993). *An Introduction to the Bootstrap*. Chapman & Hall/CRC.
* **Hosmer, D. W.**, & Lemeshow, S. (1980). Goodness of fit tests for the multiple logistic regression model. *Communications in Statistics — Theory and Methods, 9*(10), 1043–1069. https://doi.org/10.1080/03610928008827941
* **International Organization for Standardization.** (2023). *ISO/IEC 25010:2023 Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models*. https://www.iso.org/standard/35733.html
* **Jones, M.**, Bradley, J., & Sakimura, N. (2015). *JSON Web Token (JWT)* (RFC 7519). IETF. https://www.rfc-editor.org/rfc/rfc7519.html
* **Kahn, H. S.** (2005). The “lipid accumulation product” performs better than the body mass index for recognizing cardiovascular risk: A population-based comparison. *BMC Cardiovascular Disorders, 5*, 26. https://doi.org/10.1186/1471-2261-5-26
* **Kaliappan, J.**, et al. (2024). Analyzing classification and feature selection strategies for diabetes prediction across diverse diabetes datasets. *Frontiers in Artificial Intelligence, 7*, 1421751. https://doi.org/10.3389/frai.2024.1421751
* **Ke, G.**, Meng, Q., Finley, T., et al. (2017). LightGBM: A highly efficient gradient boosting decision tree. *Advances in Neural Information Processing Systems, 30*, 3146-3154.
* **Kopitar, L.**, Kočbek, P., Cilar, L., Sheikh, A., & Štiglic, G. (2020). Early detection of type 2 diabetes mellitus using machine learning-based prediction models. *Scientific Reports, 10*(1), Article 11968. https://doi.org/10.1038/s41598-020-68771-z
* **Krishnamoorthy, S.**, & Jaganathan, B. (2025). Optimizing weighted k-means clustering with gradient-based methods. *Systems Science & Control Engineering, 13*(1), 2550755. https://doi.org/10.1080/21642583.2025.2550755
* **Lundberg, S. M.**, & Lee, S.-I. (2017). A unified approach to interpreting model predictions. *Advances in Neural Information Processing Systems, 30*, 4765-4774.
* **Lumley, T.** (2010). *Complex Surveys: A Guide to Analysis Using R*. Wiley.
* **Luque, A.**, Carrasco, A., Martín, A., & de las Heras, A. (2019). The impact of class imbalance in classification performance metrics based on the data confusion matrix. *Pattern Recognition, 91*, 216–231. https://doi.org/10.1016/j.patcog.2019.01.005
* **Marjani, A.**, Moghadamnia, A. A., & Esmaeelinejad, M. (2012). The metabolic syndrome among postmenopausal women in Gorgan. *International Journal of Endocrinology, 2012*, 920502. https://doi.org/10.1155/2012/920502
* **Mohd Rizal, M. F.**, Abdul Maulud, K. N., Ganasegeran, K., Abdul Manaf, M. R., Safian, N., Mustapha, F. I., & Waller, L. A. (2024). A scoping review of supervised machine learning techniques in predicting the prevalence of type 2 diabetes mellitus. *Medicine & Health, 19*(2), 380–399. https://doi.org/10.17576/MH.2024.1902.03
* **Muka, T.**, Asllanaj, E., Avazverdi, N., et al. (2017). Age at natural menopause and risk of type 2 diabetes: A prospective cohort study. *Diabetologia, 60*(10), 1951–1960. https://doi.org/10.1007/s00125-017-4346-8
* **Park, S.**, Bekemeier, B., Flaxman, A., & Schultz, M. (2022). Impact of data visualization on decision-making and its implications for public health practice: A systematic literature review. *Informatics for Health and Social Care, 47*(2), 175–193. https://doi.org/10.1080/17538157.2021.1982942
* **Powers, D. M. W.** (2011). Evaluation: From precision, recall and F-measure to ROC, informedness, markedness and correlation. *Journal of Machine Learning Technologies, 2*(1), 37–63.
* **Provos, N.**, & Mazieres, D. (1999). A future-adaptable password scheme. *Proceedings of the USENIX Annual Technical Conference*, 81-91.
* **Rojo, D.**, Lamqaddam, H., Gosak, L., & Verbert, K. (2024). Petal-X: Human-centered visual explanations to improve cardiovascular risk communication. *arXiv preprint arXiv:2406.18690*. [Preprint]. https://doi.org/10.48550/arXiv.2406.18690
* **Russo, G. T.**, Horvath, K. V., Di Benedetto, A., Giandalia, A., Cucinotta, D., & Asztalos, B. (2010). Influence of menopause and cholesteryl ester transfer protein (CETP) activity on lipid and lipoprotein profiles in women. *Atherosclerosis, 210*(2), 566–571. https://doi.org/10.1016/j.atherosclerosis.2009.12.019
* **Schrader, S.**, Perfilyev, A., Ahlqvist, E., Groop, L., Vaag, A., Martinell, M., García-Calzón, S., & Ling, C. (2022). Novel subgroups of type 2 diabetes display different epigenetic patterns, which associate with future diabetic complications. *Diabetes Care, 45*(7), 1621–1630. https://doi.org/10.2337/dc21-2489
* **Shreffler, J.**, & Huecker, M. R. (2023). Diagnostic testing accuracy: Sensitivity, specificity, predictive values, and likelihood ratios. *StatPearls*. https://www.ncbi.nlm.nih.gov/books/NBK557491/
* **Sreehari, E.**, & Babu, L. D. D. (2024). Critical factor analysis for prediction of Diabetes Mellitus using an inclusive feature selection strategy. *Applied Artificial Intelligence, 38*(1), Article 2331919. https://doi.org/10.1080/08839514.2024.2331919
* **Stuenkel, C. A.**, Davis, S. R., Gompel, A., Lumsden, M. A., Murad, M. H., Pinkerton, J. V., & Santen, R. J. (2018). Treatment of symptoms of the menopause: An Endocrine Society clinical practice guideline. *The Journal of Clinical Endocrinology & Metabolism, 103*(9), 3149–3162. https://doi.org/10.1210/jc.2018-00661
* **Taurbekova, B.**, et al. (2025). Cluster analysis in diabetes research: A systematic review enhanced by a cross-sectional study. *Journal of Clinical Medicine, 14*(10), 3588. https://doi.org/10.3390/jcm14103588
* **Vabalas, A.**, Gowen, E., Poliakoff, E., & Casson, A. J. (2019). Machine learning algorithm validation with a limited sample size. *PLOS ONE, 14*(11), e0224365. https://doi.org/10.1371/journal.pone.0224365
* **Van Belle, V.**, & Van Calster, B. (2015). Visualizing risk prediction models. *PLOS ONE, 10*(7), e0132614. https://doi.org/10.1371/journal.pone.0132614
* **Van Calster, B.**, McLernon, D. J., van Smeden, M., Wynants, L., Steyerberg, E. W., Bossuyt, P., ... Vickers, A. J. (2019). Calibration: The Achilles heel of predictive analytics. *BMC Medicine, 17*, 230. https://doi.org/10.1186/s12916-019-1466-7
* **Veelen, A.**, Erazo-Tapia, E., Oscarsson, J., & Schrauwen, P. (2021). Type 2 diabetes subgroups and potential medication strategies in relation to effects on insulin resistance and beta-cell function: A step toward personalised diabetes treatment? *Molecular Metabolism, 46*, Article 101158. https://doi.org/10.1016/j.molmet.2020.101158
* **Wang, Y.**, Wang, X., & Zeng, L. (2024). Lipid accumulation product as a predictor of prediabetes and diabetes: Insights from NHANES data (1999–2018). *Journal of Diabetes Research, 2024*, Article 2874122. https://doi.org/10.1155/2024/2874122
* **World Health Organization.** (2021). *Ethics and governance of artificial intelligence for health*. https://www.who.int/publications/i/item/9789240029200
* **World Health Organization.** (2024, October 16). *Menopause* (Fact Sheet). https://www.who.int/news-room/fact-sheets/detail/menopause
* **World Wide Web Consortium.** (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*. https://www.w3.org/TR/WCAG22/
* **Wu, Y.**, et al. (2014). Association of physical activity and dietary habits with type 2 diabetes mellitus. *Journal of Diabetes Investigation, 5*(5), 512-520. https://doi.org/10.1111/jdi.12196
* **Xing, Z.**, Kirby, R. S., & Alman, A. C. (2022). Association of age at menopause with type 2 diabetes mellitus in postmenopausal women in the United States: NHANES 2011–2018. *Diabetes Research and Clinical Practice, 195*, 110201. https://doi.org/10.1016/j.diabres.2022.110201
* **Yazdkhasti, N.**, et al. (2024). The association between age of menopause and type 2 diabetes: A systematic review and meta-analysis. *Nutrition & Metabolism, 21*(1), 82. https://doi.org/10.1186/s12986-024-00846-5
* **Zaharia, O. P.**, Strassburger, K., Strom, A., et al. (2019). Risk of diabetes-associated diseases in subgroups of patients with recent-onset diabetes: A 5-year follow-up study. *The Lancet Diabetes & Endocrinology, 7*(9), 684–694. https://doi.org/10.1016/S2213-8587(19)30187-1
* **Zerlik, M.**, Jung, I. C., Schuler, K., Sedlmayr, M., & Sedlmayr, B. (2024). Visualization techniques for summarizing single patient health data to support physicians' clinical decisions – A scoping review. *Studies in Health Technology and Informatics, 317*, 314–323. https://doi.org/10.3233/SHTI240873
