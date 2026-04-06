import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

// EBP-backed step libraries — bilingual (Alzheimer's Association + KNGF)
const ROUTINE_STEPS = {
  dressing: {
    title: { nl: "Aankleden", en: "Getting Dressed" },
    icf_code: "d540",
    steps: {
      nl: [
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
      en: [
        "Lay out the clothes in order: underwear first, then trousers, then shirt.",
        "Pick up the underwear and put it on.",
        "Now the trousers. Put one leg in first, then the other.",
        "Pull the trousers up and fasten them.",
        "Pick up the shirt. Put your head through first.",
        "Thread one arm through the sleeve, then the other.",
        "Straighten the shirt. Well done!",
        "Now the socks. Put on one at a time.",
        "Last, the shoes. All done!",
      ],
    },
  },
  medication: {
    title: { nl: "Medicijnen innemen", en: "Taking Medication" },
    icf_code: "d5702",
    steps: {
      nl: [
        "Het is tijd voor uw medicijnen. We doen dit rustig samen.",
        "Pak de medicijnendoos of het zakje van vandaag.",
        "Open het vakje van vandaag voorzichtig.",
        "Pak een glas water. Neem een slokje om uw mond nat te maken.",
        "Leg de pillen in uw hand. Bekijk welke pillen er zijn.",
        "Neem de pillen in met een flinke slok water.",
        "Goed gedaan! Leg de doos terug op de vaste plek.",
      ],
      en: [
        "It's time for your medication. We'll do this together, nice and easy.",
        "Pick up today's medication box or sachet.",
        "Carefully open today's compartment.",
        "Get a glass of water. Take a small sip to moisten your mouth.",
        "Place the pills in your hand. Have a look at what's there.",
        "Take the pills with a good sip of water.",
        "Well done! Put the box back in its usual spot.",
      ],
    },
  },
  washing: {
    title: { nl: "Wassen", en: "Washing" },
    icf_code: "d510",
    steps: {
      nl: [
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
      en: [
        "Time to wash. Let's take it nice and slow.",
        "Turn on the tap. Make sure the water feels comfortably warm.",
        "Pick up the flannel. Get it wet and add a little soap.",
        "Wash your face first, gently in circles.",
        "Rinse your face with clean water.",
        "Now wash your hands and arms.",
        "Rinse well so no soap is left.",
        "Take a towel and pat yourself dry. No rubbing.",
        "All done! You look fresh.",
      ],
    },
  },
  morning_routine: {
    title: { nl: "Ochtendroutine", en: "Morning Routine" },
    icf_code: "d230",
    steps: {
      nl: [
        "Goedemorgen! We beginnen de dag rustig samen.",
        "Eerst even goed uitrekken in bed voordat u opstaat.",
        "Ga langzaam rechtop zitten. Neem even de tijd.",
        "Zet uw voeten op de vloer. Voel de grond onder uw voeten.",
        "Sta langzaam op. Houd eventueel vast aan de rand van het bed.",
        "Loop naar de badkamer voor wassen en tandenpoetsen.",
        "Daarna aankleden. Ik help u met de stappen.",
        "Dan ontbijt. Een goede dag begint met goed eten.",
      ],
      en: [
        "Good morning! Let's start the day together, nice and easy.",
        "First, have a good stretch in bed before getting up.",
        "Slowly sit upright. Take your time.",
        "Put your feet on the floor. Feel the ground under your feet.",
        "Stand up slowly. Hold the edge of the bed if you need to.",
        "Walk to the bathroom to wash and brush your teeth.",
        "Then get dressed. I'll guide you through the steps.",
        "Then breakfast. A good day starts with a good meal.",
      ],
    },
  },
};

const SYSTEM_PROMPTS = {
  nl: (name) => `Je bent een warme, geduldige zorgassistent. Spreek in korte zinnen (max 15 woorden). 
    Wees bemoedigend. Gebruik de naam ${name}. Formuleer de instructie als een vriendelijke uitnodiging, niet als een bevel.`,
  en: (name) => `You are a warm, patient care assistant. Speak in short sentences (max 15 words). 
    Be encouraging. Use the name ${name}. Frame the instruction as a friendly invitation, not a command.`,
};

const STEP_PROMPT = {
  nl: (step) => `Formuleer deze stap op een warme manier voor iemand met dementie: "${step}"`,
  en: (step) => `Rephrase this step warmly for someone with dementia: "${step}"`,
};

const DIFFICULTY_RESPONSES = {
  agitation: {
    nl: "Dat is helemaal goed. Laten we even pauzeren. U hoeft niets. Ik ben er als u wil doorgaan.",
    en: "That's absolutely fine. Let's pause for a moment. You don't have to do anything. I'm here when you're ready.",
  },
  difficulty: {
    nl: (step) => `Geen probleem. Laten we het kleiner maken. Kunt u alleen ${step.split(".")[0].toLowerCase()}? Ja of nee?`,
    en: (step) => `No problem. Let's make it smaller. Can you just ${step.split(".")[0].toLowerCase()}? Yes or no?`,
  },
};

async function generateTTS(openai, text, lang) {
  const ttsInstructions = lang === "en"
    ? "Speak in a warm, calm, and gentle tone. Speak slowly and clearly. You are helping an elderly person with dementia through their daily routine. Be encouraging and patient."
    : "Spreek op een warme, rustige en vriendelijke toon. Spreek langzaam en duidelijk. Je helpt een oudere persoon met dementie bij hun dagelijkse routine. Wees bemoedigend en geduldig.";

  const ttsResponse = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "coral",
    input: text,
    instructions: ttsInstructions,
    response_format: "mp3",
  });

  return ttsResponse.arrayBuffer();
}

