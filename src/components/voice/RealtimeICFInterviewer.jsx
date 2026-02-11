
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, UserRound, Stethoscope, RefreshCw, CheckCircle, Loader, Brain, AlertCircle } from 'lucide-react';
import { User } from "@/entities/User";
import { ICFCode } from "@/entities/ICFCode";
import { ICFInterviewLog } from "@/entities/ICFInterviewLog";
import { createOpenAISession } from "@/functions/createOpenAISession";
import { analyzeConversationForICF } from "@/functions/analyzeConversationForICF";
import {
  buildPatientSummary,
  buildProfessionalSummary,
  computeCoverage,
  getNextTemplateQuestion,
  inferContextFactors,
  estimateFacScore,
  retrieveInterventions,
} from "@/lib/icfClinicalReasoning";

const MODE = {
  PATIENT: 'patient',
  PROFESSIONAL: 'professional'
};

export default function RealtimeICFInterviewer() {
  const [status, setStatus] = useState("Klaar om te beginnen");
  const [captions, setCaptions] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [currentMode, setCurrentMode] = useState(MODE.PATIENT);
  const [user, setUser] = useState(null);
  const [icfCodes, setIcfCodes] = useState([]);
  
  // Session tracking
  const [sessionStart, setSessionStart] = useState(null);
  const [conversationTranscript, setConversationTranscript] = useState([]);
  const [inferredICFCodes, setInferredICFCodes] = useState([]); // This will store the final codes for logging
  const [modeSwitches, setModeSwitches] = useState([]);
  
  // Real-time ICF analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedICFCodesLive, setDetectedICFCodesLive] = useState([]);
  const [lastAnalysisTranscriptLength, setLastAnalysisTranscriptLength] = useState(0);
  const [coverageLive, setCoverageLive] = useState(null);
  const [nextGuidedQuestion, setNextGuidedQuestion] = useState("");
  
  const peerConnection = useRef(null);
  const dataChannel = useRef(null);
  const micStream = useRef(null);
  const audioPlayer = useRef(null);
  const isCleaningUp = useRef(false);
  const analysisTimeoutRef = useRef(null);
  const autoSwitchedRef = useRef(false);

  const log = useCallback((msg) => {
    console.log("[ICFInterviewer]", msg);
    setStatus(msg);
  }, []);

  // Real-time ICF Analysis Function
  const analyzeConversationLive = useCallback(async () => {
    const patientTurns = conversationTranscript.filter((t) => t.speaker === "Patiënt");
    if (patientTurns.length < 2) return; // Need at least 2 patient utterances for meaningful analysis
    if (isAnalyzing) return; // Already analyzing
    
    // Only analyze if there's new content to avoid redundant API calls
    if (patientTurns.length === lastAnalysisTranscriptLength) return;
    
    setIsAnalyzing(true);
    console.log("🧠 Analyzing conversation for ICF codes...");
    
    try {
      // Pass the full conversation history for broader context
      const conversationText = patientTurns
        .map(t => `${t.speaker}: ${t.text}`)
        .join('\n');
      
      // Pass recent patient utterances for context around new additions
      const recentTranscript = patientTurns
        .slice(Math.max(0, patientTurns.length - 4))
        .map(t => `${t.speaker}: ${t.text}`)
        .join('\n');
      
      const response = await analyzeConversationForICF({
        conversationText,
        recentTranscript
      });
      
      if (response.data && response.data.detected_codes) {
        const newCodes = response.data.detected_codes
          .filter(dc => dc.confidence > 0.6) // Only show codes with 60%+ confidence
          .map(dc => dc.code);
        
        setDetectedICFCodesLive(prev => {
          const updated = [...new Set([...prev, ...newCodes])]; // Add new codes and ensure uniqueness
          console.log("✅ ICF codes detected:", updated);
          const coverage = computeCoverage(conversationTranscript, updated);
          setCoverageLive(coverage);
          const nextQuestion = getNextTemplateQuestion(conversationTranscript, coverage);
          setNextGuidedQuestion(nextQuestion.question);
          return updated;
        });
        
        setLastAnalysisTranscriptLength(patientTurns.length); // Update the last analyzed length
      }
    } catch (error) {
      console.error("❌ Error analyzing conversation:", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [conversationTranscript, isAnalyzing, lastAnalysisTranscriptLength]);

  // Trigger analysis after new conversation entries
  useEffect(() => {
    if (!isSessionActive) return;
    if (conversationTranscript.length < 2) return;
    
    // Clear existing timeout to reset the debounce timer
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    
    // Analyze after 3 seconds of no new messages (debounce)
    analysisTimeoutRef.current = setTimeout(() => {
      analyzeConversationLive();
    }, 3000);
    
    return () => {
      // Cleanup: clear timeout if component unmounts or dependencies change
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [conversationTranscript, isSessionActive, analyzeConversationLive]);

  useEffect(() => {
    const coverage = computeCoverage(conversationTranscript, detectedICFCodesLive);
    setCoverageLive(coverage);
    const nextQuestion = getNextTemplateQuestion(conversationTranscript, coverage);
    setNextGuidedQuestion(nextQuestion.question);
  }, [conversationTranscript, detectedICFCodesLive]);

  const saveSessionLog = useCallback(async () => {
    if (!sessionStart || conversationTranscript.length === 0) return;
    
    try {
      const sessionEnd = new Date();
      const durationMinutes = (sessionEnd - sessionStart) / 1000 / 60;
      
      // Use the live detected codes as the inferred codes for logging
      // Combine with any previously inferred codes (if any, though in this setup live analysis takes precedence)
      const finalICFCodes = [...new Set([...detectedICFCodesLive, ...inferredICFCodes])];
      const patientTurns = conversationTranscript.filter((t) => t.speaker === "Patiënt");
      const coverage = computeCoverage(conversationTranscript, finalICFCodes);
      const contextFactors = inferContextFactors(patientTurns);
      const facEstimate = estimateFacScore(finalICFCodes, contextFactors);
      const interventions = retrieveInterventions(finalICFCodes, contextFactors);
      const patientSummary = buildPatientSummary(user?.display_name || "u", coverage);
      const professionalSummary = buildProfessionalSummary({
        detectedCodes: finalICFCodes,
        coverage,
        contextFactors,
        facEstimate,
        interventions,
      });
      
      await ICFInterviewLog.create({
        user_id: user?.id || "demo_user",
        conversation_transcript: JSON.stringify(conversationTranscript),
        inferred_icf_codes: finalICFCodes,
        mode_switches: modeSwitches,
        session_start: sessionStart.toISOString(),
        session_end: sessionEnd.toISOString(),
        session_duration_minutes: Math.round(durationMinutes),
        ai_interpretation_patient: patientSummary,
        ai_interpretation_professional: professionalSummary
      });
      
      log(`✅ Gesprek opgeslagen met ${finalICFCodes.length} ICF codes`);
      setInferredICFCodes(finalICFCodes); // Set for display after save
    } catch (error) {
      console.error("Error saving session log:", error);
    }
  }, [sessionStart, conversationTranscript, inferredICFCodes, modeSwitches, user, log, detectedICFCodesLive]);

  const stopSession = useCallback(async () => {
    if (isCleaningUp.current) return;
    isCleaningUp.current = true;
    
    try {
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
      
      // Save session data
      await saveSessionLog();
      
      setIsSessionActive(false);
      setIsConnecting(false);
      setCaptions("");
      setCurrentResponse("");
      setConversationTranscript([]);
      // inferredICFCodes will be set by saveSessionLog, no need to clear here if we want to display post-save
      setModeSwitches([]);
      setSessionStart(null);
      setDetectedICFCodesLive([]); // Clear live codes on session stop
      setLastAnalysisTranscriptLength(0); // Reset for next session
      setCoverageLive(null);
      setNextGuidedQuestion("");
      autoSwitchedRef.current = false;
      log("Klaar om te beginnen");
    } finally {
      isCleaningUp.current = false;
    }
  }, [saveSessionLog, log]);

  useEffect(() => {
    loadData();
    
    return () => {
      // Cleanup on unmount - directly handle cleanup without calling stopSession
      if (isCleaningUp.current) return;
      isCleaningUp.current = true;
      
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
      
      isCleaningUp.current = false;
      // Clear any pending analysis timeout on unmount
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  const loadData = async () => {
    try {
      const currentUser = await User.me().catch(() => null);
      setUser(currentUser || { display_name: "Gebruiker", dementia_stage: "mild" });
      
      // Load only a subset of ICF codes to avoid rate limiting
      try {
        const codes = await ICFCode.list('-created_date', 50);
        setIcfCodes(codes);
      } catch (icfError) {
        console.warn("Could not load ICF codes:", icfError);
        setIcfCodes([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const getPatientModeInstructions = useCallback(() => {
    const icfContext = icfCodes.length > 0 
      ? icfCodes.slice(0, 20).map(code => 
          `${code.icf_code}: ${code.display_name_en}`
        ).join('\n')
      : "Common ICF domains: d4 (mobility), d5 (self-care), d7 (relationships), b1 (mental functions)";
    const coverage = computeCoverage(conversationTranscript, detectedICFCodesLive);
    const nextQuestion = getNextTemplateQuestion(conversationTranscript, coverage);
    const progressText = coverage.domainStatus
      .map((item) => `${item.domain}: detectie=${item.detected ? "ja" : "nee"}, followups=${item.followups}`)
      .join(" | ");

    return `Je bent een warme gesprekspartner voor ${user?.display_name || 'de gebruiker'}.

Gespreksbeleid:
- Start met 1 empathische zin en stel daarna 1 gerichte vraag.
- Verzamel informatie over wat, wie, waar, wanneer en hoe.
- Vraag door over activiteiten, participatie, lichaamsfuncties en omgevingsfactoren.
- Gebruik eenvoudige taal. Geen klinische termen richting patiënt.
- Rond NIET af zolang minder dan 3 ICF-domeinen voldoende uitgevraagd zijn.
- Per domein zijn minimaal 2 vervolgvragen nodig.

Realtime voortgang (intern):
${progressText}
Domeinen voltooid: ${coverage.satisfiedDomainCount}/3

Volgende gerichte vraag (gebruik deze of een equivalente variant):
${nextQuestion.question}

Adaptive mode:
- Bij fragmentarische input (zoals "moeilijk... lopen... bang") stel verduidelijkende korte vragen.
- Verzamel extra context over tijdstip, hulp, frequentie en impact.
- Bij twijfel: vraag door in plaats van samenvatten.

ICF-context (intern, niet hardop noemen):
${icfContext}

Antwoord altijd in warm, eenvoudig Nederlands met korte zinnen.`;
  }, [icfCodes, user, conversationTranscript, detectedICFCodesLive]);

  const getProfessionalModeInstructions = useCallback(() => {
    const patientTurns = conversationTranscript
      .filter((t) => t.speaker === "Patiënt")
      .map((t) => t.text)
      .join("\n");
    const coverage = computeCoverage(conversationTranscript, detectedICFCodesLive);
    const contextFactors = inferContextFactors(conversationTranscript.filter((t) => t.speaker === "Patiënt"));
    const facEstimate = estimateFacScore(detectedICFCodesLive, contextFactors);
    const interventions = retrieveInterventions(detectedICFCodesLive, contextFactors);

    return `Je rapporteert aan een zorgverlener in professioneel Nederlands.

Gebruik patiëntinput:
${patientTurns || "Nog geen patiëntinput beschikbaar."}

Verplichte output:
1) ICF-samenvatting met code + domein + ernst (0-4) + confidence (0-1)
2) FAC-inschatting (0-5) met rationale
3) Contextfactoren: pijn (b280), balans (b755), valangst (b152), omgeving (e155)
4) Aanbevolen interventies met bronverwijzing (KNGF 2025 / WHO ICF)

Realtime context:
- Domeindekking: ${coverage.satisfiedDomainCount}/3 domeinen voltooid
- Huidige FAC: ${facEstimate.fac_score}/5
- Contextscores: pijn ${contextFactors.factors.pain.severity}/4, balans ${contextFactors.factors.balance.severity}/4, valangst ${contextFactors.factors.fear_of_falling.severity}/4, omgeving ${contextFactors.factors.environment.severity}/4
- Interventievoorstellen: ${interventions.map((i) => i.intervention).join("; ")}

Antwoord compact, klinisch, en direct bruikbaar voor besluitvorming.`;
  }, [conversationTranscript, detectedICFCodesLive]);

  const handleDataChannelMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("📨 OpenAI message:", data.type);
      
      switch (data.type) {
        case 'session.created':
          log("Sessie succesvol gestart!");
          if (!sessionStart) {
            setSessionStart(new Date());
          }
          break;
          
        case 'session.updated':
          log(`Sessie geconfigureerd voor ${currentMode} modus`);
          break;
          
        case 'input_audio_buffer.speech_started':
          log("Ik luister...");
          setCurrentResponse("");
          break;
          
        case 'input_audio_buffer.speech_stopped':
          log("Een ogenblikje...");
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
            
            setConversationTranscript(prev => [...prev, {
              timestamp: new Date().toISOString(),
              speaker: 'AI',
              text: data.transcript,
              mode: currentMode
            }]);
            
            // The previous ICF code detection logic is now replaced by the analyzeConversationLive useEffect
          }
          break;
          
        case 'conversation.item.created':
          if (data.item?.content) {
            const userText = data.item.content[0]?.text || data.item.content[0]?.transcript;
            if (userText) {
              setConversationTranscript(prev => [...prev, {
                timestamp: new Date().toISOString(),
                speaker: currentMode === MODE.PATIENT ? 'Patiënt' : 'Professional',
                text: userText,
                mode: currentMode
              }]);
            }
          }
          break;
          
        case 'response.done':
          log("Klaar om weer te luisteren");
          break;
          
        case 'error':
          let errorMessage = 'Onbekende fout';
          
          if (data.error) {
            if (typeof data.error === 'string') {
              errorMessage = data.error;
            } else if (data.error.message) {
              errorMessage = data.error.message;
            } else if (data.error.code) {
              errorMessage = `Error code: ${data.error.code}`;
            } else {
              try {
                errorMessage = JSON.stringify(data.error);
              } catch {
                errorMessage = 'Complex error object';
              }
            }
          }
          
          log(`Fout: ${errorMessage}`);
          console.error("OpenAI error details:", data);
          break;
      }
    } catch (e) {
      console.error("Error parsing message:", e, event.data);
    }
  }, [currentMode, sessionStart, log]);

  const sendSessionConfiguration = useCallback((mode = currentMode) => {
    if (!dataChannel.current || dataChannel.current.readyState !== 'open') {
      console.warn("Cannot send session config - data channel not ready");
      return;
    }

    const instructions = mode === MODE.PATIENT 
      ? getPatientModeInstructions()
      : getProfessionalModeInstructions();

    const voice = mode === MODE.PATIENT ? "cedar" : "alloy";

    const sessionConfig = {
      type: "session.update",
      session: {
        instructions,
        voice,
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

    console.log("📤 Sending session configuration for mode:", mode);
    dataChannel.current.send(JSON.stringify(sessionConfig));
  }, [currentMode, getPatientModeInstructions, getProfessionalModeInstructions]);

  const switchMode = useCallback((newMode) => {
    if (newMode === currentMode) return;
    
    const modeSwitch = {
      timestamp: new Date().toISOString(),
      from_mode: currentMode,
      to_mode: newMode
    };
    
    setModeSwitches(prev => [...prev, modeSwitch]);
    setCurrentMode(newMode);
    
    if (dataChannel.current && dataChannel.current.readyState === 'open') {
      sendSessionConfiguration(newMode);
    }
    
    log(`🔄 Geschakeld naar ${newMode === MODE.PATIENT ? 'Patiënt' : 'Professional'} modus`);
  }, [currentMode, log, sendSessionConfiguration]);

  useEffect(() => {
    if (!isSessionActive || currentMode !== MODE.PATIENT) return;
    if (!coverageLive?.readyForSummary) return;
    if (autoSwitchedRef.current) return;

    autoSwitchedRef.current = true;
    switchMode(MODE.PROFESSIONAL);
    log("✅ Voldoende ICF-gegevens verzameld, automatisch naar professional modus.");
  }, [coverageLive, currentMode, isSessionActive, log, switchMode]);

  const createPeerConnection = useCallback(async () => {
    // Prevent creating a new connection if one already exists
    if (peerConnection.current || isCleaningUp.current) return;
    
    setIsConnecting(true);
    setCaptions("");
    setCurrentResponse("");
    setDetectedICFCodesLive([]); // Clear live codes on new session start
    setLastAnalysisTranscriptLength(0); // Reset analysis tracker
    setInferredICFCodes([]); // Clear previously inferred codes
    setCoverageLive(null);
    setNextGuidedQuestion("");
    autoSwitchedRef.current = false;

    try {
      log("Sessie token aanvragen...");
      const response = await createOpenAISession();

      if (response.error || !response.data?.client_secret?.value) {
        throw new Error(`Sessie token fout: ${response.error?.message || 'Unknown error'}`);
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
      
      // Check if peer connection is still valid before adding tracks
      if (!peerConnection.current || peerConnection.current.signalingState === 'closed') {
        throw new Error("Peer connection was closed before adding tracks");
      }
      
      micStream.current.getTracks().forEach(track => {
        if (peerConnection.current && peerConnection.current.signalingState !== 'closed') {
          pc.addTrack(track, micStream.current);
        }
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
      
      // Check again before setting remote description
      if (!peerConnection.current || peerConnection.current.signalingState === 'closed') {
        throw new Error("Peer connection was closed before setting remote description");
      }
      
      const sdpResponse = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      });
      
      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        throw new Error(`OpenAI SDP fout: ${sdpResponse.status} - ${errorText}`);
      }
      
      const answerSdp = await sdpResponse.text();
      
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp
      });
      
    } catch (error) {
      console.error("Connection error:", error);
      log(`Verbinding mislukt: ${error.message}`);
      setIsConnecting(false);
      stopSession();
    }
  }, [log, sendSessionConfiguration, handleDataChannelMessage, stopSession]);

  const startSession = useCallback(async () => {
    await createPeerConnection();
  }, [createPeerConnection]);

  const getStatusDisplay = () => {
    const baseStatus = {
      'Ik luister...': { icon: Mic, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
      'Een ogenblikje...': { icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
      'Klaar om weer te luisteren': { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
      'Verbonden! Je kunt nu spreken...': { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
      'Klaar om te beginnen': { icon: Mic, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' }
    };
    
    return baseStatus[status] || {
      icon: AlertCircle, // Default to an alert icon for unknown/error states
      color: status.includes('Fout') ? 'text-red-600' : 'text-gray-500',
      bg: status.includes('Fout') ? 'bg-red-50' : 'bg-gray-50',
      border: status.includes('Fout') ? 'border-red-200' : 'border-gray-200'
    };
  };

  const statusInfo = getStatusDisplay();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header with Mode Indicator */}
        <Card className="border-2 border-blue-100 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="font-inter font-bold text-2xl text-gray-900">
                ICF Gesprekspartner
              </h1>
              <Badge 
                variant="outline" 
                className={`text-lg px-4 py-2 ${
                  currentMode === MODE.PATIENT 
                    ? 'bg-green-50 border-green-300 text-green-700' 
                    : 'bg-blue-50 border-blue-300 text-blue-700'
                }`}
              >
                {currentMode === MODE.PATIENT ? (
                  <><UserRound className="w-4 h-4 mr-2" /> Patiënt Modus</>
                ) : (
                  <><Stethoscope className="w-4 h-4 mr-2" /> Professional Modus</>
                )}
              </Badge>
            </div>
            
            <p className="text-gray-600">
              {currentMode === MODE.PATIENT 
                ? "De AI spreekt vriendelijk met de patiënt en verzamelt informatie over dagelijkse activiteiten."
                : "De AI rapporteert klinisch aan de healthcare professional met ICF classificatie."}
            </p>
          </CardContent>
        </Card>

        {/* Status Display */}
        <Card className={`border-2 ${statusInfo.border} rounded-2xl ${statusInfo.bg}`}>
          <CardContent className="p-6 text-center">
            <StatusIcon className={`w-16 h-16 ${statusInfo.color} mx-auto mb-3`} />
            <p className={`font-inter font-semibold text-xl ${statusInfo.color}`}>
              {status}
            </p>
          </CardContent>
        </Card>

        {/* Live Captions */}
        {isSessionActive && (
          <Card className="border-2 border-gray-200 rounded-2xl">
            <CardContent className="p-6">
              <h3 className="font-inter font-semibold text-lg mb-3 flex items-center gap-2">
                <Volume2 className="w-5 h-5 mr-1 text-gray-600" />
                Live Gesprek:
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 min-h-[140px] text-lg">
                {currentResponse ? (
                  <div className={`font-semibold text-xl animate-pulse ${
                    currentMode === MODE.PATIENT ? 'text-green-700' : 'text-blue-700'
                  }`}>
                    {currentResponse}
                  </div>
                ) : captions ? (
                  <div className="text-gray-900 font-medium text-xl">
                    {captions}
                  </div>
                ) : (
                  <div className="text-gray-500 italic text-center">
                    De reactie verschijnt hier...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live ICF Code Detection - THE WOW EFFECT! */}
        {isSessionActive && detectedICFCodesLive.length > 0 && (
          <Card className="border-2 border-purple-200 bg-purple-50 rounded-2xl">
            <CardContent className="p-6">
              <h3 className="font-inter font-semibold text-lg mb-3 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                Live ICF Analyse {isAnalyzing && <Loader className="w-4 h-4 animate-spin text-purple-600 ml-2" />}
              </h3>
              <div className="flex flex-wrap gap-2">
                {detectedICFCodesLive.map((code, index) => (
                  <Badge 
                    key={code} 
                    className="bg-purple-600 text-white text-sm px-3 py-1 animate-in fade-in slide-in-from-left"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {code}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-purple-700 mt-3">
                ✨ De AI detecteert automatisch ICF codes uit het gesprek!
              </p>
            </CardContent>
          </Card>
        )}

        {isSessionActive && coverageLive && (
          <Card className="border-2 border-emerald-200 bg-emerald-50 rounded-2xl">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-inter font-semibold text-lg text-emerald-800">
                ICF Domeinvoortgang
              </h3>
              <div className="flex flex-wrap gap-2">
                {coverageLive.domainStatus.map((item) => (
                  <Badge
                    key={item.domain}
                    className={item.satisfied ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800"}
                  >
                    {item.domain} ({item.followups}/2)
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-emerald-700">
                Voltooid: {coverageLive.satisfiedDomainCount}/3 domeinen
              </p>
              {nextGuidedQuestion && (
                <p className="text-sm text-emerald-800">
                  Volgende vraag: "{nextGuidedQuestion}"
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ICF Codes Collected (Final, after session) */}
        {inferredICFCodes.length > 0 && !isSessionActive && (
          <Card className="border-2 border-gray-200 rounded-2xl">
            <CardContent className="p-6">
              <h3 className="font-inter font-semibold text-lg mb-3">
                Opgeslagen ICF Codes:
              </h3>
              <div className="flex flex-wrap gap-2">
                {inferredICFCodes.map(code => (
                  <Badge key={code} className="bg-gray-600 text-white">
                    {code}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!isSessionActive && !isConnecting ? (
            <Button
              onClick={startSession}
              className="col-span-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-xl rounded-2xl"
            >
              <Mic className="w-6 h-6 mr-3" />
              Start Gesprek
            </Button>
          ) : isConnecting ? (
            <Button
              disabled
              className="col-span-full bg-gray-400 text-white px-8 py-6 text-xl rounded-2xl"
            >
              <Loader className="w-6 h-6 mr-3 animate-spin" />
              Verbinden...
            </Button>
          ) : (
            <>
              <Button
                onClick={() => switchMode(currentMode === MODE.PATIENT ? MODE.PROFESSIONAL : MODE.PATIENT)}
                variant="outline"
                className="px-6 py-6 text-lg rounded-xl border-2"
              >
                {currentMode === MODE.PATIENT ? (
                  <><Stethoscope className="w-5 h-5 mr-2" /> Schakel naar Professional</>
                ) : (
                  <><UserRound className="w-5 h-5 mr-2" /> Schakel naar Patiënt</>
                )}
              </Button>
              
              <Button
                onClick={stopSession}
                variant="destructive"
                className="px-6 py-6 text-lg rounded-xl"
              >
                <MicOff className="w-5 h-5 mr-2" />
                Stop & Bewaar
              </Button>
            </>
          )}
        </div>

        {/* Session Info */}
        {isSessionActive && (
          <Card className="border-2 border-gray-200 rounded-2xl">
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-4 text-center text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{conversationTranscript.length}</p>
                  <p className="text-gray-600">Uitwisselingen</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{detectedICFCodesLive.length}</p>
                  <p className="text-gray-600">ICF Codes</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{modeSwitches.length}</p>
                  <p className="text-gray-600">Mode Switches</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {sessionStart ? Math.floor((new Date() - sessionStart) / 1000 / 60) : 0} min
                  </p>
                  <p className="text-gray-600">Duur</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
