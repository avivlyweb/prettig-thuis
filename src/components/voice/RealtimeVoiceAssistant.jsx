import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Volume2, MessageSquare, Settings } from 'lucide-react';
import { CareEventBackend } from '../services/voiceAssistant';
import { createOpenAISession } from "@/functions/createOpenAISession";


export default function RealtimeVoiceAssistant() {
  const [status, setStatus] = useState("Klaar om te beginnen");
  const [captions, setCaptions] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  
  const peerConnection = useRef(null);
  const dataChannel = useRef(null);
  const micStream = useRef(null);
  const audioPlayer = useRef(null);
  const careEventBackend = useRef(new CareEventBackend());

  const log = (msg) => {
    console.log("[RealtimeVoice]", msg);
    setStatus(msg);
  };
  
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (peerConnection.current) {
        stopSession();
      }
    };
  }, []);

  // Handle incoming messages from OpenAI Realtime API
  const handleDataChannelMessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("📨 Ontvangen van OpenAI:", data.type, data);
      
      switch (data.type) {
        case 'session.created':
          log("✅ Sessie succesvol gestart!");
          // sendSessionConfiguration is now called on dc.onopen
          break;
          
        case 'session.updated':
          log("⚙️ Sessie geconfigureerd voor Nederlandse gesprekken");
          break;
          
        case 'input_audio_buffer.speech_started':
          log("🎤 Ik luister naar je...");
          setCurrentResponse("");
          break;
          
        case 'input_audio_buffer.speech_stopped':
          log("🤔 Ik denk na over je vraag...");
          break;
          
        case 'response.created':
          log("💭 Ik bereid mijn antwoord voor...");
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
            // Log this as a care event
            careEventBackend.current.postEvent("realtime_user", {
              type: "checkin",
              icf_tags: ["b144", "d350"],
              confidence: 0.8,
              data: {
                interaction_type: "voice_conversation",
                response_text: data.transcript,
                timestamp: new Date().toISOString()
              }
            });
          }
          break;
          
        case 'response.done':
          log("✅ Klaar om weer te luisteren");
          break;
          
        case 'error':
          log(`❌ Fout: ${data.error?.message || 'Onbekende fout'}`);
          console.error("OpenAI error:", data);
          break;
          
        case 'input_audio_buffer.committed':
          log("🔄 Audio verwerkt, wacht op antwoord...");
          break;
          
        default:
          // Log other events for debugging
          console.log(`📋 Event: ${data.type}`);
          break;
      }
    } catch (e) {
      console.error("❌ Error parsing message:", e, event.data);
    }
  };

  const sendSessionConfiguration = () => {
    if (!dataChannel.current || dataChannel.current.readyState !== 'open') {
      console.warn("⚠️ Cannot send session config - data channel not ready");
      return;
    }

    // Configure the session for Dutch conversations about daily care
    const sessionConfig = {
      type: "session.update",
      session: {
        instructions: `Je bent een vriendelijke Nederlandse spraakassistent genaamd Prettig Thuis. 
          Je helpt ouderen met lichte dementie bij dagelijkse routines. 
          
          Belangrijke richtlijnen:
          - Spreek langzaam, duidelijk en gebruik eenvoudige zinnen
          - Wees geduldig en herhaal indien nodig
          - Vraag altijd hoe de persoon zich voelt
          - Bied hulp aan met dagelijkse activiteiten zoals medicijnen, eten, of contact met familie
          - Als iemand verward lijkt over tijd of plaats, wees geruststellend
          - Eindig gesprekken altijd positief
          
          Reageer in het Nederlands en houd zinnen kort (max 15 woorden per zin).`,
        voice: "alloy",
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

    console.log("📤 Sending session configuration...");
    dataChannel.current.send(JSON.stringify(sessionConfig));
  };

  const createPeerConnection = async () => {
    if (peerConnection.current) return;
    
    setIsConnecting(true);
    setCaptions("");
    setCurrentResponse("");
    
    try {
      // Step 1: Get ephemeral token from our OWN backend function
      log("Sessie token aanvragen...");
      const { data: sessionData, error } = await createOpenAISession();

      if (error || !sessionData?.client_secret?.value) {
          throw new Error(error?.message || "Kon geen sessie token ontvangen van de backend.");
      }
      
      const EPHEMERAL_KEY = sessionData.client_secret.value;
      
      // Step 2: Create WebRTC peer connection
      log("WebRTC verbinding opstarten...");
      const pc = new RTCPeerConnection();
      peerConnection.current = pc;
      
      // Step 3: Set up audio element for playing OpenAI's voice
      if (!audioPlayer.current) {
        audioPlayer.current = document.createElement("audio");
        audioPlayer.current.autoplay = true;
        audioPlayer.current.style.display = "none";
        document.body.appendChild(audioPlayer.current);
      }
      
      pc.ontrack = (e) => {
        log("🔊 Audio stream ontvangen van OpenAI");
        if (e.streams && e.streams[0]) {
          audioPlayer.current.srcObject = e.streams[0];
        }
      };
      
      // Step 4: Get microphone access and add to peer connection
      log("🎤 Microfoon toegang verkrijgen...");
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
      
      // Step 5: Set up data channel for events
      const dc = pc.createDataChannel("oai-events");
      dataChannel.current = dc;
      
      dc.onopen = () => {
        setIsSessionActive(true);
        setIsConnecting(false);
        log("📡 Data kanaal geopend, sessie actief!");
        sendSessionConfiguration();
      };
      
      dc.onclose = () => {
        log("📡 Data kanaal gesloten");
        setIsSessionActive(false);
      };
      
      dc.onmessage = handleDataChannelMessage;
      
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        log(`🔗 Verbindingsstatus: ${state}`);
        if (state === "failed" || state === "disconnected" || state === "closed") {
          stopSession();
        } else if (state === "connected") {
          log("🎉 Verbonden! Je kunt nu spreken...");
        }
      };
      
      // Step 6: Create offer and connect DIRECTLY to OpenAI with the ephemeral key
      log("🤝 Verbinding maken met OpenAI...");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
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
        throw new Error(`OpenAI SDP error: ${sdpResponse.status} ${errorText}`);
      }
      
      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp
      });
      
    } catch (error) {
      log(`❌ Verbinding mislukt: ${error.message}`);
      console.error("Connection error:", error);
      setIsConnecting(false);
      stopSession();
    }
  };

  const sendEvent = (event) => {
    if (dataChannel.current?.readyState === "open") {
      console.log("📤 Sending to OpenAI:", event);
      dataChannel.current.send(JSON.stringify(event));
    } else {
      log("⚠️ Kan event niet verzenden: verbinding niet actief");
    }
  };
  
  const startSession = async () => {
    await createPeerConnection();
  };

  const stopSession = () => {
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
    log("🛑 Sessie gestopt");
  };

  const sendMorningGreeting = () => {
    const now = new Date();
    const hour = now.getHours();
    const isDark = hour < 7 || hour > 19;
    
    sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{
          type: "input_text",
          text: `Goedemorgen! Het is ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}. ${isDark ? 'Het is nog donker buiten.' : ''} Kun je me helpen met mijn ochtend routine?`
        }]
      }
    });
    
    sendEvent({
      type: "response.create"
    });
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

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-inter font-bold text-gray-900">
            Spraakassistent
          </h1>
          <p className="text-base text-gray-600 font-lato mt-2">
            Een rustige en helpende stem voor uw dagelijkse routine.
          </p>
        </header>

        <main className="space-y-6">
          {/* Status Card */}
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                  isSessionActive ? 'bg-green-100 text-green-800' :
                  isConnecting ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {isSessionActive ? <Mic className="w-4 h-4" /> : 
                   isConnecting ? <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" /> :
                   <MicOff className="w-4 h-4" />}
                  <span className="font-medium">{status}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={startSession} 
                  disabled={isSessionActive || isConnecting}
                  className="tap-target bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Start Sessie
                </Button>
                
                <Button 
                  onClick={stopSession} 
                  disabled={!isSessionActive && !isConnecting}
                  variant="destructive"
                  className="tap-target"
                >
                  <MicOff className="w-4 h-4 mr-2" />
                  Stop Sessie
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live Captions */}
          {isSessionActive && (
            <Card className="border-2 border-green-200">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-green-600" />
                  Live Gesprek:
                </h3>
                <div className="bg-slate-100 rounded-lg p-4 min-h-[120px] text-lg font-lato">
                  {currentResponse && (
                    <div className="text-blue-700 font-medium mb-2">
                      🤖 {currentResponse}
                    </div>
                  )}
                  {captions && (
                    <div className="text-gray-800">
                      <strong>Laatste reactie:</strong> {captions}
                    </div>
                  )}
                  {!currentResponse && !captions && (
                    <div className="text-gray-500 italic">
                      Zeg "Hallo" om het gesprek te beginnen...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          {isSessionActive && (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">Snelle acties:</h3>
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    onClick={sendMorningGreeting}
                    variant="outline" 
                    className="tap-target w-full text-left justify-start"
                  >
                    🌅 Ochtendgroet sturen
                  </Button>
                  <Button 
                    onClick={() => sendUserMessage("Kun je me helpen met mijn dagelijkse routine?")}
                    variant="outline" 
                    className="tap-target w-full text-left justify-start"
                  >
                    📋 Hulp bij dagelijkse routine
                  </Button>
                  <Button 
                    onClick={() => sendUserMessage("Hoe laat is het nu?")}
                    variant="outline" 
                    className="tap-target w-full text-left justify-start"
                  >
                    🕐 Tijd vragen
                  </Button>
                  <Button 
                    onClick={interruptResponse}
                    variant="outline" 
                    className="tap-target w-full text-left justify-start border-red-200 text-red-700 hover:bg-red-50"
                  >
                    ⏹️ Onderbreek antwoord
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connection Help */}
          {!isSessionActive && !isConnecting && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="text-center space-y-3">
                  <h3 className="font-semibold text-blue-800">Klaar om te beginnen!</h3>
                  <p className="text-sm text-blue-700">
                    Klik op "Start Sessie" om een gesprek te beginnen. 
                    Zorg dat je microfoon werkt en spreek duidelijk.
                  </p>
                  <div className="text-xs text-blue-600 space-y-1">
                    <p>💡 Je kunt gewoon beginnen met "Hallo" of "Goedemorgen"</p>
                    <p>🎤 De assistent detecteert automatisch wanneer je klaar bent met spreken</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}