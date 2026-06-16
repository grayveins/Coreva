-- ============================================================================
-- scheduled_workouts — date-keyed schedule of what the client should do.
--
-- Why: phase_workouts.day_number is relative to a phase, so it can't express
-- "do this on a specific date" or "shift the week." This table is the source
-- of truth that mobile reads to render Today/Calendar.
--
-- v0 (this migration): the table + RLS only. No backfill. Coaches manually
-- assign workouts to dates from the dashboard's per-client schedule editor.
-- Mobile read-side switch is a separate PR.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.scheduled_workouts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id             UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  scheduled_date       DATE NOT NULL,

  -- Source of the assigned workout. Exactly one of phase_workout_id /
  -- template_id is non-null when source_type isn't 'rest'.
  source_type          TEXT NOT NULL,
  phase_workout_id     UUID REFERENCES public.phase_workouts(id) ON DELETE SET NULL,
  -- workout_templates table isn't in prod yet (local-only mobile
  -- migration `20260325_workout_templates.sql`). Keep template_id as a
  -- plain UUID for now; promote to a real FK once workout_templates
  -- lands in prod.
  template_id          UUID,

  -- Per-instance edits (e.g. swap one exercise for today only). Renders on
  -- top of the source's exercises if present.
  override_payload     JSONB,

  -- Lifecycle
  completed            BOOLEAN NOT NULL DEFAULT FALSE,
  completed_session_id UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_source_type CHECK (source_type IN ('phase_workout','template','rest')),
  CONSTRAINT source_consistency CHECK (
    (source_type = 'phase_workout' AND phase_workout_id IS NOT NULL AND template_id IS NULL) OR
    (source_type = 'template'      AND template_id      IS NOT NULL AND phase_workout_id IS NULL) OR
    (source_type = 'rest'          AND phase_workout_id IS NULL AND template_id IS NULL)
  ),
  -- Single workout per client per date. v0 design call; lift later if a
  -- coach genuinely wants to stack two on a day.
  UNIQUE (client_id, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_client_date
  ON public.scheduled_workouts(client_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_coach
  ON public.scheduled_workouts(coach_id, scheduled_date);

DROP TRIGGER IF EXISTS set_scheduled_workouts_updated_at ON public.scheduled_workouts;
CREATE TRIGGER set_scheduled_workouts_updated_at
  BEFORE UPDATE ON public.scheduled_workouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.scheduled_workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage own clients' schedule" ON public.scheduled_workouts;
CREATE POLICY "Coaches manage own clients' schedule"
  ON public.scheduled_workouts FOR ALL
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "Clients read own schedule" ON public.scheduled_workouts;
CREATE POLICY "Clients read own schedule"
  ON public.scheduled_workouts FOR SELECT
  USING (client_id = auth.uid());

-- Clients can flip `completed` (the mobile workout flow does this when a
-- session ends), but only on their own row and only that column.
DROP POLICY IF EXISTS "Clients mark own schedule complete" ON public.scheduled_workouts;
CREATE POLICY "Clients mark own schedule complete"
  ON public.scheduled_workouts FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

ANALYZE public.scheduled_workouts;
