# Patient Device Prototype Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a separate patient-device route for Prettig Thuis with a calm two-button home, contextual `Start hulp`, and two-step help flow.

**Architecture:** Add a pure flow helper for deterministic patient-device state and copy, then render it through a dedicated React page. Register the page as its own route and keep the existing `Home`, caregiver, and clinical routes unchanged.

**Tech Stack:** React 18, Vite, Tailwind CSS, lucide-react, Node built-in test runner for pure helper tests, existing Base44 route config.

---

### Task 1: Add Patient Device Flow Helper

**Files:**
- Create: `src/lib/patientDeviceFlow.js`
- Create: `src/lib/patientDeviceFlow.test.mjs`

**Step 1: Write the failing tests**

Create `src/lib/patientDeviceFlow.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialPatientDeviceState,
  getContextualSuggestion,
  patientDeviceReducer,
} from "./patientDeviceFlow.js";

test("initial patient device state starts on home", () => {
  assert.deepEqual(getInitialPatientDeviceState(), {
    view: "home",
    selectedSuggestion: null,
    lastAction: null,
  });
});

test("contextual suggestion uses morning copy before noon", () => {
  const suggestion = getContextualSuggestion(new Date("2026-04-27T08:30:00"));
  assert.equal(suggestion.title, "Goedemorgen");
  assert.match(suggestion.message, /ontbijt/);
  assert.equal(suggestion.primaryAction, "Ja, graag");
});

test("contextual suggestion uses afternoon copy after noon", () => {
  const suggestion = getContextualSuggestion(new Date("2026-04-27T14:30:00"));
  assert.equal(suggestion.title, "Goedemiddag");
  assert.match(suggestion.message, /rustig moment/);
});

test("start help moves from home to contextual confirmation", () => {
  const state = patientDeviceReducer(getInitialPatientDeviceState(), {
    type: "START_HELP",
    now: new Date("2026-04-27T09:00:00"),
  });

  assert.equal(state.view, "contextual_confirmation");
  assert.equal(state.selectedSuggestion.title, "Goedemorgen");
});

test("need help opens assist choice instead of escalating immediately", () => {
  const state = patientDeviceReducer(getInitialPatientDeviceState(), {
    type: "NEED_HELP",
  });

  assert.equal(state.view, "assist_choice");
  assert.equal(state.lastAction, "need_help");
});

test("assist choice can enter talk support and call confirmation", () => {
  const assistState = patientDeviceReducer(getInitialPatientDeviceState(), {
    type: "NEED_HELP",
  });

  assert.equal(
    patientDeviceReducer(assistState, { type: "TALK_WITH_ME" }).view,
    "talk_support"
  );
  assert.equal(
    patientDeviceReducer(assistState, { type: "CALL_CONTACT" }).view,
    "call_confirm"
  );
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --test src/lib/patientDeviceFlow.test.mjs
```

Expected: FAIL because `src/lib/patientDeviceFlow.js` does not exist.

**Step 3: Write minimal implementation**

Create `src/lib/patientDeviceFlow.js`:

```js
export const PATIENT_DEVICE_VIEWS = {
  HOME: "home",
  CONTEXTUAL_CONFIRMATION: "contextual_confirmation",
  ASSIST_CHOICE: "assist_choice",
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
    case "TALK_WITH_ME":
      return {
        ...state,
        view: PATIENT_DEVICE_VIEWS.TALK_SUPPORT,
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
```

**Step 4: Run test to verify it passes**

Run:

```bash
node --test src/lib/patientDeviceFlow.test.mjs
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/patientDeviceFlow.js src/lib/patientDeviceFlow.test.mjs
git commit -m "Add patient device flow state helper"
```

---

### Task 2: Add Patient Device Page

**Files:**
- Create: `src/pages/PatientDevice.jsx`
- Modify: `src/pages.config.js`

**Step 1: Write the page component**

Create `src/pages/PatientDevice.jsx`:

