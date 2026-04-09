import { jsonResponse, loadState, sanitizeStateForClient } from "./_lib/state.mjs";

export default async function handler() {
  const state = await loadState();
  return jsonResponse(sanitizeStateForClient(state));
}
