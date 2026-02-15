import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Volume2, MessageSquare, Heart, RefreshCw, CheckCircle, Loader } from 'lucide-react';
import { CareEventBackend } from '../services/voiceAssistant';
import { createOpenAISession } from "@/functions/createOpenAISession";
import { analyzeConversationForICF } from "@/functions/analyzeConversationForICF";
import { interpretIcfCodes } from "@/lib/icfInterpretation";
import { User } from "@/entities/User";

// ICF-Based Activity Database
const DAILY_ACTIVITIES = [
  // Morning Activities (7:00 AM - 12:00 PM)
  { id: 1, name: "Ochtendmedicatie", time_block: "morning", icf_codes: ["p360"], phrases: ["Tijd voor je ochtendmedicijnen", "Zullen we je pillen pakken?"] },
  { id: 2, name: "Ontbijt voorbereiden", time_block: "morning", icf_codes: ["d630", "p310"], phrases: ["Tijd voor het ontbijt", "Zullen we ontbijten?"] },
  { id: 3, name: "Lichte ochtendrekjes", time_block: "morning", icf_codes: ["b1300", "b455"], phrases: ["Een paar ochtendrekjes doen?", "Wat lichte beweging?"] },
  { id: 4, name: "Douchen en aankleden", time_block: "morning", icf_codes: ["d510", "d540"], phrases: ["Tijd om je aan te kleden", "Zullen we je klaar maken?"] },
  { id: 5, name: "Post bekijken", time_block: "morning", icf_codes: ["d166"], phrases: ["Zullen we de post bekijken?", "Nieuwe brieven kijken?"] },
  
  // Mid-day Activities (12:00 PM - 5:00 PM) 
  { id: 6, name: "Lunch voorbereiden", time_block: "midday", icf_codes: ["d630", "p310"], phrases: ["Tijd voor de lunch", "Zullen we lunchen?"] },
  { id: 7, name: "Korte wandeling", time_block: "midday", icf_codes: ["d4501", "b1300"], phrases: ["Een korte wandeling maken?", "Even naar buiten?"] },
  { id: 8, name: "Huishoudtaken", time_block: "midday", icf_codes: ["d640"], phrases: ["Wat opruimen?", "Het huis een beetje netjes maken?"] },
  { id: 9, name: "Familie bellen", time_block: "midday", icf_codes: ["d7200", "d750"], phrases: ["Iemand bellen vandaag?", "Contact met familie?"] },
  { id: 10, name: "Licht tuinieren", time_block: "midday", icf_codes: ["d6505", "b1300"], phrases: ["In de tuin werken?", "Plantjes verzorgen?"] },
  
  // Afternoon Activities (5:00 PM - 8:00 PM)
  { id: 11, name: "Avondeten voorbereiden", time_block: "afternoon", icf_codes: ["d630", "p310"], phrases: ["Avondeten klaarmaken?", "Tijd om te koken?"] },
  { id: 12, name: "Ontspanningsoefeningen", time_block: "afternoon", icf_codes: ["d240", "b1340"], phrases: ["Wat ontspannen?", "Rustig aan doen?"] },
  { id: 13, name: "Sociale activiteit", time_block: "afternoon", icf_codes: ["d9205", "d750"], phrases: ["Bezoek verwacht?", "Gezelligheid vandaag?"] },
  { id: 14, name: "Avondmedicatie", time_block: "afternoon", icf_codes: ["p360"], phrases: ["Avondmedicijnen nemen?", "Je pillen voor vanavond?"] },
  
  // Evening Activities (8:00 PM - 11:00 PM)
  { id: 15, name: "Dagafsluiting", time_block: "evening", icf_codes: ["d240", "b1340"], phrases: ["De dag afsluiten?", "Rustig worden voor de nacht?"] },
  { id: 16, name: "Lichte avondactiviteit", time_block: "evening", icf_codes: ["d9201", "b1340"], phrases: ["Iets kalms doen?", "Een boek lezen misschien?"] },
  { id: 17, name: "Voorbereiden voor slapen", time_block: "evening", icf_codes: ["d510", "b1340"], phrases: ["Klaar maken voor bed?", "Tijd om te rusten?"] }
];

