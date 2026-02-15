# Session Progress Handoff

Date: 2026-02-11  
Repo: `prettig-thuis`

## Goal of this session

Improve real-time voice -> ICF detection quality, connect caregiver insights to real patient input, and make dashboards reflect patient speech and activities instead of placeholders.

## What was completed

### 1) Safer data upload logic
- Fixed destructive replacement in `functions/uploadICFTrainingDataset.ts`.
- New behavior: validate first -> create replacement rows -> delete old rows only after success -> rollback created rows on failure.

### 2) Backend-first caregiver event flow
- Added shared service: `src/lib/careEvents.js`.
- Supports:
  - `saveCareEvent`, `listCareEvents`
  - `saveCaregiverAlert`, `listCaregiverAlerts`
  - `markCaregiverAlertRead`, `dismissCaregiverAlert`
- Uses Base44 entities when available (`CareEvent`, `CaregiverAlert`), with local fallback.

### 3) Voice chat ICF quality improvements
- `VoiceHome` and `Talk2_0` now detect ICF from real user speech turns (instead of fixed hardcoded tags).
- Files:
  - `src/components/voice/RealtimeVoiceAssistant.jsx`
  - `src/components/voice/RealtimeVoiceAssistant2_0.jsx`
- Each check-in now stores:
  - `detected_icf_codes`
  - `interpreted_icf_codes`
  - interpretation scores/evidence/indicators
- Duplicate transcript event logging is deduped.

### 4) Interpretation layer (detected -> interpreted ICF)
- Added `src/lib/icfInterpretation.js`.
- Purpose: enrich raw detected ICF with contextual priors from patient text + profile indicators.

### 5) Dashboard rebuilt to be patient-data-driven
- Updated `src/pages/ICFInterviewDashboard.jsx`.
- Removed static placeholder-like logic and now uses:
  - patient utterances from transcript
  - linked care/activity events
  - detected vs interpreted ICF split
- Shows real event-linked details per interview.

### 6) Policy-driven ICF interviewer using your JSON configs
- Added files:
  - `conversation_policy.json`
  - `icf_question_templates.json`
  - `intervention_retrieval_logic.json`
  - `structured_context_factors_schema.json`
- Added logic module: `src/lib/icfClinicalReasoning.js`.
- Wired into `src/components/voice/RealtimeICFInterviewer.jsx`:
  - live domain coverage tracking (`>=3 domains`, `>=2 follow-ups/domain`)
  - guided next-question generation from templates
  - auto-switch to professional mode when coverage is sufficient
  - structured patient/professional summaries on save
  - FAC estimate (0-5) + rationale
  - structured context factors (pain, balance, fear_of_falling, environment)
  - intervention suggestions with KNGF/WHO references

### 7) Documentation
- `README.md` expanded and updated with recent architecture/flow changes.

## Commits pushed in this broader session

- `9e9abfc` Prevent destructive ICF training dataset replacement
- `54057bf` Expand README with app overview and setup docs
- `7917747` Persist caregiver events in backend and improve voice ICF detection
- `684d6a9` Make interview dashboard patient-data driven
- `e96f8af` Add ICF interpretation layer and show detected vs interpreted codes
- `57269b1` Document latest caregiver and ICF interpretation updates
- `6e490a5` Add policy-driven ICF interview flow with FAC/context/intervention summaries

## Dataset review result (important)

File reviewed:
- `Gesprekspartner_2026_Unified_ICF_FAC_Dialogues_Fall_Prevention_KB.json`

Findings:
- It is JSONL structured synthetic assessment data.
- It does **not** contain real dialogue transcript text suitable for direct utterance->ICF model training.
- It can still be used as contextual prior knowledge, not as speech ground truth.

Status:
- This large dataset file was **not committed**.

## Current known gaps / next priorities

1. Improve clinician-grade scoring quality:
- Current severity/context/FAC logic is rule-based and should be calibrated with reviewed real cases.

2. Intervention retrieval:
- `intervention_retrieval_logic.json` is integrated as logic guidance, but deeper retrieval from full KNGF/WHO KB entities can be strengthened.

3. Dashboard enhancement:
- Add explicit sections for:
  - FAC trend over time
  - context factor trend over time
  - low-confidence flags (`verify_with_clinician`)

4. Evaluation harness:
- Add offline eval script for precision/recall and confidence calibration over reviewed conversations.

## Suggested immediate next action when resuming

Start with:
1. Add persistent fields in interview logs for:
  - `fac_score`, `fac_rationale`
  - structured context factors
  - intervention list
2. Extend dashboard to visualize these fields longitudinally.
3. Add confidence thresholding for `verify_with_clinician` and display it prominently.

## Quick command references

```bash
npm ci
npm run dev
npx eslint src/components/voice/RealtimeICFInterviewer.jsx src/lib/icfClinicalReasoning.js src/pages/ICFInterviewDashboard.jsx
```
