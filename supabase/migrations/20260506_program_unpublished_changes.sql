-- ============================================================================
-- D21 (light): track unpublished edits on active programs
--
-- Adds a flag the dashboard surfaces as "Unpublished changes" on the program
-- builder. Any insert/update/delete to phases or workouts on an `active`
-- program flips the flag to TRUE; the coach explicitly clears it via Publish.
--
-- Why a flag and not snapshot-based drafts? Snapshot drafts are the proper
-- fix for the Trainerize "every typo notifies the client" pain, but they
-- require deferring writes through a JSONB working copy (~600 LOC). ADPT
-- today doesn't push notifications on program edits, so the urgency is
-- lower. The flag pattern lays the lifecycle groundwork: when push-on-edit
-- ships, it'll consult this flag instead of pushing on every row write.
-- ============================================================================

ALTER TABLE public.coaching_programs
  ADD COLUMN IF NOT EXISTS unpublished_changes BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_published_at  TIMESTAMPTZ;

-- Trigger fn: mark the parent program as having unpublished changes whenever
-- a phase or workout row is touched. Idempotent — only writes when the flag
-- isn't already true and the program is `active` (drafts don't need this).
CREATE OR REPLACE FUNCTION public.mark_program_unpublished()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- needed so a coach's edit on phase_workouts can update
                  -- coaching_programs even though that's a different table.
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_program_id UUID;
BEGIN
  -- Resolve program_id from whichever row type the trigger fires on.
  IF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'phase_workouts' THEN
      SELECT program_id INTO v_program_id
      FROM public.program_phases WHERE id = OLD.phase_id;
    ELSE
      v_program_id := OLD.program_id;
    END IF;
  ELSE
    IF TG_TABLE_NAME = 'phase_workouts' THEN
      SELECT program_id INTO v_program_id
      FROM public.program_phases WHERE id = NEW.phase_id;
    ELSE
      v_program_id := NEW.program_id;
    END IF;
  END IF;

  IF v_program_id IS NOT NULL THEN
    UPDATE public.coaching_programs
    SET unpublished_changes = TRUE
    WHERE id = v_program_id
      AND status = 'active'
      AND unpublished_changes = FALSE;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS program_phases_mark_unpublished ON public.program_phases;
CREATE TRIGGER program_phases_mark_unpublished
  AFTER INSERT OR UPDATE OR DELETE ON public.program_phases
  FOR EACH ROW EXECUTE FUNCTION public.mark_program_unpublished();

DROP TRIGGER IF EXISTS phase_workouts_mark_unpublished ON public.phase_workouts;
CREATE TRIGGER phase_workouts_mark_unpublished
  AFTER INSERT OR UPDATE OR DELETE ON public.phase_workouts
  FOR EACH ROW EXECUTE FUNCTION public.mark_program_unpublished();

ANALYZE public.coaching_programs;
