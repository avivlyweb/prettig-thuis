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

    // Validate every record up front. Do not mutate existing production data
    // unless the replacement dataset is complete and valid.
    const validationErrors: string[] = [];
    const sanitizedExamples = trainingData.map((example, index) => {
      const rowLabel = `index ${index}`;
      if (!example || typeof example !== "object") {
        validationErrors.push(`${rowLabel}: invalid example object`);
        return null;
      }
      if (!example.dialogue_id || !example.sentence || !example.annotations || !Array.isArray(example.annotations)) {
        validationErrors.push(`${rowLabel}: missing required fields (dialogue_id, sentence, annotations[])`);
        return null;
      }

      // Extract all ICF codes for quick lookup
      const icf_codes_extracted = example.annotations
        .map((ann) => ann?.icf_code)
        .filter((code) => code);

      return {
        dialogue_id: example.dialogue_id,
        sentence: example.sentence,
        annotations: example.annotations,
        clinician_type: example.clinician_type || "",
        source: example.source || "",
        icf_codes_extracted
      };
    });

    if (validationErrors.length > 0) {
      console.error("❌ Validation failed:", validationErrors.slice(0, 20));
      return Response.json({
        error: "Validation failed. Upload aborted; no existing data was changed.",
        validation_errors: validationErrors.slice(0, 100),
        total_validation_errors: validationErrors.length
      }, {
        status: 400,
        headers: corsHeaders
      });
    }

    const validExamples = sanitizedExamples.filter(Boolean);
    console.log(`✅ Validation successful for ${validExamples.length} examples`);

    // Snapshot existing data IDs. These are deleted only after all new rows exist.
    const existingData = await base44.asServiceRole.entities.ICFTrainingExample.list();
    console.log(`📚 Existing records before replacement: ${existingData.length}`);

    // Phase 1: Create new dataset first
    const BATCH_SIZE = 50;
    const createdIds: string[] = [];

    try {
      for (let i = 0; i < validExamples.length; i += BATCH_SIZE) {
        const batch = validExamples.slice(i, i + BATCH_SIZE);
        console.log(`📦 Creating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(validExamples.length / BATCH_SIZE)}`);

        const batchResults = await Promise.all(batch.map((example) =>
          base44.asServiceRole.entities.ICFTrainingExample.create(example)
        ));

        for (const createdRecord of batchResults) {
          createdIds.push(createdRecord.id);
        }

        if (createdIds.length % 100 === 0) {
          console.log(`✅ Progress: ${createdIds.length} replacement examples created...`);
        }
      }
    } catch (createError) {
      console.error("❌ Failed while creating replacement dataset. Rolling back new rows.", createError);
      await Promise.all(createdIds.map((id) => base44.asServiceRole.entities.ICFTrainingExample.delete(id).catch(() => null)));
      return Response.json({
        error: "Failed to create replacement dataset. Existing data was preserved.",
        details: createError?.message || String(createError)
      }, {
        status: 500,
        headers: corsHeaders
      });
    }

    // Phase 2: Delete old dataset after replacement is fully created
    let deleteErrors = 0;
    for (const existing of existingData) {
      try {
        await base44.asServiceRole.entities.ICFTrainingExample.delete(existing.id);
      } catch (deleteError) {
        deleteErrors++;
        console.error(`⚠️ Failed to delete old record ${existing.id}:`, deleteError);
      }
    }

    console.log("📊 Upload complete:", {
      created: createdIds.length,
      replaced_old_records: existingData.length,
      delete_errors: deleteErrors,
      total_uploaded: validExamples.length
    });

    return Response.json({
      success: true,
      message: `Successfully uploaded ${createdIds.length} training examples`,
      stats: {
        created: createdIds.length,
        replaced_old_records: existingData.length,
        delete_errors: deleteErrors,
        total_uploaded: validExamples.length
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
