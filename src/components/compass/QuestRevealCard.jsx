import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Volume2, RotateCcw, Repeat, MessageSquare, Settings, CheckCircle } from 'lucide-react';

const T = {
  nl: { repeat: "Herhaal", rephrase: "Herformuleer", slow: "Langzaam", normal: "Normaal", fast: "Snel", start: "Start Activiteit", newCompass: "Nieuw Kompas", speaking: "Aan het spreken..." },
  en: { repeat: "Repeat", rephrase: "Rephrase", slow: "Slow", normal: "Normal", fast: "Fast", start: "Start Activity", newCompass: "New Compass", speaking: "Speaking..." },
};

export default function QuestRevealCard({ quest, onReset, onStart, lang = "nl" }) {
  const t = T[lang] || T.nl;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSpeed, setSpeechSpeed] = useState('normal');

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'en' ? 'en-GB' : 'nl-NL';
      const rates = { slow: 0.7, normal: 1, fast: 1.3 };
      utterance.rate = rates[speechSpeed];
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const repeatQuest = () => {
    if (quest) {
      speakText(`${quest.title}. ${quest.description}`);
    }
  };

  const rephraseQuest = async () => {
    if (quest) {
      // In a real app, this would call an AI service. For now, we'll use a template.
      const rephrased = `Probeer het eens zo: ${quest.description}`;
      speakText(rephrased);
    }
  };

  // Auto-speak when the card appears
  useEffect(() => {
    if (quest) {
      const timer = setTimeout(() => {
        speakText(`${quest.title}. ${quest.description}`);
      }, 500); // Small delay for the animation
      return () => clearTimeout(timer);
    }
  }, [quest]);

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
        <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-blue-100">
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto"
            >
              <CheckCircle className="w-8 h-8 text-green-600" />
            </motion.div>
            
            <div className="space-y-3">
              <h2 className="font-inter font-bold text-2xl md:text-3xl text-gray-900">
                {quest.title}
              </h2>
              <p className="font-lato text-lg text-gray-700 leading-relaxed">
                {quest.description}
              </p>
              {quest.reason && (
                <p className="text-sm text-blue-600 font-medium bg-blue-50 px-4 py-2 rounded-full inline-block">
                  {quest.reason}
                </p>
              )}
            </div>

            {/* Voice Controls */}
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={repeatQuest} variant="outline" className="tap-target px-6 py-3 rounded-xl border-2 focus-strong" disabled={isSpeaking}>
                <Repeat className="w-5 h-5 mr-2" />
                {t.repeat}
              </Button>
              <Button onClick={rephraseQuest} variant="outline" className="tap-target px-6 py-3 rounded-xl border-2 focus-strong" disabled={isSpeaking}>
                <MessageSquare className="w-5 h-5 mr-2" />
                {t.rephrase}
              </Button>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <select value={speechSpeed} onChange={(e) => setSpeechSpeed(e.target.value)} className="tap-target px-3 py-2 border-2 border-gray-200 rounded-lg focus-strong bg-white">
                  <option value="slow">{t.slow}</option>
                  <option value="normal">{t.normal}</option>
                  <option value="fast">{t.fast}</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button onClick={onStart} className="tap-target flex-1 bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl focus-strong">
                {t.start}
              </Button>
              <Button onClick={onReset} variant="outline" className="tap-target px-6 py-4 rounded-2xl border-2 focus-strong">
                <RotateCcw className="w-5 h-5 mr-2" />
                {t.newCompass}
              </Button>
            </div>
          </div>
        </div>

        {isSpeaking && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <Volume2 className="w-5 h-5 text-amber-600 animate-pulse" />
              <span className="font-medium text-amber-800">{t.speaking}</span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}