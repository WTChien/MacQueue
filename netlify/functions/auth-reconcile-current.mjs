import {
  clearPendingState,
  badRequest,
  jsonResponse,
  loadState,
  methodNotAllowed,
  parseJson,
  promoteNextToPending,
  saveState,
} from "./_lib/state.mjs";

export default async function handler(request) {
  if (request.method !== "POST") {
    return methodNotAllowed();
  }

  const body = await parseJson(request);
  const controlToken = typeof body?.control_token === "string" ? body.control_token.trim() : "";
  const samePerson = body?.same_person === true;
  const googleSub = typeof body?.google_sub === "string" ? body.google_sub.trim() : "";
  const googleEmail = typeof body?.google_email === "string" ? body.google_email.trim().toLowerCase() : "";
  const googleName = typeof body?.name === "string" ? body.name.trim() : "";

  if (!controlToken) {
    return badRequest("缺少 control_token");
  }

  const state = await loadState();

  if (!state.current_user || !state.current_control_token) {
    return jsonResponse({ success: true, mode: "no-active-user" });
  }

  if (state.current_control_token !== controlToken) {
    return jsonResponse({ error: "目前本機沒有可協調的訪客使用狀態" }, 403);
  }

  if (samePerson) {
    if (!googleName) {
      return badRequest("缺少 Google 名字");
    }

    state.current_user = googleName;
    state.current_google_sub = googleSub || null;
    state.current_google_email = googleEmail || null;
    await saveState(state);
    return jsonResponse({ success: true, mode: "bound", current_user: state.current_user });
  }

  state.current_user = null;
  state.current_google_sub = null;
  state.current_google_email = null;
  state.start_time = null;
  state.current_control_token = null;
  clearPendingState(state);
  promoteNextToPending(state);

  await saveState(state);
  return jsonResponse({ success: true, mode: "removed" });
}
