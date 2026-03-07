# DIANA — TODO List

## 📦 Archive Stale Models
```bash
cd ~/workspace/github.com/Skufu/DianaV2
mv models/clinical models/archived/clinical
mv models/clinical_3class models/archived/clinical_3class
mv models/binary_v2_with_bp models/archived/binary_v2_with_bp
```

## 🧹 Model Cleanup (Doctor Panel)
- [ ] Audit the frontend doctor panel to remove/disable the ability to select stale models (`clinical`, `clinical_3class`, `binary_v2_with_bp`)
- [ ] Only `binary_v2_no_bp` (Logistic Regression) should be selectable
- [ ] Check if the backend API still references archived model paths — update accordingly
- [ ] Rename `binary_v2_no_bp` to something clearer in the UI (e.g., "DIANA Screening Model v2")

## 📊 Manuscript Remaining Items
- [ ] **Descriptive statistics table (Section 4.1)** — Still has representative values; run the training pipeline to get actual Mean±SD for all 9 features
- [ ] **Generate ROC Curve figure** — ROC curve with AUC = 0.7267 annotated and optimal threshold point marked
- [ ] **Generate SHAP plots** — Global feature importance bar plot + example waterfall plot
- [ ] **Generate Elbow/Silhouette plots** — Dual-panel figure for cluster validation
- [ ] **Capture web app screenshots** — Dashboard, input form, prediction result, analytics, patient history
- [ ] **Verify Section 5.3 comparison table** — Cross-check AUC values from Campugan & Aguaras, Zou et al., Hossain et al. against actual papers
- [ ] **Number all tables and figures** — Replace all `Table X` and `Figure X` with sequential numbers
