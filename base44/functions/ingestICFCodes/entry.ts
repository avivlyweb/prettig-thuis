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
    const base44 = createClientFromRequest(req);
    
    // Check authentication
    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      console.error("Auth error:", authError);
      return Response.json({ 
        error: 'Authentication required. Please log in.' 
      }, { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    if (!user || user.role !== 'admin') {
      return Response.json({ 
        error: 'Unauthorized. Only admins can upload ICF data.' 
      }, { 
        status: 403, 
        headers: corsHeaders 
      });
    }

    console.log("User authenticated:", user.email);

    // Get the file from form data
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ 
        error: 'No file provided in the request.' 
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log("File received:", file.name, file.type, file.size);

    // Upload the file using the SDK with service role
    console.log("Uploading file to storage...");
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    
    if (!uploadResult || !uploadResult.file_url) {
      throw new Error('File upload to storage failed.');
    }
    
    const fileUrl = uploadResult.file_url;
    console.log("File uploaded successfully to:", fileUrl);

    // Define the JSON schema for extraction from CSV
    const extractionSchema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          scale_code: { type: "string" },
          icf_code: { type: "string" },
          broad_category_en: { type: "string" },
          display_name_en: { type: "string" },
          info_text_en: { type: "string" },
          question_en: { type: "string" },
          answering_scale_en: { type: "string" }
        },
        required: ["icf_code", "display_name_en"]
      }
    };

    // Extract data from the uploaded file
    console.log("Extracting data from file using AI...");
    const extractResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: extractionSchema
    });

    console.log("Extraction result status:", extractResult.status);

    if (extractResult.status === "error") {
      console.error("Extraction error:", extractResult.details);
      throw new Error(`Data extraction failed: ${extractResult.details}`);
    }

    const icfData = extractResult.output;
    console.log("Total rows extracted:", icfData?.length || 0);
    
    if (!Array.isArray(icfData) || icfData.length === 0) {
      return Response.json({ 
        message: 'No valid ICF data could be extracted from the file. Please check the file format.' 
      }, { 
        status: 200, 
        headers: corsHeaders 
      });
    }
    
    // Filter out rows that don't have valid ICF codes
    const validIcfData = icfData.filter(item => 
      item.icf_code && 
      typeof item.icf_code === 'string' && 
      item.icf_code.trim() !== '' &&
      item.display_name_en &&
      typeof item.display_name_en === 'string' &&
      item.display_name_en.trim() !== ''
    );

    console.log("Valid ICF codes after filtering:", validIcfData.length);

    if (validIcfData.length === 0) {
      return Response.json({ 
        message: 'No valid ICF codes found after filtering. Ensure your CSV has "icf_code" and "display_name_en" columns with valid data.' 
      }, { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // Bulk insert into the ICFCode entity using service role
    console.log("Inserting", validIcfData.length, "ICF codes into database...");
    await base44.asServiceRole.entities.ICFCode.bulkCreate(validIcfData);

    console.log("✅ Successfully inserted all ICF codes");

    return Response.json({ 
      message: `Successfully ingested ${validIcfData.length} ICF codes.`, 
      count: validIcfData.length,
      success: true
    }, { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error("❌ Error ingesting ICF codes:", error);
    return Response.json({ 
      error: error.message || 'An unexpected error occurred during ingestion.',
      details: error.stack
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});