import { useState, useEffect } from "react";
import { ICFInterviewLog } from "@/entities/ICFInterviewLog";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Clock,
  Code,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  Globe,
  ClipboardList,
  User as UserIcon,
  Stethoscope
} from "lucide-react";

export default function ICFInterviewDashboard() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedInterview, setExpandedInterview] = useState(null);
  const [user, setUser] = useState(null);

  // Evidence-based ICF priorities from research
  const TOP_PRIORITIES = [
    { code: 'b530', label: 'Gewicht onderhoud', color: 'bg-red-100 text-red-800', description: 'Top prioriteit - blijft belangrijk door hele interventie' },
    { code: 'b1300', label: 'Energieniveau', color: 'bg-orange-100 text-orange-800', description: 'Top prioriteit - centraal voor dagelijks functioneren' },
    { code: 'p230', label: 'Zelfvertrouwen', color: 'bg-green-100 text-green-800', description: 'Top 3 - cruciaal voor gedragsverandering' },
    { code: 'd240', label: 'Stresshantering', color: 'bg-blue-100 text-blue-800', description: 'Belangrijk voor psychologisch welzijn' },
    { code: 'd5701', label: 'Dieet & Fitness', color: 'bg-purple-100 text-purple-800', description: 'Top 5 - gezonde levensstijl' },
    { code: 'd9201', label: 'Sport', color: 'bg-pink-100 text-pink-800', description: 'Springt van #13 → #4! Grote winst mogelijk' },
    { code: 'd4750', label: 'Fietsen', color: 'bg-amber-100 text-amber-800', description: '🇳🇱 Unieke Nederlandse prioriteit', cultural: true },
    { code: 'd7200', label: 'Sociale relaties', color: 'bg-indigo-100 text-indigo-800', description: 'Wordt steeds belangrijker tijdens interventie' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me().catch(() => null);
      setUser(currentUser);

      const interviewData = await ICFInterviewLog.list('-created_date');
      setInterviews(interviewData);
    } catch (error) {
      console.error("Error loading interviews:", error);
    }
    setLoading(false);
  };

  const toggleExpand = (interviewId) => {
    setExpandedInterview(expandedInterview === interviewId ? null : interviewId);
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}u ${mins}m`;
  };

  const parseTranscript = (transcriptJson) => {
    try {
      return JSON.parse(transcriptJson);
    } catch {
      return [];
    }
  };

  const analyzePriorities = (interview) => {
    const foundPriorities = TOP_PRIORITIES.filter(priority => 
      interview.inferred_icf_codes?.some(code => 
        code.toLowerCase().includes(priority.code.toLowerCase())
      )
    );
    return foundPriorities;
  };

  const generateGoalSuggestions = (interview) => {
    const suggestions = [];
    const inferredCodes = interview.inferred_icf_codes || [];

    const discussedPriorityCodes = TOP_PRIORITIES.filter(priority => 
      inferredCodes.some(code => code.toLowerCase().includes(priority.code.toLowerCase()))
    ).map(p => p.code);

    TOP_PRIORITIES.forEach(priority => {
      if (!discussedPriorityCodes.includes(priority.code)) {
        if (priority.code === 'b530') {
          suggestions.push({ icon: Target, text: 'Overweeg focus op gewichtsbeheer (b530) - top prioriteit', priority: 'high' });
        } else if (priority.code === 'p230') {
          suggestions.push({ icon: Lightbulb, text: 'Werk aan zelfvertrouwen (p230) - cruciaal voor succes', priority: 'high' });
        } else if (priority.code === 'd9201') {
          suggestions.push({ icon: TrendingUp, text: 'Stimuleer sport/beweging (d9201) - grote winst mogelijk!', priority: 'medium' });
        } else if (priority.code === 'd4750') {
          suggestions.push({ icon: Globe, text: '🇳🇱 Vraag naar fietsen (d4750) - cultureel relevante activiteit', priority: 'low', cultural: true });
        } else if (priority.code === 'b1300') {
          suggestions.push({ icon: Target, text: 'Aandacht voor energieniveau (b1300) - centraal voor dagelijks functioneren', priority: 'medium' });
        } else if (priority.code === 'd240') {
          suggestions.push({ icon: Lightbulb, text: 'Ondersteuning bij stresshantering (d240) - belangrijk voor welzijn', priority: 'medium' });
        } else if (priority.code === 'd5701') {
          suggestions.push({ icon: ClipboardList, text: 'Focus op dieet & fitness (d5701) - gezonde levensstijl', priority: 'medium' });
        } else if (priority.code === 'd7200') {
          suggestions.push({ icon: ClipboardList, text: 'Versterk sociale relaties (d7200) - wordt steeds belangrijker', priority: 'low' });
        }
      }
    });

    return suggestions;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-lg text-gray-600">Dashboard wordt geladen...</p>
        </div>
      </div>
    );
  };

  const totalInterviews = interviews.length;
  const allInferredIcfCodes = interviews.flatMap(i => i.inferred_icf_codes || []);
  const uniqueIcfCodes = [...new Set(allInferredIcfCodes)];
  const avgDuration = interviews.length > 0
    ? interviews.reduce((sum, i) => sum + (i.session_duration_minutes || 0), 0) / interviews.length
    : 0;

  const icfCodeCounts = allInferredIcfCodes.reduce((acc, code) => {
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});
  const sortedIcfCounts = Object.entries(icfCodeCounts).sort(([, a], [, b]) => b - a);
  const mostFrequentIcfCodes = sortedIcfCounts.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-inter font-bold text-3xl text-gray-900 mb-2">
            Gesprekken Analyse Dashboard
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Waardevolle inzichten uit de gesprekken met uw naaste
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-blue-100 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Totaal Gesprekken</p>
                  <p className="text-3xl font-bold text-gray-900">{totalInterviews}</p>
                </div>
                <MessageSquare className="w-12 h-12 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-100 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Unieke ICF Codes</p>
                  <p className="text-3xl font-bold text-gray-900">{uniqueIcfCodes.length}</p>
                </div>
                <Code className="w-12 h-12 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-100 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Gem. Gespreksduur</p>
                  <p className="text-3xl font-bold text-gray-900">{formatDuration(avgDuration)}</p>
                </div>
                <Clock className="w-12 h-12 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Most Frequent ICF Codes */}
        {mostFrequentIcfCodes.length > 0 && (
          <Card className="border-2 border-orange-100 rounded-2xl mb-8">
            <CardHeader>
              <CardTitle className="font-inter flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Meest Besproken Onderwerpen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {mostFrequentIcfCodes.map(([code, count]) => (
                  <Badge key={code} className="bg-orange-100 text-orange-800 text-sm px-3 py-1">
                    {code} ({count}x)
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Research-Based Priority ICF Codes Card */}
        <Card className="border-2 border-green-100 rounded-2xl mb-8">
          <CardHeader>
            <CardTitle className="font-inter flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Belangrijke Aandachtspunten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Deze onderwerpen zijn wetenschappelijk bewezen belangrijk voor welzijn:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {TOP_PRIORITIES.map(priority => (
                <div key={priority.code} className={`p-3 rounded-lg ${priority.color} border border-opacity-20`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{priority.code}</p>
                      <p className="text-xs font-medium">{priority.label}</p>
                    </div>
                    {priority.cultural && (
                      <Globe className="w-4 h-4" />
                    )}
                  </div>
                  <p className="text-xs mt-2 opacity-75">{priority.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Interview List */}
        <div className="space-y-4">
          {interviews.length === 0 ? (
            <Card className="border-2 border-gray-200 rounded-2xl">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-xl text-gray-900 mb-2">
                  Nog geen gesprekken
                </h3>
                <p className="text-gray-600">
                  Start een gesprek met de Gesprekspartner om data te verzamelen.
                </p>
              </CardContent>
            </Card>
          ) : (
            interviews.map((interview) => {
              const isExpanded = expandedInterview === interview.id;
              const transcript = parseTranscript(interview.conversation_transcript);
              const prioritiesFound = analyzePriorities(interview);
              const goalSuggestions = generateGoalSuggestions(interview);
              
              return (
                <Card key={interview.id} className="border-2 border-gray-200 rounded-2xl">
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpand(interview.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="font-inter text-lg mb-2">
                          Gesprek - {new Date(interview.session_start).toLocaleDateString('nl-NL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-blue-50">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDuration(interview.session_duration_minutes || 0)}
                          </Badge>
                          <Badge variant="outline" className="bg-purple-50">
                            <Code className="w-3 h-3 mr-1" />
                            {(interview.inferred_icf_codes || []).length} ICF codes
                          </Badge>
                          <Badge variant="outline" className="bg-green-50">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            {transcript.length} uitwisselingen
                          </Badge>
                          {prioritiesFound.length > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-800">
                              <Target className="w-3 h-3 mr-1" />
                              {prioritiesFound.length} prioriteiten besproken
                            </Badge>
                          )}
                          {interview.mode_switches && interview.mode_switches.length > 0 && (
                            <Badge variant="outline" className="bg-indigo-50">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {interview.mode_switches.length} mode switches
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0 space-y-6">
                      
                      {/* Priority Analysis */}
                      {prioritiesFound.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4 text-green-600" />
                            Besproken Prioriteiten:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {prioritiesFound.map(priority => (
                              <Badge key={priority.code} className={`${priority.color} text-sm px-3 py-1`}>
                                {priority.cultural && <Globe className="w-3 h-3 mr-1 inline" />}
                                {priority.code} - {priority.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Goal Suggestions */}
                      {goalSuggestions.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            Aanbevolen Actiepunten:
                          </h4>
                          <div className="space-y-2">
                            {goalSuggestions.map((suggestion, idx) => (
                              <div key={idx} className={`flex items-start gap-2 ${
                                suggestion.priority === 'high' ? 'text-red-700' : 
                                suggestion.priority === 'medium' ? 'text-orange-700' : 'text-blue-700'
                              }`}>
                                <suggestion.icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <p className="text-sm">{suggestion.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ICF Codes */}
                      {interview.inferred_icf_codes && interview.inferred_icf_codes.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Alle Geïdentificeerde ICF Codes:</h4>
                          <div className="flex flex-wrap gap-2">
                            {interview.inferred_icf_codes.map(code => {
                              const isPriority = TOP_PRIORITIES.find(p => code.toLowerCase().includes(p.code.toLowerCase()));
                              return (
                                <Badge 
                                  key={code} 
                                  className={isPriority ? isPriority.color : "bg-gray-100 text-gray-800"}
                                >
                                  {code}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Transcript */}
                      {transcript.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Gespreksverloop:</h4>
                          <div className="bg-slate-50 rounded-xl p-4 max-h-96 overflow-y-auto space-y-3">
                            {transcript.map((entry, index) => (
                              <div 
                                key={index} 
                                className={`p-3 rounded-lg ${
                                  entry.speaker === 'AI' 
                                    ? 'bg-blue-50 border border-blue-200' 
                                    : 'bg-white border border-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-sm text-gray-700">
                                    {entry.speaker}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(entry.timestamp).toLocaleTimeString('nl-NL')}
                                  </span>
                                </div>
                                <p className="text-gray-900">{entry.text}</p>
                                {entry.mode && (
                                  <Badge className="mt-2 text-xs" variant="outline">
                                    {entry.mode === 'patient' ? 'Patiënt modus' : 'Professional modus'}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mode Switches */}
                      {interview.mode_switches && interview.mode_switches.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Mode Switches:</h4>
                          <div className="space-y-2">
                            {interview.mode_switches.map((sw, index) => (
                              <div key={index} className="flex items-center gap-3 text-sm">
                                <Badge variant="outline">
                                  {new Date(sw.timestamp).toLocaleTimeString('nl-NL')}
                                </Badge>
                                <span className="text-gray-600">
                                  {sw.from_mode} → {sw.to_mode}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Interpretations */}
                      {interview.ai_interpretation_patient && interview.ai_interpretation_patient !== "Samenvatting voor patiënt wordt gegenereerd..." && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <UserIcon className="w-4 h-4" />
                            Samenvatting voor Patiënt:
                          </h4>
                          <p className="text-gray-700 bg-green-50 p-4 rounded-lg">
                            {interview.ai_interpretation_patient}
                          </p>
                        </div>
                      )}

                      {interview.ai_interpretation_professional && interview.ai_interpretation_professional !== "Klinische interpretatie wordt gegenereerd..." && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Stethoscope className="w-4 h-4" />
                            Klinische Interpretatie:
                          </h4>
                          <p className="text-gray-700 bg-blue-50 p-4 rounded-lg">
                            {interview.ai_interpretation_professional}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}