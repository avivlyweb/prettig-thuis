import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json(
        { error: 'Unauthorized' }, 
        { status: 401, headers: corsHeaders }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not set in environment");
      return Response.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log("Requesting ephemeral token from OpenAI...");
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return Response.json(
        { error: `OpenAI API failed: ${response.status} ${errorText}` },
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    console.log("Successfully created OpenAI session");

    return Response.json(data, {
      headers: corsHeaders,
      status: 200,
    });

  } catch (error) {
    console.error("Error creating OpenAI session:", error);
    return Response.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
});