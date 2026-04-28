import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Mic, RotateCcw, Square, Volume2 } from "lucide-react";
import { createOpenAISession } from "@/functions/createOpenAISession";
import { analyzeConversationForICF } from "@/functions/analyzeConversationForICF";
import { interpretIcfCodes } from "@/lib/icfInterpretation";
import {
  getPatientVoiceCopy,
  getPatientVoiceStatus,
  shouldShowSilenceReassurance,
} from "@/lib/patientVoiceExperience";
import { CareEventBackend } from "../services/voiceAssistant";

const primaryButton =
  "rounded-[1.75rem] bg-[#1f5f55] px-8 py-6 text-2xl font-bold text-white shadow-xl shadow-emerald-950/20 transition hover:bg-[#184c44] focus:outline-none focus:ring-4 focus:ring-[#f8c784]";

const secondaryButton =
  "rounded-[1.5rem] border-2 border-[#d5c7ad] bg-white/80 px-6 py-5 text-xl font-semibold text-[#3d3326] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#f8c784]";

function getEphemeralKey(response) {
  return response?.data?.value || response?.data?.client_secret?.value;
}

export default function PatientVoiceCompanion({ onBack, userId = "demo_patient" }) {
  const [language, setLanguage] = useState("nl");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("Tik op starten als u wilt praten.");
  const [captions, setCaptions] = useState("");
  const [silenceStartedAt, setSilenceStartedAt] = useState(null);

  const peerConnection = useRef(null);
  const dataChannel = useRef(null);
  const micStream = useRef(null);
  const audioPlayer = useRef(null);
  const lastUserText = useRef("");
  const lastProcessedUserInput = useRef("");
  const careEventBackend = useRef(new CareEventBackend());
  const sessionIdRef = useRef("");
  const languageRef = useRef(language);
  const userIdRef = useRef(userId);

  const copy = getPatientVoiceCopy(language);
  const copyRef = useRef(copy);

  useEffect(() => {
    languageRef.current = language;
    copyRef.current = copy;
    userIdRef.current = userId;
  }, [copy, language, userId]);

  const logCareEvent = useCallback(async (type, data = {}, extra = {}) => {
    if (!sessionIdRef.current && type !== "incident") return;

    const resolvedUserId = userIdRef.current || "demo_patient";
    await careEventBackend.current.postEvent(resolvedUserId, {
      type,
      icf_tags: extra.icf_tags || [],
      confidence: typeof extra.confidence === "number" ? extra.confidence : 0.5,
      session_id: sessionIdRef.current,
      data: {
        user_id: resolvedUserId,
        source: "patient_voice_companion",
        language: languageRef.current,
        session_id: sessionIdRef.current,
        timestamp: new Date().toISOString(),
        ...data,
      },
    });
  }, []);

  const detectAndLogPatientSpeech = useCallback(async (userText) => {
    if (!userText || !userText.trim()) return;
    const normalizedText = userText.trim();
    if (lastProcessedUserInput.current === normalizedText) return;
    lastProcessedUserInput.current = normalizedText;

    let detectedCodes = [];
    let confidence = 0.5;
    let reasons = [];
    let icfAnalysisFailed = false;

    try {
      const response = await analyzeConversationForICF({
        conversationText: `Patiënt: ${normalizedText}`,
        recentTranscript: `Patiënt: ${normalizedText}`,
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
      icfAnalysisFailed = true;
      console.warn("ICF detection failed for patient voice input:", error);
    }

    const interpreted = interpretIcfCodes({
      detectedCodes,
      userText: normalizedText,
      userProfile: {},
    });

    await logCareEvent("checkin", {
      speaker: "patient",
      user_text: normalizedText,
      icf_reasons: reasons,
      detected_icf_codes: detectedCodes,
      interpreted_icf_codes: interpreted.interpreted_codes,
      interpreted_icf_scores: interpreted.interpreted_scores,
      interpretation_indicators: interpreted.indicators_used,
      interpretation_evidence: interpreted.evidence,
      icf_analysis_failed: icfAnalysisFailed,
    }, {
      icf_tags: interpreted.interpreted_codes,
      confidence,
    });
  }, [logCareEvent]);

  const stopSession = useCallback(() => {
    const activeSessionId = sessionIdRef.current;

    dataChannel.current?.close();
    dataChannel.current = null;

    peerConnection.current?.close();
    peerConnection.current = null;

    micStream.current?.getTracks().forEach((track) => track.stop());
    micStream.current = null;

    if (audioPlayer.current) {
      audioPlayer.current.srcObject = null;
    }

    setStatus("idle");
    setMessage(copyRef.current.stoppedMessage);
    setSilenceStartedAt(null);

    if (activeSessionId) {
      logCareEvent("voice_session", {
        action: "ended",
        previous_session_id: activeSessionId,
      });
    }
    sessionIdRef.current = "";
    lastProcessedUserInput.current = "";
  }, [logCareEvent]);

  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!silenceStartedAt) return;
      if (shouldShowSilenceReassurance({
        elapsedMs: Date.now() - silenceStartedAt,
        isListening: status === "listening",
      })) {
        setStatus("still_there");
        setMessage(copy.stillThereMessage);
        setSilenceStartedAt(null);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [copy.stillThereMessage, silenceStartedAt, status]);

  const sendEvent = useCallback((event) => {
    if (dataChannel.current?.readyState === "open") {
      dataChannel.current.send(JSON.stringify(event));
    }
  }, []);

  const sendSessionConfiguration = useCallback(() => {
    const isEnglish = language === "en";
    const languageInstruction = isEnglish
      ? "Speak in simple English unless the patient switches to Dutch."
      : "Spreek Nederlands. Schakel alleen naar eenvoudig Engels als de patiënt dat kiest.";
    const silencePhrase = isEnglish
      ? "Take your time. I am here."
      : "Neem rustig de tijd. Ik ben er.";
    const repeatedPhrase = isEnglish
      ? "Yes, I heard you."
      : "Ja, ik heb u gehoord.";

    sendEvent({
      type: "session.update",
      session: {
        type: "realtime",
        instructions: `Je bent Prettig Thuis, een rustige Nederlandse stem voor iemand met lichte dementie.

Doel:
- Stel gerust.
- Help met één kleine stap tegelijk.
- Laat merken dat wachten en zoeken naar woorden normaal is.

Spreekstijl:
- ${languageInstruction}
- Maximaal 10 woorden per zin.
- Geen medische termen.
- Geen open vragen als dat niet nodig is.
- Bied één keuze of één kleine stap.
- Als iemand stilvalt, zeg rustig: "${silencePhrase}"
- Als iemand herhaalt, bevestig eerst: "${repeatedPhrase}"
- Doe nooit alsof u een echte contactpersoon belt.`,
        voice: "cedar",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.42,
          prefix_padding_ms: 500,
          silence_duration_ms: 2200,
        },
        tools: [],
        tool_choice: "none",
        temperature: 0.6,
        max_response_output_tokens: 1200,
      },
    });
  }, [language, sendEvent]);

  const handleRealtimeEvent = useCallback((event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "session.created":
      case "session.updated":
        setStatus("listening");
        setMessage(copy.listeningMessage);
        setSilenceStartedAt(Date.now());
        break;
      case "input_audio_buffer.speech_started":
        setStatus("listening");
        setMessage(copy.speechStartedMessage);
        setSilenceStartedAt(null);
        break;
      case "input_audio_buffer.speech_stopped":
        setStatus("thinking");
        setMessage(copy.thinkingMessage);
        setSilenceStartedAt(null);
        break;
      case "conversation.item.input_audio_transcription.completed":
        if (data.transcript) {
          lastUserText.current = data.transcript;
          setCaptions(data.transcript);
          detectAndLogPatientSpeech(data.transcript);
        }
        break;
      case "response.audio.delta":
      case "response.output_audio.delta":
        setStatus("speaking");
        setMessage(copy.speakingMessage);
        break;
      case "response.done":
        setStatus("listening");
        setMessage(copy.readyMessage);
        setSilenceStartedAt(Date.now());
        break;
      case "error":
        setStatus("disconnected");
        setMessage(copy.errorMessage);
        setSilenceStartedAt(null);
        logCareEvent("incident", {
          kind: "voice_realtime_error",
          severity: "low",
          error_type: data?.error?.type || data?.type || "error",
          notes: data?.error?.message || "Realtime voice error",
        });
        break;
      default:
        break;
    }
  }, [copy, detectAndLogPatientSpeech, logCareEvent]);

  const startSession = useCallback(async () => {
    if (peerConnection.current) return;

    sessionIdRef.current = `patient_voice_${Date.now()}`;
    setStatus("connecting");
    setMessage(copy.connectingMessage);
    setCaptions("");

    try {
      logCareEvent("voice_session", { action: "started" });
      const response = await createOpenAISession();
      const ephemeralKey = getEphemeralKey(response);
      if (response?.error || !ephemeralKey) {
        throw new Error(response?.error?.message || copy.tokenErrorMessage);
      }

      const pc = new RTCPeerConnection();
      peerConnection.current = pc;

      if (!audioPlayer.current) {
        audioPlayer.current = document.createElement("audio");
        audioPlayer.current.autoplay = true;
        audioPlayer.current.style.display = "none";
        document.body.appendChild(audioPlayer.current);
      }

      pc.ontrack = (event) => {
        if (event.streams?.[0]) {
          audioPlayer.current.srcObject = event.streams[0];
        }
      };

      micStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      micStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, micStream.current);
      });

      const dc = pc.createDataChannel("oai-events");
      dataChannel.current = dc;
      dc.onmessage = handleRealtimeEvent;
      dc.onopen = () => {
        sendSessionConfiguration();
        setStatus("listening");
        setMessage(copy.listeningMessage);
        setSilenceStartedAt(Date.now());
        logCareEvent("voice_session", { action: "connected" });
      };
      dc.onclose = () => {
        setStatus("disconnected");
        setMessage(copy.connectionStoppedMessage);
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          setStatus("disconnected");
          setMessage(copy.connectionLostMessage);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) {
        throw new Error(await sdpResponse.text());
      }

      await pc.setRemoteDescription({
        type: "answer",
        sdp: await sdpResponse.text(),
      });
    } catch (error) {
      console.error("Patient voice connection failed:", error);
      logCareEvent("incident", {
        kind: "voice_connection_failed",
        severity: "low",
        notes: error?.message || "Patient voice connection failed",
      });
      stopSession();
      setStatus("disconnected");
      setMessage(copy.unavailableMessage);
    }
  }, [copy, handleRealtimeEvent, logCareEvent, sendSessionConfiguration, stopSession]);

  const repeatLast = () => {
    const text = lastUserText.current
      ? `${copy.repeatIntro} ${lastUserText.current}`
      : copy.repeatFallback;

    sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    sendEvent({ type: "response.create" });
  };

  const toggleLanguage = () => {
    setLanguage((current) => {
      const next = current === "nl" ? "en" : "nl";
      setMessage(getPatientVoiceStatus(status, next).detail);
      return next;
    });
  };

  const statusCopy = getPatientVoiceStatus(status, language);

  return (
    <section className="w-full max-w-4xl rounded-[2.5rem] bg-white/75 p-8 text-center shadow-2xl shadow-stone-300/40">
      <div className="mb-8 flex items-center justify-between gap-4">
        <button type="button" onClick={onBack} className={secondaryButton}>
          <ArrowLeft className="mr-2 inline h-5 w-5" />
          {copy.back}
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLanguage}
            className="rounded-full border-2 border-[#d5c7ad] bg-white/80 px-5 py-3 text-lg font-bold text-[#3d3326] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#f8c784]"
            aria-label={`Language: ${copy.languageName}`}
          >
            {copy.languageToggle}
          </button>
          <div className="rounded-full bg-[#edf7f2] px-5 py-3 text-lg font-bold text-[#1f5f55]">
            {statusCopy.label}
          </div>
        </div>
      </div>

      <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-[#1f5f55] text-white shadow-xl">
        {status === "speaking" ? <Volume2 className="h-16 w-16" /> : <Mic className="h-16 w-16" />}
      </div>

      <h1 className="mb-4 text-5xl font-black tracking-tight">{copy.title}</h1>
      <p className="mx-auto mb-6 max-w-2xl text-3xl font-semibold leading-snug">
        {message || statusCopy.detail}
      </p>

      {captions && (
        <p className="mx-auto mb-8 max-w-2xl rounded-3xl bg-[#f6efe3] px-6 py-4 text-xl text-[#5f5140]">
          {copy.heardPrefix} {captions}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <button type="button" onClick={startSession} className={primaryButton}>
          {copy.start}
        </button>
        <button type="button" onClick={repeatLast} className={secondaryButton}>
          <RotateCcw className="mr-2 inline h-5 w-5" />
          {copy.repeat}
        </button>
        <button type="button" onClick={stopSession} className={secondaryButton}>
          <Square className="mr-2 inline h-5 w-5" />
          {copy.stop}
        </button>
      </div>
    </section>
  );
}
