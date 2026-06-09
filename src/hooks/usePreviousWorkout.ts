/**
 * usePreviousWorkout Hook
 * 
 * Fetches the most recent workout data for exercises.
 * Returns weight/reps from the last time user did each exercise.
 * Used to pre-fill suggested weights and show "PREVIOUS" column.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type PreviousSet = {
  weight: number;
  reps: number;
  setNumber: number;
};

export type PreviousExercise = {
  exerciseName: string;
  sets: PreviousSet[];
  date: string;
};

type PreviousWorkoutMap = Map<string, PreviousExercise>;

export function usePreviousWorkout(userId: string | null, exerciseNames: string[]) {
  const [previousData, setPreviousData] = useState<PreviousWorkoutMap>(new Map());
  const [loading, setLoading] = useState(true);

  // Stable string key to avoid array identity issues in dep array
  const exerciseNamesKey = exerciseNames.join(",");

  // Fetch previous workout data for specified exercises
  const fetchPreviousData = useCallback(async () => {
    if (!userId || exerciseNames.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // PostgREST refuses ".order()" through deeply nested foreign tables -
      // it errors with "failed to parse order". Fetch unordered and pick
      // the most-recent session per exercise client-side.
      const { data, error } = await supabase
        .from("workout_sets")
        .select(`
          weight_lbs,
          reps,
          set_number,
          workout_exercises!inner(
            exercise_name,
            session_id,
            workout_sessions!inner(
              user_id,
              started_at
            )
          )
        `)
        .eq("workout_exercises.workout_sessions.user_id", userId)
        .in("workout_exercises.exercise_name", exerciseNames)
        .eq("is_warmup", false);

      if (error) {
        console.error("Error fetching previous workout data:", error);
        setLoading(false);
        return;
      }

      // Process data into map grouped by exercise name
      // Only keep the most recent session for each exercise
      const exerciseMap = new Map<string, { 
        sets: PreviousSet[]; 
        date: string; 
        sessionId: string;
      }>();

      data?.forEach((set: any) => {
        const exerciseName = set.workout_exercises?.exercise_name;
        const sessionId = set.workout_exercises?.session_id;
        const date = set.workout_exercises?.workout_sessions?.started_at;
        
        if (!exerciseName || !sessionId) return;
        
        const existing = exerciseMap.get(exerciseName);
        
        // Only keep data from the most recent session
        if (!existing || date > existing.date) {
          exerciseMap.set(exerciseName, {
            sets: [{
              weight: set.weight_lbs || 0,
              reps: set.reps || 0,
              setNumber: set.set_number || 1,
            }],
            date,
            sessionId,
          });
        } else if (existing.sessionId === sessionId) {
          // Same session, add set
          existing.sets.push({
            weight: set.weight_lbs || 0,
            reps: set.reps || 0,
            setNumber: set.set_number || 1,
          });
        }
      });

      // Convert to final map format
      const resultMap = new Map<string, PreviousExercise>();
      exerciseMap.forEach((value, key) => {
        // Sort sets by set number
        value.sets.sort((a, b) => a.setNumber - b.setNumber);
        
        resultMap.set(key, {
          exerciseName: key,
          sets: value.sets,
          date: value.date,
        });
      });

      setPreviousData(resultMap);
    } catch (error) {
      console.error("Error fetching previous workout:", error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, exerciseNamesKey]);

  useEffect(() => {
    fetchPreviousData();
  }, [fetchPreviousData]);

  // Get previous data for a specific exercise
  const getPreviousExercise = useCallback(
    (exerciseName: string): PreviousExercise | null => {
      return previousData.get(exerciseName) || null;
    },
    [previousData]
  );

  // Get previous set data for a specific exercise and set number
  const getPreviousSet = useCallback(
    (exerciseName: string, setNumber: number): PreviousSet | null => {
      const exercise = previousData.get(exerciseName);
      if (!exercise) return null;
      
      // Return the matching set or the last set if requested set doesn't exist
      const matchingSet = exercise.sets.find(s => s.setNumber === setNumber);
      if (matchingSet) return matchingSet;
      
      // Fall back to last set (for additional sets beyond what was done before)
      return exercise.sets[exercise.sets.length - 1] || null;
    },
    [previousData]
  );

  // Get suggested weight for an exercise (average or last used)
  const getSuggestedWeight = useCallback(
    (exerciseName: string): number | null => {
      const exercise = previousData.get(exerciseName);
      if (!exercise || exercise.sets.length === 0) return null;
      
      // Return the weight from the first working set (typically the heaviest)
      return exercise.sets[0].weight || null;
    },
    [previousData]
  );

  return {
    previousData,
    loading,
    getPreviousExercise,
    getPreviousSet,
    getSuggestedWeight,
    refresh: fetchPreviousData,
  };
}

export default usePreviousWorkout;
