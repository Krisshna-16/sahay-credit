// SahayCredit - Ramesh's Credit Journey Interactive Demo Logic

// UI Elements
const dom = {
  startDemoBtn: document.getElementById('start-interactive-demo'),
  playground: document.getElementById('demo-playground'),
  
  // Progress indicators
  badges: {
    1: document.getElementById('wiz-badge-1'),
    2: document.getElementById('wiz-badge-2'),
    3: document.getElementById('wiz-badge-3'),
    4: document.getElementById('wiz-badge-4')
  },
  
  // Panes
  panes: {
    1: document.getElementById('play-stage-1'),
    2: document.getElementById('play-stage-2'),
    3: document.getElementById('play-stage-3'),
    4: document.getElementById('play-stage-4')
  },
  
  // Timeline Cards
  timeCards: {
    1: document.getElementById('time-card-1'),
    2: document.getElementById('time-card-2'),
    3: document.getElementById('time-card-3'),
    4: document.getElementById('time-card-4')
  },
  
  // Quiz view
  quizNum: document.getElementById('demo-quiz-num-label'),
  quizQuestion: document.getElementById('demo-quiz-question'),
  optCards: document.querySelectorAll('.demo-opt-card'),
  
  // Consent
  sigInput: document.getElementById('demo-sig-input'),
  consentNextBtn: document.getElementById('demo-consent-next-btn'),
  upiChk: document.getElementById('demo-upi-chk'),
  telecomChk: document.getElementById('demo-telecom-chk'),
  
  // Scoring
  scoreVal: document.getElementById('demo-score-val'),
  gaugeFill: document.getElementById('demo-gauge-fill'),
  shapItems: [
    document.getElementById('demo-shap-1'),
    document.getElementById('demo-shap-2'),
    document.getElementById('demo-shap-3')
  ],
  scoreNextBtn: document.getElementById('demo-score-next-btn'),
  
  // Disbursement & Success
  disburseBtn: document.getElementById('demo-disburse-btn'),
  successLayer: document.getElementById('demo-success-layer'),
  restartBtn: document.getElementById('demo-restart-btn'),
  langBtn: document.getElementById('lang-toggle-btn')
};

