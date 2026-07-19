/**
 * SahayCredit — Financial Health Engine (Phase 4, Module 3)
 * ==========================================================
 *
 * // ╔══════════════════════════════════════════════════════════════════════╗
 * // ║  INTEGRITY: BORROWER-FACING DIAGNOSTIC ONLY                       ║
 * // ║                                                                    ║
 * // ║  This module's output (financialHealthScore, any sub-dimension)    ║
 * // ║  MUST NEVER be passed to:                                          ║
 * // ║    - compositeScoring.js                                           ║
 * // ║    - scoring.js / calculateScore()                                 ║
 * // ║    - Any function that influences loan approval, credit limit,     ║
 * // ║      or interest rate determination.                               ║
 * // ║                                                                    ║
 * // ║  This is a CONSUMER EMPOWERMENT TOOL. It is returned to the        ║
 * // ║  borrower only via the /api/financial-health endpoint.             ║
 * // ║  The endpoint handler DOES NOT write to the applications[] array.  ║
 * // ║                                                                    ║
 * // ║  Violation = same class of error as the psychometric-quiz incident.║
 * // ╚══════════════════════════════════════════════════════════════════════╝
 *
 * HOW THIS WORKS (plain language, suitable for demo explanation):
 * ---------------------------------------------------------------
 * This module produces a borrower-facing diagnostic report that measures
 * five dimensions of financial health. It's like a personal finance
 * checkup — the borrower sees where they're doing well, where they can
 * improve, and gets actionable tips.
 *
 * Dimensions:
 * 1. Savings Health — Are you saving enough each month?
 * 2. Spending Discipline — Essential vs discretionary spending ratio
 * 3. Income Stability — How consistent is your income month-to-month?
 * 4. Debt Burden — What fraction of income goes to existing debts?
 * 5. Emergency Buffer — How many months of expenses can your balance cover?
 *
 * Each dimension is scored 0-100 and displayed as a radar chart.
 * The composite Financial Health Score is a simple average of all 5.
 *
 * CONSENT REQUIREMENT: Reuses 'behaviour' consent (same AA transaction data).
 */

const { hasActiveConsent, logDataFetch } = require('./consent');

// ── Benchmark Thresholds ───────────────────────────────────────────────────
// These define what "good" looks like for each dimension.

const BENCHMARKS = {
  savings: {
    poor: 0.05,       // <5% savings rate
    fair: 0.15,        // 5-15%
    good: 0.25,        // 15-25%
    excellent: 1.0     // >25%
  },
  essentialRatio: {
    // Higher essential ratio with lower discretionary = more disciplined
    // But extremely high essential ratio (>90%) indicates stress
    optimal: { min: 0.55, max: 0.80 }
  },
  incomeCoV: {
    // Coefficient of variation of monthly income
    excellent: 0.05,   // <5% variation
    good: 0.15,        // 5-15%
    fair: 0.30,        // 15-30%
    poor: 1.0          // >30%
  },
  foir: {
    excellent: 0.20,   // <20% FOIR
    good: 0.35,        // 20-35%
    fair: 0.50,        // 35-50%
    poor: 1.0          // >50%
  },
  emergencyMonths: {
    critical: 1,       // <1 month
    fair: 3,           // 1-3 months
    good: 6,           // 3-6 months
    excellent: 100     // >6 months
  }
};


// ── Dimension Scoring Functions ────────────────────────────────────────────

/**
 * Score the savings health dimension (0-100).
 */
function scoreSavingsHealth(savingsRatio) {
  if (savingsRatio <= 0) return { score: 5, grade: 'poor' };
  if (savingsRatio < BENCHMARKS.savings.poor) return { score: 20, grade: 'poor' };
  if (savingsRatio < BENCHMARKS.savings.fair) return { score: 50, grade: 'fair' };
  if (savingsRatio < BENCHMARKS.savings.good) return { score: 75, grade: 'good' };
  return { score: 92, grade: 'excellent' };
}

/**
 * Score the spending discipline dimension (0-100).
 */
