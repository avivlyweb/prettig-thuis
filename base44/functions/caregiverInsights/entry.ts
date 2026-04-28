import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const requestedUserId = typeof body?.userId === "string" ? body.userId.trim() : "";

    // Load last 30 days of care events
    const allCareEvents = await base44.asServiceRole.entities.CareEvent.list("-created_date", 500).catch(() => []);
    const allInterviews = await base44.asServiceRole.entities.ICFInterviewLog.list("-created_date", 50).catch(() => []);
    const matchesRequestedUser = (item) => {
      if (!requestedUserId) return true;
      return item?.user_id === requestedUserId || item?.data?.user_id === requestedUserId;
    };
    const careEvents = allCareEvents.filter(matchesRequestedUser);
    const interviews = allInterviews.filter(matchesRequestedUser);

    // Build summary for GPT
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      return d.toDateString();
    }).reverse();

    // Routine stats per day
    const routinesByDay = {};
    const escalationsByDay = {};
    const completionsByRoutine = {};
    const escalationsByRoutine = {};

    for (const event of careEvents) {
      const day = new Date(event.timestamp || event.created_date).toDateString();
      if (!last7Days.includes(day)) continue;

      if (event.type === "routine_started") {
        routinesByDay[day] = (routinesByDay[day] || 0) + 1;
      }
      if (event.type === "routine_completed") {
        routinesByDay[day] = routinesByDay[day] || 0;
        completionsByRoutine[event.data?.routine_type] = (completionsByRoutine[event.data?.routine_type] || 0) + 1;
      }
      if (event.type === "routine_escalation") {
        escalationsByDay[day] = (escalationsByDay[day] || 0) + 1;
        escalationsByRoutine[event.data?.routine_type] = (escalationsByRoutine[event.data?.routine_type] || 0) + 1;
      }
    }

    const totalEvents = careEvents.length;
    const totalCompletions = Object.values(completionsByRoutine).reduce((a, b) => a + b, 0);
    const totalEscalations = Object.values(escalationsByRoutine).reduce((a, b) => a + b, 0);
    const last7DaysSummary = last7Days.map(day => ({
      day,
      routines: routinesByDay[day] || 0,
      escalations: escalationsByDay[day] || 0,
    }));

    const icfCodesDetected = new Set();
    for (const log of interviews) {
      (log.inferred_icf_codes || []).forEach(c => icfCodesDetected.add(c));
    }

    const summaryForAI = `
Je bent een zorgkundige AI-assistent die een mantelzorger helpt.
Analyseer de volgende gegevens van de afgelopen 7 dagen voor een persoon met dementie en geef praktische, warme adviezen in het Nederlands.

ROUTINEGEGEVENS (laatste 7 dagen):
${last7DaysSummary.map(d => `- ${d.day}: ${d.routines} routines gestart, ${d.escalations} escalaties`).join('\n')}

VOLTOOIDE ROUTINES (totaal):
${Object.entries(completionsByRoutine).map(([k, v]) => `- ${k}: ${v}x voltooid`).join('\n') || 'Nog geen voltooide routines'}

MOEILIJKE MOMENTEN (escalaties per routine):
${Object.entries(escalationsByRoutine).map(([k, v]) => `- ${k}: ${v}x moeite`).join('\n') || 'Geen escalaties geregistreerd'}

ICF DOMEINEN GEDETECTEERD: ${[...icfCodesDetected].join(', ') || 'Geen'}
TOTAAL GEREGISTREERDE EVENTS: ${totalEvents}
TOTAAL VOLTOOIDE ROUTINES: ${totalCompletions}
TOTAAL ESCALATIES: ${totalEscalations}

Geef je analyse in dit exacte JSON formaat:
{
  "overall_trend": "verbeterend" | "stabiel" | "aandacht_nodig",
  "summary": "één zin samenvatting van hoe het gaat",
  "positive_observations": ["lijst van maximaal 3 positieve observaties"],
  "concerns": ["lijst van maximaal 3 aandachtspunten"],
  "recommendations": ["lijst van maximaal 3 concrete aanbevelingen voor de mantelzorger"],
  "prediction": "korte voorspelling wat de komende week te verwachten is op basis van de trend"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: summaryForAI }],
      response_format: { type: "json_object" },
      max_tokens: 600,
      temperature: 0.5,
    });

    const insights = JSON.parse(completion.choices[0].message.content);

    return Response.json({
      insights,
      chartData: last7DaysSummary,
      completionsByRoutine,
      escalationsByRoutine,
      totals: { events: totalEvents, completions: totalCompletions, escalations: totalEscalations },
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
