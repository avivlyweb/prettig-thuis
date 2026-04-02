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
    console.log("🚀 Starting uploadICFCategories function");
    
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
        error: 'Unauthorized. Only specific admins can upload ICF Categories data.' 
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
    let categoriesData;
    try {
      categoriesData = JSON.parse(fileContent);
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
    if (!Array.isArray(categoriesData)) {
      return Response.json({ 
        error: 'JSON must be an array of category objects.' 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log("📊 Found", categoriesData.length, "ICF categories");

    // Clear existing categories first
    const existingCategories = await base44.asServiceRole.entities.ICFCategory.list();
    console.log(`🗑️ Clearing ${existingCategories.length} existing categories...`);
    
    for (const existing of existingCategories) {
      await base44.asServiceRole.entities.ICFCategory.delete(existing.id);
    }
    console.log("✅ Existing categories cleared");

    // Process each category
    let created = 0;
    let errors = 0;

    for (const category of categoriesData) {
      try {
        if (!category.icf_code || !category.display_name || !category.category) {
          console.warn("⚠️ Skipping category with missing required fields:", category);
          errors++;
          continue;
        }

        await base44.asServiceRole.entities.ICFCategory.create({
          icf_code: category.icf_code,
          display_name: category.display_name,
          question: category.question || "",
          info_text: category.info_text || "",
          category: category.category
        });

        created++;

        if (created % 50 === 0) {
          console.log(`✅ Progress: ${created} categories created...`);
        }

      } catch (error) {
        console.error(`❌ Error creating category ${category.icf_code}:`, error);
        errors++;
      }
    }

    console.log("📊 Upload complete:", { created, errors });

    return Response.json({ 
      success: true,
      message: `Successfully uploaded ${created} ICF categories`,
      stats: {
        created,
        errors,
        total: categoriesData.length
      }
    }, { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error("❌ Unexpected error in uploadICFCategories:", error);
    return Response.json({ 
      error: 'An unexpected error occurred: ' + error.message,
      stack: error.stack
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});