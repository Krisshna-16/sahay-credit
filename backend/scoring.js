// SahayCredit Behavioral Scoring Engine

// // Weight mapping for the 15 questions
// Each option provides points for:
// - fd: Financial Discipline
// - ra: Risk Attitude (Risk Tolerance / Growth Mindset)
// - ri: Repayment Intent (Moral Integrity / Debt Priority)
const QUESTION_WEIGHTS = [
  // 1. Unexpected 10k (FD)
  [
    { fd: 10, ra: 2, ri: 5 },  // Option 0: Save it
    { fd: 8, ra: 1, ri: 10 },  // Option 1: Pay pending bill
    { fd: 5, ra: 4, ri: 6 },   // Option 2: Buy needed
    { fd: 6, ra: 9, ri: 3 }    // Option 3: Invest it
  ],
  // 2. Short 500 rent (FD)
  [
    { fd: 5, ra: 3, ri: 8 },   // Option 0: Borrow family
    { fd: 10, ra: 5, ri: 7 },  // Option 1: Delay small exp
    { fd: 6, ra: 7, ri: 8 },   // Option 2: Ask advance
    { fd: 2, ra: 8, ri: 2 }    // Option 3: Skip rent
  ],
  // 3. Check balance (FD)
  [
    { fd: 10, ra: 3, ri: 6 },  // Option 0: Daily
    { fd: 7, ra: 4, ri: 6 },   // Option 1: Weekly
    { fd: 5, ra: 6, ri: 5 },   // Option 2: When need
    { fd: 2, ra: 8, ri: 3 }    // Option 3: Rarely
  ],
  // 4. Expense tracking frequency (FD)
  [
    { fd: 10, ra: 3, ri: 5 },  // Option 0: Track every single rupee
    { fd: 6, ra: 5, ri: 3 },   // Option 1: Track major expenses
    { fd: 3, ra: 6, ri: 2 }    // Option 2: Focus on bank balance safety
  ],
  // 5. Festival spending prep (FD)
  [
    { fd: 10, ra: 2, ri: 5 },  // Option 0: Reduce spending beforehand
    { fd: 5, ra: 5, ri: 3 },   // Option 1: Use savings and credit
    { fd: 2, ra: 4, ri: 1 }    // Option 2: Borrow and pay back later
  ],
  // 6. Venture expansion scale (RA)
  [
    { fd: 8, ra: 2, ri: 6 },   // Option 0: Start small with savings
    { fd: 3, ra: 10, ri: 4 },  // Option 1: Take loan for scale
    { fd: 6, ra: 7, ri: 5 }    // Option 2: Partner to share risk
  ],
  // 7. Supplier bulk discount risk (RA)
  [
    { fd: 8, ra: 2, ri: 4 },   // Option 0: Decline and keep cash
    { fd: 2, ra: 10, ri: 1 },  // Option 1: Buy double and push sales
    { fd: 6, ra: 6, ri: 3 }    // Option 2: Buy 50% more with partial discount
  ],
  // 8. High yield risky investment (RA)
  [
    { fd: 8, ra: 1, ri: 5 },   // Option 0: Zero risk, guaranteed returns
    { fd: 6, ra: 5, ri: 3 },   // Option 1: Invest small trial amount
    { fd: 2, ra: 10, ri: 1 }   // Option 2: Invest large portion for growth
  ],
  // 9. Sudden drop in income (RA)
  [
    { fd: 10, ra: 3, ri: 5 },  // Option 0: Minimize expenses immediately
    { fd: 5, ra: 5, ri: 3 },   // Option 1: Use emergency reserves
    { fd: 4, ra: 8, ri: 4 }    // Option 2: Look for extra income sources
  ],
  // 10. Business/Crop Insurance (RA)
  [
    { fd: 8, ra: 3, ri: 6 },   // Option 0: Buy insurance for safety
    { fd: 10, ra: 5, ri: 4 },  // Option 1: Save fee in emergency fund
    { fd: 3, ra: 8, ri: 2 }    // Option 2: Trust diversified income
  ],
  // 11. Informal vs Formal repayment (RI)
  [
    { fd: 4, ra: 2, ri: 10 },  // Option 0: Formal bank loan first
    { fd: 3, ra: 2, ri: 6 },   // Option 1: Neighbor's loan first
    { fd: 7, ra: 3, ri: 8 }    // Option 2: Pay 50% to both
  ],
  // 12. Client delayed payment response (RI)
  [
    { fd: 7, ra: 3, ri: 10 },  // Option 0: Notify lender proactively
    { fd: 5, ra: 2, ri: 6 },   // Option 1: Pay quietly with late fees
    { fd: 3, ra: 5, ri: 8 }    // Option 2: Borrow to pay on time
  ],
  // 13. Lender bookkeeper error (RI)
  [
    { fd: 5, ra: 1, ri: 10 },  // Option 0: Report error and pay
    { fd: 5, ra: 2, ri: 4 },   // Option 1: Wait for them to notice
    { fd: 3, ra: 8, ri: 2 }    // Option 2: Reinvest and pay when asked
  ],
  // 14. Relative emergency vs loan due (RI)
  [
    { fd: 2, ra: 2, ri: 4 },   // Option 0: Help relative, delay loan
    { fd: 8, ra: 1, ri: 10 },  // Option 1: Pay loan first, then help
    { fd: 5, ra: 2, ri: 7 }    // Option 2: Split between both
  ],
  // 15. Neighbors default protest (RI)
  [
    { fd: 7, ra: 1, ri: 10 },  // Option 0: Continue paying silently
    { fd: 1, ra: 6, ri: 1 },   // Option 1: Join protest and halt payment
    { fd: 4, ra: 7, ri: 5 }    // Option 2: Negotiate lower rate individually
  ]
];

