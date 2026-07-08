# ⚡ SahayCredit — Alternate Credit Scoring for India's Unbanked

> **Empowering 1.3 billion Indians who deserve access to credit.**  
> An AI-powered alternate credit scoring platform for thin-file borrowers — MSMEs, gig workers, rural entrepreneurs — who are invisible to traditional CIBIL scoring.

---

## 🌟 What Is SahayCredit?

SahayCredit is a full-stack fintech platform that scores creditworthiness using **non-traditional signals** — UPI payment patterns, mobile bill regularity, geolocation stability, psychometric data, e-commerce behaviour, and GST ratings — instead of relying on credit history that most Indians don't have.

Built for the **RBI Account Aggregator (AA) ecosystem**, it runs a **Gradient Boosting ML model** trained entirely in the browser using Python (Pyodide + scikit-learn), with full explainability via SHAP scores and end-to-end privacy via federated learning principles.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SahayCredit Platform                     │
├─────────────────┬───────────────────┬──────────────────────────┤
│  Borrower App   │  Lender Dashboard │  ML Pipeline             │
│  (index.html)   │  (lender.html)    │  (ml_pipeline.html)      │
├─────────────────┼───────────────────┼──────────────────────────┤
│ • Onboarding    │ • Real-time       │ • In-browser Python      │
│ • AA Consent    │   analytics       │   (Pyodide/WASM)         │
│ • Score display │ • Audit log       │ • GBR training           │
│ • Loan offers   │ • API docs        │ • JS inference engine    │
│ • EMI planner   │ • SHAP factors    │ • Model export/deploy    │
│ • Document vault│ • Regulator panel │                          │
└─────────────────┴───────────────────┴──────────────────────────┘
                             │
                    Node.js + Express
                    (backend/server.js)
                             │
                    REST API Endpoints
              /api/score  /api/audit  /api/consent
```

---

## 🚀 Features

### 👤 Borrower App (`index.html`)
- **Onboarding Flow** — WhatsApp-style consent UI with RBI AA integration
- **Live Credit Score** — Animated score dial (300–900) with SHAP factor breakdown
- **Loan Offer Comparison** — 4 NBFC cards (FinServe, GrowCapital, BharatLend, QuickMudra) with EMI auto-calculation and Best Match badge
- **EMI Planner** — Slider-based loan calculator with amortization table, donut chart, affordability indicator
- **Document Vault** — AES-256-GCM encrypted storage, "Share with Lender" toggles, profile completeness bar
- **Federated Learning Visualizer** — Animated diagram showing how raw data never leaves the phone
- **Multi-language** — Hindi / English toggle

### 🏦 Lender Dashboard (`lender.html`)
- **Real-time Analytics** — Score distribution bar chart, signal radar chart, approval rate trend, time-to-score gauge (all Canvas-rendered)
- **Regulator Audit Panel** — Full decision log with SHAP factors, model version, timestamp, export CSV
- **API Documentation** — Live "Try it" panel (POST /score, GET /audit, DELETE /consent) with mock responses
- **Compliance Summary** — RBI AA consent 100%, auditability 100%, explainability score

### 🗺️ Credit Gap Map (`map.html`)
- **India Choropleth** — 28 states color-coded by credit exclusion severity
- **Click-to-explore** — State panel with MSME credit gap, SahayCredit users, rejection reasons
- **Live Ticker** — "Every 4 seconds, one Indian is rejected for a loan due to no CIBIL score"
- **Coverage Toggle** — Overlays active NBFC partner states

### 🧠 ML Training Pipeline (`ml_pipeline.html`)
- **Step 1: Train** — Python (scikit-learn GradientBoostingRegressor) runs in-browser via Pyodide/WASM; warm-start incremental training with live terminal progress
- **Step 2: Test** — 6-slider real-time inference using a pure JavaScript tree-traversal engine
- **Step 3: Export** — Download `sahay_credit_model.json` (Blob download, ~150KB)
- **Step 4: Deploy** — Step-by-step GitHub Pages deployment guide with auto-URL generator

---

## 🤖 ML Model Details

| Property | Value |
|---|---|
| Algorithm | `GradientBoostingRegressor` (scikit-learn) |
| Trees | 100 |
| Max depth | 4 |
| Learning rate | 0.1 |
| Training data | 5,000 synthetic borrower records |
| Train/test split | 80/20 |
| R² score | ~0.992 |
| Score range | 300–900 |
| Input features | 6 (see below) |
| Model format | Portable JSON (~150KB) |
| Runtime | Pure JavaScript tree traversal — no Python at inference time |

### Input Signals

| # | Signal | Range | Weight |
|---|---|---|---|
| 1 | Mobile Payments (months on-time) | 0–12 | High |
| 2 | UPI Monthly Average (₹) | 0–1,00,000 | High |
| 3 | Geo Stability (location consistency) | 0–2 | Medium |
| 4 | E-Commerce Score | 0.00–1.00 | Medium |
| 5 | Psychometric Score | 0.00–1.00 | Medium |
| 6 | GST Rating | 1.0–5.0 | Medium |

---

## 🔒 Privacy & Compliance

- **Federated Learning** — Gradients only (~48KB per round), raw data never transmitted
- **AES-256-GCM** — All documents encrypted at rest in Document Vault
- **RBI Account Aggregator** — Full AA consent flow, revocable at any time
- **SHAP Explainability** — Every credit decision shows top-3 contributing factors
- **Audit Trail** — Immutable timestamped log with model version, latency, SHAP factors
- **Right to Delete** — "Delete All My Data" button with full data purge

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5 + CSS3 + JavaScript (ES2022) |
| ML Training | Python 3.11 via Pyodide 0.25.0 (WebAssembly) |
| ML Inference | JavaScript gradient boosting tree traversal |
| Charts | HTML5 Canvas (custom, no dependencies) |
| Map | SVG-based India choropleth |
| Animations | CSS keyframes + requestAnimationFrame |
| Backend | Node.js + Express.js |
| API | REST JSON (mocked for demo) |
| Fonts | Google Fonts — Outfit + JetBrains Mono |

---

## 📁 Project Structure

```
sahay/
├── frontend/
│   ├── index.html          # Borrower app (onboarding → score → loans → vault)
│   ├── lender.html         # Lender dashboard (analytics, audit, API docs)
│   ├── map.html            # Credit gap choropleth map of India
│   ├── ml_pipeline.html    # 4-step ML training + deployment pipeline
│   ├── demo.html           # Kirana store borrower demo
│   ├── pitch.html          # Investor pitch deck
│   ├── app.js              # Borrower app logic (~120KB)
│   ├── lender.js           # Lender dashboard logic (~65KB)
│   ├── demo.js             # Demo screen logic
│   └── style.css           # Global design system (~87KB)
├── backend/
│   └── server.js           # Express server with mock API
├── package.json
└── README.md
```

---

## 🏃 Running Locally

### Prerequisites
- Node.js 16+ installed

### Setup

```bash
# Clone the repo
git clone https://github.com/Krisshna-16/sahay-credit.git
cd sahay-credit

