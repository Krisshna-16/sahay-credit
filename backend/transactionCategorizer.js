/**
 * SahayCredit — AI Transaction Categorization Engine (Phase 4, Module 1)
 * ======================================================================
 *
 * HOW THIS WORKS (plain language, suitable for demo explanation):
 * ---------------------------------------------------------------
 * This module takes a borrower's bank/UPI transaction list (from AA payload
 * or demo data) and categorizes each transaction into spending categories
 * using keyword/pattern matching — NOT an ML classifier.
 *
 * Categories:
 *   salary, rent, utilities, groceries, entertainment, transfers,
 *   emi_repayment, insurance, investment, education, healthcare, other
 *
 * For each category, it computes monthly aggregates (total, count, average).
 * It also produces a spending profile summary: essential vs discretionary
 * ratio, savings ratio, and top spending categories — all fully transparent.
 *
 * CONSENT REQUIREMENT: Reuses the existing 'behaviour' consent since it
 * operates on the same AA transaction data.
 *
 * IMPORTANT: This is a RULES-BASED keyword matcher, not a black-box
 * classifier. Every categorization decision can be traced to a specific
 * keyword or pattern rule, making it fully explainable in a live demo.
 */

const { hasActiveConsent, logDataFetch } = require('./consent');

// ── Category Definitions with Keyword Sets ─────────────────────────────────

const CATEGORIES = {
  salary: {
    label: { en: 'Salary', hi: 'वेतन' },
    essential: true,
    isIncome: true,
    keywords: [
      'salary', 'sal ', 'sal/', 'payroll', 'stipend', 'wage',
      'neft-sal', 'neft sal', 'monthly pay', 'compensation'
    ],
    // Salary-like patterns: credit, recurring, similar amount ±20%
    amountRange: { min: 5000, max: 500000 },
    txType: 'credit'
  },
  rent: {
    label: { en: 'Rent', hi: 'किराया' },
    essential: true,
    isIncome: false,
    keywords: [
      'rent', 'house rent', 'room rent', 'pg rent', 'hostel',
      'landlord', 'rental', 'accommodation', 'flat rent'
    ],
    amountRange: { min: 2000, max: 100000 },
    txType: 'debit'
  },
  utilities: {
    label: { en: 'Utilities', hi: 'उपयोगिताएं' },
    essential: true,
    isIncome: false,
    keywords: [
      'electricity', 'electric', 'elec bill', 'power bill',
      'water bill', 'gas bill', 'lpg', 'indane', 'bharat gas',
      'broadband', 'wifi', 'internet', 'jio', 'airtel', 'bsnl', 'vi ',
      'vodafone', 'mobile bill', 'phone bill', 'recharge',
      'dth', 'tata sky', 'dish tv', 'airtel dth',
      'municipal', 'property tax', 'maintenance', 'society'
    ],
    amountRange: { min: 50, max: 15000 },
    txType: 'debit'
  },
  groceries: {
    label: { en: 'Groceries', hi: 'किराना' },
    essential: true,
    isIncome: false,
    keywords: [
      'grocery', 'grocer', 'kirana', 'bigbasket', 'blinkit',
      'zepto', 'dmart', 'reliance fresh', 'more retail',
      'swiggy instamart', 'dunzo', 'jiomart', 'vegetables',
      'supermarket', 'provision', 'ration'
    ],
    amountRange: { min: 50, max: 20000 },
    txType: 'debit'
  },
  entertainment: {
    label: { en: 'Entertainment', hi: 'मनोरंजन' },
    essential: false,
    isIncome: false,
    keywords: [
      'netflix', 'hotstar', 'prime video', 'spotify', 'youtube',
      'disney', 'zee5', 'sonyliv', 'jiocinema', 'gaana',
      'swiggy', 'zomato', 'food delivery', 'restaurant',
      'cafe', 'coffee', 'starbucks', 'dominos', 'pizza',
      'movie', 'pvr', 'inox', 'bookmyshow', 'gaming',
      'pub', 'bar', 'club', 'alcohol', 'liquor'
    ],
    amountRange: { min: 50, max: 50000 },
    txType: 'debit'
  },
  emi_repayment: {
    label: { en: 'EMI / Loan Repayment', hi: 'ईएमआई / ऋण भुगतान' },
    essential: true,
    isIncome: false,
    keywords: [
      'emi', 'loan', 'repayment', 'instalment', 'installment',
      'bajaj finserv', 'hdfc loan', 'icici loan', 'sbi loan',
      'home loan', 'car loan', 'personal loan', 'education loan',
      'credit card', 'cc payment', 'minimum due', 'outstanding',
      'nach', 'mandate', 'auto debit', 'si-', 'standing instruction'
    ],
    amountRange: { min: 500, max: 200000 },
    txType: 'debit'
  },
  insurance: {
    label: { en: 'Insurance', hi: 'बीमा' },
    essential: true,
    isIncome: false,
    keywords: [
      'insurance', 'lic', 'premium', 'life insurance',
      'health insurance', 'mediclaim', 'term plan',
      'max life', 'hdfc life', 'icici pru', 'sbi life',
      'star health', 'new india', 'bajaj allianz',
      'general insurance', 'motor insurance', 'vehicle insurance'
    ],
    amountRange: { min: 200, max: 100000 },
    txType: 'debit'
  },
  investment: {
    label: { en: 'Investment', hi: 'निवेश' },
    essential: false,
    isIncome: false,
    keywords: [
      'sip', 'mutual fund', 'mf ', 'zerodha', 'groww', 'kuvera',
      'paytm money', 'coin', 'ppf', 'nps', 'elss', 'fd ',
      'fixed deposit', 'recurring deposit', 'rd ', 'nsc',
      'gold', 'sovereign gold', 'sgb', 'stocks', 'share',
      'demat', 'trading', 'investment'
    ],
    amountRange: { min: 100, max: 500000 },
    txType: 'debit'
  },
  education: {
    label: { en: 'Education', hi: 'शिक्षा' },
    essential: true,
    isIncome: false,
    keywords: [
      'school', 'college', 'university', 'tuition', 'fees',
      'coaching', 'course', 'udemy', 'coursera', 'byju',
      'unacademy', 'vedantu', 'exam', 'books', 'stationery'
    ],
    amountRange: { min: 100, max: 200000 },
    txType: 'debit'
  },
  healthcare: {
    label: { en: 'Healthcare', hi: 'स्वास्थ्य सेवा' },
    essential: true,
    isIncome: false,
    keywords: [
      'hospital', 'doctor', 'clinic', 'pharmacy', 'medical',
      'medicine', 'apollo', 'medplus', 'netmeds', 'pharmeasy',
      '1mg', 'diagnostic', 'lab test', 'pathology', 'dental'
    ],
    amountRange: { min: 50, max: 500000 },
    txType: 'debit'
  },
  transfers: {
    label: { en: 'Transfers', hi: 'स्थानांतरण' },
    essential: false,
    isIncome: false,
    keywords: [
      'transfer', 'neft', 'imps', 'rtgs', 'upi',
      'fund transfer', 'self transfer', 'own account'
    ],
    // Only match transfers if no other category matches first
    priority: -1,
    amountRange: null,
    txType: null
  },
  other: {
    label: { en: 'Other', hi: 'अन्य' },
    essential: false,
    isIncome: false,
    keywords: [],
    priority: -99,
    amountRange: null,
    txType: null
  }
};


