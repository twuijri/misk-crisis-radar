# Misk · Crisis Radar — Self-Hosted Docker Stack

A shared, live crisis-monitoring workspace for the Strategic Communication
team. Everything runs **inside your own server** — three small containers, no
external services:

| Container | Role |
|---|---|
| `web` | nginx serving the bilingual single-page dashboard (`index.html`) |
| `api` | Node/Express REST API — the only public data path |
| `db`  | PostgreSQL — the "brain", on a private network, never exposed |

The interface is **bilingual (English / العربية)** — toggle from the button in
the top bar. Arabic switches the whole layout to RTL. Updates appear for
everyone within a few seconds (light polling).

---

## ما الذي يفعله هذا الستاك؟ (نظرة سريعة)

- كل شيء داخل سيرفرك: صفحة الويب + واجهة برمجية (API) + قاعدة بيانات PostgreSQL.
- قاعدة البيانات على شبكة داخلية فقط، ما تنفتح على الإنترنت إطلاقاً.
- الصور (images) تُبنى تلقائياً على GitHub وتُنشر على GHCR، فالسيرفر يسحبها جاهزة.
- الواجهة عربي/إنجليزي مع زر تبديل في الأعلى.

الخطوات باختصار:
1. ارفع هذا المجلد كامل على GitHub (يبني صورتين: `-web` و`-api`).
2. اجعل حزمتي GHCR عامتين (Public) مرة واحدة.
3. في Dockge/Dockhand: ألصق الستاك وضع متغيرات البيئة، ثم شغّله.

---

## 1. Push to GitHub (builds the images)

```bash
cd misk
git add .
git commit -m "Misk Crisis Radar — self-hosted web/api/db stack"
git push
```

GitHub Actions builds and pushes two images to GHCR:

- `ghcr.io/<you>/misk-crisis-radar-web:latest`
- `ghcr.io/<you>/misk-crisis-radar-api:latest`

> `.env` is gitignored — your real passwords never go to GitHub. They are
> entered in the Dockhand panel instead.

## 2. Make the GHCR packages public (one time)

So your server can pull without a login, open each package and switch its
visibility to **Public**:

- `https://github.com/users/<you>/packages/container/misk-crisis-radar-web/settings`
- `https://github.com/users/<you>/packages/container/misk-crisis-radar-api/settings`

→ Danger Zone → Change visibility → **Public**.

## 3. Deploy from Dockge / Dockhand

1. **New stack** → paste the contents of [`compose.yaml`](compose.yaml).
2. In the stack **Environment / .env** editor, set:

   | Variable | Value |
   |---|---|
   | `POSTGRES_USER` | e.g. `misk` |
   | `POSTGRES_PASSWORD` | a strong password (required) |
   | `POSTGRES_DB` | e.g. `misk` |
   | `API_TOKEN` | optional shared Bearer token, or leave empty |
   | `ACCESS_CODE` | optional page access code, or leave empty |

3. **Deploy / Up**. The API auto-creates its database tables on first boot.
4. Open `https://misk.i3u.us`. The live dot turns teal = connected.

The stack is already wired for **Traefik** on domain `misk.i3u.us`
(entrypoint `web`, external network `proxy`):

- `web` router serves the page on the domain (priority 10).
- `api` router serves `/api` on the same domain (priority 20), so the browser
  talks to the backend same-origin — no CORS.

## 4. Run locally (optional test)

```bash
POSTGRES_PASSWORD=test API_TOKEN= ACCESS_CODE= docker compose up --build
```

(For a purely local run without Traefik you can add a `ports:` mapping to the
`web` service, e.g. `8080:80`.)

---

## How config injection works

`index.html` ships with placeholders:

```js
API_BASE  = "__API_BASE__"
API_TOKEN = "__API_TOKEN__"
ACCESS_CODE = "__ACCESS_CODE__"
```

On container start, [`docker-entrypoint.sh`](docker-entrypoint.sh) copies the
template into the nginx web root and `sed`-replaces those placeholders with the
environment variables. `API_BASE` defaults to `/api` (same origin).

## Data model

The API auto-migrates this schema (in [`api/server.js`](api/server.js)):

- `crisis_cases` — one row per case: `title`, `category`, `summary`, `status`,
  `expected_impact`, `recommended_action`, `reference_links`, and the six radar
  dimensions (`severity`, `urgency`, `reach`, `sentiment`, `escalation_risk`,
  `strategic_impact`, each 1–5).
- `case_updates` — timeline notes attached to a case.

## Customising

| Need | Where |
|---|---|
| Categories (keep 6 for a clean radar) | `CATEGORIES` in `index.html` |
| Risk dimensions / weights | `DIMENSIONS`, `WEIGHTS` in `index.html` (and `DIMS` in `api/server.js`) |
| Arabic / English wording | `I18N` block in `index.html` |
| Domain / routing | Traefik labels in `compose.yaml` |
| Access gate | `ACCESS_CODE` env var |
| API auth | `API_TOKEN` env var |
