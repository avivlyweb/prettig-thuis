import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Mic, RotateCcw, Square, Volume2 } from "lucide-react";
import { createOpenAISession } from "@/functions/createOpenAISession";
import {
  getPatientVoiceStatus,
  shouldShowSilenceReassurance,
} from "@/lib/patientVoiceExperience";

const primaryButton =
  "rounded-[1.75rem] bg-[#1f5f55] px-8 py-6 text-2xl font-bold text-white shadow-xl shadow-emerald-950/20 transition hover:bg-[#184c44] focus:outline-none focus:ring-4 focus:ring-[#f8c784]";

const secondaryButton =
  "rounded-[1.5rem] border-2 border-[#d5c7ad] bg-white/80 px-6 py-5 text-xl font-semibold text-[#3d3326] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#f8c784]";

function getEphemeralKey(response) {
  return response?.data?.value || response?.data?.client_secret?.value;
}

export default function PatientVoiceCompanion({ onBack }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("Tik op starten als u wilt praten.");
  const [captions, setCaptions] = useState("");
  const [silenceStartedAt, setSilenceStartedAt] = useState(null);

  const peerConnection = useRef(null);
  const dataChannel = useRef(null);
  const micStream = useRef(null);
  const audioPlayer = useRef(null);
  const lastUserText = useRef("");

  const stopSession = useCallback(() => {
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
    setMessage("Ik ben gestopt. U kunt opnieuw beginnen.");
    setSilenceStartedAt(null);
  }, []);

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
        setMessage("Neem rustig de tijd. Ik luister.");
        setSilenceStartedAt(null);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [silenceStartedAt, status]);

  const sendEvent = useCallback((event) => {
    if (dataChannel.current?.readyState === "open") {
      dataChannel.current.send(JSON.stringify(event));
    }
  }, []);

  const sendSessionConfiguration = useCallback(() => {
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
- Nederlands.
- Maximaal 10 woorden per zin.
- Geen medische termen.
- Geen open vragen als dat niet nodig is.
- Bied één keuze of één kleine stap.
- Als iemand stilvalt, zeg rustig: "Neem rustig de tijd. Ik ben er."
- Als iemand herhaalt, bevestig eerst: "Ja, ik heb u gehoord."
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
  }, [sendEvent]);

  const handleRealtimeEvent = useCallback((event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "session.created":
      case "session.updated":
        setStatus("listening");
        setMessage("Ik luister. Neem rustig de tijd.");
        setSilenceStartedAt(Date.now());
        break;
      case "input_audio_buffer.speech_started":
        setStatus("listening");
        setMessage("Ik luister naar u.");
        setSilenceStartedAt(null);
        break;
      case "input_audio_buffer.speech_stopped":
        setStatus("thinking");
        setMessage("Ik denk even mee.");
        setSilenceStartedAt(null);
        break;
      case "conversation.item.input_audio_transcription.completed":
        if (data.transcript) {
          lastUserText.current = data.transcript;
          setCaptions(data.transcript);
        }
        break;
      case "response.audio.delta":
      case "response.output_audio.delta":
        setStatus("speaking");
        setMessage("Ik praat nu.");
        break;
      case "response.done":
        setStatus("listening");
        setMessage("Ik ben klaar. U mag rustig praten.");
        setSilenceStartedAt(Date.now());
        break;
      case "error":
        setStatus("disconnected");
        setMessage("Er ging iets mis. U kunt opnieuw starten.");
        setSilenceStartedAt(null);
        break;
      default:
        break;
    }
  }, []);

  const startSession = useCallback(async () => {
    if (peerConnection.current) return;

    setStatus("connecting");
    setMessage("Ik maak verbinding. Een ogenblikje.");
    setCaptions("");

    try {
      const response = await createOpenAISession();
      const ephemeralKey = getEphemeralKey(response);
      if (response?.error || !ephemeralKey) {
        throw new Error(response?.error?.message || "Geen sessie token ontvangen.");
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
        setMessage("Ik luister. Neem rustig de tijd.");
        setSilenceStartedAt(Date.now());
      };
      dc.onclose = () => {
        setStatus("disconnected");
        setMessage("De verbinding is gestopt.");
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          setStatus("disconnected");
          setMessage("Even geen verbinding. U kunt opnieuw starten.");
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
      stopSession();
      setStatus("disconnected");
      setMessage("Het lukt nu niet. Probeer het straks opnieuw.");
    }
  }, [handleRealtimeEvent, sendSessionConfiguration, stopSession]);

  const repeatLast = () => {
    const text = lastUserText.current
      ? `Ik zei: ${lastUserText.current}`
      : "Kunt u nog een keer rustig vertellen wat u bedoelt?";

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

  const statusCopy = getPatientVoiceStatus(status);

  return (
    <section className="w-full max-w-4xl rounded-[2.5rem] bg-white/75 p-8 text-center shadow-2xl shadow-stone-300/40">
      <div className="mb-8 flex items-center justify-between gap-4">
        <button type="button" onClick={onBack} className={secondaryButton}>
          <ArrowLeft className="mr-2 inline h-5 w-5" />
          Terug
        </button>
        <div className="rounded-full bg-[#edf7f2] px-5 py-3 text-lg font-bold text-[#1f5f55]">
          {statusCopy.label}
        </div>
      </div>

      <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-[#1f5f55] text-white shadow-xl">
        {status === "speaking" ? <Volume2 className="h-16 w-16" /> : <Mic className="h-16 w-16" />}
      </div>

      <h1 className="mb-4 text-5xl font-black tracking-tight">Praat met mij</h1>
      <p className="mx-auto mb-6 max-w-2xl text-3xl font-semibold leading-snug">
        {message || statusCopy.detail}
      </p>

      {captions && (
        <p className="mx-auto mb-8 max-w-2xl rounded-3xl bg-[#f6efe3] px-6 py-4 text-xl text-[#5f5140]">
          Ik hoorde: {captions}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <button type="button" onClick={startSession} className={primaryButton}>
          Start
        </button>
        <button type="button" onClick={repeatLast} className={secondaryButton}>
          <RotateCcw className="mr-2 inline h-5 w-5" />
          Nog een keer
        </button>
        <button type="button" onClick={stopSession} className={secondaryButton}>
          <Square className="mr-2 inline h-5 w-5" />
          Stop
        </button>
      </div>
    </section>
  );
}