function scoreSpendingDiscipline(essentialRatio, discretionaryRatio) {
  // Ideal: essential ratio 55-80%, discretionary under 25%
  let score = 50; // Base

  // Essential ratio in optimal range is good
  if (essentialRatio >= BENCHMARKS.essentialRatio.optimal.min &&
      essentialRatio <= BENCHMARKS.essentialRatio.optimal.max) {
    score += 25;
  } else if (essentialRatio > BENCHMARKS.essentialRatio.optimal.max) {
    // Very high essential spending — might indicate financial stress
    score += 10;
  } else {
    // Low essential ratio — high discretionary spending
    score += 5;
  }

  // Low discretionary is disciplined
  if (discretionaryRatio < 0.15) score += 25;
  else if (discretionaryRatio < 0.25) score += 15;
  else if (discretionaryRatio < 0.40) score += 5;
  else score -= 10;

  const clampedScore = Math.max(5, Math.min(95, score));
  if (clampedScore >= 80) return { score: clampedScore, grade: 'excellent' };
  if (clampedScore >= 60) return { score: clampedScore, grade: 'good' };
  if (clampedScore >= 40) return { score: clampedScore, grade: 'fair' };
  return { score: clampedScore, grade: 'poor' };
}

/**
 * Score the income stability dimension (0-100).
 */
function scoreIncomeStability(monthlyIncomes) {
  if (!monthlyIncomes || monthlyIncomes.length < 2) {
    return { score: 40, grade: 'fair' }; // Not enough data
  }

  const mean = monthlyIncomes.reduce((a, b) => a + b, 0) / monthlyIncomes.length;
  if (mean <= 0) return { score: 10, grade: 'poor' };

  const variance = monthlyIncomes.reduce((a, b) => a + (b - mean) ** 2, 0) / monthlyIncomes.length;
  const cov = Math.sqrt(variance) / mean;

  if (cov < BENCHMARKS.incomeCoV.excellent) return { score: 95, grade: 'excellent' };
  if (cov < BENCHMARKS.incomeCoV.good) return { score: 78, grade: 'good' };
  if (cov < BENCHMARKS.incomeCoV.fair) return { score: 55, grade: 'fair' };
  return { score: 25, grade: 'poor' };
}

/**
 * Score the debt burden dimension (0-100).
 * Higher score = lower burden (healthier).
 */
function scoreDebtBurden(foir) {
  if (foir <= 0) return { score: 95, grade: 'excellent' }; // No debts
  if (foir < BENCHMARKS.foir.excellent) return { score: 90, grade: 'excellent' };
  if (foir < BENCHMARKS.foir.good) return { score: 72, grade: 'good' };
  if (foir < BENCHMARKS.foir.fair) return { score: 50, grade: 'fair' };
  return { score: 20, grade: 'poor' };
}

/**
 * Score the emergency buffer dimension (0-100).
 */
function scoreEmergencyBuffer(avgBalance, monthlyExpenses) {
  if (monthlyExpenses <= 0) return { score: 50, grade: 'fair' };

  const monthsCovered = avgBalance / monthlyExpenses;

  if (monthsCovered < BENCHMARKS.emergencyMonths.critical) return { score: 15, grade: 'critical' };
  if (monthsCovered < BENCHMARKS.emergencyMonths.fair) return { score: 45, grade: 'fair' };
  if (monthsCovered < BENCHMARKS.emergencyMonths.good) return { score: 75, grade: 'good' };
  return { score: 92, grade: 'excellent' };
}


// ── Tip Generation ─────────────────────────────────────────────────────────

