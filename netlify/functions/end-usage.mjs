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
  const emergency = body?.emergency === true;
  const googleSub = typeof body?.google_sub === "string" ? body.google_sub.trim() : "";
  const googleEmail = typeof body?.google_email === "string" ? body.google_email.trim().toLowerCase() : "";

  const state = await loadState();

  if (!state.current_user) {
    return jsonResponse({ error: "目前沒有使用者" }, 409);
  }

  if (!emergency) {
    const controlToken = body?.control_token;
    const tokenMatched = !!(state.current_control_token && controlToken && state.current_control_token === controlToken);
    const googleMatched = !!(
      (googleSub && state.current_google_sub && googleSub === state.current_google_sub) ||
      (googleEmail && state.current_google_email && googleEmail === state.current_google_email)
    );

    if (!tokenMatched && !googleMatched) {
      if (!controlToken && !googleSub && !googleEmail) {
        return badRequest("缺少 control_token 或 Google 身分資訊");
      }
      return jsonResponse({ error: "只有目前使用者本人可以結束使用" }, 403);
    }
  }

  state.current_user = null;
  state.current_google_sub = null;
  state.current_google_email = null;
  state.start_time = null;
  state.current_control_token = null;
  clearPendingState(state);
  promoteNextToPending(state);

  await saveState(state);
  return jsonResponse({ success: true, emergency });
}
