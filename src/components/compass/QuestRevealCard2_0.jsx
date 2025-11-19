import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Volume2, RotateCcw, VolumeX, CheckCircle, Sparkles } from 'lucide-react';

export default function QuestRevealCard2_0({ quest, onReset, onStart }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const playAudio = () => {
    if (quest?.quest_voice_url && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Auto-play when the card appears (if audio is available)
  useEffect(() => {
    if (quest?.quest_voice_url && audioRef.current) {
      const timer = setTimeout(() => {
        audioRef.current.play();
        setIsPlaying(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [quest]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onplay = () => setIsPlaying(true);
    }
  }, []);

  if (!quest) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl mx-auto space-y-6"
      >
        <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-purple-100">
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto"
            >
              <CheckCircle className="w-8 h-8 text-purple-600" />
            </motion.div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <h2 className="font-inter font-bold text-2xl md:text-3xl text-gray-900">
                  {quest.title}
                </h2>
                <div className="flex items-center gap-1 bg-purple-100 px-2 py-1 rounded-full">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  <span className="text-xs font-medium text-purple-800">2.0</span>
                </div>
              </div>
              <p className="font-lato text-lg text-gray-700 leading-relaxed">
                {quest.description}
              </p>
              {quest.reason && (
                <p className="text-sm text-purple-600 font-medium bg-purple-50 px-4 py-2 rounded-full inline-block">
                  {quest.reason}
                </p>
              )}
            </div>

            {/* Audio Player */}
            {quest.quest_voice_url ? (
              <div className="space-y-4">
                <audio ref={audioRef} src={quest.quest_voice_url} />
                <Button 
                  onClick={playAudio}
                  variant="outline" 
                  className="tap-target px-8 py-4 rounded-2xl border-2 border-purple-200 hover:bg-purple-50 focus-strong"
                >
                  {isPlaying ? (
                    <>
                      <VolumeX className="w-5 h-5 mr-2" />
                      Pauzeer Spraak
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-5 h-5 mr-2" />
                      Beluister Activiteit
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500">
                  Premium AI-gegenereerde natuurlijke stem
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  Audio nog niet beschikbaar voor deze activiteit
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button onClick={onStart} className="tap-target flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 text-lg font-semibold rounded-2xl focus-strong shadow-lg">
                Start Activiteit
              </Button>
              <Button onClick={onReset} variant="outline" className="tap-target px-6 py-4 rounded-2xl border-2 focus-strong">
                <RotateCcw className="w-5 h-5 mr-2" />
                Nieuw Kompas
              </Button>
            </div>
          </div>
        </div>

        {isPlaying && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <Volume2 className="w-5 h-5 text-purple-600 animate-pulse" />
              <span className="font-medium text-purple-800">Premium stem speelt af...</span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}