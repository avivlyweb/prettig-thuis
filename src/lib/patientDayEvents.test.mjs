import assert from "node:assert/strict";
import test from "node:test";
import { buildPatientDayEventPlan } from "./patientDayEvents.js";

test("buildPatientDayEventPlan creates a realistic ordered day of CareEvent rows", () => {
  const events = buildPatientDayEventPlan({
    userId: "patient-123",
    date: "2026-04-27",
  });

  assert.ok(events.length >= 10);
  assert.equal(events[0].type, "orientation_check");
  assert.equal(events.at(-1).type, "sleep_mode");

  const types = events.map((event) => event.type);
  for (const expectedType of [
    "medication_prompt",
    "hydration_prompt",
    "routine_started",
    "incident",
    "checkin",
    "voice_session",
  ]) {
    assert.ok(types.includes(expectedType), `missing ${expectedType}`);
  }

  assert.ok(types.includes("adl_complete") || types.includes("routine_escalation"));

  const timestamps = events.map((event) => new Date(event.timestamp).getTime());
  assert.deepEqual([...timestamps].sort((a, b) => a - b), timestamps);
});

test("generated patient day events satisfy the shared CareEvent contract", () => {
  const events = buildPatientDayEventPlan({
    userId: "patient-123",
    date: "2026-04-27",
    source: "patient_day_simulation",
  });

  for (const event of events) {
    assert.equal(event.user_id, "patient-123");
    assert.equal(typeof event.timestamp, "string");
    assert.ok(!Number.isNaN(Date.parse(event.timestamp)));
    assert.equal(typeof event.type, "string");
    assert.equal(event.source, "patient_day_simulation");
    assert.equal(event.data.source, "patient_day_simulation");
    assert.equal(typeof event.confidence, "number");
    assert.ok(event.confidence >= 0 && event.confidence <= 1);
    assert.ok(Array.isArray(event.icf_tags));
  }

  const taggedEvents = events.filter((event) => event.icf_tags.length > 0);
  assert.ok(taggedEvents.length >= 6);
  assert.ok(taggedEvents.some((event) => event.icf_tags.includes("b144")));
  assert.ok(taggedEvents.some((event) => event.icf_tags.includes("d570")));
});
