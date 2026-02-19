# Advanced Machine Learning Techniques in DIANA V2

This document details the advanced, defensively-engineered techniques implemented in `Ian_ML/training/train_v2.py`. These methods were chosen specifically to handle the constraints of small medical datasets and prioritize clinical utility (screening) over raw accuracy.

## 1. One-vs-Rest (OvR) ROC-AUC for Multi-Class Classification

**Technique:**
Standard ROC-AUC is designed for binary problems (Yes/No). To apply it to our 3-class problem (Normal, Pre-diabetic, Diabetic), we use the **One-vs-Rest (OvR)** strategy with **weighted averaging**.

**How it works:**
The model effectively trains three independent binary classifiers internally:
1.  **Diabetic** vs. [Normal + Pre-diabetic]
2.  **Pre-diabetic** vs. [Normal + Diabetic]
3.  **Normal** vs. [Pre-diabetic + Diabetic]

The final AUC is the weighted average of these three scores, weighted by the number of samples in each class. This provides a single robust metric for multi-class discrimination.

**Why it's clever:**
-   It allows us to use the industry-standard AUC metric even with complex multi-class outcomes.
-   Weighted averaging prevents the majority class (Normal) from dominating the score, ensuring the model is actually good at detecting the minority (Diabetic) class.

---

## 2. Leave-One-Group-Out (LOGO) Cross-Validation

**Technique:**
Instead of random `K-Fold` cross-validation, we use **Leave-One-Group-Out** validation where the "groups" are NHANES survey cycles (e.g., 2013-2014, 2015-2016).

**How it works:**
-   **Train:** On cycles 2013-2016
-   **Test:** On cycle 2017-2018 (completely unseen time period)

**Why it's clever:**
-   **Tests Temporal Generalization:** This mimics the real-world scenario of training a model on historical data and deploying it on *future* patients.
-   **Prevents Data Leakage:** Standard random splits might mix patients from the same "batch" or time period, inflating performance. LOGO guarantees the test set is analytically independent.
-   **Defensible:** This is the gold standard for proving a model will work on *new* populations.

---

## 3. Asymmetric Threshold Optimization for Screening

**Technique:**
Most models use a default threshold of 0.5 (or max probability) to classify. We implement a custom **Threshold Optimization** loop that specifically lowers the bar for "At-Risk" classes.

**How it works:**
The script tests hundreds of threshold combinations to maximize a custom `selection_score` focused purely on catch rate:
```python
score = (0.45 * Diabetic_Recall) + (0.35 * PreDiabetic_Recall) + (0.15 * Macro_F1) + (0.05 * Normal_Recall)
```

**Why it's clever:**
-   **Clinical Priority:** A false negative (missing a diabetic) is far worse than a false positive (flagging a healthy person).
-   **Screening Logic:** By intentionally accepting more false positives (lower Normal recall weight), we significantly boost sensitivity (recall) for the dangerous conditions.
-   **Runtime Optimization:** We optimize for recall/F1 because computing AUC inside a tight loop is compuationally expensive, keeping training fast.

---

## 4. Matched-Sensitivity Ablation (The "Fair Fight")

**Technique:**
To prove that our complex model (Random Forest) is better than a simple Logistic Regression, we compare them at **fixed sensitivity**.

**How it works:**
1.  We lock the Random Forest's sensitivity (e.g., 80%).
2.  We force the Logistic Regression to *also* have exactly 80% sensitivity by adjusting its threshold.
3.  We then compare their **Specificity** and **Net Benefit**.

**Why it's clever:**
-   **Honest Comparison:** A complex model might look better just because it has a different default threshold. Forcing them to have the same sensitivity isolates the true performance gain (specificity).
-   **Proof of Value:** If the Random Forest has higher specificity at the same sensitivity, it proves the complexity is actually reducing false alarms (cost), justifying its use over a simpler linear model.

---

## 5. Decision Curve Analysis (Net Benefit)

**Technique:**
We calculate **Net Benefit** across a range of probability thresholds.

**How it works:**
It quantifies the clinical value:
$$ \text{Net Benefit} = \frac{\text{True Positives}}{N} - \frac{\text{False Positives}}{N} \times \frac{p_t}{1-p_t} $$
where $p_t$ is the threshold probability (exchange rate between false positives and false negatives).

**Why it's clever:**
-   **Beyond Accuracy:** Highly accurate models can still be clinically useless if they have too many false alarms.
-   **Economic Justification:** This metric (originally from Vickers & Elkin) proves that using the model does more good than harm compared to "treating everyone" or "treating no one."

---

## 6. Model Calibration (Trustworthiness)

**Technique:**
We measure **Brier Score** and **Expected Calibration Error (ECE)** for each class.

**How it works:**
-   **Brier Score:** Mean Squared Error of the probabilities. (0 is perfect, 1 is terrible).
-   **ECE:** The average gap between confidence and accuracy (e.g., if the model says "70% risk" for 100 patients, ~70 of them should actually have diabetes).

**Why it's clever:**
-   **Real-World Safety:** A default Random Forest is often "over-confident" (predicting 99% when it should be 80%). Calibrated probabilities mean a doctor can trust the *percentage*, not just the label.
-   **Diagnostic Reliability:** This metric proves the model understands its own uncertainty.
