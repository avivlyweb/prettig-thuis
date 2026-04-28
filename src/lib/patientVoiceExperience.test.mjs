import assert from "node:assert/strict";
import test from "node:test";
import {
  getPatientVoiceCopy,
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

test("patient voice status defaults to Dutch copy", () => {
  assert.equal(getPatientVoiceStatus("listening").label, "Ik luister");
  assert.equal(getPatientVoiceStatus("listening", "nl").detail, "Neem rustig de tijd.");
});

test("patient voice status can switch to simple English copy", () => {
  assert.equal(getPatientVoiceStatus("idle", "en").label, "I am here");
  assert.equal(getPatientVoiceStatus("listening", "en").label, "I am listening");
  assert.equal(getPatientVoiceStatus("still_there", "en").detail, "There is no rush.");
});

test("patient voice copy falls back to Dutch for unknown languages", () => {
  assert.equal(getPatientVoiceStatus("speaking", "fr").label, "Ik praat nu");
  assert.equal(getPatientVoiceCopy("fr").title, "Praat met mij");
});

test("patient voice status falls back to idle copy", () => {
  assert.deepEqual(getPatientVoiceStatus("unknown"), getPatientVoiceStatus("idle"));
});

test("patient voice UI copy is available in Dutch and English", () => {
  assert.equal(getPatientVoiceCopy("nl").start, "Start");
  assert.equal(getPatientVoiceCopy("nl").repeat, "Nog een keer");
  assert.equal(getPatientVoiceCopy("en").title, "Talk with me");
  assert.equal(getPatientVoiceCopy("en").heardPrefix, "I heard:");
});

test("silence reassurance waits for a dementia-friendly pause", () => {
  assert.equal(shouldShowSilenceReassurance({ elapsedMs: 7999, isListening: true }), false);
  assert.equal(shouldShowSilenceReassurance({ elapsedMs: 8000, isListening: true }), true);
});

test("silence reassurance is hidden when not listening", () => {
  assert.equal(shouldShowSilenceReassurance({ elapsedMs: 12000, isListening: false }), false);
});
