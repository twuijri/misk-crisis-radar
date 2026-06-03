"use strict";

/* ============================================================
   Misk Crisis Radar — self-hosted API
   Express + PostgreSQL. Auto-migrates its schema on boot, so a
   paste-only Dockge/Dockhand deploy needs no init.sql on the server.
   ============================================================ */

const express = require("express");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3000;
// The editor access code. Reads are always public; writes require this code
// (sent by the browser as the X-Access-Code header). Empty = writes open.
const ACCESS_CODE = process.env.ACCESS_CODE || "";
const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgres://${process.env.POSTGRES_USER || "misk"}:${process.env.POSTGRES_PASSWORD || "misk"}@${process.env.PGHOST || "db"}:5432/${process.env.POSTGRES_DB || "misk"}`;

/* The six radar dimensions — must match DIMENSIONS in index.html. */
const DIMS = ["severity", "urgency", "reach", "sentiment", "escalation_risk", "strategic_impact"];
const TEXT_FIELDS = ["summary", "expected_impact", "recommended_action", "reference_links"];

const pool = new Pool({ connectionString: DATABASE_URL, max: 5 });

/* ------------------------------------------------------------
   Schema migration (idempotent)
   ------------------------------------------------------------ */
async function migrate() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crisis_cases (
      id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title              text NOT NULL,
      category           text,
      summary            text,
      status             text DEFAULT 'Active',
      expected_impact    text,
      recommended_action text,
      reference_links    text,
      owner              text,
      needs_leadership   boolean DEFAULT false,
      advisory_level     text,
      severity           int  DEFAULT 1,
      urgency            int  DEFAULT 1,
      reach              int  DEFAULT 1,
      sentiment          int  DEFAULT 1,
      escalation_risk    int  DEFAULT 1,
      strategic_impact   int  DEFAULT 1,
      created_at         timestamptz DEFAULT now(),
      updated_at         timestamptz DEFAULT now()
    );
  `);
  // Idempotent column adds so already-deployed databases gain the new
  // decision-support fields without a manual migration.
  await pool.query(`ALTER TABLE crisis_cases ADD COLUMN IF NOT EXISTS owner text;`);
  await pool.query(`ALTER TABLE crisis_cases ADD COLUMN IF NOT EXISTS needs_leadership boolean DEFAULT false;`);
  await pool.query(`ALTER TABLE crisis_cases ADD COLUMN IF NOT EXISTS advisory_level text;`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS case_updates (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      case_id    uuid NOT NULL REFERENCES crisis_cases(id) ON DELETE CASCADE,
      author     text,
      note       text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  `);
  // Generic key/value store. Used by the Voice of Beneficiaries Library to
  // persist its whole JSON document (key 'vobl') and by the AI proxy to keep
  // the OpenAI-compatible server config + key (key '__ai_config__') — all in
  // the same persistent Postgres volume, never in the browser.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key        text PRIMARY KEY,
      value      jsonb,
      updated_at timestamptz DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
    BEGIN NEW.updated_at = now(); RETURN NEW; END;
    $$ LANGUAGE plpgsql;
  `);
  await pool.query(`DROP TRIGGER IF EXISTS trg_cases_updated ON crisis_cases;`);
  await pool.query(`
    CREATE TRIGGER trg_cases_updated BEFORE UPDATE ON crisis_cases
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
}

