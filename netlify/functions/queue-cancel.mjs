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
  const googleSub = typeof body?.google_sub === "string" ? body.google_sub.trim() : "";
  const googleEmail = typeof body?.google_email === "string" ? body.google_email.trim().toLowerCase() : "";

  if (!personId) {
    return badRequest("缺少 person_id");
  }

  const state = await loadState();
  const matchIndex = state.queue.findIndex((person) => {
    if (person.id !== personId) {
      return false;
    }

    const tokenMatched = !!(cancelToken && person.cancel_token === cancelToken);
    const googleMatched = !!(
      (googleSub && person.google_sub && googleSub === person.google_sub) ||
      (googleEmail && person.google_email && googleEmail === person.google_email)
    );

    return tokenMatched || googleMatched;
  });

  if (matchIndex === -1 && !cancelToken && !googleSub && !googleEmail) {
    return badRequest("缺少 cancel_token 或 Google 身分資訊");
  }

  if (matchIndex === -1) {
    return jsonResponse({ error: "只能取消自己的預約" }, 403);
  }

  state.queue.splice(matchIndex, 1);
  await saveState(state);

  return jsonResponse({ success: true });
}
