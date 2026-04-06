import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { routineStepAgent } from "@/functions/routineStepAgent";
import { CheckCircle, AlertTriangle, Mic, MicOff, ChevronRight, RotateCcw, Heart, Globe } from "lucide-react";

const ROUTINES = {
  nl: [
    { type: "morning_routine", label: "🌅 Ochtendroutine", desc: "Start de dag rustig samen", icf: "d230" },
    { type: "dressing", label: "👕 Aankleden", desc: "Stap voor stap aankleden", icf: "d540" },
    { type: "washing", label: "🚿 Wassen", desc: "Gezicht en handen wassen", icf: "d510" },
    { type: "medication", label: "💊 Medicijnen", desc: "Medicatie innemen", icf: "d5702" },
    { type: "toileting", label: "🚻 Toilet", desc: "Veilig en waardig naar het toilet", icf: "d530" },
    { type: "eating", label: "🍽️ Eten & drinken", desc: "Rustig en genieten aan tafel", icf: "d550" },
    { type: "walking", label: "🚶 Even bewegen", desc: "Een stukje lopen, goed voor u", icf: "d450" },
    { type: "light_housework", label: "🧹 Helpen in huis", desc: "Een klein klusje, groot gevoel", icf: "d640" },
  ],
  en: [
    { type: "morning_routine", label: "🌅 Morning Routine", desc: "Start the day together, gently", icf: "d230" },
    { type: "dressing", label: "👕 Getting Dressed", desc: "Getting dressed step by step", icf: "d540" },
    { type: "washing", label: "🚿 Washing", desc: "Washing face and hands", icf: "d510" },
    { type: "medication", label: "💊 Medication", desc: "Taking medication", icf: "d5702" },
    { type: "toileting", label: "🚻 Toilet", desc: "Safe and dignified toileting", icf: "d530" },
    { type: "eating", label: "🍽️ Eating & Drinking", desc: "Relaxed and enjoyable mealtimes", icf: "d550" },
    { type: "walking", label: "🚶 A Little Walk", desc: "A short walk, good for you", icf: "d450" },
    { type: "light_housework", label: "🧹 Helping at Home", desc: "A small task, a big feeling", icf: "d640" },
  ],
};

const T = {
  nl: {
    title: "Stap-voor-Stap Begeleiding",
    subtitle: "AI-begeleide dagelijkse routines · EBP protocol",
    source: "Gebaseerd op Alzheimer Nederland + KNGF 2025 richtlijnen",
    step: (n, t) => `Stap ${n} van ${t}`,
    caregiverAlert: "Mantelzorger alert",
    caregiverAlertDesc: "De gebruiker toont tekenen van agitatie. Overweeg te pauzeren.",
    done: "Klaar ✓",
    needHelp: "Ik heb hulp nodig",
    skip: "Sla over naar volgende stap",
    listen: "Luisteren...",
    speak: "Spreek uw antwoord in",
    complete: "Routine voltooid! 🎉",
    backToMenu: "Terug naar menu",
    switchLang: "English",
  },
  en: {
    title: "Step-by-Step Guidance",
    subtitle: "AI-guided daily routines · EBP protocol",
    source: "Based on Alzheimer's Association + KNGF 2025 guidelines",
    step: (n, t) => `Step ${n} of ${t}`,
    caregiverAlert: "Caregiver alert",
    caregiverAlertDesc: "The user is showing signs of agitation. Consider pausing.",
    done: "Done ✓",
    needHelp: "I need help",
    skip: "Skip to next step",
    listen: "Listening...",
    speak: "Speak your answer",
    complete: "Routine complete! 🎉",
    backToMenu: "Back to menu",
    switchLang: "Nederlands",
  },
};

