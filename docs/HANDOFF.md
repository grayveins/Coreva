# ADPT - Session Handoff

Last updated: 2026-06-10. Use this to resume work in a fresh chat.

## What this is
ADPT is an Expo / React Native (Expo Router) fitness coaching app talking directly
to Supabase. v1 goal: a Trainerize replacement for Troy's own coaching (Troy is
coach #1). Companion docs: `AGENTS.md` (conventions), `WORKOUT_UX_PLAN.md` (plan +
punch list), `TRAINERIZE_TEARDOWN.md` (reference), `STRATEGIC_ANALYSIS_2026-05.md`.

## Hard rules (learned the hard way - follow these)
- **No em-dashes or en-dashes anywhere** (- / -). Troy hates anything that looks
  AI-generated. Use plain hyphens, commas, or restructure. Middot (·) separators
  are fine. (Repo was swept clean in PR #68.)
- **Monochrome only - NO accent colour.** Electric blue was tried and rejected
  ("looks horrible"). Black/white + `colors.bgSecondary`; one black hero CTA per
  screen, light-grey secondary cards. Always `useTheme()`, never hardcode colours.
  Semantic colours (success green, etc.) only if they carry meaning, used sparingly.
- **No schema changes without a migration** in `supabase/migrations/`. Never edit
  hosted Supabase directly. Use generated `types/database.ts`.
- **PRs under ~400 lines**, focused. Auto-merge via `gh` (squash + delete branch),
  don't ask each time. Commit ONLY your files - the working tree has unrelated
  uncommitted WIP (component deletions, coach files, two _layout.tsx edits) that
  must NOT be swept into commits.
- Lint + `npx jest` before shipping. tsc has ~120 pre-existing errors (mostly the
  untyped Supabase client) - the app runs fine; just don't ADD new ones.

## Current state (workout flow is heavily polished)
Shipped this session, all merged to `main` (PRs #52-72):
- Data integrity: session duration cap + stale-resume prompt; history grouped by
  month; Workouts tab renders real schedule (then day labels removed per request).
- Logging: de-bloated exercise card; real drag-to-reorder (handle long-press) via
  `react-native-reorderable-list`; removed RIR + fake 3x12 defaults; autofill-from-
  previous chip; simple equipment glyph on exercise/program/history rows.
- Preview redesign (hero + icon-led stats + muscle "Targets" + pill CTA).
- FAB "Start Workout" opens a sheet listing ALL program workouts (any phase, any
  day) + Empty workout - replaced the dinky tab jump.
- Unified exercise picker to a single add-only screen; removed standalone Library row.
- Redesigned exercise history/PB sheet (PB row + bar sparkline, dropped chart-kit).
- Repo-wide em/en dash -> hyphen sweep.

Rejected by Troy (do not build): accent colour, set types, plate calculator, per-set
RPE column, custom hand-drawn equipment icons (#71 reverted in #72 - keep the simple
Ionicons/MaterialCommunityIcons glyph in `ExerciseGlyph.tsx`).

## Pending data tasks (Troy runs in Supabase SQL editor)
- `scripts/repair_workout_data.sql` - already run (fixed bad durations + phantom
  phase_workouts).
- Em/en dash cleanup of LIVE program/phase names (code is clean, data may not be).
  SQL: `UPDATE public.coaching_programs SET name = replace(replace(name,'—','-'),'–','-'), description = replace(replace(coalesce(description,''),'—','-'),'–','-') WHERE ...;`
  and same for `public.program_phases`. (Confirm whether Troy ran this.)

## Next up (Troy chose: polish other tabs)
Polish **Home (`index.tsx`), Calendar (`calendar.tsx`), Meals (`meals.tsx`)** -
they're theme-clean but need a visual/experiential pass for consistency with the
new Workouts patterns. **Waiting on Troy's screenshots** of those tabs + notes on
what feels off (the screenshot-feedback loop is how every good change landed; do
not redesign blind, he reacts strongly to "meh"). Optional proactive pass:
consistency of cards/section headers/spacing/icons across those tabs.

Other big rocks (not started):
- **Coach platform (E5)**: in-app program builder + "act as client" view to replace
  SQL assignment. Biggest strategic gap; v1 unlock.
- **Premium motion**: post-workout RPE/effort animation, completion celebration.
- **Type the Supabase client** with `<Database>` - BLOCKED until `types/database.ts`
  is regenerated from the live schema (`npx supabase gen types typescript
  --project-id yckodvjabgkemhddrzle > types/database.ts`); stale types currently
  cause ~37 false errors. Do not attempt before regen.

## Key files
- `src/context/ActiveWorkoutContext.tsx` - active workout state (reducer, draft
  persistence, rest timer, finishWorkout).
- `src/lib/sessionDate.ts` - session timestamp + duration cap (`MAX_SESSION_MS`).
- `app/(workout)/active.tsx` - active workout screen shell.
- `app/(workout)/program-detail.tsx` - workout preview.
- `app/(workout)/exercises.tsx` - the single exercise picker (add-only).
- `app/(workout)/history.tsx` - history (by month).
- `src/components/workout/` - DraggableExerciseList, ExerciseCardNew, SetRowNew,
  InlineRestTimer, StartWorkoutSheet, StaleWorkoutSheet, ExerciseHistorySheet,
  ExerciseGlyph, EndWorkoutSheet.
- `src/components/FloatingActionButton.tsx` - global FAB (quick-add + Start Workout sheet).
- `app/(app)/(tabs)/workout.tsx` - Workouts tab; `src/lib/scheduledWorkouts.ts` - schedule resolution.

## Run / verify
- Dev: `npm run start` (Expo). Lint: `npx eslint <files>`. Tests: `npx jest`.
- Supabase project ref: `yckodvjabgkemhddrzle`.