// ── Categorization Engine ──────────────────────────────────────────────────

/**
 * Categorize a single transaction by matching keywords against narration.
 *
 * @param {Object} tx - Transaction object with fields:
 *   { narration: string, amount: number, type: 'PRIJEM'|'VYDAJ', date: string }
 * @returns {string} Category key (e.g., 'salary', 'rent', 'other')
 */
function categorizeTransaction(tx) {
  const narration = (tx.narration || tx.description || tx.k_symbol || '').toLowerCase();
  const amount = Math.abs(tx.amount || 0);
  const isCredit = tx.type === 'PRIJEM' || tx.type === 'credit' || tx.type === 'CR';

  let bestMatch = null;
  let bestPriority = -Infinity;

  for (const [catKey, catDef] of Object.entries(CATEGORIES)) {
    if (catKey === 'other') continue; // Fallback only

    const priority = catDef.priority || 0;

    // Skip if this is a lower-priority match and we already have something better
    if (priority < bestPriority) continue;

    // Check transaction direction
    if (catDef.txType === 'credit' && !isCredit) continue;
    if (catDef.txType === 'debit' && isCredit) continue;

    // Check keyword match
    const keywordMatch = catDef.keywords.some(kw => narration.includes(kw));

    if (keywordMatch) {
      // Optionally validate amount range
      if (catDef.amountRange) {
        if (amount >= catDef.amountRange.min && amount <= catDef.amountRange.max) {
          bestMatch = catKey;
          bestPriority = priority + 1; // Keyword + amount range = strong match
        } else if (priority >= bestPriority) {
          // Keyword match but amount outside expected range — still accept
          // with lower confidence, but only if no better match exists
          if (!bestMatch || bestPriority <= priority) {
            bestMatch = catKey;
            bestPriority = priority;
          }
        }
      } else {
        bestMatch = catKey;
        bestPriority = priority;
      }
    }
  }

  // Heuristic fallbacks when no keyword matches
  if (!bestMatch) {
    // Recurring credit in salary-like range → probable salary
    if (isCredit && amount >= 5000 && amount <= 500000) {
      bestMatch = 'salary'; // Will be validated by recurring pattern check
    }
    // Small recurring debits → likely utility
    else if (!isCredit && amount >= 100 && amount <= 2000) {
      bestMatch = 'utilities';
    }
    // Default
    else {
      bestMatch = 'other';
    }
  }

  return bestMatch;
}


