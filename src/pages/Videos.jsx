import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Clock, List } from "lucide-react";

const DEMO_VIDEOS = [
  {
    id: 1,
    title: "Dagelijkse Routine: Ochtend Starten",
    description: "Leer hoe je elke ochtend op een rustige manier kunt beginnen met eenvoudige stappen.",
    duration: "8:24",
    thumbnail: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=225&fit=crop",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    steps: [
      "Opstaan op je eigen tempo",
      "Een glas water drinken", 
      "Gezicht wassen",
      "Kleding kiezen"
    ]
  },
  {
    id: 2,
    title: "Veiligheid Thuis: Check je Omgeving",
    description: "Belangrijke tips om je huis veilig te houden en vallen te voorkomen.",
    duration: "6:12",
    thumbnail: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=225&fit=crop",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    steps: [
      "Controleer verlichting",
      "Let op losse tapijten",
      "Houd gangen vrij",
      "Check trapleuningen"
    ]
  },
  {
    id: 3,
    title: "Geheugen Oefeningen: Namen Onthouden",
    description: "Eenvoudige technieken om namen en gezichten beter te onthouden.",
    duration: "10:45",
    thumbnail: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=225&fit=crop",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    steps: [
      "Maak associaties",
      "Herhaal namen hardop",
      "Gebruik foto's",
      "Oefen regelmatig"
    ]
  },
  {
    id: 4,
    title: "Sociale Contacten: Familie Bellen",
    description: "Het belang van sociale verbindingen en hoe je contact kunt houden.",
    duration: "7:33",
    thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=225&fit=crop",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    steps: [
      "Plan belrondes",
      "Bereid gesprekspunten voor", 
      "Luister actief",
      "Deel je dag"
    ]
  },
  {
    id: 5,
    title: "Lichaamsoefeningen: Zitten en Bewegen",
    description: "Zachte oefeningen die je zittend kunt doen om fit en gezond te blijven.",
    duration: "12:18",
    thumbnail: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=225&fit=crop",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    steps: [
      "Arm cirkels maken",
      "Nek voorzichtig draaien",
      "Schouders optillen",
      "Diep ademen"
    ]
  },
  {
    id: 6,
    title: "Koken en Eten: Eenvoudige Maaltijden",
    description: "Veilige en eenvoudige manieren om gezonde maaltijden te bereiden.",
    duration: "9:56",
    thumbnail: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=225&fit=crop",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    steps: [
      "Plan je maaltijden",
      "Gebruik eenvoudige recepten",
      "Check verkoopdatums", 
      "Eet op vaste tijden"
    ]
  }
];

export default function Videos() {
  const [selectedVideo, setSelectedVideo] = React.useState(null);

  const openVideo = (video) => {
    setSelectedVideo(video);
  };

  const closeVideo = () => {
    setSelectedVideo(null);
  };

  if (selectedVideo) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Back Button */}
          <Button
            onClick={closeVideo}
            variant="outline"
            className="tap-target mb-6 px-6 py-3 rounded-xl border-2 focus-strong"
          >
            ← Terug naar Video's
          </Button>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Video Player */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-2xl overflow-hidden border-2 border-gray-200">
                <CardContent className="p-0">
                  <div className="aspect-video bg-black">
                    <iframe
                      width="100%"
                      height="100%"
                      src={selectedVideo.embedUrl}
                      title={selectedVideo.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Video Info */}
              <Card className="rounded-2xl border-2 border-blue-100">
                <CardContent className="p-6 space-y-4">
                  <h1 className="font-inter font-bold text-2xl text-gray-900">
                    {selectedVideo.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {selectedVideo.duration}
                    </div>
                  </div>
                  <p className="font-lato text-lg text-gray-700 leading-relaxed">
                    {selectedVideo.description}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Steps Sidebar */}
            <div className="space-y-6">
              <Card className="rounded-2xl border-2 border-green-100">
                <CardContent className="p-6">
                  <h2 className="font-inter font-semibold text-xl text-gray-900 mb-4 flex items-center gap-2">
                    <List className="w-5 h-5 text-green-600" />
                    Stappen in deze Video
                  </h2>
                  <div className="space-y-3">
                    {selectedVideo.steps.map((step, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                        <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-sm font-medium text-green-800 mt-0.5">
                          {index + 1}
                        </div>
                        <p className="font-lato text-gray-900 leading-relaxed">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* What to Expect */}
              <Card className="rounded-2xl border-2 border-amber-100">
                <CardContent className="p-6">
                  <h2 className="font-inter font-semibold text-lg text-gray-900 mb-3">
                    Wat kun je verwachten?
                  </h2>
                  <div className="space-y-3 text-sm">
                    <p className="font-lato text-gray-700 leading-relaxed">
                      • Rustige begeleiding zonder haast
                    </p>
                    <p className="font-lato text-gray-700 leading-relaxed">
                      • Duidelijke demonstraties
                    </p>
                    <p className="font-lato text-gray-700 leading-relaxed">
                      • Herhaalbare stappen
                    </p>
                    <p className="font-lato text-gray-700 leading-relaxed">
                      • Vriendelijke aanmoediging
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-inter font-bold text-3xl md:text-4xl text-gray-900 mb-4">
            Instructie Video's
          </h1>
          <p className="font-lato text-xl text-gray-600 max-w-2xl mx-auto">
            Bekijk rustige, stap-voor-stap video's die je helpen bij dagelijkse activiteiten.
          </p>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEMO_VIDEOS.map((video) => (
            <Card 
              key={video.id}
              className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-200 rounded-2xl overflow-hidden group"
              onClick={() => openVideo(video)}
            >
              <CardContent className="p-0">
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                    {video.duration}
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="font-inter font-semibold text-xl text-gray-900 leading-tight">
                    {video.title}
                  </h3>
                  <p className="font-lato text-gray-600 leading-relaxed">
                    {video.description}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Play className="w-4 h-4" />
                    <span className="font-medium">Video afspelen</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}