// Wizard State
let state = {
  currentStage: 1,
  quizIndex: 0,
  scoreInterval: null,
  currentLanguage: 'en'
};
const DEMO_TRANSLATIONS = {
  en: {
    backHome: "← Back to App",
    demoBadge: "INTERACTIVE STORY",
    bioTag: "Borrower Profile Case Study",
    bioTitle: "Meet Ramesh, Meerut Kirana Shop Owner",
    bioDesc: "Ramesh has operated a local grocery store in Meerut for 8 years. Because he buys inventory in cash and collects payments via UPI, he has **never taken a bank loan** and has a **CIBIL score of 0 (Thin-File)**. Traditional banks reject him instantly. Follow how SahayCredit evaluates his true repayment capability.",
    timelineHeadline: "End-to-End Credit Journey",
    step1: "Step 1",
    step1Title: "Kirana Questionnaire",
    step1Desc: "Ramesh answers 15 scenario questions. No correct answers, but measures debt discipline and risk tolerance.",
    step1Badge: "3 Min Quiz",
    step2: "Step 2",
    step2Title: "RBI AA Consent",
    step2Desc: "Consents to share bank transactions and utility billing logs. All raw data remains masked on-device.",
    step2Badge: "Data Stays Local",
    step3: "Step 3",
    step3Title: "XGBoost Scoring",
    step3Desc: "Algorithms evaluate cash flows, local geo-stabilities, and quiz results to generate a score of 718/900.",
    step3Badge: "XGBoost: 718/900",
    step4: "Step 4",
    step4Title: "Instant Loan Offer",
    step4Desc: "Receives a ₹2 lakhs credit limit at 14% APR from a partner NBFC. Instant bank transfer, zero branch visits.",
    step4Badge: "₹2 Lakhs approved",
    playBtn: "🚀 Play Interactive Demo",
    wiz1: "1. Quiz",
    wiz2: "2. Consent",
    wiz3: "3. Scoring",
    wiz4: "4. Disbursement",
    stage1Headline: "Stage 1: Psychometric Credit Evaluation",
    stage1Subtitle: "Select an answer on Ramesh's behalf to evaluate his financial behaviors.",
    stage2Headline: "Stage 2: Secure Data Consent (RBI AA)",
    stage2Subtitle: "Configure Ramesh's data feeds. Raw records stay local. Only secure metadata gradients are uploaded.",
    upiTitle: "📊 Bank UPI Statements",
    upiDesc: "Aggregates sales receipts. Raw logs do not leave device.",
    telecomTitle: "📱 Telecom recharge patterns",
    telecomDesc: "Verifies regular postpaid bill cycles. Raw logs remain on device.",
    sigLabel: "Type \"Ramesh\" to digitally sign consent authorization:",
    sigDesc: "RBI Account Aggregator Framework. Digitally bind signature.",
    reassuranceText: "Your data stays on your phone. Always.",
    confirmCompute: "Confirm & Compute Score",
    stage3Headline: "Stage 3: Running XGBoost Scoring Model",
    stage3Subtitle: "Processing signals locally... Masked metadata grades uploaded to compute score weights.",
    gaugeBounds: "Confidence Band: ±15",
    shapHeadline: "XGBoost Credit Drivers (SHAP Weights)",
    shap1: "✓ Consistent shop monthly UPI receipts (8 months)",
    shap2: "✓ Stable Meerut home & shop geo-coordinates",
    shap3: "✓ Low mobile carrier network switching logs",
    viewOffer: "View Partner Loan Offer",
    stage4Headline: "Stage 4: Instant NBFC Credit Approval",
    stage4Subtitle: "FinServe NBFC underwriting matching completes based on alternate 718 score.",
    offerLabel: "Pre-Approved Limit",
    offerPartner: "Partner: FinServe NBFC",
    interestLabel: "Interest Rate",
    interestVal: "14% APR",
    termLabel: "Term Period",
    termVal: "12 Months",
    paperLabel: "Paperwork",
    paperVal: "Zero (Digital)",
    disburseBtn: "Disburse Credit Line",
    successTitle: "Loan Disbursed Instantly!",
    successText: "₹2,00,000 has been transferred to Ramesh's verified bank account.",
    successSub: "Zero branch visits. Zero CIBIL history required.",
    tryAgain: "Try Again"
  },
  hi: {
    backHome: "← मुख्य ऐप पर जाएं",
    demoBadge: "इंटरएक्टिव कहानी",
    bioTag: "उधारकर्ता प्रोफ़ाइल केस स्टडी",
    bioTitle: "रमेश से मिलें, मेरठ के किराना दुकान मालिक",
    bioDesc: "रमेश पिछले 8 वर्षों से मेरठ में एक स्थानीय किराना दुकान चला रहे हैं। चूंकि वह नकद में माल खरीदते हैं और यूपीआई के माध्यम से भुगतान स्वीकार करते हैं, इसलिए उन्होंने कभी बैंक ऋण नहीं लिया है और उनका सिबिल (CIBIL) स्कोर 0 (थिन-फाइल) है। पारंपरिक बैंक उन्हें तुरंत खारिज कर देते हैं। देखें कि सहायक्रेडिट उनकी वास्तविक भुगतान क्षमता का मूल्यांकन कैसे करता है।",
    timelineHeadline: "शुरू से अंत तक क्रेडिट यात्रा",
    step1: "चरण 1",
    step1Title: "किराना प्रश्नावली",
    step1Desc: "रमेश 15 व्यवहारिक परिदृश्यों के प्रश्नों के उत्तर देता है। कोई सही उत्तर नहीं है, लेकिन यह ऋण अनुशासन और जोखिम सहनशीलता को मापता है।",
    step1Badge: "3 मिनट प्रश्नोत्तरी",
    step2: "चरण 2",
    step2Title: "आरबीआई एए सहमति",
    step2Desc: "बैंक लेनदेन और उपयोगिता बिलिंग लॉग साझा करने की सहमति। सभी कच्चा डेटा ऑन-डिवाइस मास्क रहता है।",
    step2Badge: "डेटा ऑन-डिवाइस",
    step3: "चरण 3",
    step3Title: "XGBoost स्कोरिंग",
    step3Desc: "एल्गोरिदम 718/900 का स्कोर उत्पन्न करने के लिए कैश फ्लो, स्थानीय भू-स्थिरता और प्रश्नोत्तरी परिणामों का मूल्यांकन करते हैं।",
    step3Badge: "XGBoost: 718/900",
    step4: "चरण 4",
    step4Title: "त्वरित ऋण प्रस्ताव",
    step4Desc: "साझेदार एनबीएफसी से 14% प्रति वर्ष की दर पर ₹2 लाख की क्रेडिट सीमा प्राप्त करता है। तुरंत बैंक ट्रांसफर, शून्य बैंक शाखा यात्रा।",
    step4Badge: "₹2 लाख स्वीकृत",
    playBtn: "🚀 इंटरएक्टिव डेमो शुरू करें",
    wiz1: "1. प्रश्नोत्तरी",
    wiz2: "2. सहमति",
    wiz3: "3. स्कोरिंग",
    wiz4: "4. संवितरण",
    stage1Headline: "चरण 1: साइकोमेट्रिक क्रेडिट मूल्यांकन",
    stage1Subtitle: "रमेश के वित्तीय व्यवहार का मूल्यांकन करने के लिए उसकी ओर से एक उत्तर चुनें।",
    stage2Headline: "चरण 2: सुरक्षित डेटा सहमति (आरबीआई एए)",
    stage2Subtitle: "रमेश के डेटा फ़ीड को कॉन्फ़िगर करें। कच्चे रिकॉर्ड स्थानीय रहते हैं। केवल सुरक्षित मेटाडेटा ग्रेडिएंट अपलोड किए जाते हैं।",
    upiTitle: "📊 बैंक यूपीआई विवरण",
    upiDesc: "बिक्री प्राप्तियों को एकत्रित करता है। कच्चे लॉग डिवाइस से बाहर नहीं जाते हैं।",
    telecomTitle: "📱 टेलीकॉम रिचार्ज पैटर्न",
    telecomDesc: "नियमित पोस्टपेड बिल चक्रों को सत्यापित करता है। कच्चे लॉग डिवाइस पर रहते हैं।",
    sigLabel: "सहमति प्राधिकरण पर डिजिटल हस्ताक्षर करने के लिए \"Ramesh\" टाइप करें:",
    sigDesc: "आरबीआई खाता एग्रीगेटर ढांचा। डिजिटल रूप से हस्ताक्षर बाध्य करें।",
    reassuranceText: "आपका डेटा आपके फोन पर रहता है। हमेशा।",
    confirmCompute: "सहमति दें और स्कोर की गणना करें",
    stage3Headline: "चरण 3: XGBoost स्कोरिंग मॉडल चलाना",
    stage3Subtitle: "स्थानीय रूप से संकेतों को संसाधित किया जा रहा है... स्कोर भार की गणना करने के लिए मास्क किए गए मेटाडेटा ग्रेडिएंट अपलोड किए गए।",
    gaugeBounds: "कन्फिडेंस बैंड: ±15",
    shapHeadline: "XGBoost क्रेडिट ड्राइवर (SHAP वेट)",
    shap1: "✓ दुकान की लगातार मासिक यूपीआई प्राप्तियां (8 महीने)",
    shap2: "✓ स्थिर मेरठ घर और दुकान भौगोलिक निर्देशांक",
    shap3: "✓ कम मोबाइल नेटवर्क प्रदाता बदलने का इतिहास",
    viewOffer: "साझेदार ऋण प्रस्ताव देखें",
    stage4Headline: "चरण 4: त्वरित एनबीएफसी क्रेडिट स्वीकृति",
    stage4Subtitle: "फिनसर्व एनबीएफसी (FinServe NBFC) अंडरराइटिंग मिलान 718 वैकल्पिक स्कोर के आधार पर पूरा हुआ।",
    offerLabel: "प्री-एप्रूव्ड सीमा",
    offerPartner: "साझेदार: फिनसर्व एनबीएफसी",
    interestLabel: "ब्याज दर",
    interestVal: "14% प्रति वर्ष",
    termLabel: "अवधि",
    termVal: "12 महीने",
    paperLabel: "कागजी कार्रवाई",
    paperVal: "शून्य (डिजिटल)",
    disburseBtn: "क्रेडिट लाइन जारी करें",
    successTitle: "ऋण तुरंत संवितरित किया गया!",
    successText: "₹2,00,000 रमेश के सत्यापित बैंक खाते में स्थानांतरित कर दिए गए हैं।",
    successSub: "शून्य शाखा यात्रा। शून्य सिबिल (CIBIL) इतिहास आवश्यक।",
    tryAgain: "पुनः प्रयास करें"
  }
};

