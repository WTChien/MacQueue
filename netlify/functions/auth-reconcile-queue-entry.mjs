import {
  assignPendingFromEntry,
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
  const cancelToken = typeof body?.cancel_token === "string" ? body.cancel_token.trim() : "";
  const samePerson = body?.same_person === true;
  const googleSub = typeof body?.google_sub === "string" ? body.google_sub.trim() : "";
  const googleEmail = typeof body?.google_email === "string" ? body.google_email.trim().toLowerCase() : "";
  const googleName = typeof body?.name === "string" ? body.name.trim() : "";

  if (!cancelToken) {
    return badRequest("缺少 cancel_token");
  }

  const state = await loadState();

  const isSameAsCurrentActive =
    !!state.current_user &&
    ((googleSub && state.current_google_sub === googleSub) ||
      (googleEmail && state.current_google_email === googleEmail));

  // 在队列中查找该 cancel_token
  const queueIndex = state.queue.findIndex((item) => item.cancel_token === cancelToken);

  if (queueIndex === -1) {
    // 也检查 pending 中是否有这个 cancel_token
    if (state.pending_cancel_token === cancelToken && samePerson) {
      if (isSameAsCurrentActive) {
        clearPendingState(state);
        promoteNextToPending(state);

        await saveState(state);
        return jsonResponse({ success: true, mode: "removed_already_active" });
      }

      // 绑定 pending 中的条目
      if (!googleName) {
        return badRequest("缺少 Google 名字");
      }
      assignPendingFromEntry(
        state,
        {
          id: state.pending_person_id,
          name: googleName,
          google_sub: googleSub || null,
          google_email: googleEmail || null,
          cancel_token: state.pending_cancel_token,
        },
        state.pending_since || Date.now() / 1000,
      );
      await saveState(state);
      return jsonResponse({ success: true, mode: "bound", pending_user: state.pending_user });
    }

    if (state.pending_cancel_token === cancelToken && !samePerson) {
      clearPendingState(state);
      promoteNextToPending(state);

      await saveState(state);
      return jsonResponse({ success: true, mode: "removed" });
    }

    return jsonResponse({ error: "隊列中未找到該條目" }, 404);
  }

  // 队列中找到了
  if (samePerson) {
    if (isSameAsCurrentActive) {
      state.queue.splice(queueIndex, 1);
      await saveState(state);
      return jsonResponse({ success: true, mode: "removed_already_active" });
    }

    if (!googleName) {
      return badRequest("缺少 Google 名字");
    }
    state.queue[queueIndex].name = googleName;
    state.queue[queueIndex].google_sub = googleSub || null;
    state.queue[queueIndex].google_email = googleEmail || null;
    await saveState(state);
    return jsonResponse({ success: true, mode: "bound", queue_entry: state.queue[queueIndex] });
  }

  // 移除队列条目
  state.queue.splice(queueIndex, 1);
  await saveState(state);
  return jsonResponse({ success: true, mode: "removed" });
}
