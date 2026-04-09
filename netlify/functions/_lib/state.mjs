import { getStore } from "@netlify/blobs";

const STORE_NAME = "macqueue";
const STATE_KEY = "state";

function createDefaultState() {
  return {
    current_user: null,
    start_time: null,
    current_control_token: null,
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

  return {
    current_user:
      typeof state.current_user === "string" && state.current_user.trim().length > 0
        ? state.current_user.trim()
        : null,
    start_time:
      Number.isFinite(Number(state.start_time)) && state.current_user
        ? Number(state.start_time)
        : null,
    current_control_token:
      typeof state.current_control_token === "string" && state.current_control_token.trim().length > 0
        ? state.current_control_token
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
    start_time: state.start_time,
    queue: state.queue.map((person) => ({
      id: person.id,
      name: person.name,
      join_time: person.join_time,
    })),
  };
}

export function buildQueueEntry(name) {
  return {
    id: `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    name,
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
