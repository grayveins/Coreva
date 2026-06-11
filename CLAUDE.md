# CLAUDE.md

ADPT: Expo / React Native (Expo Router) coaching app on Supabase. v1 = Trainerize
replacement for Troy's own coaching (Troy is coach #1).

**Read `docs/HANDOFF.md` first** for current state + what's next. See `AGENTS.md`
for full conventions, `docs/WORKOUT_UX_PLAN.md` for the plan.

## Non-negotiable rules
- **No em-dashes / en-dashes** (- / -) in code or copy - Troy hates AI-looking
  text. Plain hyphens / commas / restructure. Middot (·) is fine.
- **Monochrome only, NO accent colour** (electric blue was rejected). One black
  hero CTA per screen, light-grey (`colors.bgSecondary`) secondary cards. Always
  `useTheme()`, never hardcode colours.
- **Schema changes need a migration** in `supabase/migrations/`; never touch hosted
  Supabase directly; use generated `types/database.ts`.
- **Focused PRs < ~400 lines**, auto-merge (squash + delete branch). Commit ONLY
  your files - the working tree has unrelated uncommitted WIP; never sweep it in.
- Run `npx eslint <files>` + `npx jest` before shipping. Don't add new tsc errors
  (~120 pre-exist from the untyped Supabase client).

## Workflow
- Build on a branch, ship via `gh pr create` + `gh pr merge --squash --delete-branch`.
- Validate UI changes with Troy via screenshots (the feedback loop); don't redesign
  blind - he reacts strongly to anything "meh".
