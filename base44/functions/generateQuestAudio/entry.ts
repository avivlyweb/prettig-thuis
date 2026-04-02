import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY is not set in secrets." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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

    const { quest_id, text } = await req.json();

    if (!quest_id || !text) {
      throw new Error("Missing quest_id or text parameter");
    }

    console.log(`🎙️ Generating audio for quest: ${quest_id}`);

    // First, fetch the existing quest to get all its data
    const existingQuest = await base44.asServiceRole.entities.Quest.filter({ id: quest_id });
    if (!existingQuest || existingQuest.length === 0) {
      throw new Error(`Quest with id ${quest_id} not found`);
    }
    const quest = existingQuest[0];

    console.log("✅ Quest found:", quest.title);
    console.log("📊 Quest data:", JSON.stringify(quest, null, 2));

    // Generate audio using OpenAI TTS
    const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1-hd",
        voice: "nova",
        input: text,
        speed: 0.9
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("OpenAI TTS API error:", errorText);
      throw new Error(`OpenAI TTS API request failed: ${ttsResponse.status}`);
    }

    const audioData = await ttsResponse.arrayBuffer();
    console.log("✅ Received audio, size:", audioData.byteLength);

    // Create a File object from the audio data
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