import { useEffect, useMemo, useState } from "react";
import { ICFInterviewLog } from "@/entities/ICFInterviewLog";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listCareEvents } from "@/lib/careEvents";
import {
  MessageSquare,
  Clock,
  Code,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Mic,
  User as UserIcon,
  Stethoscope
} from "lucide-react";

export default function ICFInterviewDashboard() {
  const [interviews, setInterviews] = useState([]);
  const [careEvents, setCareEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedInterview, setExpandedInterview] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me().catch(() => null);

      const interviewData = await ICFInterviewLog.list('-created_date');
      setInterviews(interviewData);
      const eventData = await listCareEvents({ limit: 1000, userId: currentUser?.id });
      setCareEvents(eventData);
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

  const getPatientTurns = (transcript) =>
    transcript.filter((entry) => entry?.speaker === "Patiënt" && entry?.text);

  const getInterviewTimeRange = (interview) => {
    const start = new Date(interview.session_start).getTime();
    const end = interview.session_end ? new Date(interview.session_end).getTime() : start + 60 * 60 * 1000;
    return { start, end };
  };

  const getRelatedEvents = (interview) => {
    const { start, end } = getInterviewTimeRange(interview);
    return careEvents.filter((event) => {
      const ts = new Date(event.timestamp).getTime();
      return ts >= start - (30 * 60 * 1000) && ts <= end + (30 * 60 * 1000);
    });
  };

  const STOPWORDS = new Set([
    "ik", "je", "jij", "u", "we", "wij", "en", "de", "het", "een", "dat", "dit", "dan", "met", "van",
    "voor", "op", "in", "te", "is", "ben", "was", "zijn", "heb", "heeft", "had", "niet", "wel", "maar",
    "ook", "nog", "al", "als", "aan", "bij", "om", "mijn", "uw", "ons", "ze", "zij", "hij", "haar",
    "hem", "wat", "hoe", "waar", "wie", "waarom", "ja", "nee", "goed", "gaat", "doen", "kan", "kunnen"
  ]);

  const extractTopKeywords = (texts, limit = 10) => {
    const counts = {};
    for (const text of texts) {
      const words = (text || "")
        .toLowerCase()
        .split(/[^a-zA-ZÀ-ÿ0-9]+/)
        .filter((word) => word.length >= 4 && !STOPWORDS.has(word));
      for (const word of words) counts[word] = (counts[word] || 0) + 1;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);
  };

  const dashboardData = useMemo(() => {
    const transcripts = interviews.map((i) => parseTranscript(i.conversation_transcript));
    const allPatientTurns = transcripts.flatMap((t) => getPatientTurns(t));
    const patientTexts = allPatientTurns.map((t) => t.text);

    const allIcfCodes = [
      ...interviews.flatMap((i) => i.inferred_icf_codes || []),
      ...careEvents.flatMap((e) => e.icf_tags || []),
    ];
    const icfCounts = allIcfCodes.reduce((acc, code) => {
      if (!code) return acc;
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {});

    const activityEvents = careEvents.filter((e) =>
      ["quest_started", "adl_complete", "memory_view", "compass_choice"].includes(e.type)
    );

    const activityCounts = activityEvents.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {});

    const patientCheckins = careEvents.filter((e) =>
      e.type === "checkin" && (e.speaker === "user" || e.data?.speaker === "user")
    );

    return {
      totalInterviews: interviews.length,
      uniqueIcfCodes: Object.keys(icfCounts).length,
      avgDuration: interviews.length > 0
        ? interviews.reduce((sum, i) => sum + (i.session_duration_minutes || 0), 0) / interviews.length
        : 0,
      patientTurnCount: allPatientTurns.length,
      patientCheckinCount: patientCheckins.length,
      topIcfCodes: Object.entries(icfCounts).sort(([, a], [, b]) => b - a).slice(0, 8),
      topKeywords: extractTopKeywords(patientTexts, 10),
      activityCounts,
    };
  }, [interviews, careEvents]);

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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-inter font-bold text-3xl text-gray-900 mb-2">
            Gesprekken Analyse Dashboard
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Inzichten op basis van echte patiëntgesprekken en dagelijkse activiteiten
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="border-2 border-blue-100 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Totaal Gesprekken</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardData.totalInterviews}</p>
                </div>
                <MessageSquare className="w-12 h-12 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-cyan-100 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Patiënt Uitspraken</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardData.patientTurnCount}</p>
                </div>
                <Mic className="w-12 h-12 text-cyan-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-100 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Unieke ICF Codes</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardData.uniqueIcfCodes}</p>
                </div>
                <Code className="w-12 h-12 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-100 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Activiteiten</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {(dashboardData.activityCounts.quest_started || 0) + (dashboardData.activityCounts.adl_complete || 0)}
                  </p>
                </div>
                <ClipboardList className="w-12 h-12 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-100 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Gem. Gespreksduur</p>
                  <p className="text-3xl font-bold text-gray-900">{formatDuration(dashboardData.avgDuration)}</p>
                </div>
                <Clock className="w-12 h-12 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Most Frequent ICF Codes */}
        {dashboardData.topIcfCodes.length > 0 && (
          <Card className="border-2 border-orange-100 rounded-2xl mb-8">
            <CardHeader>
              <CardTitle className="font-inter flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Meest Genoemde ICF Codes (spraak + activiteiten)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {dashboardData.topIcfCodes.map(([code, count]) => (
                  <Badge key={code} className="bg-orange-100 text-orange-800 text-sm px-3 py-1">
                    {code} ({count}x)
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patient-driven insights */}
        <Card className="border-2 border-green-100 rounded-2xl mb-8">
          <CardHeader>
            <CardTitle className="font-inter flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Inzichten uit Patiëntinput
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Veelgebruikte woorden door de patiënt:</p>
              {dashboardData.topKeywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {dashboardData.topKeywords.map(([keyword, count]) => (
                    <Badge key={keyword} variant="outline" className="bg-green-50">
                      {keyword} ({count}x)
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nog onvoldoende patiëntspraak voor woordanalyse.</p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Check-ins uit spraak</p>
                <p className="text-lg font-semibold">{dashboardData.patientCheckinCount}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Activiteit gestart</p>
                <p className="text-lg font-semibold">{dashboardData.activityCounts.quest_started || 0}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">ADL voltooid</p>
                <p className="text-lg font-semibold">
                  {careEvents.filter((e) => e.type === "adl_complete" && e.data?.result === "done").length}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">ADL overgeslagen</p>
                <p className="text-lg font-semibold">
                  {careEvents.filter((e) => e.type === "adl_complete" && e.data?.result === "skipped").length}
                </p>
              </div>
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
              const patientTurns = getPatientTurns(transcript);
              const relatedEvents = getRelatedEvents(interview);
              const interviewIcfCodes = [
                ...(interview.inferred_icf_codes || []),
                ...relatedEvents.flatMap((event) => event.icf_tags || []),
              ];
              const uniqueInterviewCodes = [...new Set(interviewIcfCodes)];
              
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
                            {patientTurns.length} patiënt uitingen
                          </Badge>
                          <Badge variant="outline" className="bg-amber-50 text-amber-800">
                            <ClipboardList className="w-3 h-3 mr-1" />
                            {relatedEvents.length} gekoppelde activiteiten/events
                          </Badge>
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

                      {/* ICF Codes */}
                      {uniqueInterviewCodes.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">ICF Codes uit gesprek + activiteiten:</h4>
                          <div className="flex flex-wrap gap-2">
                            {uniqueInterviewCodes.map((code) => (
                              <Badge key={code} className="bg-gray-100 text-gray-800">
                                {code}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Related activity events */}
                      {relatedEvents.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Gekoppelde Activiteiten:</h4>
                          <div className="space-y-2">
                            {relatedEvents.map((event) => (
                              <div key={event.id || `${event.type}-${event.timestamp}`} className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                                <div className="flex items-center justify-between gap-2">
                                  <Badge variant="outline">{event.type}</Badge>
                                  <span className="text-xs text-gray-500">
                                    {new Date(event.timestamp).toLocaleString("nl-NL")}
                                  </span>
                                </div>
                                {event.data?.quest_title && (
                                  <p className="text-sm text-gray-800 mt-1">
                                    Activiteit: {event.data.quest_title}
                                  </p>
                                )}
                                {event.data?.user_text && (
                                  <p className="text-sm text-gray-800 mt-1">
                                    Patiënt zei: "{event.data.user_text}"
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Patient transcript only */}
                      {patientTurns.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Patiënt Gespreksverloop:</h4>
                          <div className="bg-slate-50 rounded-xl p-4 max-h-96 overflow-y-auto space-y-3">
                            {patientTurns.map((entry, index) => (
                              <div 
                                key={index} 
                                className="p-3 rounded-lg bg-white border border-gray-200"
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
