import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw, Volume2, ClipboardList, Heart } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-16 text-center">
        <div className="space-y-6">
          <h1 className="font-inter font-bold text-4xl md:text-5xl text-gray-900 leading-tight">
            Een rustige start voor een zelfverzekerde dag
          </h1>
          <p className="font-lato text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Vriendelijke herinneringen en eenvoudige stappen die het dagelijks leven gemakkelijker maken.
          </p>
          
          {/* Primary CTA */}
          <div className="pt-8">
            <Link to={createPageUrl("Routines")}>
              <Button className="tap-target bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-2xl transition-all transform hover:scale-105 focus-strong shadow-lg">
                <RotateCcw className="w-6 h-6 mr-3" />
                Draai het Kompas
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Cards */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-2 border-green-100 hover:border-green-200 transition-all rounded-2xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Volume2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-inter font-semibold text-xl text-gray-900">Spraak herinneringen</h3>
              <p className="font-lato text-gray-600 leading-relaxed">
                Luister naar vriendelijke stemmen die je door elke stap leiden met duidelijke instructies.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-pink-100 hover:border-pink-200 transition-all rounded-2xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto">
                <ClipboardList className="w-8 h-8 text-pink-600" />
              </div>
              <h3 className="font-inter font-semibold text-xl text-gray-900">Stap-voor-stap begeleiding</h3>
              <p className="font-lato text-gray-600 leading-relaxed">
                Eenvoudige taken opgebroken in beheersbare stappen met grote, duidelijke knoppen.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-100 hover:border-blue-200 transition-all rounded-2xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Heart className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-inter font-semibold text-xl text-gray-900">Mantelzorger gemoedsrust</h3>
              <p className="font-lato text-gray-600 leading-relaxed">
                Zorgverleners kunnen voortgang bekijken en persoonlijke herinneringen instellen.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Secondary CTA */}
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <Card className="border border-gray-200 rounded-2xl bg-white">
          <CardContent className="p-8 space-y-4">
            <h2 className="font-inter font-semibold text-2xl text-gray-900">Ben je een mantelzorger?</h2>
            <p className="font-lato text-gray-600">
              Krijg toegang tot het dashboard om dagelijkse activiteiten te volgen en persoonlijke herinneringen in te stellen.
            </p>
            <Link to={createPageUrl("Caregiver")}>
              <Button variant="outline" className="tap-target mt-4 px-6 py-3 text-base font-medium rounded-xl focus-strong border-2 border-blue-200 hover:bg-blue-50">
                Bezoek Mantelzorger Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}