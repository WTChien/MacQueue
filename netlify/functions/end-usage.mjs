import {
  jsonResponse,
  loadState,
  methodNotAllowed,
  saveState,
} from "./_lib/state.mjs";

export default async function handler(request) {
  if (request.method !== "POST") {
    return methodNotAllowed();
  }

  const state = await loadState();
  state.current_user = null;
  state.start_time = null;

  if (state.queue.length > 0) {
    const nextPerson = state.queue.shift();
    state.current_user = nextPerson.name;
    state.start_time = Date.now() / 1000;
  }

  await saveState(state);
  return jsonResponse({ success: true });
}