// Sample quiz questions for Ramesh's demo
const DEMO_QUESTIONS = {
  en: [
    {
      num: "Question 1 of 2",
      question: "Your supplier offers a 5% discount on early payments, but you have tight cash flow. What do you do?",
      options: [
        "Borrow short-term from a neighbor to pay early and secure the discount.",
        "Pay the regular price on standard 30-day terms to maintain store liquidity.",
        "Negotiate a partial discount for a partial upfront payment."
      ]
    },
    {
      num: "Question 2 of 2",
      question: "A customer asks for store credit but has a history of delayed payments. What do you do?",
      options: [
        "Politely decline and offer a small discount on immediate cash purchase.",
        "Allow a small credit limit to maintain goodwill and store relationship.",
        "Ask for a guarantor or co-signer before extending any credit."
      ]
    }
  ],
  hi: [
    {
      num: "प्रश्न 1 की कुल 2",
      question: "आपका आपूर्तिकर्ता जल्दी भुगतान पर 5% की छूट देता है, लेकिन आपका कैश फ्लो तंग है। आप क्या करते हैं?",
      options: [
        "जल्दी भुगतान करने और छूट सुरक्षित करने के लिए पड़ोसी से अल्पकालिक उधार लें।",
        "दुकान की तरलता बनाए रखने के लिए मानक 30-दिन की शर्तों पर नियमित कीमत का भुगतान करें।",
        "आंशिक अग्रिम भुगतान के लिए आंशिक छूट पर बातचीत करें।"
      ]
    },
    {
      num: "प्रश्न 2 की कुल 2",
      question: "एक ग्राहक स्टोर क्रेडिट मांगता है लेकिन उसका भुगतान में देरी का इतिहास रहा है। आप क्या करते हैं?",
      options: [
        "नम्रता से मना करें और तत्काल नकद खरीद पर एक छोटी छूट की पेशकश करें।",
        "सद्भावना और दुकान के संबंध को बनाए रखने के लिए एक छोटी क्रेडिट सीमा की अनुमति दें।",
        "कोई भी क्रेडिट देने से पहले एक गारंटर या सह-हस्ताक्षरकर्ता के लिए कहें।"
      ]
    }
  ]
};

