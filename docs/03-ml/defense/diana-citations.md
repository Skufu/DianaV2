# DIANA ML Authoritative Citations

This document serves as a centralized appendix of authoritative external sources used to defend the Diana ML methodology. Each citation includes a URL and a "Panel-Facing Takeaway" designed for clinical/technical defense scenarios.

## 1. Pipeline Parity & Consistency
**Source:** [Scikit-learn Pipelines: Chaining estimators](https://scikit-learn.org/stable/modules/compose.html#pipeline) (Official Documentation)
- **Relevance:** Defends the use of `sklearn.pipeline.Pipeline` to ensure preprocessing (scaling, imputation) is identically applied during both training and real-time inference.
- **Panel-Facing Takeaway:** "By using standardized scikit-learn pipelines, Diana eliminates 'training-serving skew'—a common failure mode in medical AI. This architecture guarantees that the risk assessment a clinician sees is generated using the exact same transformations validated during the research phase."

## 2. SHAP & Feature Interpretation
**Source:** [Lundberg, S. M., & Lee, S. I. (2017). A Unified Approach to Interpreting Model Predictions.](https://proceedings.neurips.cc/paper/2017/hash/8a20a862115ef7d44bc5290ed57d2d1d-Abstract.html) (Original SHAP Paper)
- **Relevance:** Provides the mathematical foundation (Shapley values) for the explainability layer used in Diana's clinical dashboard.
- **Panel-Facing Takeaway:** "Diana utilizes SHAP values, which are mathematically grounded in cooperative game theory. Unlike 'black-box' heuristics, SHAP provides the only consistent and locally accurate method to attribute a patient's risk score to specific biomarkers (e.g., HbA1c vs. BMI), aligning ML logic with clinical intuition."

## 3. Handling Missing Data (MICE)
**Source:** [Scikit-learn: Imputation of missing values (IterativeImputer)](https://scikit-learn.org/stable/modules/impute.html#iterative-imputer) (Official Documentation)
- **Relevance:** Validates the use of Multivariate Imputation by Chained Equations (MICE) for handling missing metabolic data in NHANES datasets.
- **Panel-Facing Takeaway:** "Instead of simple mean-filling which distorts clinical distributions, Diana employs IterativeImputer (MICE). This approach models each missing biomarker as a function of others, preserving the physiological correlations necessary for accurate risk clustering in menopausal populations."

## 4. Robust Performance Estimation (Nested CV)
**Source:** [Vabalas, A., et al. (2019). Machine learning algorithm validation with a limited sample size.](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0224365) (Peer-reviewed Study)
- **Relevance:** Defends the use of Nested Cross-Validation to prevent optimistic bias in performance metrics (AUC/Accuracy) when working with smaller clinical subsets.
- **Panel-Facing Takeaway:** "To ensure our reported 84%+ AUC is not a result of 'lucky' data splits, Diana uses Nested Cross-Validation. This gold-standard approach separates hyperparameter tuning from performance evaluation, providing a truly unbiased estimate of how the model will perform on new, unseen patients."

## 5. Clustering Stability
**Source:** [Rousseeuw, P. J. (1987). Silhouettes: a graphical aid to the interpretation and validation of cluster analysis.](https://www.sciencedirect.com/science/article/pii/0377221787901257) (Silhouette Analysis Foundation)
- **Relevance:** Validates the Silhouette Coefficient as the primary metric for the 'K-Means' metabolic sub-typing in Diana.
- **Panel-Facing Takeaway:** "Diana’s metabolic subgroups are validated using Silhouette analysis. This ensures that the identified 'High Risk' and 'Stable' clusters are not arbitrary, but represent statistically distinct physiological profiles with high intra-cluster cohesion and inter-cluster separation."

## 6. Clinical Safety & Bias Mitigation
**Source:** [WHO Guidance on Ethics and Governance of Artificial Intelligence for Health](https://www.who.int/publications/i/item/9789240029200) (Global Standard)
- **Relevance:** Aligns Diana's "screening, not diagnosis" positioning with global medical AI ethics.
- **Panel-Facing Takeaway:** "Diana's development adheres to WHO guidelines for AI transparency. By explicitly labeling the system as a screening tool and including a 'Doctor Validation' loop, we mitigate the risk of over-reliance and ensure the final clinical judgment remains with the human practitioner."
