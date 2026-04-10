import {
  jsonResponse,
  loadState,
  rotateExpiredPending,
  sanitizeStateForClient,
  saveState,
} from "./_lib/state.mjs";

export default async function handler() {
  const state = await loadState();
  if (rotateExpiredPending(state)) {
    await saveState(state);
  }
  return jsonResponse(sanitizeStateForClient(state));
}