// Initialize
function init() {
  bindEvents();
  translateDemoUI();
}

function bindEvents() {
  // Start play button
  dom.startDemoBtn.addEventListener('click', () => {
    dom.playground.style.display = 'block';
    setTimeout(() => {
      dom.playground.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    loadStage(1);
  });

  // Quiz Option selections
  dom.optCards.forEach((card, idx) => {
    card.addEventListener('click', () => {
      // Highlight option
      dom.optCards.forEach(c => c.classList.remove('selected-opt'));
      card.classList.add('selected-opt');
      
      // Delay before advancing
      setTimeout(() => {
        handleQuizSelection(idx);
      }, 500);
    });
  });

  // Signature validation on consent screen
  dom.sigInput.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    // Enable button if user types "ramesh"
    if (val === 'ramesh') {
      dom.consentNextBtn.disabled = false;
    } else {
      dom.consentNextBtn.disabled = true;
    }
  });

  // Consent next button
  dom.consentNextBtn.addEventListener('click', () => {
    // Complete Stage 2
    completeStage(2);
    loadStage(3);
    runScoringSimulation();
  });

  // Scoring next button
  dom.scoreNextBtn.addEventListener('click', () => {
    completeStage(3);
    loadStage(4);
  });

  // Disburse button
  dom.disburseBtn.addEventListener('click', () => {
    // Show success layer
    dom.successLayer.style.display = 'flex';
    completeStage(4);
  });

  // Restart demo button
  dom.restartBtn.addEventListener('click', resetDemo);
  
  // Language toggle button listener
  dom.langBtn.addEventListener('click', toggleLanguage);
}

