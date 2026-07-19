/**
 * SahayCredit — Loan Recommendation Engine (Phase 4, Module 4)
 * ==============================================================
 *
 * HOW THIS WORKS (plain language, suitable for demo explanation):
 * ---------------------------------------------------------------
 * This module produces affordability-aware loan recommendations. Unlike the
 * existing static score-tier-to-limit mapping (scoring.js L586-588), this
 * engine considers BOTH the credit score tier AND the borrower's actual
 * repayment capacity (from the Affordability Engine).
 *
 * The logic is conservative by design: the recommended amount is always
 * min(scoreTierLimit, affordableLimit). This prevents a scenario where a
 * borrower with a 750 score is offered ₹3.5L when their monthly budget
 * only supports ₹1.5L.
 *
 * For each eligible borrower, it generates multiple product options with
 * different tenure/amount combinations so the borrower can choose what
 * fits their budget.
 *
 * The existing scoring.js tier mapping is NOT modified — this module provides
 * an enriched recommendation layer on top.
 */

const { calculateEMI, FOIR_CAPS } = require('./affordability');

// ── Product Configuration ──────────────────────────────────────────────────
// These mirror the existing tier mapping in scoring.js but add more detail.

const TIER_CONFIG = {
  'A+': {
    maxLimit: 350000,
    rateRange: { min: 11, max: 13 },
    defaultRate: 12,
    partner: 'FinServe NBFC',
    tenureOptions: [12, 24, 36, 48, 60],
    minIncome: 15000
  },
  'A': {
    maxLimit: 200000,
    rateRange: { min: 13, max: 15 },
    defaultRate: 14,
    partner: 'FinServe NBFC',
    tenureOptions: [12, 24, 36, 48],
    minIncome: 12000
  },
  'B+': {
    maxLimit: 120000,
    rateRange: { min: 15, max: 17 },
    defaultRate: 16,
    partner: 'GrowCapital',
    tenureOptions: [12, 24, 36],
    minIncome: 10000
  },
  'B': {
    maxLimit: 60000,
    rateRange: { min: 17, max: 19 },
    defaultRate: 18,
    partner: 'GrowCapital',
    tenureOptions: [12, 24],
    minIncome: 8000
  },
  'C': {
    maxLimit: 0,
    rateRange: { min: 20, max: 24 },
    defaultRate: 22,
    partner: null,
    tenureOptions: [],
    minIncome: 0
  }
};


// ── Tier Resolution ────────────────────────────────────────────────────────

/**
 * Resolve risk tier from credit score (mirrors scoring.js getRiskCategory).
 */
function getTier(score) {
  if (score >= 750) return 'A+';
  if (score >= 700) return 'A';
  if (score >= 650) return 'B+';
  if (score >= 600) return 'B';
  return 'C';
}


// ── EMI Formatting ─────────────────────────────────────────────────────────

function formatCurrency(amount) {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}


// ── Recommendation Generator ───────────────────────────────────────────────

/**
 * Generate loan product options for a given amount and tier.
 *
 * @param {number} amount - Loan amount
 * @param {Object} tierConfig - Tier configuration
 * @param {number} headroom - Max affordable EMI per month
 * @param {number} monthlyIncome - Borrower's monthly income
 * @param {number} existingObligations - Existing monthly obligations
 * @param {boolean} isMSME - Whether borrower is MSME
 * @returns {Array} Product options
 */