const TIPS = {
  savingsHealth: {
    poor: {
      en: 'Try the 50-30-20 rule: 50% needs, 30% wants, 20% savings. Even ₹500/month adds up.',
      hi: '50-30-20 नियम आज़माएं: 50% ज़रूरतें, 30% इच्छाएं, 20% बचत। ₹500/माह भी जुड़ता है।'
    },
    fair: {
      en: 'You\'re saving — good start! Consider automating a recurring deposit to stay consistent.',
      hi: 'आप बचत कर रहे हैं — अच्छी शुरुआत! निरंतरता के लिए आवर्ती जमा स्वचालित करें।'
    },
    good: {
      en: 'Strong savings habit! Consider diversifying into SIPs or PPF for better returns.',
      hi: 'मज़बूत बचत की आदत! बेहतर रिटर्न के लिए SIP या PPF में निवेश पर विचार करें।'
    },
    excellent: {
      en: 'Excellent savings discipline. You\'re well-positioned for financial goals.',
      hi: 'उत्कृष्ट बचत अनुशासन। आप वित्तीय लक्ष्यों के लिए अच्छी स्थिति में हैं।'
    }
  },
  spendingDiscipline: {
    poor: {
      en: 'High discretionary spending detected. Track daily expenses for 2 weeks to identify savings opportunities.',
      hi: 'अधिक विवेकाधीन खर्च पाया गया। बचत के अवसर पहचानने के लिए 2 सप्ताह दैनिक खर्चों पर नज़र रखें।'
    },
    fair: {
      en: 'Good balance between needs and wants. Look for subscription services you no longer use.',
      hi: 'ज़रूरतों और इच्छाओं के बीच अच्छा संतुलन। उन सब्सक्रिप्शन सेवाओं की जांच करें जो अब उपयोग में नहीं हैं।'
    },
    good: {
      en: 'Disciplined spending pattern. Your essential-to-discretionary ratio is healthy.',
      hi: 'अनुशासित खर्च पैटर्न। आपका आवश्यक-विवेकाधीन अनुपात स्वस्थ है।'
    },
    excellent: {
      en: 'Exceptional spending discipline — you prioritize needs effectively.',
      hi: 'असाधारण खर्च अनुशासन — आप ज़रूरतों को प्रभावी ढंग से प्राथमिकता देते हैं।'
    }
  },
  incomeStability: {
    poor: {
      en: 'Highly variable income detected. Build a 3-month buffer to smooth out lean periods.',
      hi: 'अत्यधिक परिवर्तनशील आय पाई गई। कम आय के दौर को सहने के लिए 3 महीने का बफर बनाएं।'
    },
    fair: {
      en: 'Some income variation — common for self-employed. Track seasonal patterns to plan ahead.',
      hi: 'कुछ आय भिन्नता — स्व-रोजगार के लिए सामान्य। आगे की योजना के लिए मौसमी पैटर्न देखें।'
    },
    good: {
      en: 'Stable income stream. This consistency strengthens your financial position.',
      hi: 'स्थिर आय धारा। यह निरंतरता आपकी वित्तीय स्थिति को मज़बूत करती है।'
    },
    excellent: {
      en: 'Very stable income — excellent foundation for long-term financial planning.',
      hi: 'बहुत स्थिर आय — दीर्घकालिक वित्तीय योजना के लिए उत्कृष्ट आधार।'
    }
  },
  debtBurden: {
    poor: {
      en: 'Debt obligations exceed 50% of income. Prioritize paying off the highest-interest debt first.',
      hi: 'ऋण दायित्व आय के 50% से अधिक हैं। सबसे पहले सबसे अधिक ब्याज वाले ऋण का भुगतान करें।'
    },
    fair: {
      en: 'Moderate debt load. Avoid taking on new EMIs until existing ones reduce.',
      hi: 'मध्यम ऋण भार। मौजूदा ईएमआई कम होने तक नई ईएमआई लेने से बचें।'
    },
    good: {
      en: 'Manageable debt level. Your obligations leave room for savings and emergencies.',
      hi: 'प्रबंधनीय ऋण स्तर। आपके दायित्व बचत और आपातकाल के लिए जगह छोड़ते हैं।'
    },
    excellent: {
      en: 'Low debt burden — you have significant capacity for financial growth.',
      hi: 'कम ऋण भार — आपके पास वित्तीय विकास के लिए महत्वपूर्ण क्षमता है।'
    }
  },
  emergencyBuffer: {
    critical: {
      en: 'Emergency fund critically low — less than 1 month of expenses. Start building it immediately.',
      hi: 'आपातकालीन फंड गंभीर रूप से कम — 1 महीने के खर्च से भी कम। इसे तुरंत बनाना शुरू करें।'
    },
    fair: {
      en: 'Your buffer covers 1-3 months. Aim for 3-6 months of expenses as a safety net.',
      hi: 'आपका बफर 1-3 महीने को कवर करता है। सुरक्षा जाल के रूप में 3-6 महीने के खर्च का लक्ष्य रखें।'
    },
    good: {
      en: 'Good emergency buffer. You can handle most unexpected expenses without borrowing.',
      hi: 'अच्छा आपातकालीन बफर। आप बिना उधार लिए अधिकांश अप्रत्याशित खर्चों को संभाल सकते हैं।'
    },
    excellent: {
      en: 'Excellent emergency fund — over 6 months of expenses covered. Very well prepared.',
      hi: 'उत्कृष्ट आपातकालीन निधि — 6 महीने से अधिक के खर्चे कवर। बहुत अच्छी तैयारी।'
    }
  }
};


