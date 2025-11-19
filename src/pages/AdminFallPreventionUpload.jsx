import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Loader,
  CheckCircle,
  AlertTriangle,
  FileText,
  Shield
} from "lucide-react";

export default function AdminFallPreventionUpload() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      if (currentUser.email !== "avivlyweb@gmail.com") {
        alert("Toegang geweigerd. Deze pagina is alleen voor administrators.");
        window.history.back();
        return;
      }

      setUser(currentUser);
    } catch (error) {
      console.error("Error checking authentication:", error);
      alert("Je moet ingelogd zijn als administrator.");
      window.history.back();
    }
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate it's a JSON file
      if (!selectedFile.name.endsWith('.json')) {
        setError("Alleen JSON bestanden zijn toegestaan");
        setFile(null);
        return;
      }
      
      // Check if it's the correct filename
      if (!selectedFile.name.includes('12_enhanced_fall_prevention')) {
        setError(`Verkeerd bestand! Upload alsjeblieft: 12_enhanced_fall_prevention_2025.json\n\nJe probeerde te uploaden: ${selectedFile.name}`);
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Selecteer eerst een bestand");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      console.log("📤 Reading file:", file.name);
      
      // Read file content as text
      const fileContent = await file.text();
      console.log("📖 File content read, length:", fileContent.length);
      
      // Send the file content as JSON to the backend
      const response = await base44.functions.invoke('uploadFallPreventionGuideline', { fileContent });
      
      console.log("📦 Response:", response);

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setResult(response.data);
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('fall-prevention-file-input');
      if (fileInput) {
        fileInput.value = '';
      }
      
      console.log("✅ Upload successful!");
    } catch (err) {
      console.error("❌ Upload error:", err);
      const errorMessage = err.message || err.response?.data?.error || "Er is een fout opgetreden bij het uploaden. Controleer de console voor meer details.";
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="font-lato text-lg text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-inter font-bold text-3xl md:text-4xl text-gray-900 mb-4">
            Fall Prevention Guideline Upload
          </h1>
          <p className="font-lato text-xl text-gray-600 max-w-2xl mx-auto">
            Upload de Enhanced Fall Prevention Knowledge Base 2025
          </p>
        </div>

        {/* IMPORTANT: Which File Alert */}
        <Card className="border-2 border-red-200 bg-red-50 rounded-2xl mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-red-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-900 mb-2 text-lg">
                  ⚠️ LET OP: Upload het JUISTE bestand!
                </h3>
                <div className="bg-white rounded-xl p-4 mb-3">
                  <p className="font-mono text-sm text-red-800 font-bold">
                    📄 12_enhanced_fall_prevention_2025.json
                  </p>
                </div>
                <p className="text-red-800 text-sm">
                  Dit is bestand #12 uit de map "Gesprekspartner voor ouderen en ICF-classificatieassistent". 
                  Het bevat comprehensive Dutch fall prevention guidelines met KNGF 2025 aanbevelingen.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card className="border-2 border-blue-100 rounded-2xl mb-8">
          <CardHeader>
            <CardTitle className="font-inter flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-600" />
              Instructies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                Bestand Vereisten:
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span><strong>Bestandsnaam:</strong> 12_enhanced_fall_prevention_2025.json</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span><strong>Format:</strong> JSON object met metadata en clinical framework</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span><strong>Inhoud:</strong> Risk assessment, intervention strategies, evidence framework</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                ⚠️ Belangrijke Opmerkingen:
              </h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Bestaande guidelines worden vervangen door nieuwe versie</li>
                <li>• Data wordt opgeslagen in 11 aparte secties voor gemakkelijke toegang</li>
                <li>• Alleen administrators kunnen Fall Prevention Guidelines uploaden</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Upload Card */}
        <Card className="border-2 border-red-100 rounded-2xl mb-8">
          <CardHeader>
            <CardTitle className="font-inter flex items-center gap-3">
              <Upload className="w-6 h-6 text-red-600" />
              Bestand Uploaden
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Input */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-red-400 transition-colors">
              <input
                id="fall-prevention-file-input"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="fall-prevention-file-input"
                className="cursor-pointer flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    Klik om JSON bestand te kiezen
                  </p>
                  <p className="text-sm text-gray-600">
                    12_enhanced_fall_prevention_2025.json
                  </p>
                </div>
              </label>
            </div>

            {/* Selected File Display */}
            {file && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl"
                >
                  {uploading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Uploaden...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 mb-1">Fout</p>
                  <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
                </div>
              </div>
            )}

            {/* Success Display */}
            {result && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900 mb-1">Succesvol!</p>
                    <p className="text-sm text-green-700">
                      {result.message}
                    </p>
                  </div>
                </div>
                
                {result.stats && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="text-sm font-semibold text-green-900 mb-2">
                      {result.stats.created} secties opgeslagen:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.stats.sections.map(section => (
                        <Badge key={section} className="bg-green-100 text-green-800">
                          {section}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}