import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialPatientDeviceState,
  getContextualSuggestion,
  patientDeviceReducer,
} from "./patientDeviceFlow.js";

test("initial patient device state starts on home", () => {
  assert.deepEqual(getInitialPatientDeviceState(), {
    view: "home",
    selectedSuggestion: null,
    lastAction: null,
  });
});

test("contextual suggestion uses morning copy before noon", () => {
  const suggestion = getContextualSuggestion(new Date("2026-04-27T08:30:00"));

  assert.equal(suggestion.title, "Goedemorgen");
  assert.match(suggestion.message, /ontbijt/);
  assert.equal(suggestion.primaryAction, "Ja, graag");
});

test("contextual suggestion uses afternoon copy after noon", () => {
  const suggestion = getContextualSuggestion(new Date("2026-04-27T14:30:00"));

  assert.equal(suggestion.title, "Goedemiddag");
  assert.match(suggestion.message, /rustig moment/);
});

test("start help moves from home to contextual confirmation", () => {
  const state = patientDeviceReducer(getInitialPatientDeviceState(), {
    type: "START_HELP",
    now: new Date("2026-04-27T09:00:00"),
  });

  assert.equal(state.view, "contextual_confirmation");
  assert.equal(state.selectedSuggestion.title, "Goedemorgen");
});

test("need help opens assist choice instead of escalating immediately", () => {
  const state = patientDeviceReducer(getInitialPatientDeviceState(), {
    type: "NEED_HELP",
  });

  assert.equal(state.view, "assist_choice");
  assert.equal(state.lastAction, "need_help");
});

test("confirmed start advances beyond contextual confirmation", () => {
  const startState = patientDeviceReducer(getInitialPatientDeviceState(), {
    type: "START_HELP",
    now: new Date("2026-04-27T09:00:00"),
  });
  const confirmedState = patientDeviceReducer(startState, {
    type: "START_CONFIRMED",
  });

  assert.equal(confirmedState.view, "routine_started");
  assert.equal(confirmedState.lastAction, "start_confirmed");
});

test("assist choice can enter talk support and call confirmation", () => {
  const assistState = patientDeviceReducer(getInitialPatientDeviceState(), {
    type: "NEED_HELP",
  });

  assert.equal(
    patientDeviceReducer(assistState, { type: "TALK_WITH_ME" }).view,
    "talk_support"
  );
  assert.equal(
    patientDeviceReducer(assistState, { type: "CALL_CONTACT" }).view,
    "call_confirm"
  );
});
