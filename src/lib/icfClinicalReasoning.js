import conversationPolicy from "../../conversation_policy.json";
import questionTemplates from "../../icf_question_templates.json";
import interventionRetrieval from "../../intervention_retrieval_logic.json";
import contextSchema from "../../structured_context_factors_schema.json";

const DOMAIN_BY_CODE_PREFIX = {
  d4: "activiteiten_en_participatie_mobiliteit",
  d5: "activiteiten_en_participatie_zelfzorg",
  d6: "activiteiten_en_participatie_huishouden",
  d7: "activiteiten_en_participatie_sociaal",
  d9: "activiteiten_en_participatie_community",
  b1: "lichaamsfuncties_mentaal",
  b2: "lichaamsfuncties_pijn_en_zintuigen",
  b7: "lichaamsfuncties_neuromusculoskeletaal",
  e1: "omgevingsfactoren_producten",
  e3: "omgevingsfactoren_steun",
};

const DOMAIN_KEYWORDS = {
  activiteiten_en_participatie_mobiliteit: ["lopen", "wandelen", "trap", "opstaan", "stoel", "bed"],
  lichaamsfuncties_pijn_en_zintuigen: ["pijn", "zeur", "brand", "steken"],
  lichaamsfuncties_mentaal: ["angst", "bang", "somber", "vergeten", "geheugen", "concentratie"],
  omgevingsfactoren_producten: ["trap", "badkamer", "vloer", "drempel", "licht", "huis", "thuis"],
};

function toLower(value) {
  return String(value || "").toLowerCase();
}

export function getCodeDomain(code) {
  const normalized = toLower(code);
  const prefix = normalized.slice(0, 2);
  return DOMAIN_BY_CODE_PREFIX[prefix] || "overig";
}

function uniq(items) {
  return [...new Set(items)];
}

export function getPolicyRequirements() {
  return {
    rules: conversationPolicy.rules || [],
    minimumDomains: 3,
    minimumFollowupsPerDomain: 2,
  };
}

export function computeCoverage(conversationTranscript = [], detectedCodes = []) {
  const requirements = getPolicyRequirements();
  const templateCodes = Object.keys(questionTemplates.templates || {});
  const trackedDomains = uniq(templateCodes.map(getCodeDomain));
  const aiTurns = conversationTranscript.filter((t) => t.speaker === "AI");
  const patientTurns = conversationTranscript.filter((t) => t.speaker === "Patiënt");

  const domainsFromDetectedCodes = uniq((detectedCodes || []).map(getCodeDomain));
  const domainsFromPatientText = uniq(
    patientTurns
      .flatMap((turn) => {
        const text = toLower(turn.text);
        return Object.entries(DOMAIN_KEYWORDS)
          .filter(([, words]) => words.some((word) => text.includes(word)))
          .map(([domain]) => domain);
      })
  );

  const coveredDomains = uniq([...domainsFromDetectedCodes, ...domainsFromPatientText]);

  const followupsByDomain = {};
  for (const domain of trackedDomains) followupsByDomain[domain] = 0;

  for (const turn of aiTurns) {
    const text = toLower(turn.text);
    if (!text.includes("?")) continue;

    const matchingDomains = new Set();
    for (const [code, questions] of Object.entries(questionTemplates.templates || {})) {
      const domain = getCodeDomain(code);
      for (const question of questions) {
        const normalizedQuestion = toLower(question).replace("?", "");
        if (normalizedQuestion.length > 5 && text.includes(normalizedQuestion.slice(0, Math.min(24, normalizedQuestion.length)))) {
          matchingDomains.add(domain);
        }
      }
    }

    for (const [domain, words] of Object.entries(DOMAIN_KEYWORDS)) {
      if (words.some((word) => text.includes(word))) matchingDomains.add(domain);
    }

    for (const domain of matchingDomains) {
      followupsByDomain[domain] = (followupsByDomain[domain] || 0) + 1;
    }
  }

  const domainStatus = trackedDomains.map((domain) => {
    const detected = coveredDomains.includes(domain);
    const followups = followupsByDomain[domain] || 0;
    return {
      domain,
      detected,
      followups,
      satisfied: detected && followups >= requirements.minimumFollowupsPerDomain,
    };
  });

  const satisfiedDomains = domainStatus.filter((d) => d.satisfied);
  return {
    requirements,
    trackedDomains,
    domainStatus,
    coveredDomains,
    satisfiedDomainCount: satisfiedDomains.length,
    readyForSummary: satisfiedDomains.length >= requirements.minimumDomains,
  };
}

