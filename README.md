# Misk · Crisis Radar — Docker Stack

A shared, live crisis-monitoring workspace for the Strategic Communication team.
Single static page (radar + cases) backed by Supabase, packaged as a Docker
stack so it can be deployed from a panel like **Dockge / Dockhand / Portainer**.

The interface is **bilingual (English / العربية)** — toggle from the button in
the top bar. Arabic switches the whole layout to RTL.

---

## ما الذي يفعله هذا الستاك؟ (Arabic quick start)

- يخدم صفحة `index.html` عبر nginx داخل حاوية Docker.
- يحقن مفاتيح Supabase وقت تشغيل الحاوية من متغيرات البيئة، فلا تُخزَّن في الكود.
- ترفع المستودع كامل على GitHub، ثم من لوحة **Dockge / Dockhand** تسحب الستاك
  من رابط GitHub وتشغّله.
- الواجهة عربي/إنجليزي مع زر تبديل في الأعلى.

الخطوات باختصار:
1. جهّز قاعدة Supabase (شغّل `supabase-setup.sql`) واحصل على `URL` و`anon key`.
2. ارفع هذا المجلد كامل على GitHub.
3. في Dockge/Dockhand: أنشئ ستاك من رابط GitHub، وضع متغيرات البيئة الثلاثة.
4. شغّل الستاك، وافتح `http://<server-ip>:8080`.

---

## 1. Supabase (one time)

1. Create a project at **supabase.com**.
2. **SQL Editor → New query** → paste all of [`supabase-setup.sql`](supabase-setup.sql) → **Run**.
3. **Project Settings → API** → copy the **Project URL** and the **anon public** key.

> The anon key is *designed* to be public in the browser. Keep the link internal
> and (optionally) set an `ACCESS_CODE`.

## 2. Put the stack on GitHub

```bash
cd misk
git init
git add .
git commit -m "Misk Crisis Radar — bilingual Docker stack"
git branch -M main
git remote add origin https://github.com/<you>/misk-crisis-radar.git
git push -u origin main
```

> `.env` is gitignored — your real keys never go to GitHub. They are entered in
> the panel instead.

## 3. Deploy from Dockge / Dockhand / Portainer

These panels clone the repo and run `docker compose up -d` (using the
`build: .` in [`compose.yaml`](compose.yaml), which builds the image on the server).

1. **New stack → from Git repository** → paste your GitHub repo URL, branch `main`.
2. In the stack **Environment / .env** editor, set:

   | Variable | Value |
   |---|---|
   | `SUPABASE_URL` | `https://your-project-ref.supabase.co` (no trailing slash) |
   | `SUPABASE_ANON_KEY` | your anon public key |
   | `ACCESS_CODE` | optional shared code, or leave empty |

3. **Deploy / Up**.
4. Open `http://<server-ip>:8080`. The live dot turns teal = connected.

> Behind a reverse proxy (Nginx Proxy Manager / Traefik), point a domain at the
> container's port `80` (host port `8080` above) for a clean HTTPS URL.

## 4. Run locally (optional test)

```bash
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_ANON_KEY=eyJ... \
ACCESS_CODE= \
docker compose up --build
# then open http://localhost:8080
```

Opening `index.html` directly in a browser also works — it falls back to a
read-only **demo mode** when no keys are injected.

---

## How config injection works

`index.html` ships with placeholders:

```js
url:     "__SUPABASE_URL__"
anonKey: "__SUPABASE_ANON_KEY__"
ACCESS_CODE = "__ACCESS_CODE__"
```

On container start, [`docker-entrypoint.sh`](docker-entrypoint.sh) copies the
template into the nginx web root and `sed`-replaces those placeholders with the
environment variables. Restart the stack to apply changed values.

## Customising

| Need | Where |
|---|---|
| Categories (keep 6 for a clean radar) | `CATEGORIES` in `index.html` |
| Risk dimensions / weights | `DIMENSIONS`, `WEIGHTS` in `index.html` |
| Arabic / English wording | `I18N` block in `index.html` |
| Default port | `ports:` in `compose.yaml` |
| Access gate | `ACCESS_CODE` env var |