function generateOptions(amount, tierConfig, headroom, monthlyIncome, existingObligations, isMSME) {
  const options = [];
  const foirCap = FOIR_CAPS[isMSME ? 'msme' : 'salaried'];
  const rate = tierConfig.defaultRate;

  for (const tenure of tierConfig.tenureOptions) {
    const emi = calculateEMI(amount, rate, tenure);

    // Check if this option fits within FOIR
    const totalObligationsAfter = existingObligations + emi;
    const foirAfter = monthlyIncome > 0 ? totalObligationsAfter / monthlyIncome : 1;
    const fitsInBudget = emi <= headroom;

    const totalInterest = (emi * tenure) - amount;

    let verdictEn, verdictHi;
    if (fitsInBudget && foirAfter <= foirCap * 0.8) {
      verdictEn = 'Best fit — comfortably within budget';
      verdictHi = 'सर्वोत्तम — बजट में आराम से फिट';
    } else if (fitsInBudget && foirAfter <= foirCap) {
      verdictEn = 'Affordable — near the upper limit of budget';
      verdictHi = 'वहनीय — बजट की ऊपरी सीमा के पास';
    } else {
      verdictEn = 'Exceeds comfortable budget — consider lower amount';
      verdictHi = 'आरामदायक बजट से अधिक — कम राशि पर विचार करें';
    }

    options.push({
      product: 'Personal Loan',
      amount: Math.round(amount),
      tenure,
      rate,
      emi,
      totalInterest: Math.round(totalInterest),
      totalPayable: Math.round(emi * tenure),
      partner: tierConfig.partner,
      foirAfterLoan: parseFloat(foirAfter.toFixed(3)),
      fitsInBudget,
      verdict: { en: verdictEn, hi: verdictHi }
    });
  }

  return options;
}


// ── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Compute loan recommendations for a borrower.
 *
 * @param {Object} options - Input:
 *   {
 *     creditScore: number,        // Composite credit score (300-900)
 *     affordabilityData: Object,  // Output from affordability engine
 *     isMSME: boolean,           // Whether borrower is MSME
 *     requestedAmount: number,   // Optional: specific amount requested
 *     requestedTenure: number,   // Optional: specific tenure requested
 *   }
 * @returns {Object} Loan recommendation result
 */
