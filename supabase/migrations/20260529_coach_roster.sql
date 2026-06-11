-- ============================================================================
-- 20260529_coach_roster.sql
--
-- Adds get_coach_roster(p_coach_id): the at-a-glance client list that powers
-- the coach dashboard roster screen. Returns one row per coaching relationship
-- with name + adherence signals so the coach can spot who needs attention.
--
-- SECURITY DEFINER (matches get_coach_dashboard / get_client_compliance): the
-- function reads across profiles / workout_sessions / scheduled_workouts /
-- user_streaks for the coach's own clients without requiring per-table
-- coach-read RLS. It hard-scopes every read to clients in coach_clients for
-- p_coach_id, and asserts the caller IS that coach, so a coach can never read
-- another coach's roster.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_coach_roster(p_coach_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Caller must be the coach they're asking about.
  IF auth.uid() IS DISTINCT FROM p_coach_id THEN
    RAISE EXCEPTION 'not authorized for this coach roster';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_jsonb(r) ORDER BY r.sort_key), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      cc.client_id                                   AS "clientId",
      cc.status                                      AS "status",
      COALESCE(
        NULLIF(TRIM(ci.full_name), ''),
        p.first_name,
        split_part(u.email, '@', 1)
      )                                              AS "name",
      u.email                                        AS "email",
      prog.name                                      AS "activeProgramName",
      -- workouts logged in the trailing 7 days
      (SELECT COUNT(*) FROM public.workout_sessions ws
        WHERE ws.user_id = cc.client_id
          AND ws.started_at >= NOW() - INTERVAL '7 days')        AS "workoutsThisWeek",
      (SELECT MAX(ws.started_at) FROM public.workout_sessions ws
        WHERE ws.user_id = cc.client_id)                         AS "lastWorkoutAt",
      -- next upcoming, still-incomplete scheduled session
      (SELECT MIN(sw.scheduled_date) FROM public.scheduled_workouts sw
        WHERE sw.client_id = cc.client_id
          AND sw.coach_id = p_coach_id
          AND sw.completed = FALSE
          AND sw.scheduled_date >= CURRENT_DATE)                 AS "nextSessionDate",
      -- scheduled sessions in the last 7 days that were missed (the red flag)
      (SELECT COUNT(*) FROM public.scheduled_workouts sw
        WHERE sw.client_id = cc.client_id
          AND sw.coach_id = p_coach_id
          AND sw.source_type <> 'rest'
          AND sw.completed = FALSE
          AND sw.scheduled_date <  CURRENT_DATE
          AND sw.scheduled_date >= CURRENT_DATE - INTERVAL '7 days') AS "missedLast7",
      COALESCE(st.current_streak, 0)                 AS "currentStreak",
      -- pending check-in needing review
      (SELECT COUNT(*) FROM public.check_ins chk
        WHERE chk.client_id = cc.client_id
          AND chk.coach_id = p_coach_id
          AND chk.status IN ('submitted', 'flagged'))            AS "pendingCheckIns",
      -- sort: active first, then most missed sessions, then soonest next session
      (CASE cc.status WHEN 'active' THEN 0 WHEN 'pending' THEN 1
                      WHEN 'paused' THEN 2 ELSE 3 END)::text
        || '_' || LPAD((
          1000 - LEAST(
            (SELECT COUNT(*) FROM public.scheduled_workouts sw
              WHERE sw.client_id = cc.client_id AND sw.coach_id = p_coach_id
                AND sw.source_type <> 'rest' AND sw.completed = FALSE
                AND sw.scheduled_date < CURRENT_DATE
                AND sw.scheduled_date >= CURRENT_DATE - INTERVAL '7 days'),
            999)
        )::text, 4, '0')                             AS sort_key
    FROM public.coach_clients cc
    JOIN auth.users u            ON u.id = cc.client_id
    LEFT JOIN public.profiles p  ON p.id = cc.client_id
    LEFT JOIN public.client_invitations ci
      ON ci.coach_id = cc.coach_id
     AND LOWER(ci.email) = LOWER(u.email)
     AND ci.status = 'accepted'
    LEFT JOIN LATERAL (
      SELECT cp.name
      FROM public.coaching_programs cp
      WHERE cp.client_id = cc.client_id
        AND cp.coach_id = p_coach_id
        AND cp.status = 'active'
      ORDER BY cp.start_date DESC NULLS LAST
      LIMIT 1
    ) prog ON TRUE
    LEFT JOIN public.user_streaks st ON st.user_id = cc.client_id
    WHERE cc.coach_id = p_coach_id
      AND cc.status <> 'archived'
  ) r;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_coach_roster(UUID) TO authenticated;
