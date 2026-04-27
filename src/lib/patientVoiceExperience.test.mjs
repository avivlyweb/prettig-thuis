import assert from "node:assert/strict";
import test from "node:test";
import {
  getPatientVoiceStatus,
  shouldShowSilenceReassurance,
} from "./patientVoiceExperience.js";

test("patient voice status labels stay simple and non-technical", () => {
  assert.equal(getPatientVoiceStatus("idle").label, "Ik ben er");
  assert.equal(getPatientVoiceStatus("listening").label, "Ik luister");
  assert.equal(getPatientVoiceStatus("thinking").label, "Ik denk even");
  assert.equal(getPatientVoiceStatus("still_there").label, "Ik ben er nog");
  assert.equal(getPatientVoiceStatus("speaking").label, "Ik praat nu");
  assert.equal(getPatientVoiceStatus("disconnected").label, "Even geen verbinding");
});

test("patient voice status falls back to idle copy", () => {
  assert.deepEqual(getPatientVoiceStatus("unknown"), getPatientVoiceStatus("idle"));
});

test("silence reassurance waits for a dementia-friendly pause", () => {
  assert.equal(shouldShowSilenceReassurance({ elapsedMs: 7999, isListening: true }), false);
  assert.equal(shouldShowSilenceReassurance({ elapsedMs: 8000, isListening: true }), true);
});

test("silence reassurance is hidden when not listening", () => {
  assert.equal(shouldShowSilenceReassurance({ elapsedMs: 12000, isListening: false }), false);
});
