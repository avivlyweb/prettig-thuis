const SILENCE_REASSURANCE_MS = 8000;

const VOICE_STATUSES = {
  idle: {
    label: "Ik ben er",
    detail: "Tik op starten als u wilt praten.",
  },
  connecting: {
    label: "Ik kom eraan",
    detail: "Een ogenblikje.",
  },
  listening: {
    label: "Ik luister",
    detail: "Neem rustig de tijd.",
  },
  thinking: {
    label: "Ik denk even",
    detail: "Ik blijf bij u.",
  },
  still_there: {
    label: "Ik ben er nog",
    detail: "U hoeft zich niet te haasten.",
  },
  speaking: {
    label: "Ik praat nu",
    detail: "Luister rustig mee.",
  },
  disconnected: {
    label: "Even geen verbinding",
    detail: "U kunt opnieuw beginnen.",
  },
};

export function getPatientVoiceStatus(status) {
  return VOICE_STATUSES[status] || VOICE_STATUSES.idle;
}

export function shouldShowSilenceReassurance({ elapsedMs, isListening }) {
  return Boolean(isListening && elapsedMs >= SILENCE_REASSURANCE_MS);
}
