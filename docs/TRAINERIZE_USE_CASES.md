# Trainerize Use Cases & Feature Research (web) - 2026-06-11

Complements `TRAINERIZE_TEARDOWN.md` (screenshot walk of Troy's live account) with
current web research on Trainerize's full feature surface, the coach workflows it
serves, and where the real pain is. Goal: know exactly what use cases we must cover
to replace it for Troy, and what to deliberately skip.

Sources at bottom.

---

## What Trainerize actually is (the job it does)

An all-in-one **coach business platform**: build + schedule + deliver training to
clients through a (white-labeled) client app, plus everything around it - habits,
nutrition, messaging, check-ins, scheduling, payments, community. 400k+ coaches,
1.6M clients. The product clients see is a fraction; coaches pay for the cockpit.

## The core coach use cases (daily-job-to-be-done)

1. **Program a client fast.** Drag-and-drop builder, exercise library w/ demo videos,
   supersets / circuits / AMRAP, **%1RM auto-progression**. 2026: AI builder (claims
   75% -> 80-90% build-time cut), can generate from the coach's *own* exercises.
2. **Reuse, don't rebuild - "Master Programs".** Phased master programs that bundle
   workouts + auto-messages + habits + cardio, assigned to many clients. **Master
   Habit Programs** too. This is the "5 min not 45" lever - reuse is the whole game.
3. **Manage the roster at a glance.** Client profiles: programs, last login,
   exercise/nutrition compliance, **auto-tags by compliance/activity**, badges.
   Weekly auto progress reports. Team/multi-location monitoring.
4. **Act as the client / full edit access.** Coach opens the client's exact app view
   with edit controls (log their sets, add workouts) - everything except chat.
   (Teardown S5 - flagged there as the single most important coach feature for us.)
5. **Stay accountable between sessions.** Habit coaching (streaks/badges), check-ins,
   progress photos, weigh-ins, wearable sync (Apple Health, Garmin, Fitbit, Withings).
6. **Communicate at scale.** 1:1 + group messaging, **voice messages**, in-app
   **video calls** (monetizable), and **auto-messages** (welcome / scheduled check-in
   / re-engagement) - "the difference between coaching 20 and 60."
7. **Sell & get paid.** Stripe: memberships, packages, subscriptions, trial products,
   paid video sessions, automated digital delivery. Trainerize.me lead-gen profile.
8. **Community / retention.** Groups, leaderboard + threshold Challenges, WOD blasts,
   high-fives. 2026 roadmap leans hard into coach-led + client-led challenges.
9. **Nutrition.** Smart + Flexible meal planners, macro tracking, photo/barcode meal
   logging, MyFitnessPal sync, nutrition habits.

## Where coaches actually hurt (our wedge)

- **"Powerful but tedious."** Building programs is slow/repetitive; the UI is dated
  and clunky; steep learning curve. Programming on a phone is painful (desktop-bound).
- **Add-ons stack fast** - nutrition + payments + business = $55-80/mo *on top*;
  Smart Meal Planner is a separate $20-45/mo; free tier is 1 client (a demo).
- **Per-client pricing punishes growth.**
- **Bolt-on nutrition**, no white-label meal-plan PDFs, 1,400-cal floor.
- Mediocre messaging; shallow reporting; post-ABC-acquisition bugs.

Our positioning (from STRATEGIC_ANALYSIS): **Trainerize capability at Cal-AI polish,
with the periodization engine doing 80% of programming so the coach curates.**

---

## Trainerize surface -> ADPT status (gap map)

| Trainerize capability | ADPT today | Gap / priority |
|---|---|---|
| Program builder (manual) | ✅ `(coach)/program-builder` (PR #76) | exercises are **free-text** |
| Exercise library + demo videos in builder | ❌ free-text names | **HIGH** - breaks history/PB match |
| Engine-assisted draft | ✅ `EngineDraftSheet` (our moat) | ahead of TZ here |
| %1RM auto-progression | ❌ | medium (engine could do it) |
| Supersets / circuits in builder | ❌ (logger has supersets) | medium |
| **Master / reusable programs** | ❌ per-client only | **HIGH** - the reuse lever |
| Roster w/ adherence + needs-attention | ✅ `(coach)/index` roster | auto-tags missing |
| Client detail (read view) | ❌ tap -> straight to builder | **HIGH** |
| **Act-as-client / coach edit** | ❌ | **HIGHEST** per teardown (blocked: needs client link) |
| Habits / streaks / badges | ✅ client-side | coach-assign UI thin |
| Check-in review queue | partial schema, no coach UI | medium |
| Messaging (1:1/group/voice/video) | conversations schema; AI chat | medium (Troy lukewarm on chat) |
| Auto-messages / automations | ❌ | later |
| Nutrition (macros, Health bridge) | ✅ Meals + HealthKit | ahead on ingest (no food DB to maintain) |
| Payments / SaaS seats | client RevenueCat only | later (coach_subscriptions) |
| Challenges / groups | hidden `social.tsx` | de-prioritized |

## Client-app parity items (the "beat the core" list, from teardown)

Independent of the coach link, so **buildable now**:
1. Logging set table `Set | Previous | Reps | Lbs` + auto-fill toggle (teardown S8).
2. Exercise detail: demo + numbered instructions + **"Personal Best To Beat" carousel**
   + full per-exercise history (S9).
3. RPE growing-flame post-workout gauge (S11).
4. Smart swap picker: similarity-ranked + muscle/equipment/movement filters (S13).
5. Completion celebration w/ lifetime count (S12).

## Recommended next sequence (unblocked first)

The empty-client-list bug blocks roster/act-as-client/client-detail testing (Troy
said skip for now), so lead with work that doesn't depend on a live client link:

1. **Exercise-library picker in the program builder** - replace free-text with the
   logger's exercise DB (sets `exercise_id`). Fixes history/PB matching, matches
   Trainerize's library-first builder. Highest-value *coach* item that's unblocked.
2. **Save-as / Master program (reusable template)** - the "5 min not 45" reuse lever.
3. **Exercise detail "Personal Best To Beat"** - client-side, high motivation, beats
   TZ's core. (Logging set-table is also here but touches the heavily-polished logger -
   screenshot-validate before changing.)

Skip for now (per Troy / blocked / low-fit): act-as-client (needs client link),
payments/seats, challenges, AI-chat investment.

---

## Sources
- Trainerize Features - https://www.trainerize.com/features/
- What is ABC Trainerize - https://www.trainerize.com/blog/what-is-abc-trainerize/
- 2026 Roadmap - https://www.trainerize.com/blog/abc-trainerize-2026-product-roadmap/
- April 2026 updates (Exercise Notes, AI builder) - https://www.trainerize.com/blog/new-abc-trainerize-updates-april-2026-coach-habit-grow/
- Master Habit Programs - https://www.trainerize.com/blog/trainerize-update-master-habit-programs/
- Review 2026 (pros/cons) - https://www.promealplan.com/en/blog/trainerize-review-2026
- PT Pioneer review - https://www.ptpioneer.com/personal-training/tools/trainerize-review/