async function waitForDb() {
  for (let i = 1; i <= 30; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (e) {
      console.log(`[api] waiting for database (${i}/30): ${e.code || e.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("database not reachable after 30 attempts");
}

/* ------------------------------------------------------------
   Helpers
   ------------------------------------------------------------ */
function clampDim(v) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return 1;
  return Math.min(5, Math.max(1, n));
}

/* Build a {columns, values} pair from a request body, ignoring
   anything not in our known set. Returns null if title missing on create. */
function sanitize(body, requireTitle) {
  body = body || {};
  const cols = {};
  if (body.title !== undefined) cols.title = String(body.title).trim();
  if (requireTitle && (!cols.title || cols.title.length === 0)) return null;
  if (body.category !== undefined) cols.category = body.category ? String(body.category) : null;
  if (body.status !== undefined) cols.status = body.status ? String(body.status) : "Active";
  if (body.owner !== undefined) cols.owner = body.owner ? String(body.owner) : null;
  if (body.advisory_level !== undefined) cols.advisory_level = body.advisory_level ? String(body.advisory_level) : null;
  if (body.needs_leadership !== undefined) cols.needs_leadership = !!body.needs_leadership;
  TEXT_FIELDS.forEach((f) => {
    if (body[f] !== undefined) cols[f] = body[f] ? String(body[f]) : null;
  });
  DIMS.forEach((d) => {
    if (body[d] !== undefined) cols[d] = clampDim(body[d]);
  });
  return cols;
}

function asyncRoute(fn) {
  return (req, res) => fn(req, res).catch((e) => {
    console.error("[api] error:", e.message);
    res.status(500).json({ error: e.message });
  });
}

/* ------------------------------------------------------------
   App
   ------------------------------------------------------------ */
const app = express();
// 1mb leaves room for a small base64 logo data URL (downscaled client-side).
app.use(express.json({ limit: "1mb" }));

const WRITE_METHODS = ["POST", "PATCH", "PUT", "DELETE"];

// Crisis-radar reads are public; its writes require the editor access code.
// The Voice of Beneficiaries Library is fully private: everything under
// /api/kv and /api/ai requires the code for EVERY method (even reads), so a
// visitor at /voices/ sees nothing until they log in. The /api/auth route
// checks the code itself, so it is allowed through here.
const PRIVATE_PREFIXES = ["/api/kv", "/api/ai"];
app.use((req, res, next) => {
  if (req.path === "/api/health" || req.path === "/health") return next();
  if (req.path === "/api/auth") return next();
  const isPrivate = PRIVATE_PREFIXES.some((p) => req.path === p || req.path.startsWith(p + "/"));
  if (!isPrivate && !WRITE_METHODS.includes(req.method)) return next();
  if (!ACCESS_CODE) return next();
  const code = req.headers["x-access-code"] || "";
  if (code === ACCESS_CODE) return next();
  return res.status(401).json({ error: "unauthorized" });
});

app.get(["/api/health", "/health"], (req, res) => res.json({ ok: true }));

// Editor login check — returns 200 if the code is correct (or none required).
app.post("/api/auth", (req, res) => {
  const code = (req.body && req.body.code) || "";
  if (!ACCESS_CODE || code === ACCESS_CODE) return res.json({ ok: true });
  return res.status(401).json({ error: "unauthorized" });
});

const r = express.Router();

r.get("/cases", asyncRoute(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM crisis_cases ORDER BY created_at DESC");
  res.json(rows);
}));

r.post("/cases", asyncRoute(async (req, res) => {
  const cols = sanitize(req.body, true);
  if (!cols) return res.status(400).json({ error: "title is required" });
  const keys = Object.keys(cols);
  const placeholders = keys.map((_, i) => "$" + (i + 1));
  const values = keys.map((k) => cols[k]);
  const { rows } = await pool.query(
    `INSERT INTO crisis_cases (${keys.join(",")}) VALUES (${placeholders.join(",")}) RETURNING *`,
    values
  );
  res.status(201).json(rows[0]);
}));

r.patch("/cases/:id", asyncRoute(async (req, res) => {
  const cols = sanitize(req.body, false);
  const keys = Object.keys(cols);
  if (keys.length === 0) return res.status(400).json({ error: "no fields to update" });
  const set = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map((k) => cols[k]);
  values.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE crisis_cases SET ${set.join(",")} WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (rows.length === 0) return res.status(404).json({ error: "not found" });
  res.json(rows[0]);
}));

r.delete("/cases/:id", asyncRoute(async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM crisis_cases WHERE id = $1", [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: "not found" });
  res.status(204).end();
}));

r.get("/cases/:id/notes", asyncRoute(async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM case_updates WHERE case_id = $1 ORDER BY created_at ASC",
    [req.params.id]
  );
  res.json(rows);
}));

r.post("/cases/:id/notes", asyncRoute(async (req, res) => {
  const note = req.body && req.body.note ? String(req.body.note).trim() : "";
  if (!note) return res.status(400).json({ error: "note is required" });
  const author = req.body && req.body.author ? String(req.body.author) : null;
  const { rows } = await pool.query(
    "INSERT INTO case_updates (case_id, author, note) VALUES ($1,$2,$3) RETURNING *",
    [req.params.id, author, note]
  );
  res.status(201).json(rows[0]);
}));

/* ------------------------------------------------------------
   Key/value store — backs the Voice of Beneficiaries Library.
   Gated for all methods by the middleware above. Keys are limited
   to a safe charset; the AI config key is reserved (served via the
   dedicated /ai/config route, never raw).
   ------------------------------------------------------------ */
const AI_CONFIG_KEY = "__ai_config__";
const BRAND_KEY = "__brand__";
const RESERVED_KEYS = [AI_CONFIG_KEY, BRAND_KEY];
function validKvKey(k) {
  return typeof k === "string" && /^[A-Za-z0-9:_-]{1,120}$/.test(k);
}

r.get("/kv/:key", asyncRoute(async (req, res) => {
  const key = req.params.key;
  if (!validKvKey(key) || RESERVED_KEYS.includes(key)) return res.status(400).json({ error: "invalid key" });
  const { rows } = await pool.query("SELECT value FROM kv_store WHERE key = $1", [key]);
  if (rows.length === 0) return res.json({ value: null });
  res.json({ value: rows[0].value });
}));

r.put("/kv/:key", asyncRoute(async (req, res) => {
  const key = req.params.key;
  if (!validKvKey(key) || RESERVED_KEYS.includes(key)) return res.status(400).json({ error: "invalid key" });
  const value = req.body && req.body.value !== undefined ? req.body.value : req.body;
  await pool.query(
    `INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value]
  );
  res.json({ ok: true });
}));

