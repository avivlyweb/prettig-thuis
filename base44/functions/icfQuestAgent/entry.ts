import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// WHO ICF 0-4 severity scale applied to domain codes
// Priority domains per EBP: mild=d230/d177/d5702, moderate=d540/d510/d530, severe=d450/d550
const DOMAIN_SEVERITY_MAP = {
  mild: ["d230", "d177", "d5702", "d760", "d845"],
  moderate: ["d540", "d510", "d520", "d530", "d350"],
  severe: ["d450", "d550", "d530", "d330"],
};

const TIME_BLOCKS = {
  morning: [5, 11],
  midday: [11, 14],
  afternoon: [14, 17],
  evening: [17, 22],
};

function getCurrentTimeBlock() {
  const hour = new Date().getHours();
  for (const [block, [start, end]] of Object.entries(TIME_BLOCKS)) {
    if (hour >= start && hour < end) return block;
  }
  return "anytime";
}

function inferSeverityFromLogs(interviewLogs) {
  // Aggregate ICF codes across all logs, weight by recency
  const codeFrequency = {};
  const now = Date.now();

  for (const log of interviewLogs) {
    const codes = log.inferred_icf_codes || [];
    const daysAgo = (now - new Date(log.session_start).getTime()) / (1000 * 60 * 60 * 24);
    const recencyWeight = Math.max(0.1, 1 - daysAgo / 30); // 30-day window

    for (const code of codes) {
      if (!code) continue;
      const normalized = code.toLowerCase().replace(/\s/g, "");
      codeFrequency[normalized] = (codeFrequency[normalized] || 0) + recencyWeight;
    }
  }

  // WHO 0-4 scale: frequency → severity approximation
  const domainSeverity = {};
  for (const [code, freq] of Object.entries(codeFrequency)) {
    // High frequency = more impaired = higher severity
    let severity = 0;
    if (freq >= 4) severity = 3; // severe
    else if (freq >= 2.5) severity = 2; // moderate  
    else if (freq >= 1) severity = 1; // mild
    domainSeverity[code] = severity;
  }

  return { codeFrequency, domainSeverity };
}

function inferDementiaStage(domainSeverity) {
  const codes = Object.keys(domainSeverity);
  const severePresent = DOMAIN_SEVERITY_MAP.severe.some(c => codes.includes(c) && domainSeverity[c] >= 2);
  const moderatePresent = DOMAIN_SEVERITY_MAP.moderate.some(c => codes.includes(c) && domainSeverity[c] >= 1);

  if (severePresent) return "severe";
  if (moderatePresent) return "moderate";
  return "mild";
}

function scoreQuest(quest, domainSeverity, inferredStage, timeBlock, completions) {
  let score = 50; // base score

  // Stage match: prefer quests designed for this stage
  if (quest.dementia_stage === inferredStage) score += 30;
  else if (
    (inferredStage === "moderate" && quest.dementia_stage === "mild") ||
    (inferredStage === "severe" && quest.dementia_stage === "moderate")
  ) score += 10; // adjacent stage still ok

  // ICF code overlap: reward quests that address impaired domains
  const questCodes = (quest.icf_codes || []).map(c => c.toLowerCase());
  for (const code of questCodes) {
    const sev = domainSeverity[code] || 0;
    if (sev === 1) score += 15; // mild impairment — good candidate for activity
    if (sev === 2) score += 10; // moderate — include with care
    if (sev >= 3) score -= 20; // severe — avoid taxing this domain
  }

  // Time-of-day match
  const tags = quest.tags || [];
  if (tags.includes(timeBlock) || tags.includes("anytime")) score += 20;

  // Cooldown check: penalize recently completed quests
  const lastCompletion = completions.find(c => c.quest_id === quest.quest_id || c.quest_id === quest.id);
  if (lastCompletion) {
    const minutesSince = (Date.now() - new Date(lastCompletion.created_date).getTime()) / 60000;
    const cooldown = quest.cooldown_minutes || 60;
    if (minutesSince < cooldown) score -= 100; // effectively exclude
  }

  // Prefer easier quests for more impaired users
  if (inferredStage === "severe" && quest.difficulty === "Low") score += 10;
  if (inferredStage === "mild" && quest.difficulty === "High") score += 5;

  return score;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = body.user_id || user.id;

    // Fetch interview logs + recent completions + all quests in parallel
    const [interviewLogs, completions, quests] = await Promise.all([
      base44.entities.ICFInterviewLog.filter({ user_id: userId }, "-session_start", 10),
      base44.entities.Completion.filter({ user_id: userId }, "-created_date", 30),
      base44.entities.Quest.list("-created_date", 100),
    ]);

    if (interviewLogs.length === 0) {
      // No profile yet — return popular/easy quests for mild stage
      const fallback = quests
        .filter(q => q.dementia_stage === "mild" && q.difficulty !== "High")
        .slice(0, 3);
      return Response.json({
        suggested_quests: fallback,
        icf_profile: null,
        inferred_stage: "mild",
        message: "Nog geen ICF-profiel. Generieke suggesties getoond.",
      });
    }

    const { codeFrequency, domainSeverity } = inferSeverityFromLogs(interviewLogs);
    const inferredStage = inferDementiaStage(domainSeverity);
    const timeBlock = getCurrentTimeBlock();

    // Score all quests
    const scored = quests
      .map(quest => ({
        quest,
        score: scoreQuest(quest, domainSeverity, inferredStage, timeBlock, completions),
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.quest);

    // Build ICF profile summary for UI display
    const topCodes = Object.entries(codeFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, freq]) => ({
        code,
        severity: domainSeverity[code] || 0,
        frequency: Math.round(freq * 10) / 10,
      }));

    return Response.json({
      suggested_quests: scored,
      icf_profile: {
        top_codes: topCodes,
        domain_severity: domainSeverity,
        inferred_stage: inferredStage,
        time_block: timeBlock,
        based_on_sessions: interviewLogs.length,
      },
      inferred_stage: inferredStage,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});