// Toggle language state
function toggleLanguage() {
  state.currentLanguage = state.currentLanguage === 'en' ? 'hi' : 'en';
  
  // Update toggle button DOM active highlights
  const enLabel = dom.langBtn.querySelector('[data-lang="en"]');
  const hiLabel = dom.langBtn.querySelector('[data-lang="hi"]');
  if (state.currentLanguage === 'en') {
    enLabel.classList.add('active');
    hiLabel.classList.remove('active');
  } else {
    enLabel.classList.remove('active');
    hiLabel.classList.add('active');
  }

  translateDemoUI();
}

// Map localized dictionary values into static layout nodes
function translateDemoUI() {
  const t = DEMO_TRANSLATIONS[state.currentLanguage];
  
  // Header & Bio
  document.getElementById('demo-badge-text').textContent = t.demoBadge;
  document.getElementById('back-home-link-text').textContent = t.backHome;
  document.getElementById('bio-tag').textContent = t.bioTag;
  document.getElementById('bio-title').textContent = t.bioTitle;
  
  document.getElementById('bio-desc').innerHTML = state.currentLanguage === 'hi'
    ? `रमेश पिछले 8 वर्षों से मेरठ में एक स्थानीय किराना दुकान चला रहे हैं। चूंकि वह नकद में माल खरीदते हैं और यूपीआई के माध्यम से भुगतान स्वीकार करते हैं, इसलिए उन्होंने <strong>कभी बैंक ऋण नहीं लिया</strong> है और उनका <strong>सिबिल (CIBIL) स्कोर 0 (थिन-फाइल)</strong> है। पारंपरिक बैंक उन्हें तुरंत खारिज कर देते हैं। देखें कि सहायक्रेडिट उनकी वास्तविक भुगतान क्षमता का मूल्यांकन कैसे करता है।`
    : `Ramesh has operated a local grocery store in Meerut for 8 years. Because he buys inventory in cash and collects payments via UPI, he has <strong>never taken a bank loan</strong> and has a <strong>CIBIL score of 0 (Thin-File)</strong>. Traditional banks reject him instantly. Follow how SahayCredit evaluates his true repayment capability.`;

  // Timeline
  document.getElementById('timeline-headline').textContent = t.timelineHeadline;
  
  document.getElementById('time-step-label-1').textContent = t.step1;
  document.getElementById('time-title-1').textContent = t.step1Title;
  document.getElementById('time-desc-1').textContent = t.step1Desc;
  document.getElementById('time-badge-1').textContent = t.step1Badge;
  
  document.getElementById('time-step-label-2').textContent = t.step2;
  document.getElementById('time-title-2').textContent = t.step2Title;
  document.getElementById('time-desc-2').textContent = t.step2Desc;
  document.getElementById('time-badge-2').textContent = t.step2Badge;
  
  document.getElementById('time-step-label-3').textContent = t.step3;
  document.getElementById('time-title-3').textContent = t.step3Title;
  document.getElementById('time-desc-3').textContent = t.step3Desc;
  document.getElementById('time-badge-3').textContent = t.step3Badge;
  
  document.getElementById('time-step-label-4').textContent = t.step4;
  document.getElementById('time-title-4').textContent = t.step4Title;
  document.getElementById('time-desc-4').textContent = t.step4Desc;
  document.getElementById('time-badge-4').textContent = t.step4Badge;
  
  document.getElementById('start-demo-btn-text').textContent = t.playBtn;

  // Playground Wizard steps
  document.getElementById('wiz-badge-1').textContent = t.wiz1;
  document.getElementById('wiz-badge-2').textContent = t.wiz2;
  document.getElementById('wiz-badge-3').textContent = t.wiz3;
  document.getElementById('wiz-badge-4').textContent = t.wiz4;
  
  // Playground Stage 1
  document.getElementById('stage-1-headline').textContent = t.stage1Headline;
  document.getElementById('stage-1-subtitle').textContent = t.stage1Subtitle;
  
  // Re-render dynamic active playground content
  renderPlaygroundStage();
}