// ── Overall Verdict ────────────────────────────────────────────────────────

function getOverallVerdict(score) {
  if (score >= 80) return {
    en: 'Your finances are in excellent shape! Keep up the strong habits.',
    hi: 'आपकी वित्तीय स्थिति उत्कृष्ट है! अच्छी आदतें जारी रखें।'
  };
  if (score >= 65) return {
    en: 'Your finances are on a healthy track with room for improvement in a few areas.',
    hi: 'आपकी वित्तीय स्थिति स्वस्थ रास्ते पर है, कुछ क्षेत्रों में सुधार की गुंजाइश है।'
  };
  if (score >= 45) return {
    en: 'Your financial health is fair. Focus on the action items below to strengthen your position.',
    hi: 'आपका वित्तीय स्वास्थ्य ठीक है। अपनी स्थिति मज़बूत करने के लिए नीचे दिए गए कार्यों पर ध्यान दें।'
  };
  return {
    en: 'Your financial health needs attention. The tips below can help you get back on track.',
    hi: 'आपके वित्तीय स्वास्थ्य पर ध्यान देने की ज़रूरत है। नीचे दिए गए सुझाव आपको सही रास्ते पर लाने में मदद कर सकते हैं।'
  };
}


// ── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Compute a borrower-facing financial health diagnostic.
 *
 * // INTEGRITY: This output is NEVER used in lending decisions.
 * // It is returned via /api/financial-health ONLY.
 *
 * @param {string} borrowerId - Unique borrower ID
 * @param {Object} options - Input data:
 *   {
 *     categorizedData: Object,   // From transactionCategorizer
 *     affordabilityData: Object, // From affordability engine
 *     transactions: Array,       // Raw transactions (for balance averages)
 *   }
 * @returns {Object|null} Financial health report, or null if consent not granted
 */
