
import { useState, useEffect, useRef } from "react";
import { AlbumItem } from "@/entities/AlbumItem";
import { AlbumPlays } from "@/entities/AlbumPlays";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Play, ArrowLeft, ArrowRight, Volume2, MessageCircleQuestion } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generatePromptAudio } from "@/functions/generatePromptAudio";

export default function MemoryAlbum() {
  const [albumItems, setAlbumItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [user, setUser] = useState(null);
  const [viewStartTime, setViewStartTime] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me().catch(() => null);
      setUser(currentUser);

      // FOR DEMONSTRATION: Loading all album items so sample data is visible.
      // In a real application, you would filter by the current user's ID:
      // if (currentUser) {
      //   const items = await AlbumItem.filter({ user_id: currentUser.id });
      //   setAlbumItems(items);
      // }
      const items = await AlbumItem.list();
      setAlbumItems(items);

    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const playVoiceNote = (item) => {
    // Pause video before playing voice
    if (videoRef.current) {
      videoRef.current.pause();
    }
    window.speechSynthesis.cancel(); // Stop any other speech
    setIsSpeaking(false);
    
    if (item.voice_url) {
      const audio = new Audio(item.voice_url);
      audio.play().catch(e => console.error("Error playing voice note:", e));
    }
  };

  const speakPrompt = async (text) => {
    if (!text || isSpeaking) return;
    
    // Pause video before speaking
    if (videoRef.current) {
      videoRef.current.pause();
    }
    
    setIsSpeaking(true);

    try {
      const response = await generatePromptAudio({ text });

      if (!response || !response.data || !response.data.audio_base64) {
        throw new Error("No base64 audio data received from server");
      }

      // Decode the base64 string back into binary data
      const base64Audio = response.data.audio_base64;
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create a blob from the decoded data
      const blob = new Blob([bytes.buffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      audio.onloadeddata = () => {
        audio.play().catch(e => {
          console.error("Play failed:", e);
          fallbackSpeak(text);
        });
      };

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        fallbackSpeak(text);
        URL.revokeObjectURL(audioUrl);
      };

    } catch (error) {
      console.error("Error generating or playing prompt audio:", error);
      fallbackSpeak(text);
    }
  };

  const fallbackSpeak = (text) => {
    console.log("🔄 Using browser fallback voice for:", text);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'nl-NL';
      utterance.rate = 0.9;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false); // Ensure state is reset if speech synthesis is not supported
    }
  };

  const openDetail = (item, index) => {
    setSelectedItem(item);
    setCurrentIndex(index);
    setViewStartTime(new Date());
  };

  const closeDetail = async () => {
    if (viewStartTime && selectedItem && user) {
      const duration = (new Date() - viewStartTime) / 1000;
      try {
        await AlbumPlays.create({
          user_id: user.id,
          album_item_id: selectedItem.id,
          started_at: viewStartTime.toISOString(),
          duration_s: Math.round(duration)
        });
      } catch (error) {
        console.error("Failed to log album play:", error);
      }
    }
    setSelectedItem(null);
    setViewStartTime(null);
    window.speechSynthesis.cancel(); // Cancel any ongoing fallback speech
    setIsSpeaking(false); // Ensure speaking state is reset
    if (videoRef.current) { // Pause video when closing
      videoRef.current.pause();
    }
  };

  const navigateItem = (direction) => {
    // Stop any ongoing media before navigating
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }

    const newIndex = direction === 'next'
      ? Math.min(currentIndex + 1, albumItems.length - 1)
      : Math.max(currentIndex - 1, 0);

    setCurrentIndex(newIndex);
    setSelectedItem(albumItems[newIndex]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="font-lato text-lg text-gray-600">Fotoalbum wordt geladen...</p>
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
            Geheugen Album
          </h1>
          <p className="font-lato text-xl text-gray-600 max-w-2xl mx-auto">
            Bekijk vertrouwde foto's en luister naar persoonlijke herinneringen.
          </p>
        </div>

        {albumItems.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="font-inter font-semibold text-2xl text-gray-900 mb-4">
              Nog geen foto's
            </h2>
            <p className="font-lato text-gray-600 max-w-md mx-auto mb-8">
              Je mantelzorger kan foto's en herinneringen toevoegen via het dashboard.
            </p>
            <Button className="tap-target bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl">
              <Camera className="w-5 h-5 mr-2" />
              Vraag om foto's toe te voegen
            </Button>
          </div>
        ) : (
          /* Photo Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {albumItems.map((item, index) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-200 rounded-2xl overflow-hidden group"
                onClick={() => openDetail(item, index)}
              >
                <CardContent className="p-0">
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {item.media_type === 'video' && (
                       <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm">
                          <Play className="w-8 h-8 text-blue-600 ml-1" />
                        </div>
                      </div>
                    )}
                    {item.voice_url && (
                      <div className="absolute top-4 right-4 w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center shadow-lg">
                        <Volume2 className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="font-inter font-semibold text-xl text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="font-lato text-gray-600 text-lg leading-relaxed">
                      {item.caption}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={!!selectedItem} onOpenChange={closeDetail}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-inter font-bold text-2xl">
                {selectedItem?.title}
              </DialogTitle>
            </DialogHeader>

            {selectedItem && (
              <div className="space-y-6">
                {/* Media Display */}
                <div className="aspect-video relative rounded-2xl overflow-hidden bg-black">
                  {selectedItem.media_type === 'video' && selectedItem.video_url ? (
                    <video
                      ref={videoRef}
                      src={selectedItem.video_url}
                      poster={selectedItem.image_url}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                      onPlay={() => {
                        window.speechSynthesis.cancel();
                        setIsSpeaking(false);
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <img
                      src={selectedItem.image_url}
                      alt={selectedItem.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Caption */}
                <div className="bg-blue-50 rounded-2xl p-6">
                  <p className="font-lato text-xl text-gray-900 leading-relaxed text-center">
                    {selectedItem.caption}
                  </p>
                </div>

                {/* NEW: Reminiscence Prompt Card */}
                {selectedItem.reminiscence_prompt && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <MessageCircleQuestion className="w-8 h-8 text-amber-600 flex-shrink-0" />
                    <p className="font-lato text-lg text-amber-900 font-medium flex-1">
                      {selectedItem.reminiscence_prompt}
                    </p>
                    <Button
                      onClick={() => speakPrompt(selectedItem.reminiscence_prompt)}
                      disabled={isSpeaking}
                      variant="outline"
                      size="icon"
                      className="tap-target bg-amber-100 hover:bg-amber-200 border-amber-300 rounded-full w-12 h-12"
                    >
                      {isSpeaking ? (
                        <div className="w-6 h-6 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Volume2 className="w-6 h-6 text-amber-700" />
                      )}
                    </Button>
                  </div>
                )}

                {/* Controls */}
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  {selectedItem.voice_url && (
                    <Button
                      onClick={() => playVoiceNote(selectedItem)}
                      // The isSpeaking state is now tied to the AI prompt voice, not this voice note.
                      className="tap-target bg-pink-600 hover:bg-pink-700 text-white px-6 py-4 rounded-xl text-lg focus-strong"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Speel Stemnotitie
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigateItem('prev')}
                      disabled={currentIndex === 0}
                      variant="outline"
                      className="tap-target px-6 py-4 rounded-xl border-2 focus-strong"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      Vorige
                    </Button>

                    <Button
                      onClick={() => navigateItem('next')}
                      disabled={currentIndex === albumItems.length - 1}
                      variant="outline"
                      className="tap-target px-6 py-4 rounded-xl border-2 focus-strong"
                    >
                      Volgende
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </div>

                {/* Position indicator */}
                <div className="text-center">
                  <span className="font-lato text-sm text-gray-500">
                    {currentIndex + 1} van {albumItems.length}
                  </span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
