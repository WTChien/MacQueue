import { getStore } from "@netlify/blobs";

const STORE_NAME = "macqueue";
const STATE_KEY = "state";

function createDefaultState() {
  return {
    current_user: null,
    current_google_sub: null,
    current_google_email: null,
    start_time: null,
    current_control_token: null,
    pending_user: null,
    pending_google_sub: null,
    pending_google_email: null,
    pending_person_id: null,
    pending_cancel_token: null,
    queue: [],
  };
}

function normalizeQueue(queue) {
  if (!Array.isArray(queue)) {
    return [];
  }

  return queue
    .filter((item) => item && typeof item.name === "string")
    .map((item) => ({
      id: String(item.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`),
      name: String(item.name).trim(),
      google_sub:
        typeof item.google_sub === "string" && item.google_sub.trim().length > 0
          ? item.google_sub.trim()
          : null,
      google_email:
        typeof item.google_email === "string" && item.google_email.trim().length > 0
          ? item.google_email.trim().toLowerCase()
          : null,
      join_time: Number(item.join_time ?? Date.now() / 1000),
      cancel_token:
        typeof item.cancel_token === "string" && item.cancel_token.trim().length > 0
          ? item.cancel_token
          : crypto.randomUUID(),
    }))
    .filter((item) => item.name.length > 0)
    .sort((left, right) => left.join_time - right.join_time);
}

function normalizeState(state) {
  const base = createDefaultState();

  if (!state || typeof state !== "object") {
    return base;
  }

  const currentUser =
    typeof state.current_user === "string" && state.current_user.trim().length > 0
      ? state.current_user.trim()
      : null;

  return {
    current_user: currentUser,
    current_google_sub:
      typeof state.current_google_sub === "string" && state.current_google_sub.trim().length > 0
        ? state.current_google_sub.trim()
        : null,
    current_google_email:
      typeof state.current_google_email === "string" && state.current_google_email.trim().length > 0
        ? state.current_google_email.trim().toLowerCase()
        : null,
    start_time:
      Number.isFinite(Number(state.start_time)) && currentUser
        ? Number(state.start_time)
        : null,
    current_control_token:
      typeof state.current_control_token === "string" && state.current_control_token.trim().length > 0
        ? state.current_control_token
        : null,
    pending_user:
      typeof state.pending_user === "string" && state.pending_user.trim().length > 0
        ? state.pending_user.trim()
        : null,
    pending_google_sub:
      typeof state.pending_google_sub === "string" && state.pending_google_sub.trim().length > 0
        ? state.pending_google_sub.trim()
        : null,
    pending_google_email:
      typeof state.pending_google_email === "string" && state.pending_google_email.trim().length > 0
        ? state.pending_google_email.trim().toLowerCase()
        : null,
    pending_person_id:
      typeof state.pending_person_id === "string" && state.pending_person_id.trim().length > 0
        ? state.pending_person_id.trim()
        : null,
    pending_cancel_token:
      typeof state.pending_cancel_token === "string" && state.pending_cancel_token.trim().length > 0
        ? state.pending_cancel_token.trim()
        : null,
    queue: normalizeQueue(state.queue),
  };
}

function getStateStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export async function loadState() {
  const state = await getStateStore().get(STATE_KEY, {
    type: "json",
    consistency: "strong",
  });

  return normalizeState(state);
}

export async function saveState(state) {
  const nextState = normalizeState(state);
  await getStateStore().setJSON(STATE_KEY, nextState);
  return nextState;
}

export function sanitizeStateForClient(state) {
  return {
    current_user: state.current_user,
    current_google_sub: state.current_google_sub,
    start_time: state.start_time,
    pending_user: state.pending_user,
    pending_google_sub: state.pending_google_sub,
    pending_person_id: state.pending_person_id,
    queue: state.queue.map((person) => ({
      id: person.id,
      name: person.name,
      google_sub: person.google_sub,
      join_time: person.join_time,
      cancel_token: person.cancel_token,
    })),
  };
}

export function buildQueueEntry(name, googleIdentity = null) {
  return {
    id: `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    name,
    google_sub:
      googleIdentity && typeof googleIdentity.sub === "string" && googleIdentity.sub.trim().length > 0
        ? googleIdentity.sub.trim()
        : null,
    google_email:
      googleIdentity && typeof googleIdentity.email === "string" && googleIdentity.email.trim().length > 0
        ? googleIdentity.email.trim().toLowerCase()
        : null,
    join_time: Date.now() / 1000,
    cancel_token: crypto.randomUUID(),
  };
}

export function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function methodNotAllowed() {
  return jsonResponse({ error: "Method not allowed" }, 405);
}

export function badRequest(message) {
  return jsonResponse({ error: message }, 400);
}

export async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
