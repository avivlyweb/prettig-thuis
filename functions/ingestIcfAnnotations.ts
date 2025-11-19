import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    console.log("🚀 Starting ingestIcfAnnotations function");
    
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
        error: 'Unauthorized. Only specific admins can upload ICF data.' 
      }, { 
        status: 403, 
        headers: corsHeaders 
      });
    }

    // Parse form data
    let formData;
    try {
      formData = await req.formData();
      console.log("📦 FormData received");
    } catch (formError) {
      console.error("❌ Error parsing form data:", formError);
      return Response.json({ 
        error: 'Invalid form data: ' + formError.message 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const file = formData.get('file');
    const icfInterviewLogId = formData.get('icfInterviewLogId');

    console.log("📄 File:", file ? file.name : 'no file');
    console.log("🆔 ICF Interview Log ID:", icfInterviewLogId);

    if (!file) {
      return Response.json({ 
        error: 'No file provided in the request.' 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    if (!icfInterviewLogId) {
      return Response.json({ 
        error: 'No ICF Interview Log ID provided.' 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Read file content
    let fileContent;
    try {
      fileContent = await file.text();
      console.log("📖 File content read, length:", fileContent.length);
    } catch (readError) {
      console.error("❌ Error reading file:", readError);
      return Response.json({ 
        error: 'Failed to read file content: ' + readError.message 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Parse JSON
    let annotationsData;
    try {
      annotationsData = JSON.parse(fileContent);
      console.log("✅ JSON parsed successfully, items:", Array.isArray(annotationsData) ? annotationsData.length : 'not an array');
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
    if (!Array.isArray(annotationsData)) {
      return Response.json({ 
        error: 'JSON must be an array of annotation objects.' 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Fetch the existing ICF Interview Log
    let existingLog;
    try {
      existingLog = await base44.asServiceRole.entities.ICFInterviewLog.get(icfInterviewLogId);
      console.log("✅ Found existing log:", existingLog.id);
    } catch (fetchError) {
      console.error("❌ Error fetching log:", fetchError);
      return Response.json({ 
        error: 'Could not find ICF Interview Log with ID: ' + icfInterviewLogId 
      }, { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Extract all unique ICF codes from annotations
    const allIcfCodes = new Set();
    annotationsData.forEach(item => {
      if (item.annotations && Array.isArray(item.annotations)) {
        item.annotations.forEach(annotation => {
          if (annotation.icf_code) {
            allIcfCodes.add(annotation.icf_code);
          }
        });
      }
    });

    console.log("📊 Extracted", allIcfCodes.size, "unique ICF codes");

    // Prepare update data
    const updateData = {
      annotated_sentences_json: fileContent,
      detailed_icf_annotations: annotationsData,
      inferred_icf_codes: Array.from(allIcfCodes)
    };

    // Update the log
    try {
      await base44.asServiceRole.entities.ICFInterviewLog.update(icfInterviewLogId, updateData);
      console.log("✅ Successfully updated ICF Interview Log");
    } catch (updateError) {
      console.error("❌ Error updating log:", updateError);
      return Response.json({ 
        error: 'Failed to update ICF Interview Log: ' + updateError.message 
      }, { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    return Response.json({ 
      message: `Successfully ingested ${annotationsData.length} annotated sentences with ${allIcfCodes.size} unique ICF codes.`, 
      count: annotationsData.length,
      icf_codes_count: allIcfCodes.size,
      success: true
    }, { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error("❌ Unexpected error in ingestIcfAnnotations:", error);
    return Response.json({ 
      error: 'An unexpected error occurred: ' + error.message,
      stack: error.stack
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});