function scoreFactorByKeywords(text, groups) {
  for (const [severity, words] of groups) {
    if (words.some((word) => text.includes(word))) {
      return severity;
    }
  }
  return 0;
}

export function inferContextFactors(patientTurns = []) {
  const text = toLower(patientTurns.map((t) => t.text).join(" "));

  const pain = scoreFactorByKeywords(text, [
    [4, ["ondraaglijk", "constant pijn", "hele dag pijn"]],
    [3, ["veel pijn", "erge pijn", "heftig pijn"]],
    [2, ["pijn", "zeur", "steken", "brandt"]],
    [1, ["beetje pijn", "lichte pijn"]],
  ]);

  const balance = scoreFactorByKeywords(text, [
    [4, ["steeds vallen", "niet blijven staan", "kan niet staan"]],
    [3, ["gevallen", "bijna gevallen", "erg onzeker lopen"]],
    [2, ["duizelig", "wankel", "onzeker lopen", "evenwicht"]],
    [1, ["iets onzeker", "soms wankel"]],
  ]);

  const fearOfFalling = scoreFactorByKeywords(text, [
    [4, ["doodsbang", "paniek", "durf helemaal niet"]],
    [3, ["erg bang", "heel bang", "veel angst"]],
    [2, ["bang", "angst", "onzeker"]],
    [1, ["beetje bang", "lichte angst"]],
  ]);

  const environment = scoreFactorByKeywords(text, [
    [4, ["onveilig huis", "geen hulp", "gevaarlijk thuis"]],
    [3, ["gladde vloer", "slecht licht", "hoge drempel", "steile trap"]],
    [2, ["trap", "drempel", "badkamer", "los kleed", "rommel"]],
    [1, ["kleine obstakel", "soms lastig thuis"]],
  ]);

  const makeEntry = (value, icfCode, keywords) => ({
    icf_code: icfCode,
    severity: value,
    confidence: value > 0 ? 0.78 : 0.55,
    evidence_present: keywords.some((word) => text.includes(word)),
  });

  return {
    schema_description: contextSchema.description,
    factors: {
      pain: makeEntry(pain, "b280", ["pijn", "zeur", "steken"]),
      balance: makeEntry(balance, "b755", ["evenwicht", "duizelig", "wankel", "gevallen"]),
      fear_of_falling: makeEntry(fearOfFalling, "b152", ["bang", "angst", "vallen"]),
      environment: makeEntry(environment, "e155", ["trap", "drempel", "vloer", "licht", "badkamer"]),
    },
  };
}

export function estimateFacScore(detectedCodes = [], contextFactors = {}) {
  const codes = (detectedCodes || []).map(toLower);
  const hasMobility = codes.some((code) => code.startsWith("d4"));
  const balanceSeverity = contextFactors?.factors?.balance?.severity || 0;
  const fearSeverity = contextFactors?.factors?.fear_of_falling?.severity || 0;
  const painSeverity = contextFactors?.factors?.pain?.severity || 0;

  let fac = 5;
  const rationale = [];

  if (hasMobility) {
    fac = Math.min(fac, 4);
    rationale.push("Mobiliteitscodes gedetecteerd in gesprek");
  }
  if (balanceSeverity >= 3) {
    fac = Math.min(fac, 2);
    rationale.push("Hoge balansproblematiek");
  } else if (balanceSeverity === 2) {
    fac = Math.min(fac, 3);
    rationale.push("Matige balansproblematiek");
  }
  if (fearSeverity >= 3) {
    fac = Math.min(fac, 2);
    rationale.push("Sterke valangst beïnvloedt functionele mobiliteit");
  }
  if (painSeverity >= 3) {
    fac = Math.max(0, fac - 1);
    rationale.push("Ernstige pijn verlaagt functioneel lopen");
  }

  return {
    fac_score: Math.max(0, Math.min(5, fac)),
    rationale: rationale.length ? rationale : ["Onvoldoende aanwijzingen voor sterke functionele beperking"],
  };
}