```jsx
import React, { useReducer } from "react";
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
            <button type="button" className={primaryButton}>
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

  if (state.view === PATIENT_DEVICE_VIEWS.CALL_CONFIRM) {
    return (
      <Shell showBack onBack={goHome}>
        <section className="w-full max-w-3xl rounded-[2.5rem] bg-white/75 p-8 text-center shadow-2xl shadow-stone-300/40">
          <Phone className="mx-auto mb-6 h-20 w-20 text-[#1f5f55]" />
          <h1 className="mb-5 text-5xl font-black">Contactpersoon bellen?</h1>
          <p className="mb-8 text-3xl font-semibold leading-snug">
            We bellen pas als u bevestigt.
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
          <h1 className="mb-5 text-5xl font-black">We bellen nu</h1>
          <p className="mb-8 text-3xl font-semibold leading-snug">
            Blijf rustig zitten. Er komt hulp.
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
```

**Step 2: Register the route**

Modify `src/pages.config.js`:

```diff
 import Home from './pages/Home';
+import PatientDevice from './pages/PatientDevice';
 ...
     "Home": Home,
+    "PatientDevice": PatientDevice,
```

Do not change `mainPage` yet.

**Step 3: Run build**

Run:

```bash
BASE44_LEGACY_SDK_IMPORTS=true npm run build
```

Expected: build succeeds.

**Step 4: Commit**

```bash
git add src/pages/PatientDevice.jsx src/pages.config.js
git commit -m "Add patient device prototype page"
```

---

### Task 3: Add Demo Navigation Entry Without Replacing Home

**Files:**
- Modify: `src/Layout.jsx`

**Step 1: Add a low-risk route entry**

Modify `src/Layout.jsx`:

```diff
 import {
   Home,
+  Tablet,
 ...
 } from "lucide-react";
```

Add to `moreOptionsItems` under `Extra`:

```js
{ name: "Thuis Scherm", url: createPageUrl("PatientDevice"), icon: Tablet },
```

Do not add it to `coreNavItems`. The patient-device route should be available for demos without making the standard app navigation more patient-facing.

**Step 2: Run build**

Run:

```bash
BASE44_LEGACY_SDK_IMPORTS=true npm run build
```

Expected: build succeeds.

**Step 3: Commit**

```bash
git add src/Layout.jsx
git commit -m "Link patient device prototype in demo navigation"
```

---

### Task 4: Verify Full Prototype Flow

**Files:**
- No code changes expected unless verification finds a defect.

**Step 1: Run helper tests**

Run:

```bash
node --test src/lib/patientDeviceFlow.test.mjs
```

Expected: PASS.

**Step 2: Run build**

Run:

```bash
BASE44_LEGACY_SDK_IMPORTS=true npm run build
```

Expected: PASS.

**Step 3: Manual browser check**

Run:

```bash
npm run dev
```

Open the patient-device route and verify:

- Home shows only `Start hulp` and `Ik heb hulp nodig`.
- `Start hulp` opens one contextual confirmation.
- `Niet nu` returns home.
- `Ik heb hulp nodig` opens `Bel contactpersoon` and `Praat met mij`.
- `Bel contactpersoon` asks for confirmation before simulated calling.
- `Praat met mij` shows calm support copy.
- Existing `Home`, caregiver, and ICF routes still load.

**Step 4: Commit fixes if needed**

If manual verification requires changes:

```bash
git add <changed-files>
git commit -m "Fix patient device prototype verification issues"
```

---

### Task 5: Update Handoff Notes

**Files:**
- Modify: `SESSION_PROGRESS.md`

**Step 1: Append current implementation status**

Add a short dated section noting:

- `PatientDevice` was added as a separate prototype route.
- Existing `Home` was not replaced.
- The first prototype uses deterministic time-of-day suggestions.
- Real caregiver event integration, real calling, and voice integration remain future work.

**Step 2: Commit only the handoff update**

```bash
git add SESSION_PROGRESS.md
git commit -m "Document patient device prototype status"
```