function computeLoanRecommendation(options = {}) {
  const {
    creditScore = 0,
    affordabilityData,
    isMSME = false,
    requestedAmount,
    requestedTenure
  } = options;

  // ── Step 1: Resolve tier ──
  const tier = getTier(creditScore);
  const tierConfig = TIER_CONFIG[tier];

  // ── Step 2: Check basic eligibility ──
  if (creditScore < 600 || tierConfig.maxLimit === 0) {
    return {
      eligible: false,
      creditScore,
      tier,
      scoreTierLimit: 0,
      affordableLimit: 0,
      recommendedLimit: 0,
      recommendations: [],
      explanation: {
        en: `Credit score ${creditScore} is below the 600-point eligibility threshold. Focus on building credit history through timely payments.`,
        hi: `क्रेडिट स्कोर ${creditScore} 600 अंक की पात्रता सीमा से नीचे है। समय पर भुगतान के माध्यम से क्रेडिट इतिहास बनाने पर ध्यान दें।`
      }
    };
  }

  // ── Step 3: Determine limits ──
  const scoreTierLimit = tierConfig.maxLimit;

  let affordableLimit = scoreTierLimit; // Default to tier limit if no affordability data
  let monthlyIncome = 0;
  let existingObligations = 0;
  let headroom = Infinity;
  let hasAffordabilityData = false;

  if (affordabilityData && affordabilityData.affordable !== undefined) {
    hasAffordabilityData = true;
    monthlyIncome = affordabilityData.monthlyIncome || 0;
    existingObligations = affordabilityData.existingObligations || 0;
    headroom = affordabilityData.headroom || 0;

    if (affordabilityData.maxAffordableLoan && affordabilityData.maxAffordableLoan.amount > 0) {
      affordableLimit = affordabilityData.maxAffordableLoan.amount;
    } else if (!affordabilityData.affordable) {
      affordableLimit = 0;
    }
  }

  // ── Step 4: Conservative recommendation ──
  // Always take the LOWER of score tier and affordability
  const recommendedLimit = Math.min(scoreTierLimit, affordableLimit);

  if (recommendedLimit <= 0) {
    return {
      eligible: true, // Score-eligible but affordability-constrained
      creditScore,
      tier,
      scoreTierLimit,
      affordableLimit: 0,
      recommendedLimit: 0,
      recommendations: [],
      explanation: {
        en: `Your score qualifies for ${formatCurrency(scoreTierLimit)}, but current obligations leave no room for additional EMI. Reduce existing debts first.`,
        hi: `आपका स्कोर ${formatCurrency(scoreTierLimit)} के लिए योग्य है, लेकिन वर्तमान दायित्व अतिरिक्त ईएमआई की गुंजाइश नहीं छोड़ते। पहले मौजूदा ऋण कम करें।`
      }
    };
  }

  // ── Step 5: Generate product options ──
  // Option A: Full recommended amount
  const fullOptions = generateOptions(
    recommendedLimit, tierConfig, headroom, monthlyIncome, existingObligations, isMSME
  );

  // Option B: 75% of recommended (lighter commitment)
  const reducedAmount = Math.round(recommendedLimit * 0.75);
  const reducedOptions = generateOptions(
    reducedAmount, tierConfig, headroom, monthlyIncome, existingObligations, isMSME
  );

  // Merge and sort: best-fit first (fits in budget + longest tenure = lowest EMI)
  const allOptions = [...fullOptions, ...reducedOptions]
    .filter(opt => opt.fitsInBudget)
    .sort((a, b) => {
      // Prioritize: fits in budget, then lower FOIR, then lower EMI
      if (a.fitsInBudget !== b.fitsInBudget) return b.fitsInBudget - a.fitsInBudget;
      return a.foirAfterLoan - b.foirAfterLoan;
    });

  // Take top 3 distinct options
  const seen = new Set();
  const recommendations = [];
  for (const opt of allOptions) {
    const key = `${opt.amount}-${opt.tenure}`;
    if (!seen.has(key) && recommendations.length < 3) {
      seen.add(key);
      recommendations.push(opt);
    }
  }

  // If no options fit the budget, show the lowest-EMI option with a warning
  if (recommendations.length === 0 && fullOptions.length > 0) {
    const lowestEMI = fullOptions.sort((a, b) => a.emi - b.emi)[0];
    lowestEMI.verdict = {
      en: 'Tight fit — consider a smaller loan amount',
      hi: 'तंग फिट — छोटी ऋण राशि पर विचार करें'
    };
    recommendations.push(lowestEMI);
  }

  // ── Step 6: Build explanation ──
  const recFormatted = formatCurrency(recommendedLimit);
  const tierFormatted = formatCurrency(scoreTierLimit);
  const affFormatted = formatCurrency(affordableLimit);

  let explanationEn, explanationHi;
  if (recommendedLimit === scoreTierLimit && hasAffordabilityData) {
    explanationEn = `Your score qualifies for up to ${tierFormatted} and your budget supports ${affFormatted}. Recommended: ${recFormatted}.`;
    explanationHi = `आपका स्कोर ${tierFormatted} तक के लिए योग्य है और आपका बजट ${affFormatted} का समर्थन करता है। अनुशंसित: ${recFormatted}।`;
  } else if (hasAffordabilityData) {
    explanationEn = `Your score qualifies for ${tierFormatted}, but your budget supports ${affFormatted}. We conservatively recommend ${recFormatted}.`;
    explanationHi = `आपका स्कोर ${tierFormatted} के लिए योग्य है, लेकिन आपका बजट ${affFormatted} का समर्थन करता है। हम रूढ़िवादी रूप से ${recFormatted} की अनुशंसा करते हैं।`;
  } else {
    explanationEn = `Based on your credit score, you qualify for up to ${recFormatted}. Provide transaction data for a budget-adjusted recommendation.`;
    explanationHi = `आपके क्रेडिट स्कोर के आधार पर, आप ${recFormatted} तक के लिए योग्य हैं। बजट-समायोजित अनुशंसा के लिए लेनदेन डेटा प्रदान करें।`;
  }

  return {
    eligible: true,
    creditScore,
    tier,
    scoreTierLimit,
    affordableLimit: hasAffordabilityData ? affordableLimit : null,
    recommendedLimit,
    recommendations,
    partner: tierConfig.partner,
    interestRate: tierConfig.defaultRate,
    explanation: {
      en: explanationEn,
      hi: explanationHi
    }
  };
}


module.exports = {
  computeLoanRecommendation,
  getTier,
  TIER_CONFIG
};