// Dynamic rendering of current active stage text details
function renderPlaygroundStage() {
  const t = DEMO_TRANSLATIONS[state.currentLanguage];
  
  // Stage 1 Quiz rendering
  const q = DEMO_QUESTIONS[state.currentLanguage][state.quizIndex];
  dom.quizNum.textContent = q.num;
  dom.quizQuestion.textContent = q.question;
  dom.optCards.forEach((card, idx) => {
    card.querySelector('.opt-text').textContent = q.options[idx];
  });

  // Stage 2 Consent strings
  document.getElementById('stage-2-headline').textContent = t.stage2Headline;
  document.getElementById('stage-2-subtitle').textContent = t.stage2Subtitle;
  document.getElementById('demo-upi-title').textContent = t.upiTitle;
  document.getElementById('demo-upi-desc').textContent = t.upiDesc;
  document.getElementById('demo-telecom-title').textContent = t.telecomTitle;
  document.getElementById('demo-telecom-desc').textContent = t.telecomDesc;
  document.getElementById('demo-sig-label').textContent = t.sigLabel;
  document.getElementById('demo-sig-desc').textContent = t.sigDesc;
  document.getElementById('demo-reassurance-text').textContent = t.reassuranceText;
  document.getElementById('demo-consent-next-btn-text').textContent = t.confirmCompute;

  // Stage 3 Scoring strings
  document.getElementById('stage-3-headline').textContent = t.stage3Headline;
  document.getElementById('stage-3-subtitle').textContent = t.stage3Subtitle;
  document.getElementById('demo-gauge-bounds-text').textContent = t.gaugeBounds;
  document.getElementById('demo-shap-title').textContent = t.shapHeadline;
  document.getElementById('demo-shap-1').textContent = t.shap1;
  document.getElementById('demo-shap-2').textContent = t.shap2;
  document.getElementById('demo-shap-3').textContent = t.shap3;
  document.getElementById('demo-score-next-btn-text').textContent = t.viewOffer;

  // Stage 4 Offer strings
  document.getElementById('stage-4-headline').textContent = t.stage4Headline;
  document.getElementById('stage-4-subtitle').textContent = t.stage4Subtitle;
  document.getElementById('demo-offer-label').textContent = t.offerLabel;
  document.getElementById('demo-offer-partner').textContent = t.offerPartner;
  document.getElementById('demo-rate-label').textContent = t.interestLabel;
  document.getElementById('demo-rate-val').textContent = t.interestVal;
  document.getElementById('demo-term-label').textContent = t.termLabel;
  document.getElementById('demo-term-val').textContent = t.termVal;
  document.getElementById('demo-paper-label').textContent = t.paperLabel;
  document.getElementById('demo-paper-val').textContent = t.paperVal;
  document.getElementById('demo-disburse-btn-text').textContent = t.disburseBtn;

  // Success screen strings
  document.getElementById('demo-success-title').textContent = t.successTitle;
  document.getElementById('demo-success-text').textContent = t.successText;
  document.getElementById('demo-success-sub').textContent = t.successSub;
  document.getElementById('demo-restart-btn-text').textContent = t.tryAgain;
}

