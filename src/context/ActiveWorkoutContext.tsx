/**
 * ActiveWorkoutContext
 * Central state management for active workout sessions.
 * Replaces the 25+ useState calls in the old active.tsx monolith.
 * Uses useReducer for predictable state updates.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { Alert, AppState, DeviceEventEmitter } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { haptic, hapticPress, hapticSuccess, hapticCelebration } from "@/src/animations/feedback/haptics";
import { showToast } from "@/src/animations/celebrations";
import { invalidateAndNotify } from "@/lib/coachContextCache";
import { computeSessionTimestamps } from "@/src/lib/sessionDate";
import { StaleWorkoutSheet } from "@/src/components/workout/StaleWorkoutSheet";
// EffortLevel may be used later for RIR tracking per set

// =============================================================================
// TYPES
// =============================================================================

export type ActiveSet = {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
  isWarmup: boolean;
  isPR: boolean;
};

export type ActiveExercise = {
  id: string;
  exerciseId?: string;
  name: string;
  muscles: string[];
  sets: ActiveSet[];
  targetReps: string;
  targetRIR: number;
  notes: string;
  previousNotes?: string;
  groupId: string | null;
  orderIndex: number;
  isExpanded: boolean;
  restTimerSeconds: number;
};

export type RestTimerState = {
  active: boolean;
  afterExerciseId: string | null;
  /** Wallclock epoch (ms) when the timer expires. Survives backgrounding
   *  and app kill — derived `secondsLeft` is always recomputed from this. */
  endsAt: number | null;
  secondsLeft: number;
  defaultDuration: number;
};

export type SourceType = "empty" | "template" | "program" | "rerun";

export type ActiveWorkoutState = {
  /** False until startSession() is called (or a draft is rehydrated).
   *  All non-lifecycle reducer cases short-circuit when false so a stale
   *  provider tree can't be mutated by stray dispatches. */
  isActive: boolean;

  // Core
  title: string;
  sourceType: SourceType;
  sourceId?: string;
  /** Used by finishWorkout to backfill workouts to a chosen day. */
  sessionDate?: string;

  // Exercises
  exercises: ActiveExercise[];

  // Timer
  startTime: number; // Date.now() for serialization safety
  elapsedSeconds: number;

  // Rest timer
  restTimer: RestTimerState;

  // UI
  showCelebration: boolean;
  showPRCelebration: boolean;
  prData: { exercise: string; previousValue: string; newValue: string } | null;

  // User
  userId: string | null;

  // Anti-cheat: timestamps of set completions for pacing validation
  setCompletionTimestamps: number[];
};

// =============================================================================
// ACTIONS
// =============================================================================

export type SessionInit = {
  exercises: ActiveExercise[];
  title: string;
  sourceType: SourceType;
  sourceId?: string;
  sessionDate?: string;
  /** Optional: when rehydrating from a draft, restore the original wall time. */
  startTime?: number;
  /** Optional: when rehydrating, restore the rest timer state. */
  restTimer?: RestTimerState;
  /** Optional: when rehydrating, restore set-completion timestamps. */
  setCompletionTimestamps?: number[];
  userId?: string | null;
};

type Action =
  // Session lifecycle
  | { type: "START_SESSION"; payload: SessionInit }
  | { type: "END_SESSION" }
  // Exercise management
  | { type: "ADD_EXERCISE"; exercise: Omit<ActiveExercise, "orderIndex" | "id" | "isExpanded"> }
  | { type: "REMOVE_EXERCISE"; exerciseId: string }
  | { type: "SWAP_EXERCISE"; exerciseId: string; newExercise: { name: string; muscles: string[] } }
  | { type: "REORDER_EXERCISES"; fromIndex: number; toIndex: number }
  | { type: "TOGGLE_EXPAND"; exerciseId: string }
  | { type: "UPDATE_NOTES"; exerciseId: string; notes: string }
  // Superset
  | { type: "ADD_TO_SUPERSET"; exerciseId: string; groupId?: string }
  | { type: "REMOVE_FROM_SUPERSET"; exerciseId: string }
  // Set management
  | { type: "ADD_SET"; exerciseId: string }
  | { type: "REMOVE_SET"; exerciseId: string; setId: string }
  | { type: "UPDATE_SET"; exerciseId: string; setId: string; field: "weight" | "reps"; value: string }
  | { type: "TOGGLE_SET_COMPLETE"; exerciseId: string; setId: string }
  | { type: "TOGGLE_WARMUP"; exerciseId: string; setId: string }
  | { type: "MARK_SET_PR"; exerciseId: string; setId: string }
  // Rest timer
  | { type: "START_REST"; afterExerciseId: string; duration?: number }
  | { type: "TICK_REST" }
  | { type: "SKIP_REST" }
  | { type: "ADJUST_REST"; delta: number }
  // Timer
  | { type: "TICK_ELAPSED" }
  // Lifecycle
  | { type: "SET_USER_ID"; userId: string }
  | { type: "UPDATE_TITLE"; title: string }
  | { type: "SHOW_CELEBRATION"; show: boolean }
  | { type: "SHOW_PR_CELEBRATION"; show: boolean; data?: ActiveWorkoutState["prData"] }
  // Auto-advance: expand next exercise after current completes
  | { type: "AUTO_ADVANCE"; nextExerciseId: string };

