import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { quest_id } = await req.json();

    if (!quest_id) {
      throw new Error("Missing quest_id parameter");
    }

    console.log(`🎙️ Generating audio for quest: ${quest_id}`);

    // Fetch the existing quest
    const existingQuest = await base44.asServiceRole.entities.Quest.filter({ id: quest_id });
    if (!existingQuest || existingQuest.length === 0) {
      throw new Error(`Quest with id ${quest_id} not found`);
    }
    const quest = existingQuest[0];
    console.log("✅ Quest found:", quest.title);

    // Step 1: Use GPT to rewrite the quest as a warm, elderly-friendly announcement (NO codes or clinical jargon)
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Je bent een vriendelijke zorgassistent voor ouderen met dementie. Schrijf een korte, warme aankondiging (max 2 zinnen) voor een activiteit. Gebruik GEEN medische codes, geen vaktermen. Spreek direct en vriendelijk aan. Zeg alleen de naam van de activiteit en één reden waarom het leuk of goed is."
        },
        {
          role: "user",
          content: `Activiteit: ${quest.title}\nBeschrijving: ${quest.description}`
        }
      ],
      max_tokens: 80,
      temperature: 0.7,
    });
    const friendlyText = gptResponse.choices[0].message.content.trim();
    console.log("✅ Friendly text:", friendlyText);

    // Step 2: Generate audio with gpt-4o-mini-tts
    const ttsResponse = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "coral",
      input: friendlyText,
      instructions: "Spreek op een warme, rustige en vriendelijke toon. Spreek langzaam en duidelijk. Je helpt een oudere persoon met dementie bij het kiezen van een activiteit. Wees bemoedigend.",
      response_format: "mp3",
    });

    const audioData = await ttsResponse.arrayBuffer();
    console.log("✅ Received audio, size:", audioData.byteLength);

    // Upload the audio
    const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
    const audioFile = new File([audioBlob], `quest_${quest.quest_id}.mp3`, { type: 'audio/mpeg' });

    // Upload the audio file to storage using service role
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: audioFile });

    if (!uploadResult || !uploadResult.file_url) {
      throw new Error("Failed to upload audio file");
    }

    console.log("✅ Audio uploaded:", uploadResult.file_url);

    // Prepare update data with all required fields, providing defaults for missing ones
    const updateData = {
      quest_id: quest.quest_id,
      title: quest.title,
      description: quest.description,
      icf_codes: quest.icf_codes || [],
      category: quest.category,
      dementia_stage: quest.dementia_stage || "mild", // Default to "mild" if missing
      difficulty: quest.difficulty,
      cooldown_minutes: quest.cooldown_minutes,
      tags: quest.tags || [],
      quest_voice_url: uploadResult.file_url
    };

    console.log("📝 Updating quest with data:", JSON.stringify(updateData, null, 2));

    // Update the Quest entity with ALL existing data plus the new audio URL
    await base44.asServiceRole.entities.Quest.update(quest_id, updateData);

    console.log("✅ Quest updated with audio URL");

    return new Response(JSON.stringify({ 
      success: true,
      quest_id: quest.quest_id,
      audio_url: uploadResult.file_url 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Error in generateQuestAudio function:", error.message);
    console.error("Stack trace:", error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});