import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { CheckCircle, AlertTriangle, Mic, MicOff, ChevronRight, RotateCcw, Heart } from "lucide-react";

const ROUTINES = [
  { type: "morning_routine", label: "🌅 Ochtendroutine", desc: "Start de dag stap voor stap", icf: "d230" },
  { type: "dressing", label: "👕 Aankleden", desc: "Help bij het aankleden", icf: "d540" },
  { type: "medication", label: "💊 Medicijnen", desc: "Medicatie innemen", icf: "d5702" },
  { type: "washing", label: "🚿 Wassen", desc: "Wassen en verzorging", icf: "d510" },
];

export default function StepByStepRoutine() {
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [stepData, setStepData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [history, setHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [caregiverAlert, setCaregiverAlert] = useState(false);
  const [userName, setUserName] = useState("");
  const recognitionRef = useRef(null);
  const synth = window.speechSynthesis;

  useEffect(() => {
    base44.auth.me().then(u => setUserName(u?.full_name?.split(" ")[0] || "")).catch(() => {});
  }, []);

  const speak = (text) => {
    if (!text || !synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "nl-NL";
    utterance.rate = 0.85;
    utterance.pitch = 1.05;
    synth.speak(utterance);
  };

  const callAgent = async (routineType, currentStep = 0, userResponse = null) => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke("routineStepAgent", {
        routine_type: routineType,
        current_step: currentStep,
        user_response: userResponse,
        user_name: userName,
      });
      const data = response.data || response;
      setStepData(data);

      if (data.step_text) {
        setHistory(prev => [...prev, { text: data.step_text, role: "assistant", step: data.current_step }]);
        speak(data.step_text);
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
    setUserInput("");
    await callAgent(selectedRoutine.type, stepData.current_step, responseText);
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = "nl-NL";
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

  // Routine selection screen
  if (!selectedRoutine) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-2xl mx-auto pt-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Stap-voor-Stap Begeleiding</h1>
            <p className="text-gray-600">AI-begeleide dagelijkse routines · EBP protocol</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROUTINES.map(r => (
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
          <p className="text-xs text-center text-gray-400">
            Gebaseerd op Alzheimer Nederland + KNGF 2025 richtlijnen
          </p>
        </div>
      </div>
    );
  }

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
              <span>Stap {stepData.current_step + 1} van {stepData.total_steps}</span>
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
                <p className="font-semibold text-red-800">Mantelzorger alert</p>
                <p className="text-sm text-red-700">De gebruiker toont tekenen van agitatie. Overweeg te pauzeren.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversation history */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {history.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs rounded-2xl px-4 py-3 text-sm ${
                msg.role === "assistant"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-blue-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Completion state */}
        {stepData?.is_complete && !caregiverAlert && (
          <Card className="border-2 border-green-200 bg-green-50 rounded-2xl">
            <CardContent className="p-6 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="font-bold text-green-800 text-lg">Routine voltooid! 🎉</p>
              <Button onClick={reset} className="bg-green-600 hover:bg-green-700 text-white">
                Terug naar menu
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Response buttons */}
        {stepData && !stepData.is_complete && !loading && (
          <div className="space-y-3">
            {/* Quick response buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleResponse("klaar")}
                className="bg-green-600 hover:bg-green-700 text-white rounded-xl py-6 text-base"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Klaar ✓
              </Button>
              <Button
                onClick={() => handleResponse("kan niet")}
                variant="outline"
                className="border-2 border-amber-300 text-amber-800 hover:bg-amber-50 rounded-xl py-6 text-base"
              >
                <Heart className="w-5 h-5 mr-2" />
                Ik heb hulp nodig
              </Button>
            </div>

            {/* Skip + next */}
            <Button
              onClick={() => handleResponse("volgende stap")}
              variant="ghost"
              className="w-full text-gray-500"
            >
              <ChevronRight className="w-4 h-4 mr-1" />
              Sla over naar volgende stap
            </Button>

            {/* Voice input */}
            <Button
              onClick={startVoiceInput}
              variant={isListening ? "destructive" : "outline"}
              className="w-full rounded-xl py-4 border-2"
            >
              {isListening ? (
                <><MicOff className="w-5 h-5 mr-2" /> Luisteren...</>
              ) : (
                <><Mic className="w-5 h-5 mr-2" /> Spreek uw antwoord in</>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}