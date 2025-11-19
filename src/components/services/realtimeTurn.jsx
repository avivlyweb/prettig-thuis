// realtimeTurn.js
const CareEventTypes = [
  "greeting", "orientation_check", "preference_choice", "memory_view",
  "compass_choice", "adl_step", "adl_complete", "medication_prompt",
  "hydration_prompt", "safety_prompt", "checkin", "incident",
  "goodbye", "sleep_mode"
];

/** Simple schema guard without external libs */
export function validateCareEvent(ev) {
  const enumSet = {};
  CareEventTypes.forEach(type => enumSet[type] = true);
  
  if (!ev || typeof ev !== "object") throw new Error("care_event missing");
  if (!enumSet[ev.type]) throw new Error("care_event.type invalid");
  if (!Array.isArray(ev.icf_tags)) throw new Error("care_event.icf_tags invalid");
  if (typeof ev.confidence !== "number" || ev.confidence < 0 || ev.confidence > 1) {
    throw new Error("care_event.confidence invalid");
  }
  if (typeof ev.data !== "object" || ev.data == null) throw new Error("care_event.data invalid");
}

/** Web Speech API wrapper with barge-in support */
export function createSpeaker() {
  return {
    speak(text, opts) {
      const synth = window.speechSynthesis;
      // Stop any current speech first
      if (synth.speaking) synth.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = opts.rate;
      utter.lang = 'nl-NL';
      utter.onstart = () => opts.onStart?.();
      utter.onend = () => opts.onEnd?.();
      utter.onboundary = () => opts.onUtterance?.(text);

      synth.speak(utter);

      return {
        stop: () => synth.cancel(),
        isSpeaking: () => synth.speaking
      };
    }
  };
}

/** Barge-in controller that listens for UI actions: Next, Repeat, Slower */
export function attachBargeIn(controls, handlers) {
  return {
    next: () => {
      if (controls.isSpeaking()) controls.stop();
      handlers.onNext();
    },
    repeat: () => {
      if (controls.isSpeaking()) controls.stop();
      handlers.onRepeat();
    },
    slower: () => {
      if (controls.isSpeaking()) controls.stop();
      handlers.onSlower();
    }
  };
}

/** Main turn runner: sends context, validates response, speaks, logs event */
export async function runAssistantTurn(params) {
  const {
    userId, context, realtime, backend, speaker, captionsEl,
    preferredRate = context.preferences?.speech_rate ?? "slow",
    onNext, onRepeat, onSlower
  } = params;

  try {
    // 1) Send to assistant
    const assistantPayload = await realtime.sendMessage({
      type: "context",
      ...context
    });

    // 2) Validate
    validateCareEvent(assistantPayload.care_event);

    // 3) Speak with captions and barge-in
    const rateNum = preferredRate === "slow" ? 0.8 : preferredRate === "fast" ? 1.15 : 1.0;
    if (captionsEl) captionsEl.textContent = assistantPayload.speak_text;

    const speechCtl = speaker.speak(assistantPayload.speak_text, {
      rate: rateNum,
      onUtterance: (text) => { if (captionsEl) captionsEl.textContent = text; }
    });

    const barge = attachBargeIn(speechCtl, {
      onNext: onNext ?? (() => {}),
      onRepeat: onRepeat ?? (() => {}),
      onSlower: onSlower ?? (() => {})
    });

    // 4) Log event to backend
    await backend.postEvent(userId, assistantPayload.care_event);

    return {
      payload: assistantPayload,
      bargeIn: barge,
      stopSpeaking: () => speechCtl.stop()
    };
  } catch (error) {
    console.error("Error in assistant turn:", error);
    throw error;
  }
}