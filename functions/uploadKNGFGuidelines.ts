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
    console.log("🚀 Starting uploadKNGFGuidelines function");
    
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
        error: 'Unauthorized. Only specific admins can upload KNGF Guidelines data.' 
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
    let guidelineData;
    try {
      guidelineData = JSON.parse(fileContent);
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

    // Validate structure
    if (!guidelineData.metadata || !guidelineData.fall_prevention_guidance) {
      return Response.json({ 
        error: 'JSON must contain "metadata" and "fall_prevention_guidance" objects.' 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log("📊 Processing KNGF Guidelines data");

    // Clear existing guidelines for this version first
    const existingGuidelines = await base44.asServiceRole.entities.KNGFGuideline.filter({ 
      guideline_version: guidelineData.metadata.version 
    });
    
    for (const existing of existingGuidelines) {
      await base44.asServiceRole.entities.KNGFGuideline.delete(existing.id);
    }
    console.log(`🗑️ Cleared ${existingGuidelines.length} existing guidelines`);

    let created = 0;
    let errors = 0;

    try {
      // 1. Store metadata
      await base44.asServiceRole.entities.KNGFGuideline.create({
        guideline_version: guidelineData.metadata.version,
        guideline_description: guidelineData.metadata.description,
        created_date: guidelineData.metadata.created,
        source: guidelineData.metadata.source,
        based_on: guidelineData.metadata.based_on,
        section_type: "metadata",
        section_data: guidelineData.metadata
      });
      created++;
      console.log("✅ Stored metadata");

      // 2. Store risk factors
      await base44.asServiceRole.entities.KNGFGuideline.create({
        guideline_version: guidelineData.metadata.version,
        section_type: "risk_factors",
        risk_factors_intrinsic: guidelineData.fall_prevention_guidance.risk_factors.intrinsic,
        risk_factors_extrinsic: guidelineData.fall_prevention_guidance.risk_factors.extrinsic,
        section_data: guidelineData.fall_prevention_guidance.risk_factors
      });
      created++;
      console.log("✅ Stored risk factors");

      // 3. Store assessment tools
      await base44.asServiceRole.entities.KNGFGuideline.create({
        guideline_version: guidelineData.metadata.version,
        section_type: "assessment_tools",
        clinical_tests: guidelineData.fall_prevention_guidance.assessment_tools.clinical_tests,
        section_data: guidelineData.fall_prevention_guidance.assessment_tools
      });
      created++;
      console.log("✅ Stored assessment tools");

      // 4. Store intervention strategies
      await base44.asServiceRole.entities.KNGFGuideline.create({
        guideline_version: guidelineData.metadata.version,
        section_type: "intervention_strategies",
        exercise_programs: guidelineData.fall_prevention_guidance.intervention_strategies.exercise_programs,
        environmental_modifications: guidelineData.fall_prevention_guidance.intervention_strategies.environmental_modifications,
        education_and_behavior: guidelineData.fall_prevention_guidance.intervention_strategies.education_and_behavior,
        section_data: guidelineData.fall_prevention_guidance.intervention_strategies
      });
      created++;
      console.log("✅ Stored intervention strategies");

      // 5. Store ICF integration
      await base44.asServiceRole.entities.KNGFGuideline.create({
        guideline_version: guidelineData.metadata.version,
        section_type: "icf_integration",
        icf_integration_data: guidelineData.fall_prevention_guidance.icf_integration,
        section_data: guidelineData.fall_prevention_guidance.icf_integration
      });
      created++;
      console.log("✅ Stored ICF integration");

      // 6. Store FAC specific guidance
      await base44.asServiceRole.entities.KNGFGuideline.create({
        guideline_version: guidelineData.metadata.version,
        section_type: "fac_specific_guidance",
        fac_guidance: guidelineData.fac_specific_guidance,
        section_data: guidelineData.fac_specific_guidance
      });
      created++;
      console.log("✅ Stored FAC specific guidance");

    } catch (error) {
      console.error(`❌ Error storing guideline section:`, error);
      errors++;
    }

    console.log("📊 Upload complete:", { created, errors });

    return Response.json({ 
      success: true,
      message: `Successfully processed KNGF Guidelines v${guidelineData.metadata.version}`,
      stats: {
        created,
        errors,
        sections: [
          "metadata",
          "risk_factors", 
          "assessment_tools",
          "intervention_strategies",
          "icf_integration",
          "fac_specific_guidance"
        ]
      }
    }, { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error("❌ Unexpected error in uploadKNGFGuidelines:", error);
    return Response.json({ 
      error: 'An unexpected error occurred: ' + error.message,
      stack: error.stack
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});