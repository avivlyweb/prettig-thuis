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
    console.log("🚀 Starting uploadICFTrainingDataset function");
    
    const base44 = createClientFromRequest(req);
    
    // Check authentication
    let user;
    try {
      user = await base44.auth.me();
      console.log("✅ User authenticated:", user.email);
    } catch (authError) {
      console.error("❌ Auth error:", authError);
      return Response.json({ 
        error: 'Authentication required. Please log in.' 
      }, { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    // Check if user is admin
    if (user.email !== "avivlyweb@gmail.com") {
      console.error("❌ Unauthorized user:", user.email);
      return Response.json({ 
        error: 'Unauthorized. Only specific admins can upload ICF Training Dataset.' 
      }, { 
        status: 403, 
        headers: corsHeaders 
      });
    }

    // Parse JSON body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("📦 Request body received");
    } catch (parseError) {
      console.error("❌ Error parsing JSON:", parseError);
      return Response.json({ 
        error: 'Invalid JSON request body: ' + parseError.message 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const fileContent = requestBody.fileContent;

    if (!fileContent) {
      return Response.json({ 
        error: 'No file content provided in the request.' 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log("📖 File content received, length:", fileContent.length);

    // Parse JSON content
    let trainingData;
    try {
      trainingData = JSON.parse(fileContent);
      console.log("✅ JSON parsed successfully");
    } catch (jsonError) {
      console.error("❌ JSON parse error:", jsonError);
      return Response.json({ 
        error: 'Invalid JSON format: ' + jsonError.message 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Validate it's an array
    if (!Array.isArray(trainingData)) {
      return Response.json({ 
        error: 'JSON must be an array of training examples.' 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log("📊 Found", trainingData.length, "training examples");

    // Clear existing training data first
    console.log("🗑️ Clearing existing training data...");
    const existingData = await base44.asServiceRole.entities.ICFTrainingExample.list();
    console.log(`Found ${existingData.length} existing records`);
    
    for (const existing of existingData) {
      await base44.asServiceRole.entities.ICFTrainingExample.delete(existing.id);
    }
    console.log("✅ Existing training data cleared");

    // Process in batches to avoid overwhelming the system
    const BATCH_SIZE = 50;
    let created = 0;
    let errors = 0;

    for (let i = 0; i < trainingData.length; i += BATCH_SIZE) {
      const batch = trainingData.slice(i, i + BATCH_SIZE);
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(trainingData.length / BATCH_SIZE)}`);
      
      const batchPromises = batch.map(async (example) => {
        try {
          if (!example.dialogue_id || !example.sentence || !example.annotations) {
            console.warn("⚠️ Skipping example with missing required fields:", example.dialogue_id);
            errors++;
            return;
          }

          // Extract all ICF codes for quick lookup
          const icf_codes_extracted = example.annotations
            .map(ann => ann.icf_code)
            .filter(code => code);

          await base44.asServiceRole.entities.ICFTrainingExample.create({
            dialogue_id: example.dialogue_id,
            sentence: example.sentence,
            annotations: example.annotations,
            clinician_type: example.clinician_type || "",
            source: example.source || "",
            icf_codes_extracted
          });

          created++;

          if (created % 100 === 0) {
            console.log(`✅ Progress: ${created} examples created...`);
          }

        } catch (error) {
          console.error(`❌ Error creating example ${example.dialogue_id}:`, error);
          errors++;
        }
      });

      await Promise.all(batchPromises);
    }

    console.log("📊 Upload complete:", { created, errors, total: trainingData.length });

    return Response.json({ 
      success: true,
      message: `Successfully uploaded ${created} training examples`,
      stats: {
        created,
        errors,
        total: trainingData.length
      }
    }, { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error("❌ Unexpected error in uploadICFTrainingDataset:", error);
    return Response.json({ 
      error: 'An unexpected error occurred: ' + error.message,
      stack: error.stack
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});