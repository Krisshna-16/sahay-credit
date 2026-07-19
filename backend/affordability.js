/**
 * SahayCredit — Affordability Engine (Phase 4, Module 2)
 * =======================================================
 *
 * HOW THIS WORKS (plain language, suitable for demo explanation):
 * ---------------------------------------------------------------
 * This module computes a borrower's debt-servicing capacity using the RBI's
 * FOIR (Fixed Obligation to Income Ratio) methodology. It answers the
 * critical question: "Even if this person has a good credit score, can they
 * actually repay ₹X per month?"
 *
 * Steps:
 * 1. Get monthly income from the Transaction Categorizer's salary category
 *    (or fallback to the Behaviour Model's monthly_income estimate)
 * 2. Get existing obligations from EMI, rent, and insurance categories
 * 3. Compute FOIR = existingObligations / monthlyIncome
 * 4. Compute maximum affordable EMI = (income × FOIR_CAP) - obligations
 * 5. Back-calculate maximum loan amount from affordable EMI
 *
 * FOIR caps (RBI norms):
 *   - Salaried: 50% (stable income, lower cap)
 *   - MSME/Self-employed: 65% (variable income, higher cap for business cash flows)
 *
 * CONSENT REQUIREMENT: Reuses 'behaviour' consent since it operates on
 * the same AA transaction data (via Transaction Categorizer).
 */

const { hasActiveConsent, logDataFetch } = require('./consent');

// ── FOIR Caps (RBI norms) ──────────────────────────────────────────────────

const FOIR_CAPS = {
  salaried: 0.50,   // 50% for salaried individuals
  msme: 0.65         // 65% for MSME / self-employed
};

// ── EMI Calculation ────────────────────────────────────────────────────────

/**
 * Calculate monthly EMI using the standard reducing-balance formula.
 *
 * EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 *
 * @param {number} principal - Loan amount
 * @param {number} annualRate - Annual interest rate (e.g., 14 for 14%)
 * @param {number} tenureMonths - Loan tenure in months
 * @returns {number} Monthly EMI amount
 */
function calculateEMI(principal, annualRate, tenureMonths) {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualRate <= 0) return Math.round(principal / tenureMonths);

  const monthlyRate = annualRate / 12 / 100;
  const compoundFactor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = principal * monthlyRate * compoundFactor / (compoundFactor - 1);
  return Math.round(emi);
}


/**
 * Back-calculate the maximum loan principal from a given EMI budget.
 *
 * P = EMI × ((1+r)^n - 1) / (r × (1+r)^n)
 *
 * @param {number} maxEMI - Maximum affordable monthly EMI
 * @param {number} annualRate - Annual interest rate (e.g., 14 for 14%)
 * @param {number} tenureMonths - Loan tenure in months
 * @returns {number} Maximum loan principal
 */
function maxLoanFromEMI(maxEMI, annualRate, tenureMonths) {
  if (maxEMI <= 0 || tenureMonths <= 0) return 0;
  if (annualRate <= 0) return maxEMI * tenureMonths;

  const monthlyRate = annualRate / 12 / 100;
  const compoundFactor = Math.pow(1 + monthlyRate, tenureMonths);
  const principal = maxEMI * (compoundFactor - 1) / (monthlyRate * compoundFactor);
  return Math.round(principal);
}


// ── Main Affordability Computation ─────────────────────────────────────────

/**
 * Compute affordability assessment for a borrower.
 *
 * @param {string} borrowerId - Unique borrower ID
 * @param {Object} options - Input options:
 *   {
 *     categorizedData: Object,   // Output from transactionCategorizer.categorizeTransactions()
 *     behaviourIncome: number,   // Fallback monthly income from behaviour model (optional)
 *     isMSME: boolean,          // Whether borrower is MSME/self-employed
 *     requestedAmount: number,  // Loan amount being requested (optional)
 *     interestRate: number,     // Annual interest rate (e.g., 14)
 *     tenureMonths: number      // Requested tenure in months (default: 36)
 *   }
 * @returns {Object|null} Affordability assessment, or null if consent not granted
 */
