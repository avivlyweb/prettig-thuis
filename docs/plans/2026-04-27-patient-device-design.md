# Patient Device Prototype Design

Date: 2026-04-27
Project: Prettig Thuis

## Decision

Build a separate patient-device prototype route instead of replacing the existing `Home` page.

The existing app home is useful for demo navigation, caregiver access, professional tools, and broader product exploration. The patient-facing dementia support surface needs a different design rule: fewer choices, larger targets, calm language, and no visible clinical terminology. Keeping these surfaces separate reduces regression risk and makes the prototype easier to test.

## Target User

The route is designed for people with mild or early dementia using a tablet or Nest Hub-style screen at home. It should be screen-primary, voice-compatible, and degrade gracefully when audio or network support is unavailable.

## Patient-Side Flow

### 1. Home

The home screen has exactly two primary actions:

- `Start hulp`
- `Ik heb hulp nodig`

It should not show routine menus, ICF data, caregiver analytics, clinical scores, or general app navigation.

### 2. Start Hulp

`Start hulp` is a contextual trigger, not a menu opener.

The app should infer the likely next support moment from time, recent activity, and available routine context. It then presents one calm suggestion and asks for confirmation.

Example:

`Goedemorgen. Het is tijd voor ontbijt en medicijnen. Zullen we beginnen?`

Primary action:

- `Ja, graag`

Secondary action:

- `Niet nu` or `Anders`

The first prototype can use deterministic time-of-day logic. It should be structured so later versions can connect to real routines, caregiver notes, or activity history.

### 3. Ik Heb Hulp Nodig

This action must not immediately alert the caregiver. It first opens an assist screen with two choices:

- `Bel contactpersoon`
- `Praat met mij`

This preserves dignity, avoids unnecessary escalation, and still gives quick access to help.

### 4. Praat Met Mij

This state provides calm, structured support. It should use plain language and focus on orientation, reassurance, and the next small step. It may escalate only if distress or risk increases.

### 5. Bel Contactpersoon

This state should include a short confirmation or cancel window before contact escalation. The prototype may simulate calling rather than integrate real telephony.

### 6. Offline/Error

The fallback state should be calm and singular. It should avoid technical error language and offer one safe action such as trying again or asking the user to call the contact person.

## Route And Architecture

Add a dedicated route such as `PatientDevice` or `ThuisScherm`. The route should be reachable for demos but should not replace the existing app home yet.

The component should be state-machine-like, with explicit states:

- `home`
- `contextual_confirmation`
- `assist_choice`
- `talk_support`
- `call_confirm`
- `calling`
- `offline`

State should stay local for the first prototype. Caregiver alerts and care events can be integrated after the UX is stable.

## Visual Direction

The patient route should feel calm, domestic, and readable:

- Large typography and high-contrast buttons.
- Two choices maximum on the main screen.
- Warm, non-clinical Dutch copy.
- No dense navigation or analytics.
- Strong tap targets for tablet use.
- Reduced-motion-friendly interactions.

## Open Implementation Detail

For `Anders`, prefer a voice-first fallback prompt in the first version rather than adding another menu. If voice is unavailable, show one simple alternative: `Vertel wat u wilt doen`.

## Non-Goals

- Do not rebuild caregiver dashboards in this step.
- Do not expose ICF/FAC/clinical labels on the patient route.
- Do not make this the default landing page until it has been reviewed in context.
- Do not integrate real calling or emergency escalation in the first prototype unless explicitly requested.

## Success Criteria

- A reviewer can understand the patient flow in under 30 seconds.
- The patient-facing route has only two home CTAs.
- `Start hulp` suggests one contextual next step instead of opening a routine menu.
- `Ik heb hulp nodig` opens the two-step assist choice before escalation.
- Existing `Home`, caregiver, and professional routes remain intact.
