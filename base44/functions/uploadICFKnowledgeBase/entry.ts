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
    console.log("🚀 Starting uploadICFKnowledgeBase function");
    
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
        error: 'Unauthorized. Only specific admins can upload ICF Knowledge Base data.' 
      }, { 
        status: 403, 
        headers: corsHeaders 
      });
    }

    // Parse JSON body (now we receive the file content as JSON, not FormData)
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
    let knowledgeBaseData;
    try {
      knowledgeBaseData = JSON.parse(fileContent);
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
    if (!knowledgeBaseData.icf_definitions || !Array.isArray(knowledgeBaseData.icf_definitions)) {
      return Response.json({ 
        error: 'JSON must contain an "icf_definitions" array.' 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const icfDefinitions = knowledgeBaseData.icf_definitions;
    console.log("📊 Found", icfDefinitions.length, "ICF definitions");

    // Process each ICF definition
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const definition of icfDefinitions) {
      try {
        const icfCode = definition.icf_code;
        
        if (!icfCode) {
          console.warn("⚠️ Skipping definition without icf_code");
          errors++;
          continue;
        }

        // Check if this ICF code already exists
        const existingCodes = await base44.asServiceRole.entities.ICFCode.filter({ icf_code: icfCode });
        
        // Prepare data for insertion/update
        const icfData = {
          icf_code: icfCode,
          display_name_en: definition.display_name?.en || definition.display_name_en || "",
          display_name_nl: definition.display_name?.nl || definition.display_name_nl || "",
          description_en: definition.description?.en || definition.description_en || "",
          description_nl: definition.description?.nl || definition.description_nl || "",
          domain: definition.domain || "",
          parent_code: definition.parent_code || icfCode,
          related_functions: definition.related_functions || [],
          questions_from_knowledgebase: definition.questions || [],
          examples: definition.examples || [],
          keywords_en: definition.keywords?.en || "",
          keywords_nl: definition.keywords?.nl || "",
          sources: definition.source || [],
          version_knowledgebase: definition.version || "",
          last_updated_knowledgebase: definition.last_updated || new Date().toISOString()
        };

        if (existingCodes && existingCodes.length > 0) {
          // Update existing record
          await base44.asServiceRole.entities.ICFCode.update(existingCodes[0].id, icfData);
          updated++;
          console.log(`✅ Updated: ${icfCode}`);
        } else {
          // Create new record
          await base44.asServiceRole.entities.ICFCode.create(icfData);
          created++;
          console.log(`✅ Created: ${icfCode}`);
        }

      } catch (error) {
        console.error(`❌ Error processing ${definition.icf_code}:`, error);
        errors++;
      }
    }

    console.log("📊 Upload complete:", { created, updated, errors });

    return Response.json({ 
      success: true,
      message: `Successfully processed ${icfDefinitions.length} ICF definitions`,
      stats: {
        created,
        updated,
        errors,
        total: icfDefinitions.length
      }
    }, { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error("❌ Unexpected error in uploadICFKnowledgeBase:", error);
    return Response.json({ 
      error: 'An unexpected error occurred: ' + error.message,
      stack: error.stack
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});