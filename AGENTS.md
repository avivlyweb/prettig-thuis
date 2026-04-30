# Agent Instructions

## Project Identity

Prettig Thuis is a Dutch, voice-first home support app for older adults, caregivers, and professional/clinical review. It combines a calm patient device experience with caregiver dashboards, ICF signal detection, FAC/context reasoning, Base44 backend functions, and OpenAI Realtime voice flows.

Read `README.md`, `SESSION_PROGRESS.md`, and relevant files under `docs/plans/` before making product, clinical, or workflow changes.

## Core Product Boundaries

- Keep patient-facing routes calm, simple, Dutch-first, and non-clinical.
- `/PatientDevice` is a separate patient route. Do not replace `Home` or expose caregiver/professional tooling there.
- Patient home must stay two-choice only: `Start hulp` and `Ik heb hulp nodig`.
- `Start hulp` is a contextual suggestion, not a routine menu.
- `Ik heb hulp nodig` must first show patient choices such as `Bel contactpersoon` and `Praat met mij`; do not immediately alert, call, or escalate unless explicitly implementing a reviewed emergency flow.
- Do not show ICF/FAC labels, confidence scores, analytics, transcripts-for-debugging, or clinical reasoning on patient screens.
- Patient voice UX must tolerate pauses, repetition, hesitation, and uncertainty with short, reassuring copy.

## Clinical And Data Safety

- Clinical/ICF/FAC detail belongs on caregiver, professional, and admin surfaces only.
- Treat ICF/FAC outputs as decision support, not diagnosis or treatment direction.
- Current FAC/context/intervention logic is partly heuristic and rule-based. Do not describe it as clinician-grade without reviewed evidence and calibration.
- Do not present KNGF, WHO, PMID, or other clinical claims as verified unless the exact source and claim have been checked.
- Keep synthetic/demo data visibly separate from real patient data in route placement, naming, source fields, and UI copy.
- Preserve provenance for care events and inferred codes: source, confidence, transcript/user text when appropriate, and whether data came from patient speech, demo defaults, or synthetic simulation.

## Base44 And Backend Caution

- Treat `base44/functions/**` as production backend code, especially functions using service-role writes.
- Do not invoke admin upload pages or upload functions against a real Base44 app unless the user explicitly asks.
- Preserve safer upload behavior where it exists: validate first, create replacements, rollback on failure, and delete old rows only after successful replacement.
- Do not loosen hard-coded admin authorization without explicit approval and a replacement authorization design.
- Do not commit hardcoded app IDs, tokens, API keys, or server URLs. Client configuration should come from URL/env/localStorage patterns already used in the repo.

## Workflow

- Start with `git status --short` and preserve unrelated user changes.
- Keep edits scoped to the task. Do not add broad refactors, dependency upgrades, formatting churn, or adjacent fixes unless requested.
- Prefer existing patterns in `src/pages`, `src/components`, `src/lib`, `src/api`, and `base44/functions`.
- For UI changes, preserve the existing shadcn/Radix/Tailwind style and verify responsive behavior where the touched surface is patient-facing.
- Update `README.md`, `SESSION_PROGRESS.md`, or `docs/plans/` when changing architecture, data flow, setup, verification, or product decisions.

## Verification

There is no `npm test` script. Run Node tests directly.

Use targeted checks first:

```bash
node --test src/lib/patientDeviceFlow.test.mjs
node --test src/lib/patientVoiceExperience.test.mjs
node --test src/lib/patientDayEvents.test.mjs
```

For broader changes, run:

```bash
npm run lint
npm run typecheck
npm run build
```

Notes:

- `npm run build` already includes `BASE44_LEGACY_SDK_IMPORTS=true`.
- `npm run lint` and `npm run typecheck` do not cover every file. Inspect touched files directly when working outside their configured scope.
- For patient UI changes, manually smoke the relevant route and provide screenshots or a clear visual check summary when possible.
- For clinical inference or LLM prompt changes, add or update regression examples and state what remains unverified.

## Handoff

Every handoff should include:

- What changed and why.
- Files touched.
- Verification commands and outcomes.
- Patient UX, clinical, data, or Base44 risks.
- Known gaps and follow-up tasks.

For unfinished work, include blockers, failed attempts, current state, and the next concrete action.