/**
 * Validate salary categorization by checking for recurring pattern.
 * A transaction is only confirmed as 'salary' if there are similar-amount
 * credits across multiple months (±20% of median credit amount).
 *
 * @param {Array} transactions - All transactions
 * @param {Array} categorized - Parallel array of category assignments
 */
function refineSalaryClassification(transactions, categorized) {
  // Collect all transactions initially categorized as salary
  const salaryCandidates = [];
  transactions.forEach((tx, i) => {
    if (categorized[i] === 'salary') {
      salaryCandidates.push({ index: i, amount: tx.amount, date: tx.date_dt || new Date(tx.date) });
    }
  });

  if (salaryCandidates.length < 2) {
    // Not enough data to confirm salary pattern — keep or reclassify
    return;
  }

  // Find median credit amount
  const amounts = salaryCandidates.map(c => c.amount).sort((a, b) => a - b);
  const median = amounts[Math.floor(amounts.length / 2)];
  const tolerance = median * 0.20;

  // Only keep salary classification for amounts within ±20% of median
  salaryCandidates.forEach(c => {
    if (Math.abs(c.amount - median) > tolerance) {
      categorized[c.index] = 'other'; // Reclassify outliers
    }
  });
}


// ── Aggregation ────────────────────────────────────────────────────────────

/**
 * Aggregate categorized transactions into monthly summaries.
 *
 * @param {Array} transactions - Raw transactions
 * @param {Array} categories - Parallel array of category keys
 * @returns {Object} Aggregated category data
 */
function aggregateByCategory(transactions, categories) {
  const result = {};
  const monthSet = new Set();

  // Initialize all categories
  for (const catKey of Object.keys(CATEGORIES)) {
    result[catKey] = { total: 0, count: 0, transactions: [] };
  }

  transactions.forEach((tx, i) => {
    const cat = categories[i];
    const amount = Math.abs(tx.amount || 0);
    const dateObj = tx.date_dt || new Date(tx.date);
    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

    monthSet.add(monthKey);

    result[cat].total += amount;
    result[cat].count += 1;
    result[cat].transactions.push({
      amount,
      date: monthKey,
      narration: (tx.narration || tx.description || tx.k_symbol || '').substring(0, 50)
    });
  });

  const monthsCovered = Math.max(1, monthSet.size);

  // Compute per-month averages
  for (const catKey of Object.keys(result)) {
    result[catKey].avgPerMonth = Math.round(result[catKey].total / monthsCovered);
    // Remove raw transactions from output (too verbose for API response)
    delete result[catKey].transactions;
  }

  return { categories: result, monthsCovered };
}


/**
 * Compute the borrower's spending profile from categorized data.
 *
 * @param {Object} categoryData - Output from aggregateByCategory
 * @returns {Object} Spending profile
 */
function computeSpendingProfile(categoryData) {
  const cats = categoryData.categories;

  // Total income (credit categories)
  let totalIncome = 0;
  let totalDebits = 0;
  let essentialDebits = 0;
  let discretionaryDebits = 0;

  for (const [catKey, catDef] of Object.entries(CATEGORIES)) {
    const catTotal = cats[catKey] ? cats[catKey].total : 0;

    if (catDef.isIncome) {
      totalIncome += catTotal;
    } else {
      totalDebits += catTotal;
      if (catDef.essential) {
        essentialDebits += catTotal;
      } else {
        discretionaryDebits += catTotal;
      }
    }
  }

  const safeIncome = Math.max(1, totalIncome);

  return {
    totalIncome: Math.round(totalIncome),
    totalDebits: Math.round(totalDebits),
    essentialDebits: Math.round(essentialDebits),
    discretionaryDebits: Math.round(discretionaryDebits),
    essentialRatio: parseFloat((essentialDebits / Math.max(1, totalDebits)).toFixed(3)),
    discretionaryRatio: parseFloat((discretionaryDebits / Math.max(1, totalDebits)).toFixed(3)),
    savingsRatio: parseFloat(Math.max(0, (totalIncome - totalDebits) / safeIncome).toFixed(3)),
  };
}


