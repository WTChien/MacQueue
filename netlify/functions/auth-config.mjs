import { jsonResponse, methodNotAllowed } from "./_lib/state.mjs";

export default async function handler(request) {
  if (request.method !== "GET") {
    return methodNotAllowed();
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID || null;
  return jsonResponse({ google_client_id: googleClientId });
}
