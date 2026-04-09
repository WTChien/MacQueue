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
  const existingCancelToken = body?.existing_cancel_token?.trim();

  if (!name) {
    return badRequest("名字不能為空");
  }

  const state = await loadState();

  if (existingCancelToken) {
    const existingEntry = state.queue.find((person) => person.cancel_token === existingCancelToken);
    if (existingEntry) {
      return jsonResponse({
        success: true,
        mode: "queued",
        person_id: existingEntry.id,
        cancel_token: existingEntry.cancel_token,
      });
    }
  }

  if (state.current_user) {
    const entry = buildQueueEntry(name);
    state.queue.push(entry);
    await saveState(state);
    return jsonResponse({ success: true, mode: "queued", person_id: entry.id, cancel_token: entry.cancel_token });
  } else {
    state.current_user = name;
    state.start_time = Date.now() / 1000;
    state.current_control_token = crypto.randomUUID();
  }

  await saveState(state);
  return jsonResponse({ success: true, mode: "started", current_control_token: state.current_control_token });
}
