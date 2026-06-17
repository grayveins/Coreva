# auto-flag-checkin

Database-webhook-triggered Edge Function that scans a freshly-submitted check-in
and writes deterministic flags onto `public.check_ins.flag_reasons[]`. Flips the
row's `status` from `submitted` to `flagged` if any rule fires.

## Flags

| Flag | Triggered when |
|---|---|
| `weight_stall` | Latest weight changed <2% over the last 14 days, OR no `body_stats` rows in the last 14 days. |
| `missed_workouts` | 0 `workout_sessions` in the last 7 days. Suppressed if the client's earliest `coaching_programs` row is younger than 14 days (don't flag fresh clients). |
| `low_energy` | Any `scale_1_10` question whose label contains "energy" has a value ≤4. |
| `poor_sleep` | Same heuristic on "sleep". |
| `declining_trend` | Mean of all `scale_1_10` responses dropped ≥2 points vs. the prior **reviewed** check-in for this client. |
| `pain_reported` | Any text/select response contains: pain, hurt, injury, sore (case-insensitive). |

## Deploy

```bash
# from ~/troyg/Projects/ADPT
supabase functions deploy auto-flag-checkin --no-verify-jwt

# Set secrets (function env)
supabase secrets set WEBHOOK_SECRET="<long random string>"
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-available to deployed
# functions — no need to set them.
```

The `--no-verify-jwt` flag is required because Database Webhooks don't pass a
user JWT. We authenticate the call ourselves via the `WEBHOOK_SECRET` header
the function checks.

## Wire the Database Webhook

Supabase Dashboard → **Database → Webhooks → Create a new hook**

- **Name**: `auto-flag-checkin`
- **Table**: `public.check_ins`
- **Events**: `Update` only
- **Type**: `HTTP Request`
- **Method**: `POST`
- **URL**: `https://<project-ref>.supabase.co/functions/v1/auto-flag-checkin`
- **Headers**:
  - `Content-Type: application/json`
  - `x-supabase-webhook-secret: <same value as WEBHOOK_SECRET>`
- **Conditions** (so we only fire when the row first transitions into
  `submitted`, not on every coach edit):
  - Add a Postgres condition: `record.status = 'submitted' AND old_record.status IS DISTINCT FROM 'submitted'`

If your Supabase plan doesn't support webhook conditions, leave them off — the
function itself short-circuits when `record.status !== 'submitted'` or when the
prior status was already past `pending`.

## Test locally

```bash
supabase functions serve auto-flag-checkin --no-verify-jwt --env-file ./supabase/.env.local

# In another terminal, simulate the webhook payload:
curl -X POST http://localhost:54321/functions/v1/auto-flag-checkin \
  -H "Content-Type: application/json" \
  -H "x-supabase-webhook-secret: $WEBHOOK_SECRET" \
  -d '{
    "type": "UPDATE",
    "table": "check_ins",
    "record": {
      "id": "<uuid of a real submitted check-in>",
      "client_id": "<uuid>",
      "coach_id": "<uuid>",
      "template_id": null,
      "status": "submitted",
      "responses": {"q_energy": 3, "q_pain": "lower back hurt yesterday"},
      "flag_reasons": [],
      "submitted_at": "2026-05-06T10:00:00Z",
      "created_at": "2026-05-06T10:00:00Z"
    },
    "old_record": { "status": "pending" }
  }'
```

Expected response: `{"ok": true, "flagged": true, "flags": ["weight_stall", "low_energy", "pain_reported"]}` (or similar — depends on the row's underlying training/body data).

## Tuning

Hard-coded thresholds intentionally — easier to nudge after dogfooding than to
build a config table. Knobs are at the top of `index.ts`:
- `FOURTEEN_DAYS_MS`, `SEVEN_DAYS_MS` (look-back windows)
- `0.02` weight-stall %
- `4` low-energy / poor-sleep cutoff
- `2` pts declining-trend gap
- `PAIN_KEYWORDS` array
