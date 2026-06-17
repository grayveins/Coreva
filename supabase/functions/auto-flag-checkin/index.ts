/**
 * auto-flag-checkin
 *
 * Reads a freshly-submitted check-in, scans the client's recent training and
 * body data, and writes deterministic flags back onto the check-in row so the
 * coach's review queue can sort by what actually needs eyes-on. No LLM calls
 * here — every rule is a hard-coded heuristic that's easy for Troy to tune
 * after dogfooding.
 *
 * Wiring:
 *   Trigger: Supabase Database Webhook on `public.check_ins` for UPDATE where
 *     `record.status = 'submitted'`. The webhook posts JSON `{ record, old_record }`
 *     to this function. See ./README.md for the exact webhook config.
 *
 *   Auth: requires SUPABASE_SERVICE_ROLE_KEY in function secrets so we can
 *     read across coach/client RLS boundaries. The webhook itself is signed
 *     by Supabase via the `x-supabase-webhook-secret` header (also kept in
 *     function secrets as WEBHOOK_SECRET).
 *
 * Flags emitted (string identifiers consumed by the dashboard UI):
 *   weight_stall      — latest body weight changed <2% over the last 14d, or
 *                       no body_stats logged at all in 14d.
 *   missed_workouts   — 0 workout_sessions in the last 7d (client has had a
 *                       program assigned for at least 14d so we don't false-
 *                       positive new clients).
 *   low_energy        — any scale_1_10 response with "energy" in the question
 *                       label is ≤4.
 *   poor_sleep        — same heuristic, "sleep" in the label.
 *   pain_reported     — any text response or label containing one of:
 *                       "pain", "hurt", "injury", "sore" (case-insensitive).
 *   declining_trend   — average of *all* scale_1_10 responses dropped ≥2 pts
 *                       vs. the previous submitted check-in.
 *
 * If any flag fires, status flips submitted → flagged. Otherwise status is
 * left as submitted. The dashboard's review queue treats both as "needs
 * review" but flagged sorts first.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SCALE_1_10 = "scale_1_10";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-webhook-secret",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

type CheckInRow = {
  id: string;
  client_id: string;
  coach_id: string;
  template_id: string | null;
  status: string;
  responses: Record<string, unknown> | null;
  flag_reasons: string[] | null;
  submitted_at: string | null;
  created_at: string;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: CheckInRow | null;
  old_record: CheckInRow | null;
};

type Question = {
  id: string;
  label: string;
  type: string;
};

const PAIN_KEYWORDS = ["pain", "hurt", "injury", "sore"];
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: cors });
  }

  // Optional shared-secret header. If WEBHOOK_SECRET is unset we accept the
  // request — useful while wiring up. Set it before going to prod.
  const expected = Deno.env.get("WEBHOOK_SECRET");
  if (expected) {
    const got = req.headers.get("x-supabase-webhook-secret");
    if (got !== expected) {
      return new Response("forbidden", { status: 403, headers: cors });
    }
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const row = payload.record;
  if (!row || row.status !== "submitted") {
    // Nothing to do for inserts in 'pending', deletes, or anything that's
    // already been flagged/reviewed.
    return json({ skipped: true, reason: "not a fresh submission" });
  }

  // Don't re-fire on save-after-flag: we only flag the moment a check-in
  // first lands in 'submitted'. If the previous status was already
  // submitted/flagged/reviewed, bail.
  const prev = payload.old_record?.status;
  if (prev === "submitted" || prev === "flagged" || prev === "reviewed") {
    return json({ skipped: true, reason: "status already past pending" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "missing supabase env" }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const flags: string[] = [];

  // ---------- Pull dependencies in parallel ---------------------------------
  const submittedAt = row.submitted_at
    ? new Date(row.submitted_at)
    : new Date(row.created_at);
  const fourteenDaysAgo = new Date(submittedAt.getTime() - FOURTEEN_DAYS_MS);
  const sevenDaysAgo = new Date(submittedAt.getTime() - SEVEN_DAYS_MS);

  const [bodyStatsRes, workoutsRes, prevCheckInRes, templateRes, programRes] =
    await Promise.all([
      supabase
        .from("body_stats")
        .select("date, weight_kg")
        .eq("client_id", row.client_id)
        .gte("date", fourteenDaysAgo.toISOString().slice(0, 10))
        .order("date", { ascending: false }),
      supabase
        .from("workout_sessions")
        .select("id, started_at")
        .eq("user_id", row.client_id)
        .gte("started_at", sevenDaysAgo.toISOString()),
      supabase
        .from("check_ins")
        .select("responses, submitted_at")
        .eq("client_id", row.client_id)
        .eq("status", "reviewed")
        .neq("id", row.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      row.template_id
        ? supabase
            .from("check_in_templates")
            .select("questions")
            .eq("id", row.template_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      // First-ever client: no flag for "missed workouts" if they haven't had
      // a program for two weeks.
      supabase
        .from("coaching_programs")
        .select("created_at")
        .eq("client_id", row.client_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  const questions: Question[] = parseQuestions(templateRes.data?.questions);
  const responses = (row.responses ?? {}) as Record<string, unknown>;

  // ---------- Rule: weight_stall --------------------------------------------
  const bodyStats = bodyStatsRes.data ?? [];
  if (bodyStats.length === 0) {
    flags.push("weight_stall");
  } else if (bodyStats.length >= 2) {
    const newest = numeric(bodyStats[0].weight_kg);
    const oldest = numeric(bodyStats[bodyStats.length - 1].weight_kg);
    if (newest != null && oldest != null && oldest > 0) {
      const pctDelta = Math.abs((newest - oldest) / oldest);
      if (pctDelta < 0.02) flags.push("weight_stall");
    }
  }

  // ---------- Rule: missed_workouts -----------------------------------------
  const programStart = programRes.data?.created_at
    ? new Date(programRes.data.created_at)
    : null;
  const programOldEnough =
    programStart && submittedAt.getTime() - programStart.getTime() >= FOURTEEN_DAYS_MS;
  if (programOldEnough && (workoutsRes.data?.length ?? 0) === 0) {
    flags.push("missed_workouts");
  }

  // ---------- Rules: low_energy / poor_sleep / declining_trend / pain --------
  const scaleByLabel = new Map<string, number>(); // lowercased label → value
  for (const q of questions) {
    if (q.type !== SCALE_1_10) continue;
    const v = numeric(responses[q.id]);
    if (v == null) continue;
    scaleByLabel.set(q.label.toLowerCase(), v);
  }
  if (anyMatchAtMost(scaleByLabel, "energy", 4)) flags.push("low_energy");
  if (anyMatchAtMost(scaleByLabel, "sleep", 4)) flags.push("poor_sleep");

  // declining_trend: compare scale averages between this and the prior reviewed.
  if (prevCheckInRes.data?.responses) {
    const prevResponses = prevCheckInRes.data.responses as Record<string, unknown>;
    const currentAvg = avgScales(questions, responses);
    const prevAvg = avgScales(questions, prevResponses);
    if (currentAvg != null && prevAvg != null && prevAvg - currentAvg >= 2) {
      flags.push("declining_trend");
    }
  }

  // pain_reported: scan all string responses + labels of scale answers ≤ 5.
  const allText: string[] = [];
  for (const v of Object.values(responses)) {
    if (typeof v === "string") allText.push(v.toLowerCase());
    if (Array.isArray(v)) {
      for (const inner of v) if (typeof inner === "string") allText.push(inner.toLowerCase());
    }
  }
  for (const q of questions) {
    if (q.type === SCALE_1_10) continue;
    // Free text or selects — already harvested.
  }
  if (allText.some((s) => PAIN_KEYWORDS.some((kw) => s.includes(kw)))) {
    flags.push("pain_reported");
  }

  // ---------- Persist -------------------------------------------------------
  if (flags.length === 0) {
    return json({ ok: true, flagged: false, flags: [] });
  }

  const { error: updateError } = await supabase
    .from("check_ins")
    .update({
      flag_reasons: dedupe(flags),
      status: "flagged",
    })
    .eq("id", row.id);

  if (updateError) {
    console.error("update failed:", updateError);
    return json({ error: "update failed", detail: updateError.message }, 500);
  }

  return json({ ok: true, flagged: true, flags: dedupe(flags) });
});

// ----------------------------- helpers ---------------------------------------

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function parseQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((q): Question[] => {
    if (!q || typeof q !== "object") return [];
    const r = q as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.label !== "string") return [];
    if (typeof r.type !== "string") return [];
    return [{ id: r.id, label: r.label, type: r.type }];
  });
}

function numeric(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function anyMatchAtMost(
  byLabel: Map<string, number>,
  needle: string,
  threshold: number,
): boolean {
  for (const [label, value] of byLabel) {
    if (label.includes(needle) && value <= threshold) return true;
  }
  return false;
}

function avgScales(
  questions: Question[],
  responses: Record<string, unknown>,
): number | null {
  const scales: number[] = [];
  for (const q of questions) {
    if (q.type !== SCALE_1_10) continue;
    const v = numeric(responses[q.id]);
    if (v != null) scales.push(v);
  }
  if (scales.length === 0) return null;
  return scales.reduce((a, b) => a + b, 0) / scales.length;
}

function dedupe<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}
