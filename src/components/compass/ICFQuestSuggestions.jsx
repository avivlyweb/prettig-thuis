import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, Clock, Star, RefreshCw, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

const STAGE_COLORS = {
  mild: "bg-green-100 text-green-800 border-green-200",
  moderate: "bg-amber-100 text-amber-800 border-amber-200",
  severe: "bg-red-100 text-red-800 border-red-200",
};

const SEVERITY_LABELS = {
  0: { label: "Geen beperking", color: "text-green-600" },
  1: { label: "Lichte beperking", color: "text-yellow-600" },
  2: { label: "Matige beperking", color: "text-orange-600" },
  3: { label: "Ernstige beperking", color: "text-red-600" },
  4: { label: "Volledige beperking", color: "text-red-900" },
};

export default function ICFQuestSuggestions({ userId, onQuestSelect }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke("icfQuestAgent", {
        user_id: userId,
      });
      setData(response.data || response);
    } catch {
      setError("Kon suggesties niet laden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [userId]);

  if (loading) {
    return (
      <Card className="border-2 border-purple-100 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center animate-pulse">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">ICF Agent analyseert profiel...</p>
              <p className="text-sm text-gray-500">Gepersonaliseerde activiteiten worden geselecteerd</p>
            </div>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-red-100 rounded-2xl">
        <CardContent className="p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={loadSuggestions} variant="outline" className="mt-3">Opnieuw proberen</Button>
        </CardContent>
      </Card>
    );
  }

  const { suggested_quests = [], icf_profile, inferred_stage } = data || {};

  return (
    <div className="space-y-4">
      {/* ICF Profile Summary */}
      {icf_profile && (
        <Card className="border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-purple-900">ICF Profiel Agent</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${STAGE_COLORS[inferred_stage]} border`}>
                  {inferred_stage === "mild" ? "Licht" : inferred_stage === "moderate" ? "Matig" : "Ernstig"} stadium
                </Badge>
                <Button variant="ghost" size="icon" onClick={loadSuggestions} className="h-7 w-7">
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-purple-700 mb-3">
              Gebaseerd op {icf_profile.based_on_sessions} ICF gesprekken · Tijdvak: {icf_profile.time_block}
            </p>
            <div className="flex flex-wrap gap-2">
              {icf_profile.top_codes.map(({ code, severity }) => {
                const sev = SEVERITY_LABELS[severity] || SEVERITY_LABELS[0];
                return (
                  <div key={code} className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-purple-100">
                    <span className="text-xs font-mono font-bold text-purple-800">{code}</span>
                    <span className={`text-xs ${sev.color}`}>· {sev.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {!icf_profile && (
        <Card className="border-2 border-blue-100 bg-blue-50 rounded-2xl">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">
              💡 Nog geen ICF-profiel. Start een ICF-gesprek voor gepersonaliseerde suggesties.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quest Cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-gray-800">Aanbevolen voor nu</span>
        </div>
        <div className="space-y-3">
          {suggested_quests.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Geen activiteiten gevonden voor dit profiel.</p>
          ) : (
            suggested_quests.map((quest, i) => (
              <Card
                key={quest.id || quest.quest_id || i}
                className="border-2 border-gray-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer rounded-xl"
                onClick={() => onQuestSelect && onQuestSelect(quest)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {i === 0 && <Star className="w-4 h-4 text-amber-500" />}
                        <span className="font-semibold text-gray-900">{quest.title}</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{quest.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(quest.icf_codes || []).slice(0, 3).map(code => (
                          <Badge key={code} variant="outline" className="text-xs font-mono">{code}</Badge>
                        ))}
                        {quest.category && (
                          <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">{quest.category}</Badge>
                        )}
                        {quest.cooldown_minutes && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {quest.cooldown_minutes}m
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