# Install dependencies
npm install

# Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

### Pages

| URL | Description |
|---|---|
| `http://localhost:3000` | Borrower App |
| `http://localhost:3000/lender.html` | Lender Dashboard |
| `http://localhost:3000/map.html` | Credit Gap Map |
| `http://localhost:3000/ml_pipeline.html` | ML Training Pipeline |
| `http://localhost:3000/demo.html` | Kirana Store Demo |
| `http://localhost:3000/pitch.html` | Pitch Deck |

---

## 🔌 API Reference

The backend exposes a mock REST API for NBFC/lender integration:

### `POST /api/v1/score` — Score a Borrower

```json
// Request
{
  "borrower_id": "B-10234",
  "signals": {
    "mobile_payments": 11,
    "upi_monthly_avg": 42000,
    "geo_stability": "high",
    "ecommerce_score": 0.72,
    "psychometric_score": 0.81,
    "gst_rating": 4.2
  }
}

// Response
{
  "score": 718,
  "confidence_band": [703, 733],
  "eligible": true,
  "suggested_rate": 14.0,
  "shap_factors": [
    {"feature": "mobile_payments", "impact": +62},
    {"feature": "geo_stability",   "impact": +48},
    {"feature": "upi_monthly_avg", "impact": +21}
  ],
  "model_version": "xgb-v2.3.1",
  "latency_ms": 312
}
```

### `GET /api/v1/audit/{borrower_id}` — Get Audit Trail  
### `DELETE /api/v1/consent/{borrower_id}` — Revoke AA Consent

---

## 🧪 ML Pipeline Walkthrough

1. Open **http://localhost:3000/ml_pipeline.html**
2. Click **▶ Start Training** — Pyodide loads (~30s on first run)
3. Watch live terminal as 100 trees train in 10-tree batches
4. In Step 2, drag sliders to predict scores in real time
5. In Step 3, download `sahay_credit_model.json`
6. In Step 4, follow GitHub Pages deployment guide

The JS inference engine (`predictScore`) traverses the exported tree structure in pure JavaScript — **no Python, no server needed at inference time**.

---

## 🎯 Problem Statement

> **190 million Indians** are "thin-file" borrowers — they have no CIBIL score because they've never taken a formal loan. MSMEs, gig workers, kirana stores, and rural entrepreneurs are systematically excluded from formal credit.

SahayCredit uses **6 alternate data signals** already present on any smartphone to build a credible credit profile — without requiring bank statements, salary slips, or prior credit history.

**Every 4 seconds**, one Indian is rejected for a loan due to no CIBIL score.  
SahayCredit is the platform that changes that.

---

## 👨‍💻 Built By

**Krishna Singh Chauhan**  
B.Tech CSE | Fintech + AI

- 🔗 GitHub: [@Krisshna-16](https://github.com/Krisshna-16)
- Built for: National FinTech Project Challenge (NFPC) / Hackathon submission

---

## 📄 License

MIT License — open source, free to use and modify.

---

<p align="center">
  <strong>⚡ SahayCredit — Credit for Every Indian</strong><br>
  <em>Because financial inclusion isn't a luxury — it's a right.</em>
</p>
