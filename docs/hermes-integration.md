# Hermes ↔ Crisis Radar integration

This guide wires the **[Hermes Agent](https://github.com/NousResearch/hermes-agent)**
into the Misk stack so it can monitor social media (via its built‑in web search)
and submit findings to the **AI Analysis** queue in the Crisis Radar. A human then
reviews each finding and clicks **"Copy to radar"** to promote it into a real case.

```
┌───────────┐   web search    ┌──────────────┐  POST /api/ai-findings  ┌───────────┐
│  Internet │ ───────────────▶│ Hermes Agent │ ───────────────────────▶│  misk-api │
└───────────┘                 └──────────────┘   (X-Access-Code)        └─────┬─────┘
                                                                              │ pending
                                                              human review ◀──┘ findings
                                                              "Copy to radar" → crisis_cases
```

Nothing is auto‑published: Hermes only fills a **review queue**. A person always
approves before anything appears on the main radar.

---

## 1. Networking — put Hermes on the same Docker network

The API container is `misk-api`, listening on port **3000**, and it is already
attached to the external **`proxy`** network. Add Hermes to that same network and
it can reach the API by container name — no ports exposed to the internet.

Add this service to your `compose.yaml` (alongside `db`, `api`, `web`):

```yaml
  hermes:
    # Use your own image/build for Hermes. Any container that has the
    # `hermes` CLI (or your own script) and internet access works.
    build: ./hermes            # or image: your-registry/hermes:latest
    container_name: misk-hermes
    restart: unless-stopped
    environment:
      # The radar API, reachable over the shared proxy network by name:
      - RADAR_API_BASE=http://misk-api:3000/api
      # Same editor code the radar uses (keep it only in .env, never in git):
      - RADAR_ACCESS_CODE=${ACCESS_CODE}
      # Your model provider for Hermes (example: OpenRouter):
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    networks:
      - proxy                  # reach misk-api AND the internet (web search)
    # depends_on is optional; Hermes retries the API on its own schedule
    depends_on:
      - api

# (the `proxy` network is already declared as external at the bottom of the file)
```

> **Why `proxy` and not `internal`?** The `internal` network has
> `internal: true`, which blocks internet access — Hermes needs the internet for
> web search. The `proxy` network gives it both internet egress **and**
> name‑resolution to `misk-api`. If you'd rather not touch Docker networking at
> all, Hermes can simply call the **public** URL instead:
> `https://misk.i3u.us/api` (it only needs internet then).

---

## 2. The API Hermes calls

All `/api/ai-findings` routes are **private** — every request must send the editor
code as the `X-Access-Code` header (this is the same `ACCESS_CODE` from your
`.env`). That is the only credential Hermes needs.

### Submit a finding — `POST /api/ai-findings`

Send one JSON object **per social‑media post/crisis** Hermes finds:

```jsonc
{
  "is_crisis": true,                 // is this actually a crisis? true/false
  "sentiment": "negative",           // "negative" | "neutral" | "positive"
  "source_url": "https://x.com/user/status/123",  // link to the tweet/post
  "platform": "X (Twitter)",         // where it was found
  "author": "@some_account",         // who posted it (optional)
  "title": "Short headline of the issue",
  "summary": "What is being said and why it matters, in 1–3 sentences.",
  "expected_impact": "Potential effect on Misk's reputation / objectives.",
  "recommended_action": "Suggested first response.",
  "category": "Reputation",          // free text grouping (optional)
  "dims": {                          // AI scoring, each 1–5 (radar's 6 axes)
    "severity": 4,
    "urgency": 4,
    "reach": 3,
    "sentiment": 4,                  // 5 = most hostile
    "escalation_risk": 3,
    "strategic_impact": 3
  }
}
```

Every field is optional except that an empty body is pointless. Unknown fields are
kept in a `payload` column for reference. `dims` values are clamped to 1–5.

**Example call (what Hermes runs in a shell tool):**

```bash
curl -sS -X POST "$RADAR_API_BASE/ai-findings" \
  -H "Content-Type: application/json" \
  -H "X-Access-Code: $RADAR_ACCESS_CODE" \
  -d '{
    "is_crisis": true,
    "sentiment": "negative",
    "source_url": "https://x.com/example/status/123",
    "platform": "X (Twitter)",
    "author": "@example",
    "title": "Complaints about a delayed Misk program",
    "summary": "Several users report not receiving certificates after the program ended.",
    "expected_impact": "Growing frustration could spread and dent program credibility.",
    "recommended_action": "Acknowledge publicly and clarify the certificate timeline.",
    "category": "Program delivery",
    "dims": {"severity":3,"urgency":4,"reach":2,"sentiment":4,"escalation_risk":3,"strategic_impact":3}
  }'
```

A successful call returns `201` with the stored finding (including its `id`).

### Other routes (used by the radar UI, not by Hermes)

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET`  | `/api/ai-findings?status=pending` | List findings awaiting review |
| `POST` | `/api/ai-findings/:id/promote`    | Copy a finding into `crisis_cases` |
| `POST` | `/api/ai-findings/:id/dismiss`    | Mark a finding dismissed |
| `DELETE` | `/api/ai-findings/:id`          | Delete a finding |

---

## 3. The prompt to give Hermes

Paste this as a Hermes **personality / context file** (e.g. via `hermes config`
or an `AGENTS.md` in its working dir), then run it on a schedule with Hermes' cron
(`hermes` → `/cron`). It tells Hermes its mission and exactly how to report.

```text
You are the social-media crisis monitor for Misk Foundation (مؤسسة مسك), a Saudi
non-profit focused on youth empowerment, leadership, skills, and entrepreneurship.

YOUR JOB, every run:
1. Use web search to scan public social media (X/Twitter, news, forums, Reddit,
   YouTube comments) for recent posts that mention Misk Foundation, its programs,
   academies, or leadership — especially anything negative, controversial, or
   spreading quickly.
2. For EACH distinct issue you find, decide:
   - is_crisis: true only if it could harm Misk's reputation or needs a response.
   - sentiment: negative / neutral / positive.
   - Score the six radar dimensions 1–5 (severity, urgency, reach, sentiment,
     escalation_risk, strategic_impact). Be conservative — 5 means extreme.
3. POST one finding per issue to the radar API using this shell command
   (the API base and access code are in your environment):

   curl -sS -X POST "$RADAR_API_BASE/ai-findings" \
     -H "Content-Type: application/json" \
     -H "X-Access-Code: $RADAR_ACCESS_CODE" \
     -d '<the JSON object>'

   The JSON object fields are: is_crisis, sentiment, source_url (link to the
   actual post), platform, author, title, summary, expected_impact,
   recommended_action, category, and dims {severity,urgency,reach,sentiment,
   escalation_risk,strategic_impact}.

RULES:
- ALWAYS include the real source_url (the tweet/post link). No link = don't submit.
- Do NOT invent posts. Only report things you actually found via search.
- One POST per distinct issue. Skip duplicates you already reported today.
- Keep title/summary concise and factual. Arabic or English are both fine.
- You only fill a review queue; a human approves before anything goes live.
  Never call /promote or /dismiss — those are for the human reviewer.
```

Schedule it, for example, every 3 hours:

```text
/cron add "monitor Misk social media and submit findings" --every 3h
```

---

## 4. Reviewing in the radar

1. Open the Crisis Radar, sign in as an editor (the **AI Analysis** page is
   private — it only loads for a logged-in editor).
2. Go to **AI Analysis / تحليل الذكاء الاصطناعي** in the sidebar.
3. Each card shows the headline, a **Crisis / Not-a-crisis** badge, the sentiment
   (negative is red), the source link, the AI summary, and the six AI‑suggested
   scores.
4. Click **Copy to radar / نسخ إلى الرادار** to create a real case from it
   (the finding is marked *promoted*), or **Dismiss / تجاهل** to drop it.

---

## 5. Security notes

- The access code is the **only** thing protecting the queue. Keep it in `.env`
  and pass it to Hermes via environment, never commit it.
- `/api/ai-findings` is gated for **all** methods, so the queue is invisible to
  anonymous visitors of the public radar.
- Hermes never writes to `crisis_cases` directly — promotion is a deliberate
  human action in the UI. This keeps a person in the loop by design.
- Prefer the internal `http://misk-api:3000` address so findings never leave the
  Docker network in transit.
