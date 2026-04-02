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
    console.log("🚀 Starting uploadFallPreventionGuideline function");
    
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
        error: 'Unauthorized. Only specific admins can upload Fall Prevention Guideline data.' 
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
    if (!guidelineData.metadata) {
      return Response.json({ 
        error: 'JSON must contain a "metadata" object.' 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log("📊 Processing Fall Prevention Guideline data");

    // Clear existing guidelines for this version first
    const existingGuidelines = await base44.asServiceRole.entities.FallPreventionGuideline.filter({ 
      guideline_version: guidelineData.metadata.version 
    });
    
    for (const existing of existingGuidelines) {
      await base44.asServiceRole.entities.FallPreventionGuideline.delete(existing.id);
    }
    console.log(`🗑️ Cleared ${existingGuidelines.length} existing guidelines`);

    let created = 0;
    let errors = 0;

    try {
      // 1. Store complete guideline (for easy full retrieval)
      await base44.asServiceRole.entities.FallPreventionGuideline.create({
        guideline_version: guidelineData.metadata.version,
        guideline_title: guidelineData.metadata.title,
        guideline_description: guidelineData.metadata.description,
        created_date: guidelineData.metadata.created,
        sources: guidelineData.metadata.sources || [],
        total_content_pages: guidelineData.metadata.total_content_pages || 0,
        integration_level: guidelineData.metadata.integration_level || "",
        section_type: "complete",
        section_data: guidelineData
      });
      created++;
      console.log("✅ Stored complete guideline");

      // 2. Store metadata section
      await base44.asServiceRole.entities.FallPreventionGuideline.create({
        guideline_version: guidelineData.metadata.version,
        section_type: "metadata",
        section_data: guidelineData.metadata
      });
      created++;

      // 3. Store clinical framework
      if (guidelineData.clinical_framework) {
        await base44.asServiceRole.entities.FallPreventionGuideline.create({
          guideline_version: guidelineData.metadata.version,
          section_type: "clinical_framework",
          clinical_framework: guidelineData.clinical_framework,
          section_data: guidelineData.clinical_framework
        });
        created++;
      }

      // 4. Store risk assessment
      if (guidelineData.risk_assessment) {
        await base44.asServiceRole.entities.FallPreventionGuideline.create({
          guideline_version: guidelineData.metadata.version,
          section_type: "risk_assessment",
          risk_assessment: guidelineData.risk_assessment,
          section_data: guidelineData.risk_assessment
        });
        created++;
      }

      // 5. Store risk factors
      if (guidelineData.risk_factors) {
        await base44.asServiceRole.entities.FallPreventionGuideline.create({
          guideline_version: guidelineData.metadata.version,
          section_type: "risk_factors",
          risk_factors: guidelineData.risk_factors,
          section_data: guidelineData.risk_factors
        });
        created++;
      }

      // 6. Store assessment tools
      if (guidelineData.assessment_tools) {
        await base44.asServiceRole.entities.FallPreventionGuideline.create({
          guideline_version: guidelineData.metadata.version,
          section_type: "assessment_tools",
          assessment_tools: guidelineData.assessment_tools,
          section_data: guidelineData.assessment_tools
        });
        created++;
      }

      // 7. Store intervention strategies
      if (guidelineData.intervention_strategies) {
        await base44.asServiceRole.entities.FallPreventionGuideline.create({
          guideline_version: guidelineData.metadata.version,
          section_type: "intervention_strategies",
          intervention_strategies: guidelineData.intervention_strategies,
          section_data: guidelineData.intervention_strategies
        });
        created++;
      }

      // 8. Store clinical workflow
      if (guidelineData.clinical_workflow) {
        await base44.asServiceRole.entities.FallPreventionGuideline.create({
          guideline_version: guidelineData.metadata.version,
          section_type: "clinical_workflow",
          clinical_workflow: guidelineData.clinical_workflow,
          section_data: guidelineData.clinical_workflow
        });
        created++;
      }

      // 9. Store evidence framework
      if (guidelineData.evidence_framework) {
        await base44.asServiceRole.entities.FallPreventionGuideline.create({
          guideline_version: guidelineData.metadata.version,
          section_type: "evidence_framework",
          evidence_framework: guidelineData.evidence_framework,
          section_data: guidelineData.evidence_framework
        });
        created++;
      }

      // 10. Store patient communication
      if (guidelineData.patient_communication) {
        await base44.asServiceRole.entities.FallPreventionGuideline.create({
          guideline_version: guidelineData.metadata.version,
          section_type: "patient_communication",
          patient_communication: guidelineData.patient_communication,
          section_data: guidelineData.patient_communication
        });
        created++;
      }

      // 11. Store FAC integration
      if (guidelineData.fac_integration) {
        await base44.asServiceRole.entities.FallPreventionGuideline.create({
          guideline_version: guidelineData.metadata.version,
          section_type: "fac_integration",
          fac_integration: guidelineData.fac_integration,
          section_data: guidelineData.fac_integration
        });
        created++;
      }

    } catch (error) {
      console.error(`❌ Error storing guideline section:`, error);
      errors++;
    }

    console.log("📊 Upload complete:", { created, errors });

    return Response.json({ 
      success: true,
      message: `Successfully processed Fall Prevention Guideline v${guidelineData.metadata.version}`,
      stats: {
        created,
        errors,
        sections: [
          "complete",
          "metadata",
          "clinical_framework", 
          "risk_assessment",
          "risk_factors",
          "assessment_tools",
          "intervention_strategies",
          "clinical_workflow",
          "evidence_framework",
          "patient_communication",
          "fac_integration"
        ]
      }
    }, { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error("❌ Unexpected error in uploadFallPreventionGuideline:", error);
    return Response.json({ 
      error: 'An unexpected error occurred: ' + error.message,
      stack: error.stack
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});