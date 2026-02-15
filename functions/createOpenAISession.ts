const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const realtimeModel = Deno.env.get("OPENAI_REALTIME_MODEL") || "gpt-realtime";
  const realtimeVoice = Deno.env.get("OPENAI_REALTIME_VOICE") || "alloy";

  if (!OPENAI_API_KEY) {
    return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not set in secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    console.log("Requesting ephemeral token from OpenAI...");
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: realtimeModel,
          audio: {
            output: {
              voice: realtimeVoice,
            },
          },
        },
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API error:", errorText);
        throw new Error(`OpenAI API request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const normalizedData = data?.value
      ? { ...data, client_secret: { value: data.value } }
      : data;
    console.log("Successfully received ephemeral token.");

    return new Response(JSON.stringify(normalizedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error creating OpenAI session:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
