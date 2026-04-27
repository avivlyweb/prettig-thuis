# Patient Voice Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a simplified dementia-friendly patient voice screen from `/PatientDevice -> Praat met mij` while preserving existing full voice debug routes.

**Architecture:** Add a small pure state/copy helper with tests, then create a patient-only Realtime WebRTC component that reuses the existing Base44 `createOpenAISession` function. Wire `PatientDevice` to open that component and adjust the token function defaults/fallbacks.

**Tech Stack:** React 18, Vite, OpenAI Realtime WebRTC, Base44 functions, Node built-in test runner.

---

### Task 1: Patient Voice UX Helper

Create `src/lib/patientVoiceExperience.js` and `src/lib/patientVoiceExperience.test.mjs`.

Test:
- idle/listening/thinking/still-there/speaking/disconnected labels
- silence prompt after long quiet period
- no prompt before threshold

### Task 2: Patient Voice Component

Create `src/components/voice/PatientVoiceCompanion.jsx`.

Requirements:
- Uses existing `createOpenAISession`
- WebRTC direct Realtime connection
- Simple patient UI only
- Voice `cedar`
- VAD silence duration around 2200ms
- Large `Stop`, `Nog een keer`, `Terug` controls
- Gentle silence reassurance after several seconds

### Task 3: Wire PatientDevice

Add a `patient_voice` view to `patientDeviceFlow`.

Make `/PatientDevice -> Ik heb hulp nodig -> Praat met mij` open the simplified voice screen, not the old debug voice pages.

### Task 4: Token Function Polish

Update `base44/functions/createOpenAISession/entry.ts` default model to `gpt-realtime-1.5`, default voice to `cedar`, and fallback once to `gpt-realtime` when no explicit `OPENAI_REALTIME_MODEL` env override is set.

### Task 5: Verify

Run:

```bash
node --test src/lib/patientDeviceFlow.test.mjs src/lib/patientVoiceExperience.test.mjs
npm run build -- --configLoader runner
npm run lint
```

Push after passing.