// =============================================================================
// HELPERS
// =============================================================================

let setIdCounter = 0;
const generateSetId = () => `set-${Date.now()}-${++setIdCounter}`;

let exerciseIdCounter = 0;
const generateExerciseId = () => `ex-${Date.now()}-${++exerciseIdCounter}`;

const generateGroupId = () => `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const WORKOUT_DRAFT_KEY = "adpt:workout-draft";

type WorkoutDraft = Pick<
  ActiveWorkoutState,
  | "title"
  | "sourceType"
  | "sourceId"
  | "sessionDate"
  | "exercises"
  | "startTime"
  | "elapsedSeconds"
  | "restTimer"
  | "setCompletionTimestamps"
  | "userId"
>;

async function saveDraft(state: ActiveWorkoutState): Promise<void> {
  if (!state.isActive) return;
  try {
    const draft: WorkoutDraft = {
      title: state.title,
      sourceType: state.sourceType,
      sourceId: state.sourceId,
      sessionDate: state.sessionDate,
      exercises: state.exercises,
      startTime: state.startTime,
      elapsedSeconds: state.elapsedSeconds,
      restTimer: state.restTimer,
      setCompletionTimestamps: state.setCompletionTimestamps,
      userId: state.userId,
    };
    await AsyncStorage.setItem(WORKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Silent — don't crash a workout over a failed checkpoint
  }
}

async function clearDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WORKOUT_DRAFT_KEY);
  } catch {
    // Silent
  }
}

export async function loadDraft(): Promise<WorkoutDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(WORKOUT_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkoutDraft;
  } catch {
    await clearDraft();
    return null;
  }
}

const DEFAULT_REST_DURATION = 90;

/** A rehydrated draft older than this (or started on a prior calendar day)
 *  is "stale" — we ask the user what to do rather than silently resuming. */
const STALE_RESUME_MS = 6 * 60 * 60 * 1000; // 6 hours

function isDraftStale(startTime: number, now: number = Date.now()): boolean {
  if (now - startTime > STALE_RESUME_MS) return true;
  return new Date(startTime).toDateString() !== new Date(now).toDateString();
}

/** Friendly age label for the stale-workout prompt. */
export function staleStartedLabel(startTime: number, now: number = Date.now()): string {
  const startDay = new Date(startTime);
  startDay.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - startDay.getTime()) / 86_400_000);
  if (days <= 0) {
    const hrs = Math.floor((now - startTime) / 3_600_000);
    return hrs >= 1 ? `${hrs} hour${hrs === 1 ? "" : "s"} ago` : "earlier today";
  }
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function emptyState(): ActiveWorkoutState {
  return {
    isActive: false,
    title: "Workout",
    sourceType: "empty",
    sourceId: undefined,
    sessionDate: undefined,
    exercises: [],
    startTime: 0,
    elapsedSeconds: 0,
    restTimer: {
      active: false,
      afterExerciseId: null,
      endsAt: null,
      secondsLeft: 0,
      defaultDuration: DEFAULT_REST_DURATION,
    },
    showCelebration: false,
    showPRCelebration: false,
    prData: null,
    userId: null,
    setCompletionTimestamps: [],
  };
}

/** Recompute remaining seconds from wallclock `endsAt`. Idempotent. */
function recomputeRest(rest: RestTimerState, now: number = Date.now()): RestTimerState {
  if (!rest.active || rest.endsAt == null) return rest;
  const remaining = Math.max(0, Math.ceil((rest.endsAt - now) / 1000));
  if (remaining <= 0) {
    return { ...rest, active: false, afterExerciseId: null, endsAt: null, secondsLeft: 0 };
  }
  return { ...rest, secondsLeft: remaining };
}

// =============================================================================
// REDUCER
// =============================================================================

function workoutReducer(state: ActiveWorkoutState, action: Action): ActiveWorkoutState {
  // Lifecycle actions are always allowed (they manage the active flag itself).
  if (action.type === "START_SESSION") {
    const init = action.payload;
    const startTime = init.startTime ?? Date.now();
    const restTimer = recomputeRest(
      init.restTimer ?? {
        active: false,
        afterExerciseId: null,
        endsAt: null,
        secondsLeft: 0,
        defaultDuration: DEFAULT_REST_DURATION,
      }
    );
    return {
      isActive: true,
      title: init.title,
      sourceType: init.sourceType,
      sourceId: init.sourceId,
      sessionDate: init.sessionDate,
      exercises: init.exercises.map((ex, i) => ({ ...ex, orderIndex: i })),
      startTime,
      elapsedSeconds: Math.floor((Date.now() - startTime) / 1000),
      restTimer,
      showCelebration: false,
      showPRCelebration: false,
      prData: null,
      userId: init.userId ?? state.userId ?? null,
      setCompletionTimestamps: init.setCompletionTimestamps ?? [],
    };
  }
  if (action.type === "END_SESSION") {
    // Preserve userId so a new workout can start without re-fetching the user.
    return { ...emptyState(), userId: state.userId };
  }

  // Everything else requires an active session — defensively no-op when the
  // provider tree is mounted but no workout is running.
  if (!state.isActive) return state;

  switch (action.type) {
    case "ADD_EXERCISE": {
      const newExercise: ActiveExercise = {
        ...action.exercise,
        id: generateExerciseId(),
        orderIndex: state.exercises.length,
        isExpanded: state.exercises.length === 0, // expand first one
      };
      return { ...state, exercises: [...state.exercises, newExercise] };
    }

    case "REMOVE_EXERCISE": {
      const exercises = state.exercises
        .filter((ex) => ex.id !== action.exerciseId)
        .map((ex, i) => ({ ...ex, orderIndex: i }));
      // Clean up any superset groups that now have < 2 members
      return { ...state, exercises: cleanupSupersets(exercises) };
    }

    case "SWAP_EXERCISE": {
      return {
        ...state,
        exercises: state.exercises.map((ex) => {
          if (ex.id !== action.exerciseId) return ex;
          return {
            ...ex,
            name: action.newExercise.name,
            muscles: action.newExercise.muscles,
            sets: ex.sets.map((s) => ({ ...s, weight: "", reps: "", completed: false, isPR: false })),
            notes: "",
          };
        }),
      };
    }

    case "REORDER_EXERCISES": {
      const exercises = [...state.exercises];
      const [moved] = exercises.splice(action.fromIndex, 1);
      exercises.splice(action.toIndex, 0, moved);
      return {
        ...state,
        exercises: exercises.map((ex, i) => ({ ...ex, orderIndex: i })),
      };
    }

    case "TOGGLE_EXPAND": {
      return {
        ...state,
        exercises: state.exercises.map((ex) => ({
          ...ex,
          isExpanded: ex.id === action.exerciseId ? !ex.isExpanded : ex.isExpanded,
        })),
      };
    }

    case "UPDATE_NOTES": {
      return {
        ...state,
        exercises: state.exercises.map((ex) =>
          ex.id === action.exerciseId ? { ...ex, notes: action.notes } : ex
        ),
      };
    }

    // Superset
    case "ADD_TO_SUPERSET": {
      const groupId = action.groupId || generateGroupId();
      return {
        ...state,
        exercises: state.exercises.map((ex) =>
          ex.id === action.exerciseId ? { ...ex, groupId } : ex
        ),
      };
    }

    case "REMOVE_FROM_SUPERSET": {
      const exercises = state.exercises.map((ex) =>
        ex.id === action.exerciseId ? { ...ex, groupId: null } : ex
      );
      return { ...state, exercises: cleanupSupersets(exercises) };
    }

    // Set management
    case "ADD_SET": {
      return {
        ...state,
        exercises: state.exercises.map((ex) => {
          if (ex.id !== action.exerciseId) return ex;
          const newSet: ActiveSet = {
            id: generateSetId(),
            weight: "",
            reps: "",
            completed: false,
            isWarmup: false,
            isPR: false,
          };
          return { ...ex, sets: [...ex.sets, newSet] };
        }),
      };
    }

    case "REMOVE_SET": {
      return {
        ...state,
        exercises: state.exercises.map((ex) => {
          if (ex.id !== action.exerciseId) return ex;
          if (ex.sets.length <= 1) return ex;
          const target = ex.sets.find((s) => s.id === action.setId);
          if (!target || target.completed) return ex;
          return { ...ex, sets: ex.sets.filter((s) => s.id !== action.setId) };
        }),
      };
    }

    case "UPDATE_SET": {
      return {
        ...state,
        exercises: state.exercises.map((ex) => {
          if (ex.id !== action.exerciseId) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s) =>
              s.id === action.setId ? { ...s, [action.field]: action.value } : s
            ),
          };
        }),
      };
    }

    case "TOGGLE_SET_COMPLETE": {
      // Track completion timestamp for anti-cheat pacing validation
      const set = state.exercises
        .find((ex) => ex.id === action.exerciseId)
        ?.sets.find((s) => s.id === action.setId);
      const isCompleting = set && !set.completed;

      return {
        ...state,
        exercises: state.exercises.map((ex) => {
          if (ex.id !== action.exerciseId) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s) =>
              s.id === action.setId ? { ...s, completed: !s.completed } : s
            ),
          };
        }),
        setCompletionTimestamps: isCompleting
          ? [...state.setCompletionTimestamps, Date.now()]
          : state.setCompletionTimestamps,
      };
    }

    case "TOGGLE_WARMUP": {
      return {
        ...state,
        exercises: state.exercises.map((ex) => {
          if (ex.id !== action.exerciseId) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s) =>
              s.id === action.setId ? { ...s, isWarmup: !s.isWarmup } : s
            ),
          };
        }),
      };
    }

    case "MARK_SET_PR": {
      return {
        ...state,
        exercises: state.exercises.map((ex) => {
          if (ex.id !== action.exerciseId) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s) =>
              s.id === action.setId ? { ...s, isPR: true } : s
            ),
          };
        }),
      };
    }

    // Rest timer (wallclock-driven — survives backgrounding and app kill).
    case "START_REST": {
      const duration = action.duration ?? state.restTimer.defaultDuration;
      return {
        ...state,
        restTimer: {
          active: true,
          afterExerciseId: action.afterExerciseId,
          endsAt: Date.now() + duration * 1000,
          secondsLeft: duration,
          defaultDuration: state.restTimer.defaultDuration,
        },
      };
    }

    case "TICK_REST": {
      return { ...state, restTimer: recomputeRest(state.restTimer) };
    }

    case "SKIP_REST": {
      return {
        ...state,
        restTimer: {
          ...state.restTimer,
          active: false,
          afterExerciseId: null,
          endsAt: null,
          secondsLeft: 0,
        },
      };
    }

    case "ADJUST_REST": {
      if (!state.restTimer.active || state.restTimer.endsAt == null) return state;
      // Floor at "now" so -15 from a 5-second remainder doesn't go negative.
      const newEndsAt = Math.max(Date.now(), state.restTimer.endsAt + action.delta * 1000);
      return {
        ...state,
        restTimer: recomputeRest({ ...state.restTimer, endsAt: newEndsAt }),
      };
    }

    // Elapsed timer
    case "TICK_ELAPSED": {
      return { ...state, elapsedSeconds: Math.floor((Date.now() - state.startTime) / 1000) };
    }

    // Lifecycle
    case "SET_USER_ID":
      return { ...state, userId: action.userId };

    case "UPDATE_TITLE":
      return { ...state, title: action.title };

    case "SHOW_CELEBRATION":
      return { ...state, showCelebration: action.show };

    case "SHOW_PR_CELEBRATION":
      return {
        ...state,
        showPRCelebration: action.show,
        prData: action.data ?? state.prData,
      };

    case "AUTO_ADVANCE": {
      return {
        ...state,
        exercises: state.exercises.map((ex) => ({
          ...ex,
          isExpanded: ex.id === action.nextExerciseId ? true : ex.isExpanded,
        })),
      };
    }

    default:
      return state;
  }
}

// Clean up superset groups with < 2 members
function cleanupSupersets(exercises: ActiveExercise[]): ActiveExercise[] {
  const groupCounts = new Map<string, number>();
  for (const ex of exercises) {
    if (ex.groupId) {
      groupCounts.set(ex.groupId, (groupCounts.get(ex.groupId) || 0) + 1);
    }
  }
  return exercises.map((ex) => {
    if (ex.groupId && (groupCounts.get(ex.groupId) || 0) < 2) {
      return { ...ex, groupId: null };
    }
    return ex;
  });
}

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export type ActiveWorkoutActions = {
  // Session lifecycle
  startSession: (init: SessionInit) => void;
  // Exercises
  addExercise: (exercise: Omit<ActiveExercise, "orderIndex" | "id" | "isExpanded">) => void;
  removeExercise: (exerciseId: string) => void;
  swapExercise: (exerciseId: string, newExercise: { name: string; muscles: string[] }) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;
  toggleExpand: (exerciseId: string) => void;
  updateNotes: (exerciseId: string, notes: string) => void;
  // Superset
  addToSuperset: (exerciseId: string, groupId?: string) => void;
  removeFromSuperset: (exerciseId: string) => void;
  // Sets
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (exerciseId: string, setId: string, field: "weight" | "reps", value: string) => void;
  toggleSetComplete: (exerciseId: string, setId: string) => void;
  toggleWarmup: (exerciseId: string, setId: string) => void;
  // Rest timer
  startRestTimer: (afterExerciseId: string, duration?: number) => void;
  skipRestTimer: () => void;
  adjustRestTimer: (delta: number) => void;
  // Lifecycle
  finishWorkout: () => Promise<void>;
  discardWorkout: () => void;
  saveAsTemplate: (name: string) => Promise<void>;
  updateTitle: (title: string) => void;
};

export type ActiveWorkoutProgress = {
  totalSets: number;
  completedSets: number;
  percentage: number;
};

type ContextValue = {
  state: ActiveWorkoutState;
  actions: ActiveWorkoutActions;
  progress: ActiveWorkoutProgress;
  formatTime: (seconds: number) => string;
};

const ActiveWorkoutContext = createContext<ContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

type ProviderProps = {
  children: ReactNode;
};

/**
 * The provider is mounted at the app root so an active workout survives
 * navigation (swipe-out from the modal, tab switching). Sessions are
 * started explicitly via `actions.startSession(...)` from the workout
 * screen, and rehydrated from AsyncStorage on app launch if a draft
 * exists. The Hevy-style mini-bar reads `state.isActive` to render.
 */
export function ActiveWorkoutProvider({ children }: ProviderProps) {
  const [state, dispatch] = useReducer(workoutReducer, undefined, emptyState);

  // Always-current ref to state — used in setTimeout callbacks to avoid
  // stale closures when multiple sets complete in quick succession.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Get user ID on mount (kept available so a workout can be started
  // without re-fetching the auth user).
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) dispatch({ type: "SET_USER_ID", userId: user.id });
    };
    getUser();
  }, []);

  // Stale-draft prompt: set when a rehydrated session is too old to silently
  // resume (left running for hours, or started on a prior calendar day).
  const [staleStartTime, setStaleStartTime] = useState<number | null>(null);

  // Rehydrate from AsyncStorage exactly once on mount. If a draft exists
  // we resume the workout; otherwise the provider stays inactive. A stale
  // draft is resumed too (so nothing is lost) but flagged for the prompt.
  const rehydratedRef = useRef(false);
  useEffect(() => {
    if (rehydratedRef.current) return;
    rehydratedRef.current = true;
    let cancelled = false;
    (async () => {
      const draft = await loadDraft();
      if (cancelled || !draft) return;
      dispatch({
        type: "START_SESSION",
        payload: {
          exercises: draft.exercises,
          title: draft.title,
          sourceType: draft.sourceType,
          sourceId: draft.sourceId,
          sessionDate: draft.sessionDate,
          startTime: draft.startTime,
          restTimer: draft.restTimer,
          setCompletionTimestamps: draft.setCompletionTimestamps,
          userId: draft.userId,
        },
      });
      if (isDraftStale(draft.startTime)) setStaleStartTime(draft.startTime);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Elapsed timer — only ticks while a session is active.
  useEffect(() => {
    if (!state.isActive) return;
    const interval = setInterval(() => dispatch({ type: "TICK_ELAPSED" }), 1000);
    return () => clearInterval(interval);
  }, [state.isActive]);

  // Rest timer countdown
  useEffect(() => {
    if (!state.restTimer.active) return;
    const interval = setInterval(() => {
      dispatch({ type: "TICK_REST" });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.restTimer.active]);

  // Resync the wallclock rest timer when the app returns to the foreground —
  // intervals are paused while backgrounded, so the stored secondsLeft can
  // be stale by the time we wake up.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") dispatch({ type: "TICK_REST" });
    });
    return () => sub.remove();
  }, []);

  // Haptic when rest timer finishes
  const prevRestActive = useRef(state.restTimer.active);
  useEffect(() => {
    if (prevRestActive.current && !state.restTimer.active) {
      haptic("success");
      showToast({ type: "motivation" });
    }
    prevRestActive.current = state.restTimer.active;
  }, [state.restTimer.active]);

  // Haptic at 5 seconds remaining
  useEffect(() => {
    if (state.restTimer.active && state.restTimer.secondsLeft === 5) {
      haptic("light");
    }
  }, [state.restTimer.active, state.restTimer.secondsLeft]);

  // Debounced checkpoint to AsyncStorage on every state change.
  // 500ms debounce so the AsyncStorage queue doesn't thrash during typing,
  // but every meaningful pause (set completion, swap, add/delete) flushes
  // to disk — which is what protects against a hard app kill.
  useEffect(() => {
    if (!state.isActive) return;
    const t = setTimeout(() => saveDraft(state), 500);
    return () => clearTimeout(t);
  }, [state]);

  // Force-flush on background/inactive — the OS may kill us shortly after.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") saveDraft(state);
    });
    return () => sub.remove();
  }, [state]);

  // Listen for adds dispatched from the sibling exercises picker.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "workout:addExercise",
      (payload: { name: string; muscles?: string[] }) => {
        const seed = Date.now();
        dispatch({
          type: "ADD_EXERCISE",
          exercise: {
            name: payload.name,
            muscles: payload.muscles ?? [],
            sets: [
              { id: `set-add-${seed}-0`, weight: "", reps: "", completed: false, isWarmup: false, isPR: false },
              { id: `set-add-${seed}-1`, weight: "", reps: "", completed: false, isWarmup: false, isPR: false },
              { id: `set-add-${seed}-2`, weight: "", reps: "", completed: false, isWarmup: false, isPR: false },
            ],
            // Freestyle adds carry no coach prescription — leave reps/RIR
            // blank so the card shows just the set count, not a fake "8-12".
            targetReps: "",
            targetRIR: 0,
            notes: "",
            groupId: null,
            restTimerSeconds: 90,
          },
        });
      }
    );
    return () => sub.remove();
  }, []);

  // Progress
  const progress = useMemo<ActiveWorkoutProgress>(() => {
    const totalSets = state.exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => !s.isWarmup).length, 0);
    const completedSets = state.exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.completed && !s.isWarmup).length,
      0
    );
    return {
      totalSets,
      completedSets,
      percentage: totalSets > 0 ? completedSets / totalSets : 0,
    };
  }, [state.exercises]);

  // Format time helper
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const actions = useMemo<ActiveWorkoutActions>(() => ({
    startSession: (init) => {
      dispatch({ type: "START_SESSION", payload: init });
    },

    addExercise: (exercise) => {
      hapticPress();
      dispatch({ type: "ADD_EXERCISE", exercise });
    },

    removeExercise: (exerciseId) => {
      hapticPress();
      dispatch({ type: "REMOVE_EXERCISE", exerciseId });
    },

    swapExercise: (exerciseId, newExercise) => {
      dispatch({ type: "SWAP_EXERCISE", exerciseId, newExercise });
      showToast({ message: `Swapped to ${newExercise.name}`, type: "motivation" });
    },

    reorderExercises: (fromIndex, toIndex) => {
      hapticPress();
      dispatch({ type: "REORDER_EXERCISES", fromIndex, toIndex });
    },

    toggleExpand: (exerciseId) => {
      hapticPress();
      dispatch({ type: "TOGGLE_EXPAND", exerciseId });
    },

    updateNotes: (exerciseId, notes) => {
      dispatch({ type: "UPDATE_NOTES", exerciseId, notes });
    },

    addToSuperset: (exerciseId, groupId) => {
      hapticPress();
      dispatch({ type: "ADD_TO_SUPERSET", exerciseId, groupId });
    },

    removeFromSuperset: (exerciseId) => {
      hapticPress();
      dispatch({ type: "REMOVE_FROM_SUPERSET", exerciseId });
    },

    addSet: (exerciseId) => {
      hapticPress();
      dispatch({ type: "ADD_SET", exerciseId });
    },

    removeSet: (exerciseId, setId) => {
      hapticPress();
      dispatch({ type: "REMOVE_SET", exerciseId, setId });
    },

    updateSet: (exerciseId, setId, field, value) => {
      dispatch({ type: "UPDATE_SET", exerciseId, setId, field, value });
    },

    toggleSetComplete: (exerciseId, setId) => {
      const exercise = state.exercises.find((ex) => ex.id === exerciseId);
      const set = exercise?.sets.find((s) => s.id === setId);
      if (!set) return;

      if (set.completed) {
        // Uncomplete
        hapticPress();
        dispatch({ type: "TOGGLE_SET_COMPLETE", exerciseId, setId });
      } else {
        // Complete — require weight & reps
        if (!set.weight || !set.reps) {
          showToast({ message: "Enter weight & reps first", type: "motivation" });
          return;
        }
        hapticSuccess();
        dispatch({ type: "TOGGLE_SET_COMPLETE", exerciseId, setId });

        const messages = ["Nice!", "Strong!", "Solid!", "Keep it up!", "Crushed it!"];
        showToast({ message: messages[Math.floor(Math.random() * messages.length)], type: "setComplete" });

        // Check if exercise is now complete, auto-advance.
        // Use stateRef.current (not the closure's stale `state`) so rapid
        // multi-set completions always see the latest exercise/set state.
        setTimeout(() => {
          const current = stateRef.current;
          const currentExercise = current.exercises.find((ex) => ex.id === exerciseId);
          if (!currentExercise) return;

          // Include the set we just toggled (state may not have propagated yet
          // by the time this fires, so we optimistically count it as complete).
          const allComplete = currentExercise.sets.every((s) =>
            s.id === setId ? true : s.completed
          );

          if (allComplete) {
            const idx = current.exercises.findIndex((ex) => ex.id === exerciseId);
            const isLast = idx === current.exercises.length - 1;
            if (isLast) {
              hapticCelebration();
              dispatch({ type: "SHOW_CELEBRATION", show: true });
            } else {
              const nextId = current.exercises[idx + 1]?.id;
              if (nextId) dispatch({ type: "AUTO_ADVANCE", nextExerciseId: nextId });
            }
          } else if (!current.restTimer.active) {
            // Only start the rest timer if one isn't already counting down.
            // Completing multiple sets quickly would otherwise restart the
            // timer on each completion, which feels buggy. Honor the
            // exercise's prescribed rest (coach-set), not the generic default.
            dispatch({
              type: "START_REST",
              afterExerciseId: exerciseId,
              duration: currentExercise.restTimerSeconds,
            });
          }
        }, 800);
      }
    },

    toggleWarmup: (exerciseId, setId) => {
      hapticPress();
      dispatch({ type: "TOGGLE_WARMUP", exerciseId, setId });
    },

    startRestTimer: (afterExerciseId, duration) => {
      dispatch({ type: "START_REST", afterExerciseId, duration });
    },

    skipRestTimer: () => {
      hapticPress();
      dispatch({ type: "SKIP_REST" });
      showToast({ type: "motivation" });
    },

    adjustRestTimer: (delta) => {
      hapticPress();
      dispatch({ type: "ADJUST_REST", delta });
    },

    finishWorkout: async () => {
      dispatch({ type: "SHOW_CELEBRATION", show: false });

      // Resolve user fresh from auth as a fallback — `state.userId` can be
      // null if the provider's initial getUser() race lost to the user
      // starting a workout, or if the draft was hydrated before auth wired
      // up. Previously we'd silently tear down here, which made every End
      // tap look like a successful save while writing nothing to the DB.
      let userId = state.userId;
      if (!userId) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id ?? null;
          if (userId) dispatch({ type: "SET_USER_ID", userId });
        } catch {
          /* fall through to the throw below */
        }
      }
      if (!userId) {
        // No auth — surface a real error so the caller's catch fires.
        // We do NOT tear down state; the user can fix sign-in and retry.
        throw new Error(
          "Not signed in. Please re-open the app or sign in again before saving.",
        );
      }

      try {
        // 1. Create session — backfill to selected day if user logged for a past date
        const lastActivityAt = state.setCompletionTimestamps.length
          ? Math.max(...state.setCompletionTimestamps)
          : null;
        const { startedAt, endedAt } = computeSessionTimestamps({
          startTime: state.startTime,
          now: new Date(),
          sessionDate: state.sessionDate,
          lastActivityAt,
        });

        const { data: sessionData, error: sessionError } = await supabase
          .from("workout_sessions")
          .insert({
            user_id: userId,
            title: state.title,
            started_at: startedAt.toISOString(),
            ended_at: endedAt.toISOString(),
          })
          .select("id")
          .single();

        if (sessionError) throw sessionError;
        const sessionId = sessionData.id;

        // 2. Save exercises
        const exercisesToSave = state.exercises
          .map((exercise, i) => ({
            exercise,
            index: i,
            completedSets: exercise.sets.filter((s) => s.completed),
          }))
          .filter(({ completedSets }) => completedSets.length > 0);

        const exerciseInserts = exercisesToSave.map(({ exercise, index }) => ({
          session_id: sessionId,
          exercise_name: exercise.name,
          muscle_group: exercise.muscles[0] || null,
          order_index: index,
          notes: exercise.notes || null,
        }));

        const { data: exerciseRows, error: exerciseError } = await supabase
          .from("workout_exercises")
          .insert(exerciseInserts)
          .select("id");

        if (exerciseError || !exerciseRows) {
          await supabase.from("workout_sessions").delete().eq("id", sessionId);
          throw new Error("Failed to save exercises");
        }

        // 3. Save sets
        const allSets: {
          workout_exercise_id: string;
          set_number: number;
          weight_lbs: number | null;
          reps: number | null;
          rir: number | null;
          is_warmup: boolean;
          is_pr: boolean;
        }[] = [];

        exercisesToSave.forEach(({ exercise, completedSets }, idx) => {
          const dbExerciseId = exerciseRows[idx]?.id;
          if (!dbExerciseId) return;

          completedSets.forEach((set, setIndex) => {
            const weight = set.weight ? parseFloat(set.weight) : 0;
            const reps = set.reps ? parseInt(set.reps, 10) : 0;
            allSets.push({
              workout_exercise_id: dbExerciseId,
              set_number: setIndex + 1,
              weight_lbs: weight || null,
              reps: reps || null,
              rir: exercise.targetRIR,
              is_warmup: set.isWarmup,
              is_pr: set.isPR,
            });
          });
        });

        if (allSets.length > 0) {
          const { error: setsError } = await supabase.from("workout_sets").insert(allSets);
          if (setsError) {
            await supabase.from("workout_sessions").delete().eq("id", sessionId);
            throw new Error("Failed to save sets");
          }
        }

        // 4. Update streak — pass the session's actual date (not CURRENT_DATE)
        // so backfilled workouts don't get attributed to today.
        const workoutDate = `${startedAt.getFullYear()}-${String(
          startedAt.getMonth() + 1
        ).padStart(2, "0")}-${String(startedAt.getDate()).padStart(2, "0")}`;
        const { error: streakError } = await supabase.rpc("update_user_streak", {
          p_user_id: userId,
          p_workout_date: workoutDate,
        });
        if (streakError) console.error(streakError);

        // 5. Clear draft + tear down session — workout saved successfully
        await clearDraft();
        dispatch({ type: "END_SESSION" });

        // 6. Invalidate coach cache
        await invalidateAndNotify(userId, "workout_complete").catch(console.error);
      } catch (e) {
        console.error("Error saving workout:", e);
        const detail =
          (e as any)?.message ?? (typeof e === "string" ? e : "Unknown error");
        Alert.alert(
          "Couldn't save workout",
          `${detail}\n\nYour sets are still in this session — you can try ending again.`,
        );
        throw e; // Re-throw so caller knows it failed
      }

      // NOTE: Do NOT navigate here — caller handles navigation
      // after any post-save actions (XP award, save-as-template, etc.)
    },

    discardWorkout: () => {
      // Silent: clear state immediately. Callers (mini-bar trash button,
      // EndWorkoutSheet's empty-mode "Discard") are responsible for any
      // confirmation UI before invoking this — keeps the action layer
      // free of system Alert.alert chrome and lets each surface use
      // its own themed sheet.
      clearDraft();
      dispatch({ type: "END_SESSION" });
    },

    saveAsTemplate: async (name) => {
      if (!state.userId) return;

      const exercises = state.exercises.map((ex) => ({
        name: ex.name,
        sets: ex.sets.length,
        reps: ex.targetReps,
        rir: ex.targetRIR,
        notes: ex.notes || undefined,
        muscleGroup: ex.muscles[0] || undefined,
      }));

      const { error } = await supabase.from("workout_templates").insert({
        user_id: state.userId,
        name,
        exercises,
      });

      if (error) {
        console.error("Error saving template:", error);
        Alert.alert("Error", "Failed to save template.");
      } else {
        showToast({ message: "Template saved!", type: "motivation" });
      }
    },

    updateTitle: (title) => {
      dispatch({ type: "UPDATE_TITLE", title });
    },
  }), [state.exercises, state.userId, state.startTime, state.title, state.sessionDate, state.setCompletionTimestamps]);

  const value = useMemo<ContextValue>(
    () => ({ state, actions, progress, formatTime }),
    [state, actions, progress, formatTime]
  );

  const staleCompletedSets = useMemo(
    () =>
      state.exercises.reduce(
        (n, ex) => n + ex.sets.filter((s) => s.completed).length,
        0,
      ),
    [state.exercises],
  );

  return (
    <ActiveWorkoutContext.Provider value={value}>
      {children}
      <StaleWorkoutSheet
        visible={staleStartTime != null}
        startedLabel={staleStartTime != null ? staleStartedLabel(staleStartTime) : ""}
        title={state.title}
        completedSets={staleCompletedSets}
        onResume={() => setStaleStartTime(null)}
        onSave={() => {
          setStaleStartTime(null);
          actions.finishWorkout().catch(() => {});
        }}
        onDiscard={() => {
          setStaleStartTime(null);
          actions.discardWorkout();
        }}
      />
    </ActiveWorkoutContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Validate the current workout session for anti-cheat.
 * Call this before awarding XP to check for suspicious activity.
 */
export { validateSession, validateWeight, validatePRJump } from "@/lib/workout/validation";

export function useActiveWorkout(): ContextValue {
  const ctx = useContext(ActiveWorkoutContext);
  if (!ctx) {
    throw new Error("useActiveWorkout must be used within ActiveWorkoutProvider");
  }
  return ctx;
}

/** Safe version — returns null when outside the provider instead of throwing */
export function useActiveWorkoutSafe(): ContextValue | null {
  return useContext(ActiveWorkoutContext);
}
