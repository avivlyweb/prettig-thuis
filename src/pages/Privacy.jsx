import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Eye, Lock, Trash2, Mail } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-inter font-bold text-3xl md:text-4xl text-gray-900 mb-4">
            Privacy & Gegevensbescherming
          </h1>
          <p className="font-lato text-xl text-gray-600">
            Jouw privacy staat voorop. Hier leggen we uit hoe we je gegevens beschermen.
          </p>
        </div>

        {/* Privacy Cards */}
        <div className="space-y-8">
          {/* What We Store */}
          <Card className="border-2 border-blue-100 rounded-2xl">
            <CardHeader>
              <CardTitle className="font-inter flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                Welke gegevens bewaren we?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">Minimale gegevens</h3>
                <ul className="font-lato text-gray-700 space-y-2">
                  <li>• Je voorkeursnaam voor persoonlijke aansprekingen</li>
                  <li>• ICF profiel instellingen voor gepersonaliseerde activiteiten</li>
                  <li>• Voltooide activiteiten om voortgang bij te houden</li>
                  <li>• Herinneringen die je mantelzorger heeft ingesteld</li>
                  <li>• Foto's en stemnotities in je geheugenalbum</li>
                </ul>
              </div>
              <p className="font-lato text-gray-600 text-sm">
                We bewaren alleen wat nodig is om de app goed te laten werken. 
                Geen medische gegevens, geen gevoelige persoonlijke informatie.
              </p>
            </CardContent>
          </Card>

          {/* How We Use Data */}
          <Card className="border-2 border-green-100 rounded-2xl">
            <CardHeader>
              <CardTitle className="font-inter flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Eye className="w-5 h-5 text-green-600" />
                </div>
                Hoe gebruiken we je gegevens?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Voor jou</h3>
                  <ul className="font-lato text-gray-700 text-sm space-y-1">
                    <li>• Activiteiten aanbevelen die bij je passen</li>
                    <li>• Je voortgang bijhouden</li>
                    <li>• Persoonlijke herinneringen tonen</li>
                  </ul>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Niet voor</h3>
                  <ul className="font-lato text-gray-700 text-sm space-y-1">
                    <li>• Verkoop aan derden</li>
                    <li>• Reclame of marketing</li>
                    <li>• Delen zonder toestemming</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cookies and Analytics */}
          <Card className="border-2 border-amber-100 rounded-2xl">
            <CardHeader>
              <CardTitle className="font-inter flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-600" />
                </div>
                Cookies en analyse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Beperkte cookies</h3>
                <p className="font-lato text-gray-700 text-sm mb-3">
                  We gebruiken alleen essentiële cookies die nodig zijn voor de app:
                </p>
                <ul className="font-lato text-gray-700 text-sm space-y-1">
                  <li>• Inlogstatus onthouden</li>
                  <li>• Voorkeursinstellingen bewaren</li>
                  <li>• App offline laten werken (PWA functionaliteit)</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Anonieme statistieken</h3>
                <p className="font-lato text-gray-700 text-sm">
                  We verzamelen anonieme gegevens over app gebruik om de ervaring te verbeteren. 
                  Dit kan niet naar jou worden teruggevoerd.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card className="border-2 border-purple-100 rounded-2xl">
            <CardHeader>
              <CardTitle className="font-inter flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                Jouw rechten (AVG/GDPR)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Je hebt recht op:</h3>
                  <ul className="font-lato text-gray-700 text-sm space-y-2">
                    <li>• Inzage in je gegevens</li>
                    <li>• Correctie van onjuiste gegevens</li>
                    <li>• Verwijdering van je account</li>
                    <li>• Gegevensoverdracht</li>
                    <li>• Bezwaar tegen verwerking</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Hoe gebruik je dit?</h3>
                  <p className="font-lato text-gray-700 text-sm">
                    Stuur een e-mail naar ons contactadres of gebruik de knop hieronder 
                    om al je gegevens te verwijderen.
                  </p>
                  <Button
                    variant="outline"
                    className="tap-target w-full mt-3 border-2 border-red-200 text-red-700 hover:bg-red-50 rounded-xl focus-strong"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Verwijder Mijn Gegevens
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="border-2 border-gray-200 rounded-2xl">
            <CardHeader>
              <CardTitle className="font-inter flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-gray-600" />
                </div>
                Vragen over privacy?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-lato text-gray-700">
                Heb je vragen over hoe we je gegevens behandelen? 
                We helpen je graag verder.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-gray-900">Contact</p>
                <p className="font-lato text-gray-700">E-mail: <a href="mailto:privacy@prettigthuis.nl" className="text-blue-600 hover:text-blue-700">privacy@prettigthuis.nl</a></p>
                <p className="font-lato text-sm text-gray-600">
                  We reageren binnen 2 werkdagen op privacyvragen.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Medical Disclaimer */}
          <Card className="border-2 border-orange-100 rounded-2xl">
            <CardContent className="p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-inter font-semibold text-gray-900">Belangrijke opmerking</h3>
              <p className="font-lato text-gray-700 text-sm leading-relaxed max-w-2xl mx-auto">
                Prettig Thuis is een educatieve app die ondersteuning biedt bij dagelijkse routines. 
                Het is geen medisch hulpmiddel en vervangt geen professionele zorg. 
                Raadpleeg altijd je arts of zorgverlener voor medische kwesties.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}