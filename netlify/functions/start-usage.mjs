import {
  badRequest,
  buildQueueEntry,
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
  const name = body?.name?.trim();

  if (!name) {
    return badRequest("名字不能為空");
  }

  const state = await loadState();

  if (state.current_user) {
    state.queue.push(buildQueueEntry(name));
  } else {
    state.current_user = name;
    state.start_time = Date.now() / 1000;
  }

  await saveState(state);
  return jsonResponse({ success: true });
}
