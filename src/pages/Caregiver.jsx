
import { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  BarChart3,
  Users,
  Settings
} from "lucide-react";
import AlertSystem from "../components/caregiver/AlertSystem";

export default function Caregiver() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const currentUser = await User.me();
      if (currentUser?.caregiver_mode) {
        setUser(currentUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      setIsAuthenticated(false);
    }
    setLoading(false);
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
              <CardContent>
                <p className="font-lato text-gray-600">
                  Gedetailleerde analyse van dagelijkse activiteiten, voortgang en patronen.
                </p>
                <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                  <p className="font-medium text-blue-800">
                    Functie in ontwikkeling - binnenkort beschikbaar
                  </p>
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
