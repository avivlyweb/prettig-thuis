import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const base44 = createClientFromRequest(req);
    
    // Check authentication
    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      return Response.json({ 
        error: 'Authentication required' 
      }, { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const { conversationText, recentTranscript } = await req.json();

    if (!conversationText || conversationText.length < 10) {
      return Response.json({ 
        detectedCodes: [],
        confidence: 0,
        analysis: "Insufficient conversation data"
      }, { 
        headers: corsHeaders 
      });
    }

    console.log("🔍 Analyzing conversation for ICF codes...");
    console.log("Text length:", conversationText.length);

    // Load training examples and ICF code data for context
    const [trainingExamples, icfCodes, icfCategories] = await Promise.all([
      base44.asServiceRole.entities.ICFTrainingExample.list('-created_date', 20),
      base44.asServiceRole.entities.ICFCode.list('-created_date', 50),
      base44.asServiceRole.entities.ICFCategory.list('-created_date', 30),
    ]);

    console.log(`📚 Loaded ${trainingExamples.length} training examples, ${icfCodes.length} ICF codes, ${icfCategories.length} categories`);

    // Build context from training examples
    const exampleContext = trainingExamples.slice(0, 10).map(ex => 
      `Zin: "${ex.sentence}"\nICF Codes: ${ex.icf_codes_extracted?.join(', ') || 'none'}`
    ).join('\n\n');

    // Build ICF code reference
    const icfReference = icfCodes.slice(0, 30).map(code =>
      `${code.icf_code}: ${code.display_name_nl || code.display_name_en} - ${code.description_nl || code.description_en || ''}`
    ).join('\n');

    // Create LLM prompt with training data
    const prompt = `Je bent een expert in ICF (International Classification of Functioning, Disability and Health) classificatie voor Nederlandse zorgconversaties.

**JE TAAK:**
Analyseer het volgende gesprek en identificeer ALLE relevante ICF codes op basis van wat de patiënt zegt en impliceert.

**TRAINING VOORBEELDEN uit echte gesprekken:**
${exampleContext}

**ICF CODE REFERENTIE:**
${icfReference}

**BELANGRIJKE ICF DOMEINEN:**
- b1xx: Mentale functies (b144=geheugen, b152=emotionele functies, b140=aandacht, b1300=energieniveau)
- b2xx: Zintuiglijke functies (b280=pijn, b210=visus)
- b7xx: Bewegingsfuncties (b730=spierkracht, b755=onwillekeurige bewegingen, b740=spieruithoudingsvermogen)
- d4xx: Mobiliteit (d410=houding veranderen, d415=houding handhaven, d450=lopen, d455=verplaatsen, d4750=fietsen)
- d5xx: Zelfzorg (d510=wassen, d540=aankleden, d550=eten, d570=medicatie)
- d6xx: Huishouden (d620=boodschappen, d630=maaltijden, d640=huishouden)
- d7xx: Interpersoonlijk (d710=basale interacties, d7200=relaties, d760=familierelaties)
- d9xx: Maatschappelijk leven (d920=ontspanning, d9201=sport)

**GESPREK OM TE ANALYSEREN:**
${conversationText}

**RECENTIE CONTEXT (laatste uitwisselingen):**
${recentTranscript || 'Geen recente context beschikbaar'}

**INSTRUCTIES:**
1. Lees het gesprek zorgvuldig
2. Identificeer alle vermeldingen van:
   - Fysieke problemen (vermoeidheid, zwakte, pijn, evenwicht, vallen)
   - Bewegingsproblemen (lopen, trap, opstaan, zitten)
   - Zelfzorg activiteiten (wassen, aankleden, eten, medicatie)
   - Mentale/emotionele problemen (geheugen, angst, somberheid)
   - Sociale activiteiten (contact met anderen, eenzaamheid)
   - Dagelijkse activiteiten (koken, schoonmaken, boodschappen)
3. Wees SPECIFIEK: als iemand zegt "ik ben moe" → b1300, als ze zeggen "ik ben gevallen" → d450 + d415
4. Denk aan IMPLICATIES: als iemand hulp nodig heeft met traplopen → d455
5. Geef een confidence score (0-1) voor elk gedetecteerde code

Antwoord met ALLEEN een JSON object (geen extra tekst!):
{
  "detected_codes": [
    {"code": "d450", "confidence": 0.9, "reason": "Patiënt noemt 'gevallen' en 'evenwicht'"},
    {"code": "b1300", "confidence": 0.85, "reason": "Patiënt zegt 'zo moe' en 'geen energie'"}
  ],
  "summary": "Korte samenvatting van de belangrijkste bevindingen",
  "keywords_found": ["moe", "gevallen", "evenwicht"]
}`;

    // Call LLM for analysis
    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          detected_codes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                confidence: { type: "number" },
                reason: { type: "string" }
              }
            }
          },
          summary: { type: "string" },
          keywords_found: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    console.log("✅ LLM Analysis complete");
    console.log("Detected codes:", llmResponse.detected_codes?.length || 0);

    return Response.json({
      detected_codes: llmResponse.detected_codes || [],
      summary: llmResponse.summary || "",
      keywords_found: llmResponse.keywords_found || [],
      analysis_method: "LLM + Training Examples",
      training_examples_used: trainingExamples.length,
      icf_codes_referenced: icfCodes.length
    }, {
      headers: corsHeaders
    });

  } catch (error) {
    console.error("❌ Error analyzing conversation:", error);
    return Response.json({
      error: error.message,
      detectedCodes: [],
      analysis: "Analysis failed"
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
});