/* ============================================================
   API helpers for the Voice of Beneficiaries Library.
   Same-origin: the library is served at /voices/ and the backend
   lives at /api on the same domain, so there is no CORS.

   Auth: every library request is private. The control-panel access
   code is shared with the Crisis Radar (sessionStorage "crg_code"),
   so logging into either system unlocks both. All requests send it
   as the X-Access-Code header.
   ============================================================ */

const API_BASE = "/api";
const CODE_KEY = "crg_code";

export function getCode() {
  try { return sessionStorage.getItem(CODE_KEY) || ""; } catch (e) { return ""; }
}
export function setCode(code) {
  try { sessionStorage.setItem(CODE_KEY, code || ""); } catch (e) {}
}
export function clearCode() {
  try { sessionStorage.removeItem(CODE_KEY); } catch (e) {}
}

function headers() {
  const h = { "Content-Type": "application/json" };
  const code = getCode();
  if (code) h["X-Access-Code"] = code;
  return h;
}

/* Thrown with .unauthorized=true on a 401 so the UI can drop to login. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.unauthorized = status === 401;
  }
}

async function request(path, opts) {
  opts = opts || {};
  const res = await fetch(API_BASE + path, { headers: headers(), ...opts });
  if (!res.ok) {
    let msg = "HTTP " + res.status;
    try { const j = await res.json(); if (j && j.error) msg = j.error; } catch (e) {}
    throw new ApiError(msg, res.status);
  }
  return res.status === 204 ? null : res.json();
}

/* Verify a code against the backend without storing it. */
export async function verifyCode(code) {
  const res = await fetch(API_BASE + "/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return res.ok;
}

/* Key/value document store (library data blob). */
export function kvGet(key) {
  return request("/kv/" + encodeURIComponent(key));
}
export function kvPut(key, value) {
  return request("/kv/" + encodeURIComponent(key), {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
}

/* AI proxy + config (key stays server-side; GET never returns it). */
export function aiGetConfig() {
  return request("/ai/config");
}
export function aiPutConfig(cfg) {
  return request("/ai/config", { method: "PUT", body: JSON.stringify(cfg) });
}
export async function aiComplete(system, prompt, maxTokens) {
  const out = await request("/ai/complete", {
    method: "POST",
    body: JSON.stringify({ system, prompt, max_tokens: maxTokens || 1000 }),
  });
  return (out && out.text) || "";
}

/* Shared branding (logo) — used by both the radar and the library. */
export function brandGet() {
  return request("/brand");
}
export function brandPut(logo) {
  return request("/brand", { method: "PUT", body: JSON.stringify({ logo }) });
}
