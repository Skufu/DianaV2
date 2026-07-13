# DIANA Minor-Revision Evidence Pack

Generated from the current repository dataset and frozen model artifacts. This pack is an audit and sensitivity-analysis supplement; it does not replace external clinical validation.

## Bottom-line findings

1. **The defensible clustering description is “model-clustered, researcher-named.”** Weighted K-Means assigned all 734 operational-label-positive profiles to raw groups C0-C3 by nearest weighted centroid. K=4, the weights, the operational-positive gate, and the semantic names were researcher-defined. The names were applied after fitting through a deterministic centroid waterfall.
2. **The existing clustering proof must be replaced.** It drops 48 records and visualizes only 686 complete cases. The tables and figures in this pack use the same imputer, scaler, frozen Weighted K-Means artifact, and all 734 records used by the active clustering pipeline.
3. **The current Information Gain table is not reliable.** Missing-heavy variables were inflated because NaN rows received no conditional-entropy contribution while remaining in the denominator. Missing-aware CRP IG is 0.024212, not 0.502669; fasting-insulin IG is 0.060456, not 0.378539.
4. **Logistic Regression is defensible but should not be called universally superior.** It had the highest held-out AUC in all 6/6 survey releases and was also the inner-development winner in all 6 folds. Its mean advantage was only about 0.02 AUC, and multiplicity-adjusted exploratory paired tests do not establish definitive superiority.
5. **The clusters are not proven menopause-specific.** A same-NHANES period-reported comparison group produced similar frozen-centroid profile proportions (chi-square p=0.382, Cramer's V=0.056). This suggests the profiles are general metabolic patterns observed within a cohort selected by a no-period gate, not effects caused by menopause.
6. **The development cohort is operationally defined, not confirmed natural menopause.** RHQ031=2 means no menstrual period in the prior 12 months. In 2013-2023, the recorded reasons included 581 self-reported menopause/change-of-life responses, 310 hysterectomies, 70 other reasons, and 3 don't-know responses. In 2009-2012, 402 of 412 records used a questionnaire code that combined menopause and hysterectomy and cannot be separated retrospectively.

## 1. Dataset attrition

| stage | source_variable | previous_n | excluded_n | retained_n | retained_pct_of_raw | criterion |
|---|---|---|---|---|---|---|
| Merged raw releases | SEQN | 61626 | 0 | 61626 | 100.0000 | Six NHANES releases |
| Female respondents | RIAGENDR | 61626 | 30108 | 31518 | 51.1440 | RIAGENDR = 2 |
| Age 45-60 | RIDAGEYR | 31518 | 26596 | 4922 | 7.9869 | 45 <= RIDAGEYR <= 60 |
| No-period operational cohort | RHQ031 | 4922 | 2096 | 2826 | 4.5857 | RHQ031 = 2: no menstrual period in prior 12 months |
| Complete HbA1c | LBXGH | 2826 | 90 | 2736 | 4.4397 | LBXGH observed for label construction |
| Final fasting-lab cohort | LBXGLU | 2736 | 1360 | 1376 | 2.2328 | LBXGLU observed as fasting-subsample linkage gate |

The exact observed path is 61,626 -> 31,518 -> 4,922 -> 2,826 -> 2,736 -> 1,376. The final Normal/At-Risk split must use DIQ010 plus the HbA1c override. FBS is a fasting-lab eligibility gate, not a second outcome-label rule.

![NHANES cohort attrition](dataset_attrition.png)

### 1.1 Why the no-period gate is not synonymous with natural menopause

| era | source_variable | response_code | recorded_reason | count | percentage_within_era | era_total_n |
|---|---|---|---|---|---|---|
| 2009-2012 | RHD042 | 7 | Menopause or hysterectomy (combined code) | 402 | 97.5728 | 412 |
| 2009-2012 | RHD042 | 8 | Medical condition or treatment | 6 | 1.4563 | 412 |
| 2009-2012 | RHD042 | 9 | Other | 3 | 0.7282 | 412 |
| 2009-2012 | RHD042 | 99 | Don't know | 1 | 0.2427 | 412 |
| 2013-2023 | RHD043 | 3 | Hysterectomy | 310 | 32.1577 | 964 |
| 2013-2023 | RHD043 | 7 | Menopause / change of life (self-report) | 581 | 60.2697 | 964 |
| 2013-2023 | RHD043 | 9 | Other | 70 | 7.2614 | 964 |
| 2013-2023 | RHD043 | 99 | Don't know | 3 | 0.3112 | 964 |

The two questionnaire eras must remain separate. `RHD043` distinguishes hysterectomy from a self-reported menopause/change-of-life reason in 2013-2023, whereas `RHD042` code 7 combines menopause and hysterectomy in 2009-2012. The manuscript should therefore describe the 1,376 records as the **no-period-in-prior-year operational development cohort**. A self-reported menopause/change-of-life subgroup analysis is possible only for the later cycles, would not recover the older combined-code records, and would still not be clinically adjudicated.

![Recorded reasons for the no-period gate](reproductive_status_reason_audit.png)

### 1.2 Target-label source agreement is not target validation

| comparison | cohort_n | eligible_valid_pair_n | excluded_missing_or_invalid_n | agreement_n | disagreement_n | agreement_pct | interpretation |
|---|---|---|---|---|---|---|---|
| DIQ010-only vs HbA1c-only | 1376 | 1376 | 0 | 831 | 545 | 60.3924 | Independent source-agreement description; neither source is treated as a gold standard. |
| Hybrid operational label vs HbA1c-only | 1376 | 1376 | 0 | 1295 | 81 | 94.1134 | Circular by construction because HbA1c is a component of the hybrid operational label; not validation evidence. |

DIQ010-only status and HbA1c-only status agree for 831/1,376 records (60.4%). The hybrid operational target and HbA1c-only status agree for 1,295/1,376 (94.1%), but this higher value is circular by construction because HbA1c is used to create the hybrid target. It may be reported as a consistency check, not as independent evidence of target validity.

## 2. Entropy and corrected Information Gain

Target entropy: **H(Y) = 0.996773 bits**.

| corrected_rank | feature_label | missing_pct | conditional_entropy_h_y_given_x | corrected_ig_missing_as_category | corrected_ig_pct_of_h_y | decision | decision_reason |
|---|---|---|---|---|---|---|---|
| 1 | HDL | 2.0349 | 0.9262 | 0.0706 | 7.0815 | Retained | Non-diagnostic lipid predictor |
| 2 | Metabolic syndrome score | 0.0000 | 0.9325 | 0.0643 | 6.4507 | Excluded | Composite duplicate of retained components |
| 3 | Waist circumference | 2.0349 | 0.9328 | 0.0640 | 6.4176 | Retained | Accessible central-adiposity predictor |
| 4 | Fasting insulin | 32.0494 | 0.9363 | 0.0605 | 6.0652 | Excluded | 32.0% missing; specialized assay; not routinely available |
| 5 | TG/HDL ratio | 2.6163 | 0.9365 | 0.0603 | 6.0502 | Excluded | Derived duplicate of retained TG and HDL |
| 6 | BMI | 0.7994 | 0.9460 | 0.0508 | 5.0975 | Retained | Accessible anthropometric predictor |
| 7 | Triglycerides | 2.6163 | 0.9560 | 0.0408 | 4.0945 | Retained | Non-diagnostic lipid predictor |
| 8 | BMI category | 0.7994 | 0.9651 | 0.0316 | 3.1732 | Excluded | Derived duplicate of retained continuous BMI |
| 9 | CRP | 48.2558 | 0.9726 | 0.0242 | 2.4290 | Excluded | 48.3% missing; cycle-limited; not in deployed workflow |
| 10 | Alcohol use | 0.0000 | 0.9750 | 0.0218 | 2.1869 | Retained | Behavioral covariate; not selected by IG alone |
| 11 | Systolic BP | 5.9593 | 0.9761 | 0.0207 | 2.0748 | Excluded | Removed from cuff-free no-BP contract |
| 12 | Family history of diabetes | 19.2587 | 0.9823 | 0.0144 | 1.4472 | Excluded | 19.3% missing; unavailable in 2021-2023; not in deployed workflow |
| 13 | Total cholesterol | 2.0349 | 0.9880 | 0.0088 | 0.8818 | Excluded | Redundant with retained lipid components |
| 14 | Physical activity | 0.0000 | 0.9886 | 0.0082 | 0.8240 | Retained | Behavioral covariate; not selected by IG alone |
| 15 | LDL | 3.9971 | 0.9913 | 0.0055 | 0.5485 | Retained | Non-diagnostic lipid predictor |
| 16 | Age | 0.0000 | 0.9925 | 0.0043 | 0.4274 | Retained | Prespecified demographic covariate |
| 17 | Smoking status | 0.0000 | 0.9926 | 0.0042 | 0.4213 | Retained | Behavioral covariate; not selected by IG alone |
| 18 | Diastolic BP | 5.9593 | 0.9946 | 0.0022 | 0.2197 | Excluded | Removed from cuff-free no-BP contract |

IG is a univariate relevance audit, not the sole feature-selection rule. The final feature contract also used non-circularity, availability, redundancy, accessibility, and clinical covariate rationale. Do not say that all nine deployed features were retained because they had the top nine IG scores.

![Missing-aware Information Gain audit](information_gain_missingness_audit.png)

## 3. Model-selection evidence

| model | auc_mean | auc_sd | sensitivity_mean | specificity_mean | f1_mean |
|---|---|---|---|---|---|
| Logistic Regression | 0.7360 | 0.0277 | 0.7475 | 0.6053 | 0.7108 |
| Random Forest | 0.7164 | 0.0186 | 0.7319 | 0.6004 | 0.7024 |
| XGBoost | 0.7129 | 0.0132 | 0.7300 | 0.5889 | 0.6990 |
| LightGBM | 0.7118 | 0.0173 | 0.7242 | 0.6030 | 0.6964 |

| comparison | lr_wins_out_of_6 | mean_auc_difference | bootstrap_95_ci_lower | bootstrap_95_ci_upper | exact_two_sided_sign_flip_p | bonferroni_adjusted_p_three_comparisons |
|---|---|---|---|---|---|---|
| Logistic Regression - Random Forest | 6 | 0.0196 | 0.0098 | 0.0323 | 0.0312 | 0.0938 |
| Logistic Regression - LightGBM | 6 | 0.0243 | 0.0080 | 0.0452 | 0.0312 | 0.0938 |
| Logistic Regression - XGBoost | 6 | 0.0232 | 0.0108 | 0.0396 | 0.0312 | 0.0938 |

Inner-development selection, which does not consult each held-out test cycle:

| fold | held_out_cycle | inner_selected_model | selected_inner_cv_auc | selected_outer_auc |
|---|---|---|---|---|
| 1 | 2009-2010 | Logistic Regression | 0.7389 | 0.7109 |
| 2 | 2011-2012 | Logistic Regression | 0.7414 | 0.7135 |
| 3 | 2013-2014 | Logistic Regression | 0.7348 | 0.7356 |
| 4 | 2015-2016 | Logistic Regression | 0.7269 | 0.7876 |
| 5 | 2017-2018 | Logistic Regression | 0.7333 | 0.7379 |
| 6 | 2021-2023 | Logistic Regression | 0.7365 | 0.7305 |

Recommended claim: Logistic Regression was the best-supported current candidate under the implemented survey-cycle-blocked validation design. It ranked first in AUC in every held-out cycle and every inner-development selection. The gap was modest, there were only six cycle groups, and the analysis was not preregistered; interpretability is a secondary reason for retaining LR, not evidence that it was predetermined to win.

![Candidate model performance by cycle](model_selection_by_cycle.png)

## 4. Exact centroid-to-label proof

| raw_cluster_id | assigned_proxy_label | count | percentage | bmi | triglycerides | ldl | hdl | age | waist_circumference | lap_score | lap_score_conventional_mmol_l | naming_rule | interpretation_boundary |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | MARD-like | 232 | 31.6076 | 28.2489 | 97.7802 | 102.5517 | 62.4009 | 55.4224 | 94.9819 | 3616.0962 | 40.8276 | Step 4: residual centroid; mildest metabolic pattern | Residual label; age differs by only about 1.15 years across clusters |
| 1 | MOD-like | 226 | 30.7902 | 42.0464 | 119.6372 | 113.1327 | 51.9469 | 54.2699 | 123.5261 | 7839.3578 | 88.5103 | Step 3: highest BMI among remaining centroids | BMI 42.05 indicates severe obesity despite legacy 'mild' name |
| 2 | SIRD-like | 77 | 10.4905 | 32.2536 | 335.1558 | 109.5325 | 41.7273 | 54.5065 | 107.6584 | 16643.3169 | 187.9114 | Step 1: highest centroid LAP score | TG-waist proxy; code score uses TG in mg/dL; no HOMA2-IR |
| 3 | SIDD-like | 199 | 27.1117 | 29.0102 | 148.2563 | 166.1457 | 52.0050 | 54.9497 | 98.6357 | 6024.4946 | 68.0196 | Step 2: highest LDL among remaining centroids | LDL-dominant; no HOMA2-B/C-peptide evidence |

The implementation's `lap_score` multiplies waist by triglycerides in mg/dL. Conventional female LAP formulas use triglycerides in mmol/L, so the additional column converts TG by 88.57. This constant conversion does not change which centroid ranks first, but the raw code value must be called a **LAP-style ranking score**, not a standard clinical LAP magnitude.

Only BMI and age directly overlap with the original Ahlqvist clustering variables. The original study also used age at diagnosis, HbA1c, GAD antibodies, HOMA2-B, and HOMA2-IR. DIANA's lipid/waist profiles therefore cannot be described as a replication. Safer primary names are **TG-waist dominant**, **LDL-dominant/atherogenic**, **obesity-dominant**, and **lower-metabolic-burden residual**, with Ahlqvist-inspired names in parentheses.

![Centroid naming waterfall](cluster_centroid_naming_waterfall.png)

## 5. Clustering validity and stability

| geometry | silhouette | davies_bouldin | calinski_harabasz |
|---|---|---|---|
| Unweighted standardized space (legacy report) | 0.1762 | 1.5950 | 154.3203 |
| Weighted fitted geometry (X * sqrt(weights)) | 0.2079 | 1.3834 | 187.4295 |

The active algorithm minimizes weighted squared distance, so weighted-space metrics are the geometry-matched validation figures. The legacy unweighted values may be retained only if explicitly labeled as a secondary standardized-space view.

Weighted-geometry sensitivity across candidate values of K:

| k | silhouette_weighted_geometry | davies_bouldin_weighted_geometry | calinski_harabasz_weighted_geometry | random_state | n_init |
|---|---|---|---|---|---|
| 2 | 0.2176 | 1.6605 | 209.0307 | 42 | 10 |
| 3 | 0.2068 | 1.5583 | 193.2081 | 42 | 10 |
| 4 | 0.2079 | 1.3834 | 187.4295 | 42 | 10 |
| 5 | 0.1761 | 1.4415 | 170.4236 | 42 | 10 |
| 6 | 0.1632 | 1.4960 | 155.5267 | 42 | 10 |

K=2 had the highest silhouette and Calinski-Harabasz scores, while K=4 had the lowest Davies-Bouldin index and retained the intended four-profile granularity. K=4 is therefore a documented design trade-off, not a uniquely proven optimum.

Across one-weight-at-a-time perturbations of +/-10% and +/-20% on all 734 records, minimum ARI was **0.9185** and minimum semantic agreement was **97.00%**. Across 30 initialization seeds, minimum ARI was **0.9536**. This supports initialization and local-weight robustness, not full sampling stability or external reproducibility.

![Full-cohort cluster stability](cluster_stability_full_734.png)

## 6. Why normal-glycemic records were excluded from subtyping

Fitting K=4 to all 1,376 records changed the operational-positive partition to ARI **0.685** relative to the operational-positive-only solution. Matched centroids shifted by **0.586 weighted SD units on average**, and one all-cohort cluster was **67.0% normal**. This is empirical ablation evidence that including normals consumes cluster capacity and materially changes the four operational-positive profiles. It does not prove that every centroid is “contaminated.”

![Normal-inclusion ablation](normal_inclusion_ablation.png)

## 7. Exploratory comparison with women reporting a period in the prior year

No-period-in-prior-year development cohort: 1376 eligible / 734 operational-label positive. Period-reported comparison cohort: 591 eligible / 231 operational-label positive.

| group | profile | count | percentage | bmi | triglycerides | ldl | hdl | age | waist_circumference |
|---|---|---|---|---|---|---|---|---|---|
| No period in prior year (development) | SIRD-like | 77 | 10.4905 | 32.2536 | 335.1558 | 109.5325 | 41.7273 | 54.5065 | 107.6584 |
| No period in prior year (development) | SIDD-like | 199 | 27.1117 | 29.0102 | 148.2563 | 166.1457 | 52.0050 | 54.9497 | 98.6357 |
| No period in prior year (development) | MOD-like | 226 | 30.7902 | 42.0464 | 119.6372 | 113.1327 | 51.9469 | 54.2699 | 123.5261 |
| No period in prior year (development) | MARD-like | 232 | 31.6076 | 28.2489 | 97.7802 | 102.5517 | 62.4009 | 55.4224 | 94.9819 |
| Menstruating comparison | SIRD-like | 17 | 7.3593 | 32.0765 | 324.2353 | 109.7059 | 38.8235 | 47.7059 | 102.5882 |
| Menstruating comparison | SIDD-like | 57 | 24.6753 | 29.0575 | 148.4386 | 166.3860 | 52.6842 | 49.3860 | 96.2649 |
| Menstruating comparison | MOD-like | 79 | 34.1991 | 43.5085 | 115.8861 | 111.5570 | 50.0000 | 48.7215 | 121.9494 |
| Menstruating comparison | MARD-like | 78 | 33.7662 | 28.3792 | 82.6795 | 102.8205 | 63.1923 | 49.2179 | 93.3500 |

The metabolic shapes are visually similar, while age shifts because the groups are not age matched. This is an internal exploratory comparison only; a defensible menopause-effect study would require age matching or adjustment, a prespecified hypothesis, and an independent cohort.

![Exploratory menstrual-status comparison](menstrual_status_profile_comparison.png)

## 8. Minimum manuscript corrections before submission

1. Correct Figure 3.1's final label split: DIQ010 + HbA1c override, not HbA1c + FBS.
2. Replace “postmenopausal cohort” with “no-period-in-prior-year operational development cohort,” and show the reproductive-reason audit unless a confirmed natural-menopause subgroup is used.
3. Replace any 94.1% “label validation” claim with the two-source audit and state that hybrid-versus-HbA1c agreement is circular by construction.
4. Replace Table 4.5 with the missing-aware IG table and define IG%, H(Y), H(Y|X), missingness, and exclusion reason.
5. Replace the 686-case clustering proof with the 734-case waterfall, validation, and stability evidence here.
6. State explicitly which steps were researcher choices and which step was unsupervised membership assignment.
7. Add the raw-cluster ID -> centroid calculation -> proxy label crosswalk.
8. Report LR's 6/6 cycle ranking and inner-only selection audit, but call the differences modest and the statistical comparison exploratory.
9. Reframe “MARD-like” as a residual lower-metabolic-burden proxy, “SIDD-like” as LDL-dominant rather than insulin-deficient, and MOD-like as obesity-dominant because BMI 42.05 is not mild obesity.
10. Rebuild Chapter 5 from the canonical Chapter 3-4 truth. Remove claims of diagnosis, personalized treatment, validated biological subtypes, clinical validity, or proven superiority.
11. Map each limitation to a specific next study: Philippine prospective validation/recalibration; corrected IG; externally nested model-family selection and OOF calibration; age-matched reproductive-status comparison; independent centroid replication with HOMA2/C-peptide/GAD markers; consensus/bootstrap clustering; K=2 versus K=4 sensitivity; and formal UAT/expert/accessibility/security/load testing.

## Ready-to-say defense answers

**How were the clusters made and labeled?**

> “The 734 operational-label-positive records were grouped automatically by Weighted K-Means using nearest-centroid distance in six standardized features. After those raw groups were fixed, we assigned human-readable proxy names through a deterministic centroid-level waterfall. So the membership was model-generated, while the names were researcher-defined. We now state that distinction directly.”

**Why Logistic Regression?**

> “We did not choose Logistic Regression because one sensitivity or F1 value looked better afterward. Under the implemented primary AUC rule, it ranked first in all six held-out NHANES cycles. An additional inner-development audit also selected it in all six folds before each outer test result was consulted. Its advantage was only about 0.02 AUC, so we call it the best-supported current choice because of consistent discrimination and coefficient-level interpretability, not a universally superior model.”

**Are the clusters specific to menopause?**

> “No. They are metabolic patterns observed within a development cohort defined by no reported period in the prior year, which included self-reported menopause/change of life, hysterectomy, and other reasons. An exploratory same-NHANES comparison found similar patterns among women who reported a period, so we cannot claim that menopause caused or uniquely defined the clusters. That requires a correctly phenotyped, age-matched external comparison.”

## Primary methodological references

- Ahlqvist et al. (2018), original adult-onset diabetes subgroup study: https://doi.org/10.1016/S2213-8587(18)30051-2
- Collins et al. (2024), TRIPOD+AI reporting guidance: https://doi.org/10.1136/bmj-2023-078378
