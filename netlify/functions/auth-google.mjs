import { badRequest, jsonResponse, methodNotAllowed, parseJson } from "./_lib/state.mjs";

async function verifyGoogleIdToken(idToken) {
  const endpoint = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const response = await fetch(endpoint, { method: "GET" });

  if (!response.ok) {
    throw new Error("google token verification failed");
  }

  return response.json();
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return methodNotAllowed();
  }

  const body = await parseJson(request);
  const credential = body?.credential;

  if (!credential || typeof credential !== "string") {
    return badRequest("缺少 Google credential");
  }

  try {
    const payload = await verifyGoogleIdToken(credential);
    const configuredClientId = process.env.GOOGLE_CLIENT_ID;

    if (configuredClientId && payload.aud !== configuredClientId) {
      return jsonResponse({ error: "Google client 驗證失敗" }, 403);
    }

    if (!payload.name || !payload.sub) {
      return jsonResponse({ error: "Google 回傳資料不完整" }, 400);
    }

    return jsonResponse({
      success: true,
      profile: {
        sub: payload.sub,
        name: payload.name,
        email: payload.email || null,
        picture: payload.picture || null,
      },
    });
  } catch (error) {
    console.error("Google 登入驗證失敗:", error);
    return jsonResponse({ error: "Google 登入失敗，請重試" }, 401);
  }
}