function computeAffordability(borrowerId, options = {}) {
  // ── Consent gate ──
  if (!hasActiveConsent(borrowerId, 'behaviour')) {
    return null;
  }

  logDataFetch(borrowerId, 'affordability');

  const {
    categorizedData,
    behaviourIncome,
    isMSME = false,
    interestRate = 14,
    tenureMonths = 36
  } = options;

  // ── Step 1: Determine monthly income ──
  let monthlyIncome = 0;
  let incomeSource = 'unknown';

  if (categorizedData && categorizedData.spendingProfile) {
    const salaryData = categorizedData.categories && categorizedData.categories.salary;
    if (salaryData && salaryData.avgPerMonth > 0) {
      monthlyIncome = salaryData.avgPerMonth;
      incomeSource = 'transaction_categorizer';
    } else if (categorizedData.spendingProfile.totalIncome > 0 && categorizedData.monthsCovered > 0) {
      monthlyIncome = Math.round(categorizedData.spendingProfile.totalIncome / categorizedData.monthsCovered);
      incomeSource = 'transaction_categorizer_total';
    }
  }

  // Fallback to behaviour model income
  if (monthlyIncome <= 0 && behaviourIncome > 0) {
    monthlyIncome = behaviourIncome;
    incomeSource = 'behaviour_model';
  }

  // Final fallback — cannot compute affordability without income
  if (monthlyIncome <= 0) {
    return {
      monthlyIncome: 0,
      existingObligations: 0,
      foir: 0,
      foirCap: FOIR_CAPS[isMSME ? 'msme' : 'salaried'],
      headroom: 0,
      maxAffordableLoan: null,
      incomeSource: 'none',
      affordable: false,
      affordabilityVerdict: {
        en: 'Unable to assess affordability — no income data available',
        hi: 'वहनीयता का आकलन नहीं हो सका — आय डेटा उपलब्ध नहीं है'
      }
    };
  }

  // ── Step 2: Calculate existing obligations ──
  let existingObligations = 0;

  if (categorizedData && categorizedData.categories) {
    const cats = categorizedData.categories;

    // EMI / loan repayments
    if (cats.emi_repayment) {
      existingObligations += cats.emi_repayment.avgPerMonth || 0;
    }

    // Rent
    if (cats.rent) {
      existingObligations += cats.rent.avgPerMonth || 0;
    }

    // Insurance premiums (fixed monthly commitment)
    if (cats.insurance) {
      existingObligations += cats.insurance.avgPerMonth || 0;
    }
  }

  // ── Step 3: Compute FOIR ──
  const foirCap = FOIR_CAPS[isMSME ? 'msme' : 'salaried'];
  const foir = monthlyIncome > 0 ? existingObligations / monthlyIncome : 0;

  // ── Step 4: Maximum affordable EMI ──
  const maxTotalObligations = Math.round(monthlyIncome * foirCap);
  const headroom = Math.max(0, maxTotalObligations - existingObligations);

  // ── Step 5: Back-calculate max affordable loan ──
  const maxAffordableLoanAmount = maxLoanFromEMI(headroom, interestRate, tenureMonths);
  const maxAffordableEMI = headroom;

  // ── Step 6: Check if requested amount is affordable ──
  let requestedEMI = 0;
  let requestedAffordable = true;
  if (options.requestedAmount && options.requestedAmount > 0) {
    requestedEMI = calculateEMI(options.requestedAmount, interestRate, tenureMonths);
    requestedAffordable = requestedEMI <= headroom;
  }

  // ── Step 7: Build verdict ──
  const foirPct = Math.round(foir * 100);
  const foirCapPct = Math.round(foirCap * 100);
  const headroomFormatted = headroom.toLocaleString('en-IN');

  let verdictEn, verdictHi;
  if (headroom <= 0) {
    verdictEn = `Current obligations (${foirPct}% FOIR) already exceed the ${foirCapPct}% cap. No additional EMI capacity.`;
    verdictHi = `वर्तमान दायित्व (${foirPct}% FOIR) पहले से ही ${foirCapPct}% सीमा से अधिक हैं। अतिरिक्त ईएमआई क्षमता नहीं है।`;
  } else if (headroom < 2000) {
    verdictEn = `Limited EMI capacity: ₹${headroomFormatted}/month headroom after existing obligations.`;
    verdictHi = `सीमित ईएमआई क्षमता: मौजूदा दायित्वों के बाद ₹${headroomFormatted}/माह शेष।`;
  } else {
    verdictEn = `Can comfortably service ₹${headroomFormatted}/month additional EMI (FOIR: ${foirPct}% of ${foirCapPct}% cap).`;
    verdictHi = `₹${headroomFormatted}/माह अतिरिक्त ईएमआई आराम से चुका सकते हैं (FOIR: ${foirPct}%/${foirCapPct}% सीमा)।`;
  }

  return {
    monthlyIncome: Math.round(monthlyIncome),
    existingObligations: Math.round(existingObligations),
    foir: parseFloat(foir.toFixed(3)),
    foirCap,
    headroom,
    maxAffordableLoan: {
      amount: maxAffordableLoanAmount,
      tenure: tenureMonths,
      rate: interestRate,
      emi: maxAffordableEMI
    },
    requestedAmount: options.requestedAmount || null,
    requestedEMI: requestedEMI || null,
    requestedAffordable,
    incomeSource,
    affordable: headroom > 0,
    affordabilityVerdict: {
      en: verdictEn,
      hi: verdictHi
    }
  };
}


module.exports = {
  computeAffordability,
  calculateEMI,
  maxLoanFromEMI,
  FOIR_CAPS
};