async function generateAndCacheAudio(base44, routineType, stepIndex, lang, stepText) {
  const voice = "coral";

  // Check cache first
  const existing = await base44.asServiceRole.entities.RoutineStepAudio.filter({
    routine_type: routineType,
    step_index: stepIndex,
    lang,
  });

  if (existing && existing.length > 0 && existing[0].audio_url) {
    console.log(`Cache HIT: ${routineType} step ${stepIndex} [${lang}]`);
    return existing[0].audio_url;
  }

  console.log(`Cache MISS: generating TTS for ${routineType} step ${stepIndex} [${lang}]`);

  const audioData = await generateTTS(openai, stepText, lang);
  const audioFile = new File([new Blob([audioData], { type: "audio/mpeg" })], `routine_${routineType}_${stepIndex}_${lang}.mp3`, { type: "audio/mpeg" });
  const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: audioFile });

  if (!uploadResult?.file_url) throw new Error("Upload failed");

  await base44.asServiceRole.entities.RoutineStepAudio.create({
    routine_type: routineType,
    step_index: stepIndex,
    lang,
    step_text: stepText,
    audio_url: uploadResult.file_url,
    voice,
  });

  return uploadResult.file_url;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { routine_type, current_step, user_response, user_name, lang = "nl" } = body;

    const routine = ROUTINE_STEPS[routine_type];
    if (!routine) return Response.json({ error: "Unknown routine" }, { status: 400 });

    const steps = routine.steps[lang] || routine.steps.nl;
    const totalSteps = steps.length;
    const stepIndex = current_step || 0;

    // Handle EBP cue hierarchy response logic
    let escalation = null;
    let nextStepIndex = stepIndex;
    let overrideText = null;

    if (user_response) {
      const response = user_response.toLowerCase();
      const agitatedKw = ["angry", "go away", "stop", "leave me", "boos", "laat me", "weg", "schreeuw"];
      const cantKw = ["can't", "cannot", "won't", "no", "help", "kan niet", "wil niet", "nee", "pijn", "moe"];
      const doneKw = ["done", "ready", "yes", "ok", "good", "next", "skip", "volgende", "overslaan", "klaar", "gedaan", "ja", "oke", "prima", "heb het", "gedaan", "net gedaan"];

      if (agitatedKw.some(k => response.includes(k))) {
        escalation = "agitation";
        overrideText = DIFFICULTY_RESPONSES.agitation[lang];
      } else if (cantKw.some(k => response.includes(k))) {
        escalation = "difficulty";
        overrideText = typeof DIFFICULTY_RESPONSES.difficulty[lang] === "function"
          ? DIFFICULTY_RESPONSES.difficulty[lang](steps[stepIndex])
          : DIFFICULTY_RESPONSES.difficulty[lang];
      } else if (doneKw.some(k => response.includes(k))) {
        nextStepIndex = stepIndex + 1;
      }
    }

    const isComplete = nextStepIndex >= totalSteps;
    const name = user_name || user.full_name?.split(" ")[0] || (lang === "en" ? "you" : "u");

    let stepText;
    let audio_url = null;

    if (escalation) {
      stepText = overrideText;
      // Generate OpenAI TTS for escalation responses (no caching, always fresh)
      try {
        const audioData = await generateTTS(openai, stepText, lang);
        const audioFile = new File([new Blob([audioData], { type: "audio/mpeg" })], `escalation_${lang}.mp3`, { type: "audio/mpeg" });
        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: audioFile });
        if (uploadResult?.file_url) audio_url = uploadResult.file_url;
      } catch (audioErr) {
        console.warn("Escalation TTS skipped:", audioErr.message);
      }
    } else if (isComplete) {
      stepText = lang === "en"
        ? `Well done, ${name}! You've completed the ${routine.title.en.toLowerCase()}. That's wonderful!`
        : `Heel goed gedaan, ${name}! U heeft de ${routine.title.nl.toLowerCase()} helemaal afgerond. Dat is geweldig!`;
      // Generate TTS for completion message too
      try {
        const audioData = await generateTTS(openai, stepText, lang);
        const audioFile = new File([new Blob([audioData], { type: "audio/mpeg" })], `complete_${lang}.mp3`, { type: "audio/mpeg" });
        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: audioFile });
        if (uploadResult?.file_url) audio_url = uploadResult.file_url;
      } catch (audioErr) {
        console.warn("Completion TTS skipped:", audioErr.message);
      }
    } else {
      const rawStep = steps[nextStepIndex];

      // Generate personalized text via GPT
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[lang](name) },
          { role: "user", content: STEP_PROMPT[lang](rawStep) },
        ],
        max_tokens: 100,
        temperature: 0.7,
      });
      stepText = completion.choices[0].message.content;

      // Generate + cache audio
      try {
        audio_url = await generateAndCacheAudio(base44, routine_type, nextStepIndex, lang, stepText);
      } catch (audioErr) {
        console.warn("Audio generation skipped:", audioErr.message);
      }
    }

    return Response.json({
      routine_type,
      routine_title: routine.title[lang],
      icf_code: routine.icf_code,
      current_step: nextStepIndex,
      total_steps: totalSteps,
      step_text: stepText,
      audio_url,
      raw_step: steps[nextStepIndex] || null,
      is_complete: isComplete,
      progress_percent: Math.round((nextStepIndex / totalSteps) * 100),
      escalation,
      needs_caregiver_alert: escalation === "agitation",
      lang,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});