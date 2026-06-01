"use strict";

/* ============================================================
   Misk Crisis Radar — self-hosted API
   Express + PostgreSQL. Auto-migrates its schema on boot, so a
   paste-only Dockge/Dockhand deploy needs no init.sql on the server.
   ============================================================ */

const express = require("express");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN || "";
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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS case_updates (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      case_id    uuid NOT NULL REFERENCES crisis_cases(id) ON DELETE CASCADE,
      author     text,
      note       text NOT NULL,
      created_at timestamptz DEFAULT now()
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
app.use(express.json({ limit: "256kb" }));

// Optional Bearer-token gate. If API_TOKEN is empty, the API is open
// (it still sits behind the reverse proxy on the internal network).
app.use((req, res, next) => {
  if (req.path === "/api/health" || req.path === "/health") return next();
  if (!API_TOKEN) return next();
  const auth = req.headers["authorization"] || "";
  if (auth === "Bearer " + API_TOKEN) return next();
  return res.status(401).json({ error: "unauthorized" });
});

app.get(["/api/health", "/health"], (req, res) => res.json({ ok: true }));

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
