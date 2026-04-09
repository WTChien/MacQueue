import {
  badRequest,
  jsonResponse,
  loadState,
  methodNotAllowed,
  parseJson,
  saveState,
} from "./_lib/state.mjs";

export default async function handler(request) {
  if (request.method !== "POST") {
    return methodNotAllowed();
  }

  const body = await parseJson(request);
  const personId = body?.person_id;

  if (!personId) {
    return badRequest("缺少 person_id");
  }

  const state = await loadState();
  state.queue = state.queue.filter((person) => person.id !== personId);
  await saveState(state);

  return jsonResponse({ success: true });
}
