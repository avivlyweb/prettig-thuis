const SILENCE_REASSURANCE_MS = 8000;

const VOICE_STATUSES = {
  nl: {
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
  },
  en: {
    idle: {
      label: "I am here",
      detail: "Tap start if you want to talk.",
    },
    connecting: {
      label: "I am coming",
      detail: "One moment.",
    },
    listening: {
      label: "I am listening",
      detail: "Take your time.",
    },
    thinking: {
      label: "I am thinking",
      detail: "I will stay with you.",
    },
    still_there: {
      label: "I am still here",
      detail: "There is no rush.",
    },
    speaking: {
      label: "I am speaking",
      detail: "Listen calmly.",
    },
    disconnected: {
      label: "No connection",
      detail: "You can start again.",
    },
  },
};

const UI_COPY = {
  nl: {
    back: "Terug",
    title: "Praat met mij",
    start: "Start",
    repeat: "Nog een keer",
    stop: "Stop",
    heardPrefix: "Ik hoorde:",
    languageToggle: "English",
    languageName: "Nederlands",
    idleMessage: "Tik op starten als u wilt praten.",
    stoppedMessage: "Ik ben gestopt. U kunt opnieuw beginnen.",
    stillThereMessage: "Neem rustig de tijd. Ik luister.",
    listeningMessage: "Ik luister. Neem rustig de tijd.",
    speechStartedMessage: "Ik luister naar u.",
    thinkingMessage: "Ik denk even mee.",
    speakingMessage: "Ik praat nu.",
    readyMessage: "Ik ben klaar. U mag rustig praten.",
    errorMessage: "Er ging iets mis. U kunt opnieuw starten.",
    connectingMessage: "Ik maak verbinding. Een ogenblikje.",
    tokenErrorMessage: "Geen sessie token ontvangen.",
    connectionStoppedMessage: "De verbinding is gestopt.",
    connectionLostMessage: "Even geen verbinding. U kunt opnieuw starten.",
    unavailableMessage: "Het lukt nu niet. Probeer het straks opnieuw.",
    repeatIntro: "Ik zei:",
    repeatFallback: "Kunt u nog een keer rustig vertellen wat u bedoelt?",
  },
  en: {
    back: "Back",
    title: "Talk with me",
    start: "Start",
    repeat: "One more time",
    stop: "Stop",
    heardPrefix: "I heard:",
    languageToggle: "Nederlands",
    languageName: "English",
    idleMessage: "Tap start if you want to talk.",
    stoppedMessage: "I have stopped. You can start again.",
    stillThereMessage: "Take your time. I am listening.",
    listeningMessage: "I am listening. Take your time.",
    speechStartedMessage: "I am listening to you.",
    thinkingMessage: "I am thinking with you.",
    speakingMessage: "I am speaking now.",
    readyMessage: "I am ready. You may speak calmly.",
    errorMessage: "Something went wrong. You can start again.",
    connectingMessage: "I am connecting. One moment.",
    tokenErrorMessage: "No session token received.",
    connectionStoppedMessage: "The connection has stopped.",
    connectionLostMessage: "No connection for a moment. You can start again.",
    unavailableMessage: "It is not working now. Please try again later.",
    repeatIntro: "I said:",
    repeatFallback: "Can you calmly tell me once more what you mean?",
  },
};

export function normalizePatientVoiceLanguage(language) {
  return language === "en" ? "en" : "nl";
}

export function getPatientVoiceStatus(status, language = "nl") {
  const copy = VOICE_STATUSES[normalizePatientVoiceLanguage(language)];
  return copy[status] || copy.idle;
}

export function getPatientVoiceCopy(language = "nl") {
  return UI_COPY[normalizePatientVoiceLanguage(language)];
}

export function shouldShowSilenceReassurance({ elapsedMs, isListening }) {
  return Boolean(isListening && elapsedMs >= SILENCE_REASSURANCE_MS);
}
