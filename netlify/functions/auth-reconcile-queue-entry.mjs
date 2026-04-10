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
  const cancelToken = typeof body?.cancel_token === "string" ? body.cancel_token.trim() : "";
  const samePerson = body?.same_person === true;
  const googleSub = typeof body?.google_sub === "string" ? body.google_sub.trim() : "";
  const googleEmail = typeof body?.google_email === "string" ? body.google_email.trim().toLowerCase() : "";
  const googleName = typeof body?.name === "string" ? body.name.trim() : "";

  if (!cancelToken) {
    return badRequest("缺少 cancel_token");
  }

  const state = await loadState();

  // 在队列中查找该 cancel_token
  const queueIndex = state.queue.findIndex((item) => item.cancel_token === cancelToken);

  if (queueIndex === -1) {
    // 也检查 pending 中是否有这个 cancel_token
    if (state.pending_cancel_token === cancelToken && samePerson) {
      // 绑定 pending 中的条目
      if (!googleName) {
        return badRequest("缺少 Google 名字");
      }
      state.pending_user = googleName;
      state.pending_google_sub = googleSub || null;
      state.pending_google_email = googleEmail || null;
      await saveState(state);
      return jsonResponse({ success: true, mode: "bound", pending_user: state.pending_user });
    }

    if (state.pending_cancel_token === cancelToken && !samePerson) {
      // 移除 pending 并推进队列
      state.pending_user = null;
      state.pending_google_sub = null;
      state.pending_google_email = null;
      state.pending_person_id = null;
      state.pending_cancel_token = null;

      if (state.queue.length > 0) {
        const nextPerson = state.queue.shift();
        state.pending_user = nextPerson.name;
        state.pending_google_sub = nextPerson.google_sub ?? null;
        state.pending_google_email = nextPerson.google_email ?? null;
        state.pending_person_id = nextPerson.id;
        state.pending_cancel_token = nextPerson.cancel_token;
      }

      await saveState(state);
      return jsonResponse({ success: true, mode: "removed" });
    }

    return jsonResponse({ error: "隊列中未找到該條目" }, 404);
  }

  // 队列中找到了
  if (samePerson) {
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
