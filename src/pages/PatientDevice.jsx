import { useReducer } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Home,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import {
  getInitialPatientDeviceState,
  patientDeviceReducer,
  PATIENT_DEVICE_VIEWS,
} from "@/lib/patientDeviceFlow";
import PatientVoiceCompanion from "@/components/voice/PatientVoiceCompanion";

const DEFAULT_PATIENT_ID = "demo_patient";

const primaryButton =
  "w-full rounded-[2rem] bg-[#1f5f55] px-8 py-8 text-3xl font-bold text-white shadow-xl shadow-emerald-950/20 transition hover:bg-[#184c44] focus:outline-none focus:ring-4 focus:ring-[#f8c784]";

const secondaryButton =
  "w-full rounded-[1.5rem] border-2 border-[#d5c7ad] bg-white/80 px-6 py-5 text-2xl font-semibold text-[#3d3326] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#f8c784]";

function Shell({ children, title = "Prettig Thuis", showBack, onBack }) {
  return (
    <div className="min-h-screen bg-[#f6efe3] text-[#2f281f]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-6 sm:px-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#1f5f55] text-white shadow-lg">
              <Home className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xl font-semibold text-[#5f5140]">{title}</p>
              <p className="text-base text-[#756854]">Rustige hulp voor thuis</p>
            </div>
          </div>
          {showBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 rounded-full bg-white/80 px-5 py-3 text-lg font-semibold text-[#3d3326] shadow-sm focus:outline-none focus:ring-4 focus:ring-[#f8c784]"
            >
              <ArrowLeft className="h-5 w-5" />
              Terug
            </button>
          )}
        </header>
        <main className="flex flex-1 items-center justify-center py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function PatientDevice() {
  const patientId =
    typeof window === "undefined"
      ? DEFAULT_PATIENT_ID
      : new URLSearchParams(window.location.search).get("patient_id")
        || new URLSearchParams(window.location.search).get("user_id")
        || new URLSearchParams(window.location.search).get("userId")
        || DEFAULT_PATIENT_ID;

  const [state, dispatch] = useReducer(
    patientDeviceReducer,
    undefined,
    getInitialPatientDeviceState
  );

  const goHome = () => dispatch({ type: "BACK_HOME" });

  if (state.view === PATIENT_DEVICE_VIEWS.CONTEXTUAL_CONFIRMATION) {
    return (
      <Shell showBack onBack={goHome}>
        <section className="w-full max-w-3xl rounded-[2.5rem] bg-white/75 p-8 shadow-2xl shadow-stone-300/40">
          <div className="mb-8 flex items-center gap-4">
            <Clock className="h-10 w-10 text-[#1f5f55]" />
            <h1 className="text-5xl font-black tracking-tight">
              {state.selectedSuggestion.title}
            </h1>
          </div>
          <p className="mb-10 text-4xl font-semibold leading-tight">
            {state.selectedSuggestion.message}
          </p>
          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => dispatch({ type: "START_CONFIRMED" })}
              className={primaryButton}
            >
              {state.selectedSuggestion.primaryAction}
            </button>
            <button type="button" onClick={goHome} className={secondaryButton}>
              {state.selectedSuggestion.secondaryAction}
            </button>
          </div>
        </section>
      </Shell>
    );
  }

  if (state.view === PATIENT_DEVICE_VIEWS.ROUTINE_STARTED) {
    return (
      <Shell showBack onBack={goHome}>
        <section className="w-full max-w-3xl rounded-[2.5rem] bg-white/75 p-8 text-center shadow-2xl shadow-stone-300/40">
          <CheckCircle2 className="mx-auto mb-6 h-20 w-20 text-[#1f5f55]" />
          <h1 className="mb-5 text-5xl font-black">We beginnen rustig</h1>
          <p className="mb-8 text-3xl font-semibold leading-snug">
            Fijn. Neem de tijd. We doen dit stap voor stap.
          </p>
          <button type="button" onClick={goHome} className={secondaryButton}>
            Terug naar begin
          </button>
        </section>
      </Shell>
    );
  }

  if (state.view === PATIENT_DEVICE_VIEWS.ASSIST_CHOICE) {
    return (
      <Shell showBack onBack={goHome}>
        <section className="w-full max-w-3xl text-center">
          <HeartHandshake className="mx-auto mb-6 h-20 w-20 text-[#1f5f55]" />
          <h1 className="mb-4 text-5xl font-black tracking-tight">
            Waarmee kan ik helpen?
          </h1>
          <p className="mb-10 text-2xl text-[#6e604f]">
            Kies rustig. U bepaalt wat er nu gebeurt.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => dispatch({ type: "CALL_CONTACT" })}
              className={primaryButton}
            >
              <Phone className="mx-auto mb-3 h-10 w-10" />
              Bel contactpersoon
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "TALK_WITH_ME" })}
              className={secondaryButton}
            >
              <MessageCircle className="mx-auto mb-3 h-10 w-10" />
              Praat met mij
            </button>
          </div>
        </section>
      </Shell>
    );
  }

  if (state.view === PATIENT_DEVICE_VIEWS.TALK_SUPPORT) {
    return (
      <Shell showBack onBack={goHome}>
        <section className="w-full max-w-3xl rounded-[2.5rem] bg-white/75 p-8 text-center shadow-2xl shadow-stone-300/40">
          <MessageCircle className="mx-auto mb-6 h-20 w-20 text-[#1f5f55]" />
          <h1 className="mb-5 text-5xl font-black">Ik ben bij u</h1>
          <p className="mb-8 text-3xl font-semibold leading-snug">
            Adem rustig in en uit. We doen samen een kleine stap.
          </p>
          <button type="button" onClick={goHome} className={secondaryButton}>
            Terug naar begin
          </button>
        </section>
      </Shell>
    );
  }

  if (state.view === PATIENT_DEVICE_VIEWS.PATIENT_VOICE) {
    return (
      <Shell showBack onBack={goHome}>
        <PatientVoiceCompanion onBack={goHome} userId={patientId} />
      </Shell>
    );
  }

  if (state.view === PATIENT_DEVICE_VIEWS.CALL_CONFIRM) {
    return (
      <Shell showBack onBack={goHome}>
        <section className="w-full max-w-3xl rounded-[2.5rem] bg-white/75 p-8 text-center shadow-2xl shadow-stone-300/40">
          <Phone className="mx-auto mb-6 h-20 w-20 text-[#1f5f55]" />
          <h1 className="mb-5 text-5xl font-black">Contactpersoon bellen?</h1>
          <p className="mb-8 text-3xl font-semibold leading-snug">
            Dit is nu nog een test. Er wordt nog niemand echt gebeld.
          </p>
          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => dispatch({ type: "CONFIRM_CALL" })}
              className={primaryButton}
            >
              Ja, bel nu
            </button>
            <button type="button" onClick={goHome} className={secondaryButton}>
              Annuleren
            </button>
          </div>
        </section>
      </Shell>
    );
  }

  if (state.view === PATIENT_DEVICE_VIEWS.CALLING) {
    return (
      <Shell showBack onBack={goHome}>
        <section className="w-full max-w-3xl rounded-[2.5rem] bg-white/75 p-8 text-center shadow-2xl shadow-stone-300/40">
          <ShieldCheck className="mx-auto mb-6 h-20 w-20 text-[#1f5f55]" />
          <h1 className="mb-5 text-5xl font-black">Test: bellen gestart</h1>
          <p className="mb-8 text-3xl font-semibold leading-snug">
            In deze test wordt geen echte contactpersoon gebeld.
          </p>
          <button type="button" onClick={goHome} className={secondaryButton}>
            Terug naar begin
          </button>
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <section className="w-full max-w-4xl text-center">
        <p className="mb-5 text-2xl font-semibold text-[#756854]">
          Vandaag is een rustige dag
        </p>
        <h1 className="mb-12 text-6xl font-black tracking-tight sm:text-7xl">
          Waarmee kan ik helpen?
        </h1>
        <div className="grid gap-6 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => dispatch({ type: "START_HELP", now: new Date() })}
            className={primaryButton}
          >
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12" />
            Start hulp
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "NEED_HELP" })}
            className={secondaryButton}
          >
            <HeartHandshake className="mx-auto mb-4 h-12 w-12" />
            Ik heb hulp nodig
          </button>
        </div>
      </section>
    </Shell>
  );
}
