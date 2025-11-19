import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle, AlertTriangle, FileText, Loader } from "lucide-react";
import { ingestICFCodes } from "@/functions/ingestICFCodes";

export default function ICFUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
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
      console.log("📤 Uploading file:", file.name, file.type, file.size);
      
      // Call the function directly using the imported function
      const response = await ingestICFCodes({ file });
      
      console.log("📦 Response:", response);

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setResult(response.data);
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input');
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-inter font-bold text-3xl md:text-4xl text-gray-900 mb-4">
            ICF Codes Uploaden
          </h1>
          <p className="font-lato text-xl text-gray-600 max-w-2xl mx-auto">
            Upload een CSV-bestand met ICF classificatiecodes om de AI-assistent te trainen.
          </p>
        </div>

        {/* Upload Card */}
        <Card className="border-2 border-blue-100 rounded-2xl mb-8">
          <CardHeader>
            <CardTitle className="font-inter flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              Bestand Selecteren
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Input */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="file-input"
                className="cursor-pointer flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    Klik om bestand te kiezen
                  </p>
                  <p className="text-sm text-gray-600">
                    CSV, XLSX of XLS bestanden toegestaan
                  </p>
                </div>
              </label>
            </div>

            {/* Selected File Display */}
            {file && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-green-600" />
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
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl"
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
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Success Display */}
            {result && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900 mb-1">Succesvol!</p>
                  <p className="text-sm text-green-700">
                    {result.message || `${result.count} ICF codes geüpload.`}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card className="border-2 border-gray-200 rounded-2xl">
          <CardHeader>
            <CardTitle className="font-inter">Bestand Vereisten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                Vereiste Kolommen:
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span><strong>scale_code:</strong> Identifier voor de beoordelingsschaal (bijv. micf_adults_scale_difficulty1)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span><strong>icf_code:</strong> De WHO ICF code (bijv. d410, b144) - VERPLICHT</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span><strong>broad_category_en:</strong> Brede categorie (bijv. Physical function)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span><strong>display_name_en:</strong> Leesbare naam (bijv. Changing body position) - VERPLICHT</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span><strong>info_text_en:</strong> Beschrijvende informatie</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span><strong>question_en:</strong> Voorbeeldvraag</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span><strong>answering_scale_en:</strong> Antwoordschaal</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                ⚠️ Belangrijke Opmerkingen:
              </h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Alleen rijen met geldige ICF codes worden geïmporteerd</li>
                <li>• De eerste rijen zonder ICF codes worden overgeslagen</li>
                <li>• Alleen administrators kunnen ICF data uploaden</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}