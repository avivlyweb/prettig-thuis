# Prettig Thuis

Prettig Thuis is a React + Vite web app for home support workflows, focused on older adults and caregivers.  
The app includes routines, memory/album experiences, voice assistants, caregiver dashboards, and ICF-related admin tooling.

## Tech Stack

- React 18
- Vite 6
- Tailwind CSS
- Base44 SDK (`@base44/sdk`) + Base44 functions (Deno runtime in `functions/`)
- Radix UI components

## Main Features

- Daily routines and activity guidance (`Routines`, `Routines2_0`)
- Voice assistants (`VoiceHome`, `Talk2_0`, `Gesprekspartner`)
- Memory content flows (`MemoryAlbum`, `GoudenMomenten`, `Videos`)
- Caregiver dashboard (`Caregiver`)
- ICF workflow pages and admin uploads:
- `ICFUpload`
- `ICFInterviewDashboard`
- `AdminKnowledgeBaseUpload`
- `AdminKNGFUpload`
- `AdminICFCategoriesUpload`
- `AdminFallPreventionUpload`
- `AdminTrainingDatasetUpload`

## Project Structure

- `src/`: frontend app (pages, components, layout, API clients)
- `functions/`: server-side Base44/Deno functions
- `src/pages.config.js`: route/page registration
- `src/api/base44Client.js`: Base44 client configuration

## Local Development

### 1. Install dependencies

```bash
npm ci
```

### 2. Run the app

```bash
npm run dev
```

### 3. Build

```bash
npm run build
```

Note: this repository currently includes legacy Base44 import paths (`@/entities/*`, `@/functions/*`, `@/integrations/*`).  
If you hit build errors related to these imports, build with:

```bash
BASE44_LEGACY_SDK_IMPORTS=true npm run build
```

## Scripts

- `npm run dev`: start dev server
- `npm run build`: production build
- `npm run preview`: preview production build
- `npm run lint`: eslint
- `npm run lint:fix`: eslint autofix
- `npm run typecheck`: TypeScript check over configured JS/JSX files

## Environment / Runtime Parameters

The app reads Base44 runtime parameters via URL/query/local storage fallback:

- `VITE_BASE44_APP_ID`
- `VITE_BASE44_BACKEND_URL`
- optional URL params like `app_id`, `server_url`, `access_token`, `functions_version`

See:
- `src/lib/app-params.js`
- `src/api/base44Client.js`

## Functions

Server functions are under `functions/` and include:

- OpenAI session/audio helpers (`createOpenAISession.ts`, `generatePromptAudio.ts`)
- ICF ingestion and analysis (`ingestICFCodes.ts`, `analyzeConversationForICF.ts`, etc.)
- Admin upload pipelines (`uploadICFTrainingDataset.ts`, `uploadICFKnowledgeBase.ts`, etc.)

## Recent Updates (2026)

### Caregiver data flow

- Care events and caregiver alerts are now persisted through a shared backend-first service in `src/lib/careEvents.js` (with local fallback).
- `Caregiver`/`AlertSystem` reads from this shared service instead of only direct browser-local storage.

### Voice to ICF improvements

- `VoiceHome` and `Talk2_0` now run ICF detection on user speech turns and store structured check-ins.
- Each check-in now stores both:
- `detected_icf_codes` (raw from speech analysis)
- `interpreted_icf_codes` (context-adjusted output)
- Speech deduping is applied to avoid duplicate event logging from repeated realtime events.

### ICF interpretation layer

- Added `src/lib/icfInterpretation.js`.
- This layer refines detected ICF codes with contextual priors (frailty indicators + keyword-based indicators from patient text).
- Interpreted results include scores and evidence metadata.

### Gesprekken Analyse Dashboard

- `ICFInterviewDashboard` is now patient-data driven.
- Insights are built from real patient utterances and related activity events.
- Dashboard shows:
- detected vs interpreted ICF code distributions
- patient-only transcript insights
- linked activity events around interview windows
- per-event detection/interpretation details when available

### Data-safety update: ICF training dataset replacement

`functions/uploadICFTrainingDataset.ts` now uses a non-destructive replacement flow:

1. Validate the entire incoming dataset first.
2. Create the full replacement dataset.
3. Delete old records only after replacement creation succeeds.
4. Roll back newly created rows if creation fails.

This prevents production data from being wiped on partial upload failures.
