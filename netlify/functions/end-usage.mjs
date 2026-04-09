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
  const emergency = body?.emergency === true;

  const state = await loadState();

  if (!state.current_user || !state.current_control_token) {
    return jsonResponse({ error: "目前沒有使用者" }, 409);
  }

  if (!emergency) {
    const controlToken = body?.control_token;

    if (!controlToken) {
      return badRequest("缺少 control_token");
    }

    if (state.current_control_token !== controlToken) {
      return jsonResponse({ error: "只有目前使用者本人可以結束使用" }, 403);
    }
  }

  state.current_user = null;
  state.start_time = null;
  state.current_control_token = null;

  if (state.queue.length > 0) {
    const nextPerson = state.queue.shift();
    state.current_user = nextPerson.name;
    state.start_time = Date.now() / 1000;
    state.current_control_token = nextPerson.cancel_token;
  }

  await saveState(state);
  return jsonResponse({ success: true, emergency });
}
