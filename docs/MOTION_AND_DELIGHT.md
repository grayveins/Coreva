# Motion & Delight - ADPT's "wow" language - 2026-06-11

Troy's note: app is correct but "mid and boring," no wow factor. Needs pleasure,
animation, the UI elements that make consumer apps succeed. This doc sets the
motion language so delight is consistent and on-brand, then specs the first three
moments (teardown picks #3 RPE flame, #5 completion celebration, #6 preview).

## The core constraint that makes this work

ADPT is monochrome with NO accent colour (electric blue was rejected; confetti was
deliberately avoided in onboarding). So **motion + haptics + typography are the wow
lever, not colour.** A single warm tint is allowed ONLY where it's semantic (the
effort flame = heat). This is actually premium: Apple Fitness, Cal AI, Linear,
Things - their delight is motion and restraint, not colour and confetti.

## Principles (research-backed)

1. **Purpose or cut it.** Every animation does one of: give feedback, guide
   attention, or reward. Decorative motion is noise (and battery). Sources below.
2. **Fast.** Micro-interactions 200-300ms; the big payoff can breathe to ~600-900ms
   but never blocks the user (always skippable / auto-advances).
3. **Adaptive reward.** Small win = subtle nod; PR / streak milestone = bigger
   moment. Scale the celebration to the achievement.
4. **Haptics married to motion.** Every key beat has a paired haptic - the "phone
   high-fives you." Use the existing `haptics.ts` (selection ticks, success, the
   `hapticCelebration` triple-tap).
5. **Spring, not linear.** Use Reanimated springs (we have `animation.spring` tokens)
   for anything that should feel physical; `Easing.out` for count-ups.
6. **Count, don't cut.** Numbers count up (we have `CountUpText`), bars/rings draw in,
   lists stagger in (`StaggeredList`). Never hard-pop a final value.
7. **Restraint = premium.** One hero motion per moment. No competing animations.

## Reusable kit already in the repo (build on this, don't reinvent)

`react-native-reanimated` 4, `expo-haptics`, `lottie-react-native`, `react-native-svg`.
`src/animations/`: `CountUpText`, `AnimatedProgressRing`, `StaggeredList`,
`AnimatedCheckbox`, `Confetti` (use sparingly/never), `feedback/haptics`, spring
tokens in `theme.animation`.

---

## Moment specs

### #5 Completion celebration (FLAGSHIP - build first)
**Today:** finishing a workout shows a flat sheet - tap a feeling card -> a checkmark
*fades in* -> "Saved!" -> auto-dismiss. Zero payoff. This is the single flattest
high-emotion moment in the app.

**Elevate to:** a real payoff beat after the effort capture -
- A ring/arc **draws closed** (AnimatedProgressRing) as a satisfying "done" gesture.
- Hero stat **counts up**: total volume lifted (lbs), then sets, then PRs - staggered
  in one after another (CountUpText + StaggeredList), each with a soft selection tick.
- A warm crescendo haptic on the ring close (`hapticCelebration`).
- **Lifetime line** ("workout 27 done") for the streak/identity hit (Trainerize S12).
- Monochrome; the only warmth is a subtle glow if a PR was hit (adaptive reward).
- Auto-advances; "Done" to dismiss. No confetti.

### #3 RPE "growing flame" effort capture (build second)
**Today:** 4 static cards [Easy][Good][Hard][Pain].
**Elevate to:** a draggable vertical/arc gauge 1-10; as you raise effort a **flame/ember
grows** in scale + intensity, label cycles (Easy -> Moderate -> Hard -> All out),
selection-tick haptic per step. On-brand: monochrome flame, single warm ember only
near the top of the scale. Feeds the RIR/effort we already model. (Pain stays a
separate quick path.)

### #6 Workout preview parity (build third)
**Today:** functional preview.
**Elevate to:** est-time + equipment chips (we have `ExerciseGlyph`), exercise
thumbnails, instructions, and a confident "Start" with a spring press + entrance
stagger of the exercise list. The pre-workout hype moment.

---

## Validation
Motion can't be screenshot-checked. Each moment ships behind the existing flow; Troy
screen-records / runs it and reacts, we iterate. Start with #5, lock the feel, reuse
that motion language for #3 and #6.

## Sources
- 5 Micro-Interaction Rules 2026 - https://dev.to/devin-rosario/5-micro-interaction-design-rules-for-apps-in-2026-48nb
- Motion & Micro-Interactions, what users expect 2026 - https://www.techqware.com/blog/motion-design-micro-interactions-what-users-expect
- 12 Micro-animation examples 2026 - https://bricxlabs.com/blogs/micro-interactions-2025-examples
- Mobile app animation patterns - https://www.svgator.com/blog/mobile-apps-animation-examples/