/* ------------------------------------------------------------
   Shared branding. The logo is read by BOTH the public Crisis Radar
   page and the private library, so GET is public; only an editor (with
   the access code) may change it via PUT. Stored as a small data URL.
   ------------------------------------------------------------ */
r.get("/brand", asyncRoute(async (req, res) => {
  const { rows } = await pool.query("SELECT value FROM kv_store WHERE key = $1", [BRAND_KEY]);
  res.json((rows[0] && rows[0].value) || { logo: null });
}));

r.put("/brand", asyncRoute(async (req, res) => {
  const logo =
    req.body && typeof req.body.logo === "string" && req.body.logo.trim() ? req.body.logo : null;
  await pool.query(
    `INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [BRAND_KEY, { logo }]
  );
  res.json({ logo });
}));

/* ------------------------------------------------------------
   AI config + proxy. The OpenAI-compatible base URL, model and API
   key live server-side in kv_store (persistent volume). The key is
   never returned to the browser — GET reports only whether it is set.
   ------------------------------------------------------------ */
async function getAiConfig() {
  const { rows } = await pool.query("SELECT value FROM kv_store WHERE key = $1", [AI_CONFIG_KEY]);
  return (rows[0] && rows[0].value) || {};
}

r.get("/ai/config", asyncRoute(async (req, res) => {
  const c = await getAiConfig();
  res.json({ baseUrl: c.baseUrl || "", model: c.model || "", hasKey: !!c.apiKey });
}));

r.put("/ai/config", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const current = await getAiConfig();
  const next = {
    baseUrl: body.baseUrl !== undefined ? String(body.baseUrl || "").trim() : (current.baseUrl || ""),
    model: body.model !== undefined ? String(body.model || "").trim() : (current.model || ""),
    // Empty/omitted apiKey keeps the existing one; sending "__clear__" wipes it.
    apiKey: current.apiKey || "",
  };
  if (body.apiKey !== undefined) {
    const k = String(body.apiKey || "").trim();
    if (k === "__clear__") next.apiKey = "";
    else if (k) next.apiKey = k;
  }
  await pool.query(
    `INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [AI_CONFIG_KEY, next]
  );
  res.json({ baseUrl: next.baseUrl, model: next.model, hasKey: !!next.apiKey });
}));

r.post("/ai/complete", asyncRoute(async (req, res) => {
  const cfg = await getAiConfig();
  if (!cfg.baseUrl || !cfg.model) {
    return res.status(400).json({ error: "AI not configured" });
  }
  const system = req.body && req.body.system ? String(req.body.system) : "";
  const prompt = req.body && req.body.prompt ? String(req.body.prompt) : "";
  const maxTokens = req.body && req.body.max_tokens ? parseInt(req.body.max_tokens, 10) : 1000;
  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  // Normalise to the OpenAI chat-completions endpoint (LiteLLM compatible).
  const base = cfg.baseUrl.replace(/\/+$/, "");
  const url = /\/chat\/completions$/.test(base) ? base : base + "/chat/completions";

  let upstream;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: "Bearer " + cfg.apiKey } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: Number.isNaN(maxTokens) ? 1000 : maxTokens,
        messages,
      }),
    });
  } catch (e) {
    return res.status(502).json({ error: "upstream unreachable: " + e.message });
  }
  if (!upstream.ok) {
    let detail = "HTTP " + upstream.status;
    try { const j = await upstream.json(); if (j && j.error) detail = j.error.message || JSON.stringify(j.error); } catch (e) {}
    return res.status(502).json({ error: "ai error: " + detail });
  }
  const json = await upstream.json();
  const text =
    (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) || "";
  res.json({ text: String(text).trim() });
}));

app.use("/api", r);

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
(async () => {
  try {
    await waitForDb();
    await migrate();
    app.listen(PORT, () => console.log(`[api] listening on :${PORT}`));
  } catch (e) {
    console.error("[api] fatal:", e.message);
    process.exit(1);
  }
})();