export function retrieveInterventions(detectedCodes = [], contextFactors = {}) {
  const codes = uniq((detectedCodes || []).map((code) => toLower(code)));
  const interventions = [];

  if (codes.some((code) => code.startsWith("d4"))) {
    interventions.push({
      intervention: "Mobiliteitstraining en loopoefeningen",
      source: "KNGF 2025",
      reason: "D4xx mobiliteitscodes aanwezig",
    });
    interventions.push({
      intervention: "Valpreventie- en balanstraining",
      source: "KNGF 2025",
      reason: "Mobiliteitsbeperking met verhoogd valrisico",
    });
  }

  if (codes.includes("b280")) {
    interventions.push({
      intervention: "Pijnmanagement in combinatie met graded activity",
      source: "WHO ICF + KNGF",
      reason: "Pijnfactor beïnvloedt dagelijks functioneren",
    });
  }

  if (codes.includes("b134")) {
    interventions.push({
      intervention: "Slaaphygiëne-advies en dag-nachtritme ondersteuning",
      source: "WHO ICF",
      reason: "Slaapklachten beïnvloeden belastbaarheid",
    });
  }

  if (codes.includes("b152") || (contextFactors?.factors?.fear_of_falling?.severity || 0) >= 2) {
    interventions.push({
      intervention: "Angstreductie en geleidelijke exposure bij bewegen",
      source: "KNGF 2025",
      reason: "Valangst belemmert activiteit en participatie",
    });
  }

  if ((contextFactors?.factors?.environment?.severity || 0) >= 2) {
    interventions.push({
      intervention: "Omgevingsscreening thuis en valgevaarreductie",
      source: "WHO ICF",
      reason: "Omgevingsfactoren verhogen functionele belemmering",
    });
  }

  if (interventions.length === 0) {
    interventions.push({
      intervention: "Algemene functionele monitoring en herbeoordeling",
      source: interventionRetrieval.description,
      reason: "Nog beperkte signalen voor gerichte interventie",
    });
  }

  return uniq(interventions.map((i) => JSON.stringify(i))).map((raw) => JSON.parse(raw));
}

export function getNextTemplateQuestion(conversationTranscript = [], coverage = null) {
  const cov = coverage || computeCoverage(conversationTranscript, []);
  const aiAsked = conversationTranscript
    .filter((turn) => turn.speaker === "AI")
    .map((turn) => toLower(turn.text));

  const unsatisfied = cov.domainStatus
    .filter((d) => !d.satisfied)
    .sort((a, b) => a.followups - b.followups);

  for (const domainItem of unsatisfied) {
    for (const [code, questions] of Object.entries(questionTemplates.templates || {})) {
      if (getCodeDomain(code) !== domainItem.domain) continue;
      for (const q of questions) {
        const normalized = toLower(q);
        if (!aiAsked.some((asked) => asked.includes(normalized.slice(0, 14)))) {
          return { code, domain: domainItem.domain, question: q };
        }
      }
    }
  }

  return {
    code: "generic",
    domain: "algemeen",
    question: "Kunt u beschrijven wat vandaag het lastigst was bij uw dagelijkse activiteiten?",
  };
}

export function buildProfessionalSummary({ detectedCodes = [], coverage, contextFactors, facEstimate, interventions }) {
  const coverageLines = coverage.domainStatus
    .filter((d) => d.detected || d.followups > 0)
    .map((d) => `${d.domain}: detectie=${d.detected ? "ja" : "nee"}, follow-ups=${d.followups}`);

  const context = contextFactors?.factors || {};
  const contextLines = [
    `pijn (b280): ${context.pain?.severity ?? 0}/4`,
    `balans (b755): ${context.balance?.severity ?? 0}/4`,
    `valangst (b152): ${context.fear_of_falling?.severity ?? 0}/4`,
    `omgeving (e155): ${context.environment?.severity ?? 0}/4`,
  ];

  return [
    "Samenvatting voor professional:",
    "",
    `ICF-samenvatting (code + domein): ${uniq(detectedCodes).join(", ") || "geen sterke codes gedetecteerd"}`,
    ...coverageLines.map((line) => `- ${line}`),
    "",
    `FAC-inschatting: ${facEstimate.fac_score}/5`,
    `Rationale: ${facEstimate.rationale.join("; ")}`,
    "",
    "Contextfactoren:",
    ...contextLines.map((line) => `- ${line}`),
    "",
    "Aanbevolen interventies (KNGF/WHO ICF):",
    ...interventions.map((it) => `- ${it.intervention} (${it.source}) – ${it.reason}`),
  ].join("\n");
}

export function buildPatientSummary(userName = "u", coverage) {
  const done = coverage.satisfiedDomainCount;
  return `Dank u ${userName}, u heeft veel duidelijk verteld. We hebben nu ${done} belangrijke domeinen besproken. Uw zorgverlener krijgt een samenvatting, zodat de ondersteuning beter op uw dagelijks leven aansluit.`;
}
