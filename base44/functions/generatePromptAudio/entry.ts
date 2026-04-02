import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';

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
    const { text } = await req.json();
    if (!text) {
      throw new Error("Missing 'text' parameter in the request body.");
    }

    const enhancedText = `${text} *spreekt langzaam en liefdevol*`;

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1-hd",
        voice: "nova",
        input: enhancedText,
        speed: 0.8
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI TTS API error:", errorText);
        throw new Error(`OpenAI TTS API request failed: ${response.status} ${errorText}`);
    }

    const audioData = await response.arrayBuffer();
    console.log("✅ Received caring voice audio, size:", audioData.byteLength);

    // Encode the ArrayBuffer to Base64 to safely transmit it
    const base64Audio = encodeBase64(audioData);

    // Return the base64 string as JSON
    return new Response(JSON.stringify({ audio_base64: base64Audio }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in generatePromptAudio function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});