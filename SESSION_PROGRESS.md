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

---

# Session Progress Handoff

Date: 2026-04-27  
Repo: `prettig-thuis`

## Goal of this session

Pause implementation work and align on patient-first product direction, clinical fit, and prototype UX for people with mild/early dementia.

## What was completed

### 1) Environment and access check
- Confirmed local repo clone at `/Users/avivly/Downloads/prettig-thuis-git`
- Confirmed Git remote and clean branch state
- Confirmed Base44 CLI auth and public app reachability
- Confirmed local build works with:
  - `BASE44_LEGACY_SDK_IMPORTS=true npm run build`

### 2) Read-only 3-agent review
- Ran three parallel read-only reviews:
  - backend/model/data
  - frontend flow and ICF data flow
  - UI/UX fit for patient category
- No code changes, no commit, no push

### 3) Current model and data findings
- Realtime voice uses `gpt-realtime` by default via `createOpenAISession`
- Realtime transcription uses `whisper-1`
- Several functions use `gpt-4o-mini`, `gpt-4o-mini-tts`, and `tts-1-hd`
- `analyzeConversationForICF` uses `base44.integrations.Core.InvokeLLM`, but the effective model is not pinned in repo code
- Current clinical logic is partially evidence-informed but still largely heuristic/rule-based

### 4) Product and clinical direction agreed in discussion
- The app should support both:
  - patient mode: dementia daily-routine assistant
  - caregiver/clinical mode: ICF assessment and insight layer
- These should not be mixed into one dense patient-facing experience
- Patient side must stay calm, simple, and non-clinical
- Clinical/ICF/FAC detail belongs to caregiver/professional surfaces

### 5) Local research/material review
- Reviewed product/pitch PDFs in `/Users/avivly/Downloads/PrettigThuis `
- Reviewed local A-PROOF / ICF materials in `/Users/avivly/Downloads/aproof website/aproof 2`
- Most useful local structured assets identified:
  - `comprehensive_elderly_dialogues_dutch.json`
  - `enhanced_icf_dialogues.json`
  - `icf_fac_master_knowledge_base.json`
  - `icf_kngf_richtlijn2025_integrated_knowledge_base.json`
  - `12_enhanced_fall_prevention_2025.json`
  - `icf_categories_complete.json`
- Conclusion:
  - pitch PDFs are useful for target-user/product narrative
  - local A-PROOF/elderly ICF JSONs are more useful for clinical KB/eval direction

### 6) Patient UX direction agreed
- Prototype should be `screen-primary` first (Nest Hub/tablet style)
- But long-term architecture should still allow switching/degrading to audio-first or audio-only
- Home screen should have exactly 2 primary CTAs:
  - `Start hulp`
  - `Ik heb hulp nodig`

### 7) `Ik heb hulp nodig` flow agreed
- Tapping `Ik heb hulp nodig` should NOT immediately alert caregiver
- It should first open a short assist screen with 2 choices:
  - `Bel contactpersoon`
  - `Praat met mij`
- Rationale:
  - preserves dignity
  - avoids unnecessary escalation
  - still gives fast access to help

### 8) `Start hulp` decision agreed
- `Start hulp` should be a contextual trigger, not a menu opener
- It should use hybrid-proactive initiation:
  1. check time/context/history
  2. suggest the most relevant next routine step
  3. ask for simple confirmation
- Example:
  - Voice: `Goedemorgen. Het is tijd voor uw ontbijt en medicijnen. Zullen we beginnen?`
  - Screen:
    - primary: `Ja, graag`
    - secondary: `Anders?` or `Niet nu`
- No patient-facing routine menu like:
  - `Ochtend`
  - `Medicijnen`
  - `Eten`

### 9) Evidence/citation caution
- Design direction is sound, but several externally supplied PMIDs were not verified as matching the claims
- Safe conclusion:
  - keep the UX decision
  - re-verify all clinical citations before using them in challenge submission/presentation as evidence

## Current design baseline when resuming

### Patient-side structure
1. `Home`
   - `Start hulp`
   - `Ik heb hulp nodig`
2. `Start hulp`
   - contextual next-step suggestion
   - one large confirm CTA
   - one small correction/snooze option
3. `Ik heb hulp nodig`
   - `Bel contactpersoon`
   - `Praat met mij`
4. `Praat met mij`
   - calming structured support
   - can escalate if distress/risk increases
5. `Bel contactpersoon`
   - short confirmation/cancel window
6. `Offline/Error`
   - single calm fallback state

## Open questions / next design tasks

1. Define exact patient screens and states:
- idle/home
- contextual confirmation
- assist choice
- talking/calm support
- contact calling
- offline/error

2. Decide whether `Anders?` should:
- open a tiny 2-option correction step, or
- trigger a voice-first fallback prompt

3. Define caregiver dashboard around:
- traffic light alert model
- notes / memory board
- routine adherence
- emergency/help events

4. Separate prototype surfaces clearly:
- patient device UI
- caregiver dashboard
- clinical/ICF layer

## Resume keyword

Use this exact word to resume this thread:

`MEDISCHPUNT-RESUME`
