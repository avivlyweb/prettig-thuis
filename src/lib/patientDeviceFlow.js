export const PATIENT_DEVICE_VIEWS = {
  HOME: "home",
  CONTEXTUAL_CONFIRMATION: "contextual_confirmation",
  ROUTINE_STARTED: "routine_started",
  ASSIST_CHOICE: "assist_choice",
  PATIENT_VOICE: "patient_voice",
  TALK_SUPPORT: "talk_support",
  CALL_CONFIRM: "call_confirm",
  CALLING: "calling",
  OFFLINE: "offline",
};

export function getInitialPatientDeviceState() {
  return {
    view: PATIENT_DEVICE_VIEWS.HOME,
    selectedSuggestion: null,
    lastAction: null,
  };
}

export function getContextualSuggestion(now = new Date()) {
  const hour = now.getHours();

  if (hour < 12) {
    return {
      title: "Goedemorgen",
      message: "Het is tijd voor ontbijt en medicijnen. Zullen we beginnen?",
      primaryAction: "Ja, graag",
      secondaryAction: "Niet nu",
    };
  }

  if (hour < 17) {
    return {
      title: "Goedemiddag",
      message: "Dit is een goed moment voor een rustig moment. Zullen we samen beginnen?",
      primaryAction: "Ja, graag",
      secondaryAction: "Niet nu",
    };
  }

  return {
    title: "Goedenavond",
    message: "Het is tijd om rustig af te sluiten. Zullen we samen kijken wat nog nodig is?",
    primaryAction: "Ja, graag",
    secondaryAction: "Niet nu",
  };
}

export function patientDeviceReducer(state, action) {
  switch (action.type) {
    case "START_HELP":
      return {
        ...state,
        view: PATIENT_DEVICE_VIEWS.CONTEXTUAL_CONFIRMATION,
        selectedSuggestion: getContextualSuggestion(action.now),
        lastAction: "start_help",
      };
    case "NEED_HELP":
      return {
        ...state,
        view: PATIENT_DEVICE_VIEWS.ASSIST_CHOICE,
        lastAction: "need_help",
      };
    case "START_CONFIRMED":
      return {
        ...state,
        view: PATIENT_DEVICE_VIEWS.ROUTINE_STARTED,
        lastAction: "start_confirmed",
      };
    case "TALK_WITH_ME":
      return {
        ...state,
        view: PATIENT_DEVICE_VIEWS.PATIENT_VOICE,
        lastAction: "talk_with_me",
      };
    case "CALL_CONTACT":
      return {
        ...state,
        view: PATIENT_DEVICE_VIEWS.CALL_CONFIRM,
        lastAction: "call_contact",
      };
    case "CONFIRM_CALL":
      return {
        ...state,
        view: PATIENT_DEVICE_VIEWS.CALLING,
        lastAction: "confirm_call",
      };
    case "OFFLINE":
      return {
        ...state,
        view: PATIENT_DEVICE_VIEWS.OFFLINE,
        lastAction: "offline",
      };
    case "BACK_HOME":
      return getInitialPatientDeviceState();
    default:
      return state;
  }
}
