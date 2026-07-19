# ⚠️ ARCHIVED — Unvalidated Fraud Detection Service

**Status:** NOT VALIDATED — Do not deploy.

This LightGBM/IEEE-CIS fraud service was not validated and was never in the deployment path. It is retained here for future reference only.

## Why It Was Archived

1. **No documented train/test split** — No training script exists in the repository. The model was trained externally in Google Colab with no reproducibility artifacts.
2. **No leakage audit** — Without the training notebook, it is impossible to verify whether any engineered features encode the fraud label.
3. **No evaluation metrics** — No confusion matrix, ROC-AUC, precision/recall curves, or held-out evaluation results are documented anywhere.
4. **Suspicious 2-tree model export** — The model file contains only 2 trees despite `num_iterations: 500` being configured. This may indicate interruption, corruption, or extreme early stopping.
5. **Domain mismatch** — Trained on IEEE-CIS (US/Vesta payment processor card transactions). SahayCredit targets Indian thin-file borrowers using UPI. The feature domains do not overlap.

## The Active Fraud Detection System

The active, validated fraud detection system is:

**`backend/fraud.js`** — Rule-based, PaySim-calibrated, 9 detection rules with honest `dataSource: "real" | "simulated"` tagging. Runs natively in the Node.js process, requires zero additional dependencies.

## If You Want to Revive This

To properly validate a fraud ML model for SahayCredit, you would need:
- A domain-relevant dataset (Indian UPI/mobile-money fraud patterns)
- A documented 70/15/15 stratified train/val/test split
- Leakage audit of all engineered features
- Calibration against the actual deployment fraud base rate
- Evaluation metrics on a held-out test set (ROC-AUC, precision/recall, confusion matrix)
- The same validation rigor applied to the core XGBoost and behaviour models in this project
