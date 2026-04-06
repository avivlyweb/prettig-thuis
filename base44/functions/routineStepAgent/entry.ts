import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

// EBP-backed step libraries (Alzheimer's Association + KNGF protocols)
const ROUTINE_STEPS = {
  dressing: {
    title: "Aankleden",
    icf_code: "d540",
    steps: [
      "Leg de kleding in de goede volgorde klaar: eerst ondergoed, dan broek, dan shirt.",
      "Pak het ondergoed op en trek het aan.",
      "Pak nu de broek. Trek eerst het ene been er in, dan het andere.",
      "Trek de broek omhoog en sluit hem.",
      "Pak het shirt. Steek eerst je hoofd er doorheen.",
      "Trek de ene arm door de mouw, dan de andere.",
      "Trek het shirt recht. Goed gedaan!",
      "Pak nu de sokken. Trek er één aan per keer.",
      "Als laatste de schoenen. Klaar!",
    ],
  },
  medication: {
    title: "Medicijnen innemen",
    icf_code: "d5702",
    steps: [
      "Het is tijd voor uw medicijnen. We doen dit rustig samen.",
      "Pak de medicijnendoos of het zakje van vandaag.",
      "Open het vakje van vandaag voorzichtig.",
      "Pak een glas water. Neem een slokje om uw mond nat te maken.",
      "Leg de pillen in uw hand. Bekijk welke pillen er zijn.",
      "Neem de pillen in met een flinke slok water.",
      "Goed gedaan! Leg de doos terug op de vaste plek.",
    ],
  },
  washing: {
    title: "Wassen",
    icf_code: "d510",
    steps: [
      "Tijd om u te wassen. Laten we het rustig aanpakken.",
      "Draai de kraan open. Zorg dat het water aangenaam warm aanvoelt.",
      "Pak de washand. Maak hem nat en doe er wat zeep op.",
      "Was eerst uw gezicht, zachtjes in cirkeltjes.",
      "Spoel het gezicht af met schoon water.",
      "Was nu de handen en armen.",
      "Spoel goed af zodat er geen zeep overblijft.",
      "Pak een handdoek en dep uzelf droog. Niet wrijven.",
      "Klaar! U ziet er fris uit.",
    ],
  },
  morning_routine: {
    title: "Ochtendroutine",
    icf_code: "d230",
    steps: [
      "Goedemorgen! We beginnen de dag rustig samen.",
      "Eerst even goed uitrekken in bed voordat u opstaat.",
      "Ga langzaam rechtop zitten. Neem even de tijd.",
      "Zet uw voeten op de vloer. Voel de grond onder uw voeten.",
      "Sta langzaam op. Houd eventueel vast aan de rand van het bed.",
      "Loop naar de badkamer voor wassen en tandenpoetsen.",
      "Daarna aankleden. Ik help u met de stappen.",
      "Dan ontbijt. Een goede dag begint met goed eten.",
    ],
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { routine_type, current_step, user_response, user_name } = body;

    const routine = ROUTINE_STEPS[routine_type];
    if (!routine) {
      return Response.json({ error: "Onbekende routine" }, { status: 400 });
    }

    const totalSteps = routine.steps.length;
    const stepIndex = current_step || 0;

    // Handle user response logic (EBP: cue hierarchy)
    let escalation = null;
    let nextStepIndex = stepIndex;
    let assistMessage = null;

    if (user_response) {
      const response = user_response.toLowerCase();

      const cantDoKeywords = ["kan niet", "wil niet", "nee", "pijn", "moe", "stop", "ik doe het niet", "help"];
      const agitatedKeywords = ["boos", "laat me", "ga weg", "schreeuw", "weg", "niet doen"];
      const doneKeywords = ["klaar", "gedaan", "ja", "goed", "oke", "oké", "prima", "doe het"];

      if (agitatedKeywords.some(k => response.includes(k))) {
        escalation = "agitation";
        assistMessage = "Dat is helemaal goed. Laten we even pauzeren. U hoeft niets. Ik ben er als u wil doorgaan.";
      } else if (cantDoKeywords.some(k => response.includes(k))) {
        escalation = "difficulty";
        // Cue hierarchy: simplify, offer binary choice
        assistMessage = `Geen probleem. Laten we het kleiner maken. Kunt u alleen ${routine.steps[stepIndex].split(".")[0].toLowerCase()}? Ja of nee?`;
      } else if (doneKeywords.some(k => response.includes(k))) {
        nextStepIndex = stepIndex + 1;
      } else {
        // Unknown response — repeat with simpler cue
        assistMessage = `Dat heb ik niet helemaal begrepen. Kunt u zeggen "klaar" als u klaar bent, of "ik kan het niet" als u hulp nodig heeft?`;
      }
    } else {
      nextStepIndex = stepIndex;
    }

    const isComplete = nextStepIndex >= totalSteps;

    // Generate warm, personalized voice text using GPT
    const name = user_name || user.full_name?.split(" ")[0] || "u";
    let stepText;

    if (escalation === "agitation") {
      stepText = assistMessage;
    } else if (escalation === "difficulty") {
      stepText = assistMessage;
    } else if (isComplete) {
      stepText = `Heel goed gedaan, ${name}! U heeft de ${routine.title.toLowerCase()} helemaal afgerond. Dat is geweldig!`;
    } else {
      const rawStep = routine.steps[nextStepIndex];

      // Use AI to personalize the step delivery
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Je bent een warme, geduldige zorgassistent. Spreek in korte zinnen (max 15 woorden). 
            Wees bemoedigend. Gebruik de naam ${name}. Formuleer de instructie als een vriendelijke uitnodiging, niet als een bevel.`,
          },
          {
            role: "user",
            content: `Formuleer deze stap op een warme manier voor iemand met dementie: "${rawStep}"`,
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      });

      stepText = completion.choices[0].message.content;
    }

    return Response.json({
      routine_type,
      routine_title: routine.title,
      icf_code: routine.icf_code,
      current_step: nextStepIndex,
      total_steps: totalSteps,
      step_text: stepText,
      raw_step: routine.steps[nextStepIndex] || null,
      is_complete: isComplete,
      progress_percent: Math.round((nextStepIndex / totalSteps) * 100),
      escalation,
      needs_caregiver_alert: escalation === "agitation",
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});