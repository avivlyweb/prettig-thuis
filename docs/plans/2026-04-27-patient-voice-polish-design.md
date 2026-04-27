# Patient Voice Polish Design

Date: 2026-04-27
Project: Prettig Thuis

## Decision

Add a simplified patient-only voice screen behind `/PatientDevice -> Praat met mij`, while preserving the existing full voice routes for builders and demo debugging.

## Why

The target user is a person with mild or early dementia. The patient should not see technical logs, ICF codes, dense transcript controls, or clinical language. The voice experience must tolerate pauses, repetition, hesitation, and uncertainty without making the patient feel that they failed.

## Patient Voice Screen

The patient screen should show one clear state at a time:

- `Ik ben er`
- `Ik luister`
- `Ik denk even`
- `Ik ben er nog`
- `Ik praat nu`

The screen should include large fallback controls:

- `Stop`
- `Nog een keer`
- `Terug`

If the patient pauses, the UI should remain calm. After a longer silence, it should show a gentle reassurance such as:

`Neem rustig de tijd. Ik luister.`

The assistant prompt should use short Dutch sentences, avoid open-ended questions where possible, and offer one small next step.

## Builder Voice Screens

Keep the existing routes unchanged:

- `/VoiceHome`
- `/Talk2_0`
- `/Gesprekspartner`

These remain useful for logs, transcripts, ICF behavior, and raw Realtime debugging.

## OpenAI Voice Stack

Keep the current OpenAI Realtime WebRTC foundation. Do not migrate to the OpenAI Realtime Agents SDK in this step.

Use a stronger default if available:

- realtime model: `gpt-realtime-1.5`, with backend fallback to `gpt-realtime`
- patient voice: `cedar`
- longer server VAD silence duration for dementia-friendly pauses

## Non-Goals

- No full Agents SDK migration.
- No caregiver event logging from patient voice yet.
- No real emergency/call escalation.
- No clinical terms on the patient voice screen.
