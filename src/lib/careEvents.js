import { base44 } from "@/api/base44Client";

const CARE_EVENTS_KEY = "care_events";
const CAREGIVER_ALERTS_KEY = "caregiver_alerts";
const MAX_LOCAL_ITEMS = 500;

const isBrowser = typeof window !== "undefined";

function safeParseJson(raw, fallback = []) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function getLocalItems(key) {
  if (!isBrowser) return [];
  return safeParseJson(window.localStorage.getItem(key), []);
}

function setLocalItems(key, items) {
  if (!isBrowser) return;
  const bounded = items.length > MAX_LOCAL_ITEMS ? items.slice(items.length - MAX_LOCAL_ITEMS) : items;
  window.localStorage.setItem(key, JSON.stringify(bounded));
}

function entity(name) {
  return base44?.entities?.[name] || null;
}

function normalizeCareEvent(item) {
  const eventText = item.text || item.data?.user_text || item.data?.response_text || item.data?.transcript || "";
  return {
    id: item.id || item._id || `${item.user_id || "user"}-${item.timestamp || Date.now()}`,
    user_id: item.user_id || "unknown_user",
    session_id: item.session_id || item.data?.session_id || "",
    type: item.type || "checkin",
    icf_tags: Array.isArray(item.icf_tags) ? item.icf_tags : [],
    confidence: typeof item.confidence === "number" ? item.confidence : 0,
    data: item.data || {},
    source: item.source || item.data?.source || "unknown",
    speaker: item.speaker || item.data?.speaker || "unknown",
    transcript: item.transcript || item.data?.transcript || "",
    text: eventText,
    timestamp: item.timestamp || item.created_date || new Date().toISOString(),
  };
}

export function resolveUserId(primaryUserId, fallbackData = {}) {
  const candidates = [
    primaryUserId,
    fallbackData.user_id,
    fallbackData.data?.user_id,
    fallbackData.profile?.id,
  ];

  for (const value of candidates) {
    if (!value) continue;
    const normalized = String(value).trim();
    if (!normalized) continue;
    if (normalized === "realtime_user" || normalized === "demo_user" || normalized === "unknown_user") continue;
    return normalized;
  }

  return String(primaryUserId || fallbackData.user_id || "unknown_user");
}

function normalizeAlert(item) {
  return {
    id: item.id || item._id || `${item.user_id || "user"}-${item.timestamp || Date.now()}`,
    user_id: item.user_id || "unknown_user",
    level: item.level || "info",
    title: item.title || "Melding",
    message: item.message || "",
    data: item.data || {},
    read: Boolean(item.read),
    timestamp: item.timestamp || item.created_date || new Date().toISOString(),
  };
}

export async function saveCareEvent(event) {
  const normalized = normalizeCareEvent({
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  });

  const CareEvent = entity("CareEvent");
  if (CareEvent?.create) {
    try {
      return await CareEvent.create(normalized);
    } catch (error) {
      console.warn("Falling back to local care event store:", error);
    }
  }

  const local = getLocalItems(CARE_EVENTS_KEY);
  local.push(normalized);
  setLocalItems(CARE_EVENTS_KEY, local);
  return normalized;
}

export async function listCareEvents({ limit = 200, userId } = {}) {
  const CareEvent = entity("CareEvent");
  let backendEvents = [];

  if (CareEvent?.list) {
    try {
      backendEvents = await CareEvent.list("-created_date", limit);
    } catch (error) {
      console.warn("Could not load CareEvent from backend:", error);
    }
  }

  const localEvents = getLocalItems(CARE_EVENTS_KEY);
  const merged = [...backendEvents, ...localEvents].map(normalizeCareEvent);

  const filtered = userId ? merged.filter((e) => e.user_id === userId) : merged;
  filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const deduped = [];
  const seen = new Set();
  for (const item of filtered) {
    const key = item.id || `${item.user_id}-${item.type}-${item.timestamp}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.slice(Math.max(0, deduped.length - limit));
}

export async function saveCaregiverAlert(alert) {
  const normalized = normalizeAlert({
    ...alert,
    timestamp: alert.timestamp || new Date().toISOString(),
  });

  const CaregiverAlert = entity("CaregiverAlert");
  if (CaregiverAlert?.create) {
    try {
      return await CaregiverAlert.create(normalized);
    } catch (error) {
      console.warn("Falling back to local caregiver alert store:", error);
    }
  }

  const local = getLocalItems(CAREGIVER_ALERTS_KEY);
  local.push(normalized);
  setLocalItems(CAREGIVER_ALERTS_KEY, local);
  return normalized;
}

export async function listCaregiverAlerts({ limit = 200, userId } = {}) {
  const CaregiverAlert = entity("CaregiverAlert");
  let backendAlerts = [];

  if (CaregiverAlert?.list) {
    try {
      backendAlerts = await CaregiverAlert.list("-created_date", limit);
    } catch (error) {
      console.warn("Could not load CaregiverAlert from backend:", error);
    }
  }

  const localAlerts = getLocalItems(CAREGIVER_ALERTS_KEY);
  const merged = [...backendAlerts, ...localAlerts].map(normalizeAlert);
  const filtered = userId ? merged.filter((a) => a.user_id === userId) : merged;
  filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const deduped = [];
  const seen = new Set();
  for (const item of filtered) {
    const key = item.id || `${item.user_id}-${item.level}-${item.title}-${item.timestamp}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.slice(Math.max(0, deduped.length - limit));
}

export async function markCaregiverAlertRead(alert) {
  const normalized = normalizeAlert(alert);
  const CaregiverAlert = entity("CaregiverAlert");

  if (CaregiverAlert?.update && normalized.id) {
    try {
      await CaregiverAlert.update(normalized.id, { read: true });
      return;
    } catch (error) {
      console.warn("Could not mark backend alert as read, using local fallback:", error);
    }
  }

  const local = getLocalItems(CAREGIVER_ALERTS_KEY);
  const updated = local.map((item) => {
    const same = (item.id && normalized.id && item.id === normalized.id)
      || (!item.id && !normalized.id && item.timestamp === normalized.timestamp && item.title === normalized.title);
    return same ? { ...item, read: true } : item;
  });
  setLocalItems(CAREGIVER_ALERTS_KEY, updated);
}

export async function dismissCaregiverAlert(alert) {
  const normalized = normalizeAlert(alert);
  const CaregiverAlert = entity("CaregiverAlert");

  if (CaregiverAlert?.delete && normalized.id) {
    try {
      await CaregiverAlert.delete(normalized.id);
      return;
    } catch (error) {
      console.warn("Could not delete backend alert, using local fallback:", error);
    }
  }

  const local = getLocalItems(CAREGIVER_ALERTS_KEY);
  const updated = local.filter((item) => {
    if (item.id && normalized.id) return item.id !== normalized.id;
    return !(item.timestamp === normalized.timestamp && item.title === normalized.title);
  });
  setLocalItems(CAREGIVER_ALERTS_KEY, updated);
}
