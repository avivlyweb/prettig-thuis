import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload,
  Loader,
  CheckCircle,
  AlertTriangle,
  FileText,
  Brain
} from "lucide-react";

export default function AdminTrainingDatasetUpload() {
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
      if (!selectedFile.name.endsWith('.json')) {
        setError("Alleen JSON bestanden zijn toegestaan");
        setFile(null);
        return;
      }
      
      if (!selectedFile.name.includes('2_large_icf_training_dataset') && 
          !selectedFile.name.includes('10_integrated_training')) {
        setError(`Verkeerd bestand! Upload alsjeblieft:\n- 2_large_icf_training_dataset.json\n- of 10_integrated_training.json\n\nJe probeerde te uploaden: ${selectedFile.name}`);
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
      const fileContent = await file.text();
      console.log("📖 File content read, length:", fileContent.length);
      
      const response = await base44.functions.invoke('uploadICFTrainingDataset', { fileContent });
      console.log("📦 Response:", response);

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setResult(response.data);
      setFile(null);
      
      const fileInput = document.getElementById('training-file-input');
      if (fileInput) {
        fileInput.value = '';
      }
      
      console.log("✅ Upload successful!");
    } catch (err) {
      console.error("❌ Upload error:", err);
      const errorMessage = err.message || err.response?.data?.error || "Er is een fout opgetreden bij het uploaden.";
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
        <div className="text-center mb-12">
          <h1 className="font-inter font-bold text-3xl md:text-4xl text-gray-900 mb-4">
            ICF Training Dataset Upload
          </h1>
          <p className="font-lato text-xl text-gray-600 max-w-2xl mx-auto">
            Upload annotated training examples voor de Gesprekspartner AI
          </p>
        </div>

        <Card className="border-2 border-purple-200 bg-purple-50 rounded-2xl mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Brain className="w-8 h-8 text-purple-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-2 text-lg">
                  ⚠️ LET OP: Upload één van deze bestanden
                </h3>
                <div className="bg-white rounded-xl p-4 mb-3 space-y-2">
                  <p className="font-mono text-sm text-purple-800 font-bold">
                    📄 2_large_icf_training_dataset.json
                  </p>
                  <p className="font-mono text-sm text-purple-800 font-bold">
                    📄 10_integrated_training.json
                  </p>
                </div>
                <p className="text-purple-800 text-sm">
                  Deze datasets bevatten geannoteerde gesprekken die de AI helpen om beter te begrijpen 
                  hoe natuurlijke taal vertaald moet worden naar ICF codes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-100 rounded-2xl mb-8">
          <CardHeader>
            <CardTitle className="font-inter flex items-center gap-3">
              <Brain className="w-6 h-6 text-blue-600" />
              Instructies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                Wat bevat deze data:
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span><strong>Geannoteerde zinnen:</strong> Nederlandse zinnen met ICF code annotaties</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span><strong>Confidence scores:</strong> Betrouwbaarheidsscores per annotatie</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span><strong>Validatie info:</strong> Welk type clinicus de annotatie heeft gevalideerd</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span><strong>Context:</strong> Of functie verbetert of verslechtert</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                ⚠️ Belangrijke Opmerkingen:
              </h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Dit kan enkele minuten duren voor grote datasets (1000+ voorbeelden)</li>
                <li>• Bestaande training data wordt vervangen</li>
                <li>• Data wordt verwerkt in batches van 50 voorbeelden tegelijk</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-100 rounded-2xl mb-8">
          <CardHeader>
            <CardTitle className="font-inter flex items-center gap-3">
              <Upload className="w-6 h-6 text-purple-600" />
              Bestand Uploaden
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
              <input
                id="training-file-input"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="training-file-input"
                className="cursor-pointer flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    Klik om JSON bestand te kiezen
                  </p>
                  <p className="text-sm text-gray-600">
                    2_large_icf_training_dataset.json of 10_integrated_training.json
                  </p>
                </div>
              </label>
            </div>

            {file && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-600" />
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
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl"
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

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 mb-1">Fout</p>
                  <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
                </div>
              </div>
            )}

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
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-green-200">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-700">{result.stats.total}</p>
                      <p className="text-xs text-green-600">Totaal</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-700">{result.stats.created}</p>
                      <p className="text-xs text-blue-600">Geüpload</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-700">{result.stats.errors}</p>
                      <p className="text-xs text-red-600">Fouten</p>
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