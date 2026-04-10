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
  const pendingToken = body?.pending_token;

  if (!pendingToken) {
    return badRequest("缺少 pending_token");
  }

  const state = await loadState();

  if (!state.pending_user) {
    return jsonResponse({ error: "目前沒有等待確認的使用者" }, 409);
  }

  if (state.pending_cancel_token !== pendingToken) {
    return jsonResponse({ error: "驗證失敗，無法確認" }, 403);
  }

  state.current_user = state.pending_user;
  state.current_google_sub = state.pending_google_sub ?? null;
  state.current_google_email = state.pending_google_email ?? null;
  state.start_time = Date.now() / 1000;
  state.current_control_token = crypto.randomUUID();
  state.pending_user = null;
  state.pending_google_sub = null;
  state.pending_google_email = null;
  state.pending_person_id = null;
  state.pending_cancel_token = null;

  await saveState(state);
  return jsonResponse({ success: true, current_control_token: state.current_control_token });
}
