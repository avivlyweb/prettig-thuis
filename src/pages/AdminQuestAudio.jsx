import { useState, useEffect } from "react";
import { Quest } from "@/entities/Quest";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Volume2,
  Loader,
  CheckCircle,
  AlertTriangle,
  PlayCircle,
  Sparkles,
  Trash2,
  AlertCircle
} from "lucide-react";
import { generateQuestAudio } from "@/functions/generateQuestAudio";
import { updateGenericQuests } from "@/functions/updateGenericQuests";

export default function AdminQuestAudio() {
  const [_user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quests, setQuests] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [playingAudio, setPlayingAudio] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      
      if (currentUser.email !== "avivlyweb@gmail.com") {
        alert("Toegang geweigerd. Deze pagina is alleen voor administrators.");
        window.history.back();
        return;
      }

      setUser(currentUser);
      const questData = await Quest.list();
      setQuests(questData);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Je moet ingelogd zijn als administrator.");
      window.history.back();
    }
    setLoading(false);
  };

  const transformGenericQuests = async () => {
    if (!confirm("Dit zal alle generieke ICF quests transformeren naar natuurlijke activiteiten en hun oude audio verwijderen. Doorgaan?")) {
      return;
    }

    setIsTransforming(true);
    setResults([]);

    try {
      const response = await updateGenericQuests();
      
      if (response.data?.success) {
        alert(`✅ Transformatie voltooid!\n\n${response.data.successCount} quests bijgewerkt\n${response.data.errorCount} fouten`);
        setResults(response.data.results || []);
        
        // Reload quests
        const updatedQuests = await Quest.list();
        setQuests(updatedQuests);
      } else {
        throw new Error(response.data?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Transformation error:', error);
      alert(`Fout bij transformatie: ${error.message}`);
    }

    setIsTransforming(false);
  };

  const clearAllAudio = async () => {
    if (!confirm("Dit zal ALLE audio URLs verwijderen van ALLE quests. Je moet daarna alle audio opnieuw genereren. Doorgaan?")) {
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: quests.length });

    for (let i = 0; i < quests.length; i++) {
      const quest = quests[i];
      try {
        await Quest.update(quest.id, {
          quest_id: quest.quest_id,
          title: quest.title,
          description: quest.description,
          icf_codes: quest.icf_codes || [],
          category: quest.category,
          dementia_stage: quest.dementia_stage || "mild",
          difficulty: quest.difficulty,
          cooldown_minutes: quest.cooldown_minutes,
          tags: quest.tags || [],
          quest_voice_url: null
        });
      } catch (error) {
        console.error(`Error clearing audio for ${quest.title}:`, error);
      }
      setProgress({ current: i + 1, total: quests.length });
    }

    setIsGenerating(false);
    alert('✅ Alle audio URLs verwijderd!');
    
    const updatedQuests = await Quest.list();
    setQuests(updatedQuests);
  };

  const generateAllAudio = async () => {
    if (!quests.length) return;

    // Filter quests that don't have audio yet
    const questsWithoutAudio = quests.filter(q => !q.quest_voice_url);
    
    if (questsWithoutAudio.length === 0) {
      alert("Alle quests hebben al audio!");
      return;
    }

    if (!confirm(`${questsWithoutAudio.length} quests hebben nog geen audio. Audio genereren voor allemaal?`)) {
      return;
    }

    setIsGenerating(true);
    setResults([]);
    setProgress({ current: 0, total: questsWithoutAudio.length });

    for (let i = 0; i < questsWithoutAudio.length; i++) {
      const quest = questsWithoutAudio[i];
      
      try {
        console.log(`🎙️ Generating audio for: ${quest.title}`);

        const response = await generateQuestAudio({
          quest_id: quest.id,
        });

        if (response.data?.success) {
          setResults(prev => [...prev, {
            quest_id: quest.quest_id,
            title: quest.title,
            status: 'success',
            audio_url: response.data.audio_url
          }]);
        } else {
          throw new Error(response.data?.error || 'Unknown error');
        }

      } catch (error) {
        console.error(`Error generating audio for ${quest.title}:`, error);
        setResults(prev => [...prev, {
          quest_id: quest.quest_id,
          title: quest.title,
          status: 'error',
          message: error.message
        }]);
      }

      setProgress({ current: i + 1, total: questsWithoutAudio.length });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsGenerating(false);
    alert('✅ Audio generatie voltooid!');
    
    // Reload quests
    const updatedQuests = await Quest.list();
    setQuests(updatedQuests);
  };

  const playAudio = (audioUrl) => {
    if (playingAudio) {
      playingAudio.pause();
      setPlayingAudio(null);
    }

    const audio = new Audio(audioUrl);
    audio.play();
    audio.onended = () => setPlayingAudio(null);
    setPlayingAudio(audio);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const questsWithAudio = quests.filter(q => q.quest_voice_url);
  const questsWithoutAudio = quests.filter(q => !q.quest_voice_url);
  const genericQuests = quests.filter(q => 
    q.title && (q.title.includes('taak') || q.description?.includes('Voer ICF-activiteit'))
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-inter font-bold text-3xl md:text-4xl text-gray-900 mb-4">
            Quest Audio Beheer
          </h1>
          <p className="font-lato text-xl text-gray-600 max-w-2xl mx-auto">
            Administrator tools voor quest transformatie en audio generatie
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 border-blue-100 rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-gray-600 mb-1">Totaal Quests</p>
              <p className="text-3xl font-bold text-gray-900">{quests.length}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-100 rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-gray-600 mb-1">Met Audio</p>
              <p className="text-3xl font-bold text-green-600">{questsWithAudio.length}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-100 rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-gray-600 mb-1">Zonder Audio</p>
              <p className="text-3xl font-bold text-orange-600">{questsWithoutAudio.length}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-100 rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-gray-600 mb-1">Generieke Quests</p>
              <p className="text-3xl font-bold text-red-600">{genericQuests.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Guide */}
        {genericQuests.length === 0 && questsWithAudio.length > 0 && (
          <Card className="border-2 border-amber-200 bg-amber-50 rounded-2xl mb-8">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-amber-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-2">Audio moet opnieuw gegenereerd worden</h3>
                  <p className="text-amber-800 mb-4">
                    De quest teksten zijn al getransformeerd, maar oude audio bestanden zijn nog aanwezig. 
                    Volg deze stappen om alles te vernieuwen:
                  </p>
                  <ol className="text-amber-800 space-y-2 list-decimal list-inside">
                    <li>Klik op "Verwijder Alle Audio" hieronder (Danger Zone)</li>
                    <li>Klik daarna op "Genereer Audio" om nieuwe audio te maken</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          
          {/* Step 1: Transform Generic Quests */}
          <Card className="border-2 border-purple-200 rounded-2xl">
            <CardHeader>
              <CardTitle className="font-inter flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                Stap 1: Transformeer Generieke Quests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Verander alle "Voer ICF-activiteit dXXX uit" quests naar natuurlijke, vriendelijke activiteiten.
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-sm text-purple-900 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Dit verwijdert ook oude audio URLs
                </p>
              </div>
              {genericQuests.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm text-green-900 font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Alle quests zijn al getransformeerd! ✅
                  </p>
                </div>
              ) : (
                <Button
                  onClick={transformGenericQuests}
                  disabled={isTransforming}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl"
                >
                  {isTransforming ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Bezig met transformeren...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Transformeer {genericQuests.length} Quests
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Generate Audio */}
          <Card className="border-2 border-green-200 rounded-2xl">
            <CardHeader>
              <CardTitle className="font-inter flex items-center gap-2">
                <Volume2 className="w-6 h-6 text-green-600" />
                Stap 2: Genereer Audio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Genereer high-quality audio voor alle quests die nog geen audio hebben.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-green-900 font-medium">
                  {questsWithoutAudio.length} quests hebben audio nodig
                </p>
              </div>
              <Button
                onClick={generateAllAudio}
                disabled={isGenerating || questsWithoutAudio.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl"
              >
                {isGenerating ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Genereren... {progress.current}/{progress.total}
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5 mr-2" />
                    Genereer Audio voor {questsWithoutAudio.length} Quests
                  </>
                )}
              </Button>
              {isGenerating && (
                <Progress value={(progress.current / progress.total) * 100} className="w-full" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Danger Zone */}
        <Card className="border-2 border-red-200 rounded-2xl mb-8">
          <CardHeader>
            <CardTitle className="font-inter flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-6 h-6" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Verwijder Alle Audio</p>
                <p className="text-sm text-gray-600">Dit verwijdert alle audio URLs. Je moet daarna alle audio opnieuw genereren.</p>
              </div>
              <Button
                onClick={clearAllAudio}
                disabled={isGenerating}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Verwijder Alle Audio
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card className="border-2 border-blue-100 rounded-2xl">
            <CardHeader>
              <CardTitle className="font-inter">Resultaten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                      result.status === 'success'
                        ? 'bg-green-50 border-green-200'
                        : result.status === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {result.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : result.status === 'error' ? (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-600" />
                      )}
                      <div>
                        <p className="font-medium">{result.title || result.quest_id}</p>
                        {result.old_title && (
                          <p className="text-sm text-gray-600">
                            Was: {result.old_title}
                          </p>
                        )}
                        {result.message && (
                          <p className="text-sm text-gray-600">{result.message}</p>
                        )}
                      </div>
                    </div>
                    {result.audio_url && (
                      <Button
                        onClick={() => playAudio(result.audio_url)}
                        size="sm"
                        variant="outline"
                      >
                        <PlayCircle className="w-4 h-4 mr-1" />
                        Test
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