export default function RealtimeVoiceAssistant2_0() {
  const [status, setStatus] = useState("Klaar om te beginnen");
  const [captions, setCaptions] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);
  const [user, setUser] = useState(null);
  
  const peerConnection = useRef(null);
  const dataChannel = useRef(null);
  const micStream = useRef(null);
  const audioPlayer = useRef(null);
  const careEventBackend = useRef(new CareEventBackend());
  const lastProcessedUserInput = useRef("");
  const sessionIdRef = useRef("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await User.me().catch(() => null);
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Demo user for testing
        setUser({
          display_name: "Gebruiker",
          dementia_stage: "mild",
          icf_profile: {
            b1300_energy_level: "light_support",
            d630_daily_routine: "light_support", 
            d4501_walking: "independent",
            d540_self_care: "independent",
            d750_social_relationships: "needs_support",
            p360_medicines: "light_support"
          }
        });
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const getCurrentTimeBlock = () => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "midday"; 
    if (hour >= 17 && hour < 20) return "afternoon";
    return "evening";
  };

  const getRelevantActivities = (timeBlock, icfProfile) => {
    const timeBasedActivities = DAILY_ACTIVITIES.filter(activity => 
      activity.time_block === timeBlock
    );

    if (!icfProfile) return timeBasedActivities.slice(0, 3);

    // Get ICF codes where user needs support
    const supportNeeded = Object.entries(icfProfile)
      .filter(([_key, value]) => value !== 'independent')
      .map(([key]) => key.split('_')[0]); // Extract code like 'b1300' from 'b1300_energy_level'

    // Prioritize activities that match user's support needs
    const priorityActivities = timeBasedActivities.filter(activity =>
      activity.icf_codes.some(code => supportNeeded.includes(code))
    );

    const otherActivities = timeBasedActivities.filter(activity =>
      !activity.icf_codes.some(code => supportNeeded.includes(code))
    );

    return [...priorityActivities, ...otherActivities].slice(0, 3);
  };

  // Improved error message extraction utility
  const getErrorMessage = (error) => {
    if (!error) return "Unknown error";
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.error) {
      if (typeof error.error === 'string') return error.error;
      if (error.error.message) return error.error.message;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return "Complex error object - check console";
    }
  };

  const log = (msg) => {
    console.log("[RealtimeVoice2.0]", msg);
    setStatus(msg);
  };

  const extractUserText = (data) => {
    if (data?.transcript) return data.transcript;
    if (data?.item?.role !== "user") return "";
    const content = Array.isArray(data.item?.content) ? data.item.content : [];
    for (const block of content) {
      if (typeof block?.text === "string" && block.text.trim()) return block.text;
      if (typeof block?.transcript === "string" && block.transcript.trim()) return block.transcript;
    }
    return "";
  };

  const detectAndLogUserSpeech = async (userText) => {
    if (!userText || !userText.trim()) return;
    const normalizedText = userText.trim();
    if (lastProcessedUserInput.current === normalizedText) return;
    lastProcessedUserInput.current = normalizedText;

    let detectedCodes = [];
    let confidence = 0.5;
    let reasons = [];

    try {
      const response = await analyzeConversationForICF({
        conversationText: `Patiënt: ${userText}`,
        recentTranscript: `Patiënt: ${userText}`,
      });

      const detected = response?.data?.detected_codes || [];
      detectedCodes = detected
        .filter((item) => typeof item?.confidence === "number" ? item.confidence >= 0.6 : true)
        .map((item) => item.code)
        .filter(Boolean);
      reasons = detected
        .filter((item) => item?.reason)
        .slice(0, 3)
        .map((item) => item.reason);

      const confidenceValues = detected
        .map((item) => item?.confidence)
        .filter((value) => typeof value === "number");
      if (confidenceValues.length > 0) {
        confidence = confidenceValues.reduce((acc, value) => acc + value, 0) / confidenceValues.length;
      }
    } catch (error) {
      console.warn("ICF detection failed for Talk 2.0 input:", error);
    }

    const interpreted = interpretIcfCodes({
      detectedCodes,
      userText: normalizedText,
      userProfile: user || {},
    });

    await careEventBackend.current.postEvent(user?.id || "realtime_user", {
      type: "checkin",
      icf_tags: interpreted.interpreted_codes,
      confidence,
      session_id: sessionIdRef.current,
      data: {
        source: "talk_2_0",
        speaker: "user",
        user_id: user?.id || "realtime_user",
        session_id: sessionIdRef.current,
        user_text: normalizedText,
        icf_reasons: reasons,
        detected_icf_codes: detectedCodes,
        interpreted_icf_codes: interpreted.interpreted_codes,
        interpreted_icf_scores: interpreted.interpreted_scores,
        interpretation_indicators: interpreted.indicators_used,
        interpretation_evidence: interpreted.evidence,
        timestamp: new Date().toISOString(),
      },
    });
  };
  
  const stopSession = useCallback(() => {
    if (dataChannel.current) {
      dataChannel.current.close();
      dataChannel.current = null;
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    if (micStream.current) {
      micStream.current.getTracks().forEach(track => track.stop());
      micStream.current = null;
    }
    
    if (audioPlayer.current && document.body.contains(audioPlayer.current)) {
      document.body.removeChild(audioPlayer.current);
      audioPlayer.current = null;
    }
    
    setIsSessionActive(false);
    setIsConnecting(false);
    setCaptions("");
    setCurrentResponse("");
    setConversationHistory([]);
    sessionIdRef.current = "";
    log("Klaar om te beginnen");
  }, []);

  useEffect(() => {
    return () => {
      if (peerConnection.current) {
        stopSession();
      }
    };
  }, [stopSession]);

  const handleDataChannelMessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("📨 Ontvangen van OpenAI (Talk 2.0):", data.type, data);
      
      switch (data.type) {
        case 'session.created':
          log("Sessie succesvol gestart!");
          break;
          
        case 'session.updated':
          log("Sessie geconfigureerd");
          break;
          
        case 'input_audio_buffer.speech_started':
          log("Ik luister...");
          setCurrentResponse("");
          break;
          
        case 'input_audio_buffer.speech_stopped':
          log("Een ogenblikje...");
          break;
          
        case 'response.created':
          log("Ik bereid mijn antwoord voor...");
          break;
          
        case 'response.audio_transcript.delta':
          if (data.delta) {
            setCurrentResponse(prev => prev + data.delta);
          }
          break;
          
        case 'response.audio_transcript.done':
          if (data.transcript) {
            setCaptions(data.transcript);
            setCurrentResponse("");
            
            setConversationHistory(prev => {
              const newHistory = [...prev, data.transcript];
              return newHistory.slice(-5); 
            });
            
            if (conversationHistory.length > 0 && 
                conversationHistory[conversationHistory.length - 1] === data.transcript) {
              console.log("🔄 Repetition detected, sending intervention...");
              sendEvent({
                type: "conversation.item.create",
                item: {
                  type: "message",
                  role: "user",
                  content: [{
                    type: "input_text",
                    text: `De gebruiker herhaalt zichzelf. Stuur een zachte, geruststellende reactie om van onderwerp te veranderen, bijvoorbeeld "We hebben het al gehad over de medicijnen. Zullen we nu over de koffie praten?"`
                  }]
                }
              });
              
              sendEvent({
                type: "response.create"
              });
            }

          }
          break;

        case 'conversation.item.input_audio_transcription.completed': {
          const userText = extractUserText(data);
          if (userText) {
            detectAndLogUserSpeech(userText);
          }
          break;
        }

        case 'conversation.item.created': {
          const userText = extractUserText(data);
          if (userText) {
            detectAndLogUserSpeech(userText);
          }
          break;
        }
          
        case 'response.done':
          log("Klaar om weer te luisteren");
          break;
          
        case 'error':
          // IMPROVED: More comprehensive error handling
          const errorMessage = getErrorMessage(data);
          console.error("Full OpenAI error data:", data);
          log(`Fout: ${errorMessage}`);
          break;
          
        case 'input_audio_buffer.committed':
          log("Audio verwerkt...");
          break;
          
        default:
          console.log(`📋 Event: ${data.type}`);
          break;
      }
    } catch (e) {
      console.error("❌ Error parsing message:", e, event.data);
      log("Fout bij verwerken van bericht");
    }
  };

  const sendSessionConfiguration = () => {
    if (!dataChannel.current || dataChannel.current.readyState !== 'open') {
      console.warn("⚠️ Cannot send session config - data channel not ready");
      return;
    }

    const currentTimeBlock = getCurrentTimeBlock();
    const relevantActivities = getRelevantActivities(currentTimeBlock, user?.icf_profile);

    const activityContext = relevantActivities.map(activity => 
      `${activity.name}: ${activity.phrases.join(' of ')}`
    ).join('\n');

    const sessionConfig = {
      type: "session.update",
      session: {
        instructions: `Je bent een kalme en geduldige Nederlandse spraakassistent, genaamd Prettig Thuis. Je rol is om ${user?.display_name || 'de gebruiker'} met lichte dementie te helpen met hun dagelijkse routines en om hen gerust te stellen.

HUIDIGE CONTEXT:
- Tijd van de dag: ${currentTimeBlock}
- Gebruiker: ${user?.display_name || 'Gebruiker'}
- Relevante activiteiten voor nu:
${activityContext}

Belangrijke richtlijnen:
- Spreek extreem langzaam en duidelijk, met een zachte, geruststellende toon. Gebruik de stem 'Cedar'.
- Gebruik korte, simpele zinnen van maximaal 10 woorden.
- Herhaal jezelf exact als de persoon verward lijkt.
- Begin gesprekken proactief door een relevante activiteit voor te stellen uit de bovenstaande lijst.
- Reageer op herhalingen van de gebruiker met kalme bekrachtiging, zoals "Ja, ik heb je gehoord." en leid het gesprek dan zachtjes naar een volgend onderwerp.
- Blijf in het heden. Als de persoon over het verleden praat, bekrachtig hun herinnering kort ("Dat klinkt mooi.") en leid het gesprek direct terug naar de huidige taak.
- Vraag geen open vragen. Bied twee keuzes aan ("Wil je koffie of thee?") of stel ja/nee-vragen.
- Als de persoon gefrustreerd raakt, reageer dan met empathie ("Ik begrijp dat dit moeilijk is") en verander van onderwerp.
- Gebruik eenvoudige verbale cues zoals 'Ik luister...' of 'Een ogenblikje...'.
- Eindig elke interactie positief.

Reageer uitsluitend in het Nederlands.`,
        voice: "cedar",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000
        },
        tools: [],
        tool_choice: "none",
        temperature: 0.7,
        max_response_output_tokens: 4096
      }
    };

    console.log("📤 Sending enhanced session configuration with ICF context...");
    dataChannel.current.send(JSON.stringify(sessionConfig));
  };

  const createPeerConnection = async () => {
    if (peerConnection.current) return;
    sessionIdRef.current = `talk_2_0_${Date.now()}`;
    
    setIsConnecting(true);
    setCaptions("");
    setCurrentResponse("");
    setConversationHistory([]);
    
    try {
      log("Sessie token aanvragen...");
      const response = await createOpenAISession({});
      console.log("Full createOpenAISession response:", response);

      if (response.error || !response.data?.client_secret?.value) {
          const errorMsg = getErrorMessage(response.error || response);
          throw new Error(`Sessie token fout: ${errorMsg}`);
      }
      
      const EPHEMERAL_KEY = response.data.client_secret.value;
      
      log("WebRTC verbinding opstarten...");
      const pc = new RTCPeerConnection();
      peerConnection.current = pc;
      
      if (!audioPlayer.current) {
        audioPlayer.current = document.createElement("audio");
        audioPlayer.current.autoplay = true;
        audioPlayer.current.style.display = "none";
        document.body.appendChild(audioPlayer.current);
      }
      
      pc.ontrack = (e) => {
        log("Audio stream ontvangen");
        if (e.streams && e.streams[0]) {
          audioPlayer.current.srcObject = e.streams[0];
        }
      };
      
      log("Microfoon toegang verkrijgen...");
      micStream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        } 
      });
      
      micStream.current.getTracks().forEach(track => {
        pc.addTrack(track, micStream.current);
      });
      
      const dc = pc.createDataChannel("oai-events");
      dataChannel.current = dc;
      
      dc.onopen = () => {
        setIsSessionActive(true);
        setIsConnecting(false);
        log("Data kanaal geopend, sessie actief!");
        sendSessionConfiguration();
      };
      
      dc.onclose = () => {
        log("Data kanaal gesloten");
        setIsSessionActive(false);
      };
      
      dc.onmessage = handleDataChannelMessage;
      
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        log(`Verbindingsstatus: ${state}`);
        if (state === "failed" || state === "disconnected" || state === "closed") {
          stopSession();
        } else if (state === "connected") {
          log("Verbonden! Je kunt nu spreken...");
        }
      };
      
      log("Verbinding maken met OpenAI...");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const sdpResponse = await fetch("https://api.openai.com/v1/realtime?model=gpt-realtime", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      });
      
      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error("SDP Response error:", {
          status: sdpResponse.status,
          statusText: sdpResponse.statusText,
          body: errorText
        });
        throw new Error(`OpenAI SDP fout: ${sdpResponse.status} - ${errorText}`);
      }
      
      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp
      });
      
    } catch (error) {
      // IMPROVED: More comprehensive error logging and display
      console.error("Full connection error:", error);
      const detailedError = getErrorMessage(error);
      log(`Verbinding mislukt: ${detailedError}`);
      setIsConnecting(false);
      stopSession();
    }
  };

  const sendEvent = (event) => {
    if (dataChannel.current?.readyState === "open") {
      console.log("📤 Sending to OpenAI (Talk 2.0):", event);
      dataChannel.current.send(JSON.stringify(event));
    } else {
      log("⚠️ Kan event niet verzenden: verbinding niet actief");
    }
  };
  
  const startSession = async () => {
    await createPeerConnection();
  };

  const sendUserMessage = (message) => {
    sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{
          type: "input_text",
          text: message
        }]
      }
    });
    
    sendEvent({
      type: "response.create"
    });
  };

  const interruptResponse = () => {
    sendEvent({
      type: "response.cancel"
    });
  };

  // Enhanced Visual Status System
  const statusMap = {
      'Ik luister...': { icon: Mic, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200', pulse: true, text: 'Ik luister...' },
      'Een ogenblikje...': { icon: RefreshCw, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', pulse: true, text: 'Een ogenblikje...' },
      'Audio verwerkt...': { icon: Loader, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', pulse: true, text: 'Audio verwerkt...' },
      'Ik bereid mijn antwoord voor...': { icon: RefreshCw, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', pulse: true, text: 'Aan het denken...' },
      'Klaar om weer te luisteren': { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200', pulse: false, text: 'Klaar voor je vraag' },
      'Verbonden! Je kunt nu spreken...': { icon: Heart, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', pulse: false, text: 'Hallo! Ik ben er om te helpen.' },
      'Klaar om te beginnen': { icon: Mic, color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', pulse: false, text: 'Start de assistent om te praten' },
      'default': { icon: Mic, color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', pulse: false, text: status }
  };
  
  const currentStatusInfo = statusMap[status] || {
    ...statusMap.default,
    text: status.startsWith('Fout:') || status.startsWith('Verbinding mislukt:') ? 'Er is een fout opgetreden' : status,
    color: status.startsWith('Fout:') || status.startsWith('Verbinding mislukt:') ? 'text-red-600' : 'text-gray-500',
    bgColor: status.startsWith('Fout:') || status.startsWith('Verbinding mislukt:') ? 'bg-red-50' : 'bg-gray-50',
    borderColor: status.startsWith('Fout:') || status.startsWith('Verbinding mislukt:') ? 'border-red-200' : 'border-gray-200',
    icon: status.startsWith('Fout:') || status.startsWith('Verbinding mislukt:') ? MicOff : Mic
  };
  
  const StatusIcon = currentStatusInfo.icon;

  return (
    <div className="min-h-screen bg-slate-50 font-lato flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-2 border-blue-100 shadow-xl rounded-3xl">
        <CardContent className="p-6 sm:p-8 space-y-6">
          
          {/* Enhanced Visual Status Cue */}
          <div className={`text-center p-6 rounded-2xl border-2 transition-all duration-300 ${currentStatusInfo.bgColor} ${currentStatusInfo.borderColor}`}>
            <div className="flex flex-col items-center gap-4">
              <StatusIcon className={`w-16 h-16 ${currentStatusInfo.color} ${currentStatusInfo.pulse ? 'animate-pulse' : ''}`} />
              <p className={`font-inter font-semibold text-2xl ${currentStatusInfo.color}`}>
                {currentStatusInfo.text}
              </p>
              {user && (
                <p className="text-sm text-gray-600">
                  Hallo {user.display_name} • {getCurrentTimeBlock() === 'morning' ? 'Goedemorgen' : 
                   getCurrentTimeBlock() === 'midday' ? 'Goedemiddag' : 
                   getCurrentTimeBlock() === 'afternoon' ? 'Goedenavond' : 'Goedenavond'}
                </p>
              )}
            </div>
          </div>

          {/* Enhanced Live Captions */}
          <Card className="border-2 border-gray-200 bg-white rounded-2xl">
            <CardContent className="p-4 sm:p-6">
              <h3 className="font-inter font-semibold text-base sm:text-lg mb-3 flex items-center gap-2 text-gray-700">
                <Volume2 className="w-5 h-5 text-gray-600" />
                Wat de assistent zegt:
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 min-h-[140px] text-lg font-lato flex items-center justify-center">
                {currentResponse ? (
                  <div className="text-blue-700 font-semibold text-xl sm:text-3xl animate-pulse">
                    {currentResponse}
                  </div>
                ) : captions ? (
                  <div className="text-gray-900 font-medium text-xl sm:text-3xl">
                    {captions}
                  </div>
                ) : (
                  <div className="text-gray-500 italic text-base sm:text-lg text-center">
                    De reactie van de assistent verschijnt hier...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {!isSessionActive && !isConnecting ? (
              <Button
                onClick={startSession}
                className="tap-target bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-xl font-semibold rounded-2xl transition-all transform hover:scale-105 focus-strong shadow-lg col-span-full"
                aria-label="Start de assistent"
              >
                <Mic className="w-7 h-7 mr-3" />
                Start Assistent
              </Button>
            ) : isConnecting ? (
              <Button
                disabled
                className="tap-target bg-gray-400 text-white px-8 py-6 text-xl font-semibold rounded-2xl col-span-full"
                aria-label="Bezig met verbinden"
              >
                <div className="animate-spin w-6 h-6 mr-3 border-2 border-white border-t-transparent rounded-full"></div>
                Verbinden...
              </Button>
            ) : (
              <>
                <Button
                  onClick={stopSession}
                  className="tap-target bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-xl font-semibold rounded-2xl transition-all focus-strong shadow-lg"
                  aria-label="Stop de assistent"
                >
                  <MicOff className="w-7 h-7 mr-2" />
                  Stop
                </Button>

                <Button
                  onClick={interruptResponse}
                  className="tap-target bg-amber-500 hover:bg-amber-600 text-white px-8 py-6 text-xl font-semibold rounded-2xl transition-all focus-strong shadow-lg"
                  aria-label="Onderbreek het antwoord"
                >
                  <MessageSquare className="w-7 h-7 mr-2" />
                  Onderbreek
                </Button>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-3 pt-4 border-t">
             <h3 className="font-inter font-medium text-center text-gray-500 text-sm">Hulp nodig?</h3>
             <div className="flex justify-center gap-3">
                <Button onClick={() => sendUserMessage("Herhaal dat alsjeblieft.")} variant="outline" className="rounded-lg">
                  Herhaal
                </Button>
                <Button onClick={() => sendUserMessage("Wat is het plan voor vandaag?")} variant="outline" className="rounded-lg">
                  Plan Vandaag
                </Button>
                <Button onClick={() => sendUserMessage("Vertel een korte, vrolijke gedachte.")} variant="outline" className="rounded-lg">
                  Vrolijke Gedachte
                </Button>
             </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}