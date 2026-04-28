# Patient Day Simulator

## Purpose

`PatientDaySimulator` is a hidden/demo route for generating one synthetic patient day and saving the resulting monitoring events through the shared `saveCareEvent` contract. It gives professional/demo users a quick way to populate caregiver and ICF monitoring surfaces with realistic event sequences for `demo_patient` or another supplied patient id.

The route is intentionally registered outside the core patient navigation. It appears as a low-key professional tool so it can support demos, QA, and admin-style monitoring checks without becoming part of the patient-facing experience.

## Flow

The page calls the shared `buildPatientDayEvents({ userId, startDate })` contract, then saves each returned CareEvent-like object sequentially via `saveCareEvent`. It also tolerates the provisional `buildPatientDayEventPlan({ userId, date })` export while EventMesh integration is landing. The UI shows the patient id input, run state, saved event count, and the saved event list with type, time, ICF tags, and source.

## Limitations

This is not a clinical simulation engine and should not be used as patient-facing guidance or medical evidence. It depends on the EventMesh-owned `src/lib/patientDayEvents.js` module for event content and timing. The durable integration contract is `buildPatientDayEvents({ userId, startDate })`; the temporary fallback should be removed once EventMesh exports that final name.