export default function StepByStepRoutine() {
  const [lang, setLang] = useState("nl");
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [stepData, setStepData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [caregiverAlert, setCaregiverAlert] = useState(false);
  const [userName, setUserName] = useState("");
  const recognitionRef = useRef(null);
  const synth = window.speechSynthesis;
  const t = T[lang];

  useEffect(() => {
    base44.auth.me().then(u => setUserName(u?.full_name?.split(" ")[0] || "")).catch(() => {});
  }, []);

  const speak = (text) => {
    if (!text || !synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "en" ? "en-GB" : "nl-NL";
    utterance.rate = 0.85;
    synth.speak(utterance);
  };

  const playAudio = (url) => {
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch(e => console.warn("Audio play failed:", e));
  };

  const callAgent = async (routineType, currentStep = 0, userResponse = null) => {
    setLoading(true);
    try {
      const response = await routineStepAgent({
        routine_type: routineType,
        current_step: currentStep,
        user_response: userResponse,
        user_name: userName,
        lang,
      });
      const data = response.data || response;
      setStepData(data);

      if (data.step_text) {
        setHistory(prev => [...prev, { text: data.step_text, role: "assistant", step: data.current_step }]);
        if (data.audio_url) {
          playAudio(data.audio_url);
        } else {
          speak(data.step_text);
        }
      }

      if (data.needs_caregiver_alert) setCaregiverAlert(true);
    } catch (err) {
      console.error("Routine agent error:", err);
    } finally {
      setLoading(false);
    }
  };

  const startRoutine = async (routine) => {
    setSelectedRoutine(routine);
    setHistory([]);
    setStepData(null);
    setCaregiverAlert(false);
    await callAgent(routine.type, 0);
  };

  const handleResponse = async (responseText) => {
    if (!stepData || stepData.is_complete) return;
    setHistory(prev => [...prev, { text: responseText, role: "user" }]);
    await callAgent(selectedRoutine.type, stepData.current_step, responseText);
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = lang === "en" ? "en-GB" : "nl-NL";
    rec.continuous = false;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      handleResponse(text);
    };
    recognitionRef.current = rec;
    rec.start();
  };

  const reset = () => {
    synth?.cancel();
    setSelectedRoutine(null);
    setStepData(null);
    setHistory([]);
    setCaregiverAlert(false);
  };

  const routineList = ROUTINES[lang];

  // Routine selection screen
  if (!selectedRoutine) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-2xl mx-auto pt-8 space-y-6">
          <div className="text-center space-y-2 relative">
            <button
              onClick={() => setLang(l => l === "nl" ? "en" : "nl")}
              className="absolute right-0 top-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {t.switchLang}
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-600">{t.subtitle}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {routineList.map(r => (
              <Card
                key={r.type}
                onClick={() => startRoutine(r)}
                className="border-2 border-gray-100 hover:border-blue-400 hover:shadow-lg cursor-pointer transition-all rounded-2xl"
              >
                <CardContent className="p-6 text-center space-y-2">
                  <div className="text-4xl">{r.label.split(" ")[0]}</div>
                  <p className="font-semibold text-gray-900">{r.label.split(" ").slice(1).join(" ")}</p>
                  <p className="text-sm text-gray-500">{r.desc}</p>
                  <Badge variant="outline" className="text-xs font-mono">{r.icf}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-xs text-center text-gray-400">{t.source}</p>
        </div>
      </div>
    );
  }

  // Active routine screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-xl mx-auto pt-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-xl text-gray-900">{selectedRoutine.label}</h2>
            <Badge variant="outline" className="text-xs font-mono">{selectedRoutine.icf}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={reset}>
            <RotateCcw className="w-5 h-5 text-gray-500" />
          </Button>
        </div>

        {/* Progress bar */}
        {stepData && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{t.step(stepData.current_step + 1, stepData.total_steps)}</span>
              <span>{stepData.progress_percent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-blue-500 transition-all duration-700"
                style={{ width: `${stepData.progress_percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Caregiver alert */}
        {caregiverAlert && (
          <Card className="border-2 border-red-200 bg-red-50 rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">{t.caregiverAlert}</p>
                <p className="text-sm text-red-700">{t.caregiverAlertDesc}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversation history */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {history.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs rounded-2xl px-4 py-3 text-sm ${
                msg.role === "assistant" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-blue-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Completion */}
        {stepData?.is_complete && !caregiverAlert && (
          <Card className="border-2 border-green-200 bg-green-50 rounded-2xl">
            <CardContent className="p-6 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="font-bold text-green-800 text-lg">{t.complete}</p>
              <Button onClick={reset} className="bg-green-600 hover:bg-green-700 text-white">
                {t.backToMenu}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Response buttons */}
        {stepData && !stepData.is_complete && !loading && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleResponse(lang === "en" ? "done" : "klaar")}
                className="bg-green-600 hover:bg-green-700 text-white rounded-xl py-6 text-base"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {t.done}
              </Button>
              <Button
                onClick={() => handleResponse(lang === "en" ? "can't" : "kan niet")}
                variant="outline"
                className="border-2 border-amber-300 text-amber-800 hover:bg-amber-50 rounded-xl py-6 text-base"
              >
                <Heart className="w-5 h-5 mr-2" />
                {t.needHelp}
              </Button>
            </div>

            <Button
              onClick={() => handleResponse(lang === "en" ? "next step" : "volgende stap")}
              variant="ghost"
              className="w-full text-gray-500"
            >
              <ChevronRight className="w-4 h-4 mr-1" />
              {t.skip}
            </Button>

            <Button
              onClick={startVoiceInput}
              variant={isListening ? "destructive" : "outline"}
              className="w-full rounded-xl py-4 border-2"
            >
              {isListening ? (
                <><MicOff className="w-5 h-5 mr-2" />{t.listen}</>
              ) : (
                <><Mic className="w-5 h-5 mr-2" />{t.speak}</>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}