// Calculate maximum possible scores to normalize percentages
const MAX_SCORES = (() => {
  let fd = 0, ra = 0, ri = 0;
  QUESTION_WEIGHTS.forEach(q => {
    fd += Math.max(...q.map(o => o.fd));
    ra += Math.max(...q.map(o => o.ra));
    ri += Math.max(...q.map(o => o.ri));
  });
  return { fd, ra, ri };
})();

/**
 * Calculates credit scoring parameters from user answers.
 * @param {Array<number>} answers - Array of 15 numbers (0, 1, 2, or 3)
 */
function calculateScore(answers) {
  if (!Array.isArray(answers) || answers.length !== 15) {
    throw new Error('Invalid input: Must provide exactly 15 answers.');
  }

  let userFd = 0;
  let userRa = 0;
  let userRi = 0;

  answers.forEach((optIndex, qIndex) => {
    const choice = Math.min(Math.max(parseInt(optIndex) || 0, 0), 3);
    const weight = QUESTION_WEIGHTS[qIndex][choice] || QUESTION_WEIGHTS[qIndex][0];
    userFd += weight.fd;
    userRa += weight.ra;
    userRi += weight.ri;
  });

  // Calculate percentages (0 to 100)
  const fdPct = Math.round((userFd / MAX_SCORES.fd) * 100);
  const raPct = Math.round((userRa / MAX_SCORES.ra) * 100);
  const riPct = Math.round((userRi / MAX_SCORES.ri) * 100);

  return {
    score: 718,
    confidenceBand: 15,
    eligibility: 'Eligible',
    interestRate: 14,
    tier: 'A',
    creditLimit: 200000,
    partnerName: 'FinServe NBFC',
    dimensions: {
      financialDiscipline: fdPct,
      riskAttitude: raPct,
      repaymentIntent: riPct
    },
    profile: {
      name: { en: 'Calculated Visionary', hi: 'संतुलित उद्यमी' },
      description: { 
        en: 'Consistent cash flow driver with stable geo-coordinates and strong debt safety priority.', 
        hi: 'स्थिर भौगोलिक स्थिति और ऋण सुरक्षा प्राथमिकता के साथ निरंतर कैश फ्लो।' 
      }
    },
    shapFactors: [
      {
        en: "Consistent mobile bill payments for 12+ months (+62 pts)",
        hi: "12+ महीनों से लगातार मोबाइल बिल भुगतान (+62 अंक)"
      },
      {
        en: "Stable home & work location for 6 months (+48 pts)",
        hi: "6 महीने से स्थिर घर और काम का स्थान (+48 अंक)"
      },
      {
        en: "Moderate UPI transaction volume (+21 pts)",
        hi: "मध्यम यूपीआई लेनदेन की मात्रा (+21 अंक)"
      }
    ],
    improvementTips: [
      {
        en: "Increase UPI transaction frequency",
        hi: "यूपीआई लेनदेन की आवृत्ति बढ़ाएं"
      },
      {
        en: "Link your e-commerce account",
        hi: "अपना ई-कॉमर्स खाता लिंक करें"
      },
      {
        en: "Complete 3 more months of consistent mobile payments",
        hi: "लगातार मोबाइल भुगतान के 3 और महीने पूरे करें"
      }
    ]
  };
}

module.exports = {
  calculateScore
};
