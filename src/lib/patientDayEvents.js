const DEFAULT_SOURCE = "patient_day_simulation";

const DAY_EVENTS = [
  {
    at: "07:30",
    type: "orientation_check",
    icf_tags: ["b144", "b152", "d230", "e310"],
    confidence: 0.92,
    data: {
      label: "morning_orientation",
      prompt: "Goedemorgen. Het is maandag, u bent thuis, en uw ontbijt staat klaar.",
      observed_response: "recognized_home_after_prompt",
    },
  },
  {
    at: "08:00",
    type: "medication_prompt",
    icf_tags: ["d570", "b144", "e355", "e580"],
    confidence: 0.9,
    data: {
      label: "breakfast_medication",
      medication_window: "morning",
      adherence: "prompted",
    },
  },
  {
    at: "08:10",
    type: "adl_step",
    icf_tags: ["d550", "d570", "b755"],
    confidence: 0.86,
    data: {
      label: "breakfast_started",
      step: "sit_down_and_start_breakfast",
      support_level: "verbal_prompt",
    },
  },
  {
    at: "09:45",
    type: "hydration_prompt",
    icf_tags: ["d570", "e310"],
    confidence: 0.88,
    data: {
      label: "mid_morning_hydration",
      prompt: "Neem rustig een glas water.",
      intake: "partial",
    },
  },
  {
    at: "10:30",
    type: "routine_started",
    icf_tags: ["d230", "d450", "b755", "e355"],
    confidence: 0.87,
    data: {
      label: "guided_walk_routine",
      routine_type: "short_indoor_walk",
      goal: "gentle_mobility_and_orientation",
    },
  },
  {
    at: "10:42",
    type: "routine_step",
    icf_tags: ["d450", "b755", "d230"],
    confidence: 0.84,
    data: {
      label: "walk_to_window",
      step: "walk_to_living_room_window",
      completion: "completed_with_pause",
    },
  },
  {
    at: "11:05",
    type: "incident",
    icf_tags: ["b144", "b152", "d230", "e310"],
    confidence: 0.78,
    data: {
      label: "pause_confusion",
      severity: "low",
      trigger: "could_not_remember_next_step",
      patient_state: "paused_and_looked_for_reassurance",
    },
  },
  {
    at: "11:07",
    type: "checkin",
    icf_tags: ["b152", "e310", "e355"],
    confidence: 0.91,
    data: {
      label: "help_request_checkin",
      request_type: "reassurance",
      response: "caregiver_notified_and_device_checked_in",
    },
  },
  {
    at: "11:10",
    type: "voice_session",
    icf_tags: ["b144", "b152", "d230", "e355"],
    confidence: 0.89,
    data: {
      label: "voice_support",
      session_goal: "reorient_and_resume_or_close_activity",
      outcome: "calmed_after_short_conversation",
    },
  },
  {
    at: "11:20",
    type: "adl_complete",
    icf_tags: ["d230", "d450", "b755"],
    confidence: 0.82,
    data: {
      label: "activity_completed",
      activity: "short_indoor_walk",
      completion: "completed_after_voice_support",
    },
  },
  {
    at: "12:30",
    type: "hydration_prompt",
    icf_tags: ["d550", "d570"],
    confidence: 0.85,
    data: {
      label: "lunch_hydration",
      meal_context: "lunch",
      intake: "accepted",
    },
  },
  {
    at: "15:00",
    type: "routine_escalation",
    icf_tags: ["d230", "b152", "e310"],
    confidence: 0.8,
    data: {
      label: "skipped_afternoon_activity",
      activity: "photo_album_prompt",
      reason: "patient_declined_and_preferred_rest",
      escalation: "soft_skip_logged_no_alert",
    },
  },
  {
    at: "18:00",
    type: "medication_prompt",
    icf_tags: ["d550", "d570", "e580"],
    confidence: 0.89,
    data: {
      label: "evening_meal_medication",
      medication_window: "evening",
      adherence: "confirmed_after_prompt",
    },
  },
  {
    at: "20:45",
    type: "goodbye",
    icf_tags: ["b152", "d230", "e310"],
    confidence: 0.87,
    data: {
      label: "end_of_day_closure",
      message: "De dag is klaar. Morgen helpen we opnieuw stap voor stap.",
    },
  },
  {
    at: "21:00",
    type: "sleep_mode",
    icf_tags: ["d230", "e580"],
    confidence: 0.93,
    data: {
      label: "sleep_mode_enabled",
      mode: "overnight_low_stimulation",
    },
  },
];

function normalizeDate(date = new Date()) {
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return String(date).slice(0, 10);
}

function timestampFor(date, time) {
  return `${normalizeDate(date)}T${time}:00.000Z`;
}

export function buildPatientDayEventPlan({
  userId,
  date = new Date(),
  source = DEFAULT_SOURCE,
} = {}) {
  const user_id = String(userId || "").trim();
  if (!user_id) {
    throw new Error("buildPatientDayEventPlan requires a userId");
  }

  return DAY_EVENTS.map((event) => ({
    user_id,
    type: event.type,
    timestamp: timestampFor(date, event.at),
    icf_tags: [...event.icf_tags],
    confidence: event.confidence,
    source,
    data: {
      ...event.data,
      source,
      simulated_day: normalizeDate(date),
      scenario: "mild_early_dementia_all_day",
    },
  }));
}

export function buildPatientDayEvents({
  userId,
  startDate,
  date = startDate || new Date(),
  source = DEFAULT_SOURCE,
} = {}) {
  return buildPatientDayEventPlan({ userId, date, source });
}
