const INDICATOR_TO_ICF = {
  mobiliteit: ["d410", "d415", "d420", "d450", "d460"],
  spierkracht: ["b730", "b735"],
  voeding: ["b510", "b520", "b530"],
  communicatie: ["b310", "b320", "b330", "d350"],
  balans: ["d410", "d415", "d420"],
  "cognitief functioneren": ["b117", "b140", "b144"],
  huidconditie: ["b810", "b820"],
};

const KEYWORD_TO_INDICATOR = {
  lopen: "mobiliteit",
  wandelen: "mobiliteit",
  trap: "mobiliteit",
  opstaan: "mobiliteit",
  vallen: "balans",
  evenwicht: "balans",
  duizelig: "balans",
  zwak: "spierkracht",
  kracht: "spierkracht",
  moe: "spierkracht",
  eten: "voeding",
  eetlust: "voeding",
  slikken: "voeding",
  praten: "communicatie",
  horen: "communicatie",
  spreken: "communicatie",
  vergeet: "cognitief functioneren",
  geheugen: "cognitief functioneren",
  concentratie: "cognitief functioneren",
  huid: "huidconditie",
  wond: "huidconditie",
};

function normalizeCode(code) {
  return String(code || "").toLowerCase().trim();
}

function extractTextIndicators(text) {
  const lowered = String(text || "").toLowerCase();
  const indicators = new Set();
  for (const [keyword, indicator] of Object.entries(KEYWORD_TO_INDICATOR)) {
    if (lowered.includes(keyword)) indicators.add(indicator);
  }
  return [...indicators];
}

export function interpretIcfCodes({ detectedCodes = [], userText = "", userProfile = {} } = {}) {
  const scoreByCode = new Map();
  const evidence = [];

  for (const code of detectedCodes) {
    if (!code) continue;
    const normalized = normalizeCode(code);
    scoreByCode.set(normalized, Math.max(scoreByCode.get(normalized) || 0, 0.75));
  }

  const profileIndicators = Array.isArray(userProfile?.frailty_indicators)
    ? userProfile.frailty_indicators
    : [];
  const textIndicators = extractTextIndicators(userText);
  const mergedIndicators = [...new Set([...profileIndicators, ...textIndicators])];

  for (const indicator of mergedIndicators) {
    const related = INDICATOR_TO_ICF[indicator] || [];
    const fromText = textIndicators.includes(indicator);
    const boost = fromText ? 0.35 : 0.2;

    if (fromText) {
      evidence.push({
        indicator,
        reason: `Patiënttekst bevat indicator '${indicator}'`,
      });
    }

    for (const code of related) {
      const normalized = normalizeCode(code);
      scoreByCode.set(normalized, Math.min(0.99, (scoreByCode.get(normalized) || 0) + boost));
    }
  }

  const interpreted = [...scoreByCode.entries()]
    .filter(([, score]) => score >= 0.6)
    .sort((a, b) => b[1] - a[1])
    .map(([code, score]) => ({ code, score: Number(score.toFixed(3)) }));

  return {
    interpreted_codes: interpreted.map((item) => item.code),
    interpreted_scores: interpreted,
    indicators_used: mergedIndicators,
    evidence,
  };
}