function computeFinancialHealth(borrowerId, options = {}) {
  // ── Consent gate ──
  if (!hasActiveConsent(borrowerId, 'behaviour')) {
    return null;
  }

  logDataFetch(borrowerId, 'financialHealth');

  const { categorizedData, affordabilityData, transactions } = options;

  // ── Dimension 1: Savings Health ──
  const savingsRatio = (categorizedData && categorizedData.spendingProfile)
    ? categorizedData.spendingProfile.savingsRatio
    : 0;
  const savings = scoreSavingsHealth(savingsRatio);

  // ── Dimension 2: Spending Discipline ──
  const essentialRatio = (categorizedData && categorizedData.spendingProfile)
    ? categorizedData.spendingProfile.essentialRatio
    : 0.5;
  const discretionaryRatio = (categorizedData && categorizedData.spendingProfile)
    ? categorizedData.spendingProfile.discretionaryRatio
    : 0.3;
  const spending = scoreSpendingDiscipline(essentialRatio, discretionaryRatio);

  // ── Dimension 3: Income Stability ──
  // Compute monthly income totals from categorized data
  let monthlyIncomes = [];
  if (categorizedData && categorizedData.categories && categorizedData.categories.salary) {
    // Use the transaction-level data to compute per-month income
    // Since we don't have raw tx in aggregated output, estimate from total and months
    const totalIncome = (categorizedData.spendingProfile && categorizedData.spendingProfile.totalIncome) || 0;
    const months = categorizedData.monthsCovered || 1;
    const avgMonthly = totalIncome / months;
    // Approximate variation: if we have transactions, compute per-month
    if (transactions && transactions.length > 0) {
      const monthlyMap = {};
      transactions.forEach(tx => {
        const isCredit = tx.type === 'PRIJEM' || tx.type === 'credit' || tx.type === 'CR';
        if (!isCredit) return;
        const d = tx.date_dt || new Date(tx.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[key]) monthlyMap[key] = 0;
        monthlyMap[key] += Math.abs(tx.amount || 0);
      });
      monthlyIncomes = Object.values(monthlyMap);
    } else {
      // Approximate: assume stable income (slight variation)
      monthlyIncomes = Array(months).fill(avgMonthly);
    }
  }
  const income = scoreIncomeStability(monthlyIncomes);

  // ── Dimension 4: Debt Burden ──
  const foir = (affordabilityData && affordabilityData.foir) || 0;
  const debt = scoreDebtBurden(foir);

  // ── Dimension 5: Emergency Buffer ──
  let avgBalance = 0;
  if (transactions && transactions.length > 0) {
    const balances = transactions
      .filter(tx => tx.balance !== null && tx.balance !== undefined)
      .map(tx => parseFloat(tx.balance) || 0);
    if (balances.length > 0) {
      avgBalance = balances.reduce((a, b) => a + b, 0) / balances.length;
    }
  }
  const monthlyExpenses = (categorizedData && categorizedData.spendingProfile)
    ? categorizedData.spendingProfile.totalDebits / Math.max(1, categorizedData.monthsCovered)
    : 0;
  const emergency = scoreEmergencyBuffer(avgBalance, monthlyExpenses);

  // ── Composite Score ──
  const dimensions = {
    savingsHealth: {
      score: savings.score,
      grade: savings.grade,
      label: { en: 'Savings Health', hi: 'बचत स्वास्थ्य' },
      tip: TIPS.savingsHealth[savings.grade]
    },
    spendingDiscipline: {
      score: spending.score,
      grade: spending.grade,
      label: { en: 'Spending Discipline', hi: 'खर्च अनुशासन' },
      tip: TIPS.spendingDiscipline[spending.grade]
    },
    incomeStability: {
      score: income.score,
      grade: income.grade,
      label: { en: 'Income Stability', hi: 'आय स्थिरता' },
      tip: TIPS.incomeStability[income.grade]
    },
    debtBurden: {
      score: debt.score,
      grade: debt.grade,
      label: { en: 'Debt Burden', hi: 'ऋण भार' },
      tip: TIPS.debtBurden[debt.grade]
    },
    emergencyBuffer: {
      score: emergency.score,
      grade: emergency.grade,
      label: { en: 'Emergency Buffer', hi: 'आपातकालीन बफर' },
      tip: TIPS.emergencyBuffer[emergency.grade]
    }
  };

  const allScores = Object.values(dimensions).map(d => d.score);
  const financialHealthScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);

  // ── Action Items (top 3 weakest dimensions) ──
  const weakest = Object.entries(dimensions)
    .sort(([, a], [, b]) => a.score - b.score)
    .slice(0, 3)
    .filter(([, d]) => d.score < 70);

  const actionItems = weakest.map(([, d]) => d.tip);

  return {
    financialHealthScore,
    dimensions,
    overallVerdict: getOverallVerdict(financialHealthScore),
    actionItems,
    dataQuality: {
      transactionsAnalyzed: (transactions && transactions.length) || 0,
      monthsCovered: (categorizedData && categorizedData.monthsCovered) || 0,
      hasBalanceData: avgBalance > 0,
      hasAffordabilityData: !!affordabilityData
    }
  };
}


module.exports = {
  computeFinancialHealth
};