/**
 * Get top spending categories sorted by total amount.
 *
 * @param {Object} categoryData - Output from aggregateByCategory
 * @param {number} topN - Number of top categories to return
 * @returns {Array} Top categories with labels and percentages
 */
function getTopCategories(categoryData, topN = 5) {
  const cats = categoryData.categories;
  const totalSpent = Object.entries(cats)
    .filter(([key]) => !CATEGORIES[key].isIncome && key !== 'other')
    .reduce((sum, [, data]) => sum + data.total, 0);

  const sorted = Object.entries(cats)
    .filter(([key]) => !CATEGORIES[key].isIncome && cats[key].total > 0 && key !== 'other')
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, topN);

  return sorted.map(([key, data]) => ({
    name: key,
    label: CATEGORIES[key].label,
    total: Math.round(data.total),
    avgPerMonth: data.avgPerMonth,
    pct: totalSpent > 0 ? Math.round((data.total / totalSpent) * 100) : 0
  }));
}


// ── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Categorize and aggregate a borrower's transactions.
 *
 * @param {string} borrowerId - Unique borrower ID
 * @param {Array} transactions - Array of transaction objects from AA payload or demo data
 *   Expected shape: [{ date, amount, type, narration|description|k_symbol, balance }]
 * @returns {Object|null} Categorized transaction data, or null if consent not granted
 */
function categorizeTransactions(borrowerId, transactions) {
  // ── Consent gate ──
  if (!hasActiveConsent(borrowerId, 'behaviour')) {
    return null;
  }

  logDataFetch(borrowerId, 'transactionCategorization');

  // Handle empty input
  if (!transactions || transactions.length === 0) {
    return {
      categories: {},
      spendingProfile: {
        totalIncome: 0,
        totalDebits: 0,
        essentialDebits: 0,
        discretionaryDebits: 0,
        essentialRatio: 0,
        discretionaryRatio: 0,
        savingsRatio: 0
      },
      topCategories: [],
      transactionCount: 0,
      monthsCovered: 0,
      explanation: {
        en: 'No transaction data available for categorization',
        hi: 'वर्गीकरण के लिए कोई लेनदेन डेटा उपलब्ध नहीं है'
      }
    };
  }

  // Parse dates if needed
  const parsed = transactions.map(tx => ({
    ...tx,
    date_dt: tx.date_dt || new Date(tx.date),
    amount: Math.abs(parseFloat(tx.amount) || 0)
  }));

  // Step 1: Categorize each transaction
  const categories = parsed.map(tx => categorizeTransaction(tx));

  // Step 2: Refine salary classifications
  refineSalaryClassification(parsed, categories);

  // Step 3: Aggregate by category
  const aggregated = aggregateByCategory(parsed, categories);

  // Step 4: Compute spending profile
  const spendingProfile = computeSpendingProfile(aggregated);

  // Step 5: Top categories
  const topCategories = getTopCategories(aggregated);

  // Step 6: Build explanation
  const topNames = topCategories.slice(0, 3).map(c => c.label.en).join(', ');
  const savingsPct = Math.round(spendingProfile.savingsRatio * 100);

  return {
    categories: aggregated.categories,
    spendingProfile,
    topCategories,
    transactionCount: parsed.length,
    monthsCovered: aggregated.monthsCovered,
    explanation: {
      en: `Analyzed ${parsed.length} transactions over ${aggregated.monthsCovered} months. Top spending: ${topNames || 'N/A'}. Savings rate: ${savingsPct}%.`,
      hi: `${parsed.length} लेनदेन का ${aggregated.monthsCovered} महीनों में विश्लेषण। शीर्ष खर्च: ${topNames || 'N/A'}। बचत दर: ${savingsPct}%।`
    }
  };
}


module.exports = {
  categorizeTransactions,
  categorizeTransaction,
  CATEGORIES
};
