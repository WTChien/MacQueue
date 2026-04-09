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
  const cancelToken = body?.cancel_token;

  if (!personId) {
    return badRequest("缺少 person_id");
  }

  if (!cancelToken) {
    return badRequest("缺少 cancel_token");
  }

  const state = await loadState();
  const matchIndex = state.queue.findIndex(
    (person) => person.id === personId && person.cancel_token === cancelToken,
  );

  if (matchIndex === -1) {
    return jsonResponse({ error: "只能取消自己的預約" }, 403);
  }

  state.queue.splice(matchIndex, 1);
  await saveState(state);

  return jsonResponse({ success: true });
}