// Load a specific wizard stage pane
function loadStage(stageNum) {
  state.currentStage = stageNum;
  
  // Hide all stages
  for (let s in dom.panes) {
    dom.panes[s].style.display = 'none';
  }
  
  // Show active stage
  dom.panes[stageNum].style.display = 'block';
  
  // Update progress bar active state
  for (let s in dom.badges) {
    if (parseInt(s) === stageNum) {
      dom.badges[s].classList.add('active');
      dom.badges[s].classList.remove('completed');
    } else if (parseInt(s) < stageNum) {
      dom.badges[s].classList.add('completed');
      dom.badges[s].classList.remove('active');
    } else {
      dom.badges[s].classList.remove('active', 'completed');
    }
  }
}

// Mark a journey stage as completed on the timeline cards
function completeStage(stageNum) {
  dom.timeCards[stageNum].classList.add('completed-step');
}

// Handle quiz selection and advances
function handleQuizSelection(optionIndex) {
  if (state.quizIndex === 0) {
    // Move to question 2
    state.quizIndex = 1;
    dom.optCards.forEach(c => c.classList.remove('selected-opt'));
    renderPlaygroundStage();
  } else {
    // Quiz completed
    completeStage(1);
    loadStage(2);
  }
}

// Run XGBoost score increment and circular gauge sweep
function runScoringSimulation() {
  let score = 300;
  dom.scoreVal.textContent = score;
  
  // Dash offset calculations: 300 is 125.6, 900 is 0
  dom.gaugeFill.style.strokeDashoffset = 125.6;
  
  // Clear any existing intervals
  if (state.scoreInterval) {
    clearInterval(state.scoreInterval);
  }
  
  // Sequentially display SHAP items
  dom.shapItems.forEach(item => {
    item.style.opacity = '0';
  });
  
  state.scoreInterval = setInterval(() => {
    // Fast increment
    score += Math.floor(Math.random() * 8) + 4;
    
    if (score >= 718) {
      score = 718;
      clearInterval(state.scoreInterval);
      
      // Reveal next buttons
      setTimeout(() => {
        dom.scoreNextBtn.style.display = 'block';
        dom.scoreNextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 500);
    }
    
    dom.scoreVal.textContent = score;
    
    // Animate circular dial sweep path
    const pct = (score - 300) / 600;
    const offset = 125.6 * (1 - pct);
    dom.gaugeFill.style.strokeDashoffset = offset;
    
    // Sequence SHAP indicator appearances
    if (score >= 420) dom.shapItems[0].style.opacity = '1';
    if (score >= 560) dom.shapItems[1].style.opacity = '1';
    if (score >= 680) dom.shapItems[2].style.opacity = '1';
    
  }, 35);
}

// Reset the entire playground and parameters
function resetDemo() {
  // Clear local variables
  state.currentStage = 1;
  state.quizIndex = 0;
  if (state.scoreInterval) {
    clearInterval(state.scoreInterval);
  }
  
  // Reset elements
  dom.sigInput.value = '';
  dom.consentNextBtn.disabled = true;
  dom.scoreNextBtn.style.display = 'none';
  dom.successLayer.style.display = 'none';
  dom.upiChk.checked = true;
  dom.telecomChk.checked = true;
  
  // Reset timeline card status borders
  for (let s in dom.timeCards) {
    dom.timeCards[s].classList.remove('completed-step');
  }
  
  // Reset quiz options text in active language
  dom.optCards.forEach(card => card.classList.remove('selected-opt'));
  renderPlaygroundStage();
  
  // Hide playground
  dom.playground.style.display = 'none';
  
  // Scroll to header
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Run script
document.addEventListener('DOMContentLoaded', init);
