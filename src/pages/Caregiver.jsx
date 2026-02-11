
import { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { listCareEvents } from "@/lib/careEvents";
import { ICFInterviewLog } from "@/entities/ICFInterviewLog";
import {
  Shield,
  AlertTriangle,
  BarChart3,
  Users,
  Settings,
  MessageSquare,
  Mic,
  Code,
  Activity,
} from "lucide-react";
import AlertSystem from "../components/caregiver/AlertSystem";

export default function Caregiver() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [analytics, setAnalytics] = useState({
    todayEvents: 0,
    speechCheckins: 0,
    uniqueIcfCodes: 0,
    interviews: 0,
    recentPatientStatements: [],
  });

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const currentUser = await User.me();
      if (currentUser?.caregiver_mode) {
        setUser(currentUser);
        setIsAuthenticated(true);
        await loadAnalytics(currentUser.id);
      }
    } catch {
      setIsAuthenticated(false);
    }
    setLoading(false);
  };

  const loadAnalytics = async (userId) => {
    try {
      const [events, interviews] = await Promise.all([
        listCareEvents({ limit: 1000, userId }),
        ICFInterviewLog.list("-created_date", 200),
      ]);

      const today = new Date().toDateString();
      const todayEvents = events.filter((event) => new Date(event.timestamp).toDateString() === today);
      const speechCheckins = events.filter((event) => event.type === "checkin" && (event.speaker === "user" || event.data?.speaker === "user"));

      const codeSet = new Set();
      for (const event of events) {
        const codes = event.data?.interpreted_icf_codes || event.icf_tags || [];
        for (const code of codes) {
          if (code) codeSet.add(code);
        }
      }

      const recentPatientStatements = speechCheckins
        .map((event) => ({
          text: event.text || event.data?.user_text || event.transcript || "",
          timestamp: event.timestamp,
        }))
        .filter((item) => item.text)
        .slice(-5)
        .reverse();

      const userInterviews = interviews.filter((item) => !item.user_id || item.user_id === userId || item.user_id === "demo_user");
      setAnalytics({
        todayEvents: todayEvents.length,
        speechCheckins: speechCheckins.length,
        uniqueIcfCodes: codeSet.size,
        interviews: userInterviews.length,
        recentPatientStatements,
      });
    } catch (error) {
      console.error("Error loading caregiver analytics:", error);
    }
  };

  const enableCaregiverMode = async () => {
    try {
      const currentUser = await User.me().catch(() => null);
      if (currentUser) {
        await User.update(currentUser.id, { caregiver_mode: true });
      } else {
        await User.updateMyUserData({ caregiver_mode: true });
      }
      setIsAuthenticated(true);
      await checkAuthentication();
    } catch (error) {
      console.error("Error enabling caregiver mode:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="font-lato text-lg text-gray-600">Dashboard wordt geladen...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <Card className="border-2 border-blue-200 rounded-2xl">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>

              <div className="space-y-3">
                <h1 className="font-inter font-bold text-2xl text-gray-900">
                  Mantelzorger Dashboard
                </h1>
                <p className="font-lato text-gray-600 leading-relaxed">
                  Toegang tot het dashboard om dagelijkse activiteiten te volgen en
                  persoonlijke herinneringen in te stellen.
                </p>
              </div>

              <Button
                onClick={enableCaregiverMode}
                className="tap-target w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold rounded-xl focus-strong"
              >
                <Shield className="w-5 h-5 mr-2" />
                Activeer Mantelzorger Modus
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-inter font-bold text-3xl text-gray-900 mb-2">
            Mantelzorger Dashboard
          </h1>
          <p className="font-lato text-xl text-gray-600">
            Volg voortgang en beheer ondersteuning voor {user?.display_name || 'de gebruiker'}.
          </p>
        </div>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="alerts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Waarschuwingen
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analyse
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Gebruikers
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Instellingen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts">
            <AlertSystem />
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="border-2 border-gray-200 rounded-2xl">
              <CardHeader>
                <CardTitle className="font-inter">Gebruiksstatistieken</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs text-blue-700 mb-1">Events vandaag</p>
                    <p className="text-2xl font-bold text-blue-900">{analytics.todayEvents}</p>
                    <Activity className="w-4 h-4 text-blue-600 mt-2" />
                  </div>
                  <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4">
                    <p className="text-xs text-cyan-700 mb-1">Patiënt check-ins</p>
                    <p className="text-2xl font-bold text-cyan-900">{analytics.speechCheckins}</p>
                    <Mic className="w-4 h-4 text-cyan-600 mt-2" />
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                    <p className="text-xs text-purple-700 mb-1">Unieke ICF codes</p>
                    <p className="text-2xl font-bold text-purple-900">{analytics.uniqueIcfCodes}</p>
                    <Code className="w-4 h-4 text-purple-600 mt-2" />
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <p className="text-xs text-green-700 mb-1">ICF gesprekken</p>
                    <p className="text-2xl font-bold text-green-900">{analytics.interviews}</p>
                    <MessageSquare className="w-4 h-4 text-green-600 mt-2" />
                  </div>
                </div>

                <div>
                  <p className="font-lato text-gray-700 mb-2">Laatste patiëntinput uit spraak:</p>
                  {analytics.recentPatientStatements.length === 0 ? (
                    <p className="font-lato text-sm text-gray-500">Nog geen patiëntinput beschikbaar.</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.recentPatientStatements.map((item, index) => (
                        <div key={`${item.timestamp}-${index}`} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                          <p className="text-sm text-gray-900">{item.text}</p>
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              {new Date(item.timestamp).toLocaleString("nl-NL")}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="border-2 border-gray-200 rounded-2xl">
              <CardHeader>
                <CardTitle className="font-inter">Gebruikersbeheer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-lato text-gray-600">
                  Beheer gebruikersprofielen, ICF-instellingen en voorkeuren.
                </p>
                <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                  <p className="font-medium text-blue-800">
                    Functie in ontwikkeling - binnenkort beschikbaar
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-2 border-gray-200 rounded-2xl">
              <CardHeader>
                <CardTitle className="font-inter">Dashboard Instellingen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-lato text-gray-600">
                  Configureer waarschuwingen, notificaties en dashboard voorkeuren.
                </p>
                <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                  <p className="font-medium text-blue-800">
                    Functie in ontwikkeling - binnenkort beschikbaar
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
