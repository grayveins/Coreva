/**
 * ExerciseInfo
 * 
 * Expandable exercise info card showing:
 * - Form cues / tips
 * - Target muscles with body visualization
 * - YouTube demo video
 * - Common mistakes to avoid
 */

import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/context/ThemeContext";
import { hapticPress } from "@/src/animations/feedback/haptics";
import { MuscleGroupDisplay } from "@/src/components/MuscleImage";
import { defaultExercises, type ExerciseDemo } from "@/lib/exercises";

// Exercise data - beginner-friendly instructions
const EXERCISE_DATA: Record<string, ExerciseDetails> = {
  // === CHEST ===
  "Bench Press": {
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Triceps", "Shoulders"],
    formCues: [
      "Squeeze shoulder blades together",
      "Grip bar just wider than shoulders",
      "Lower bar to mid-chest slowly",
      "Push feet into floor as you press up",
    ],
    commonMistakes: [
      "Elbows flaring out too wide",
      "Bouncing bar off chest",
      "Butt lifting off the bench",
    ],
    tip: "Push yourself into the bench, not just the bar up.",
  },
  "Incline Bench Press": {
    primaryMuscles: ["Upper Chest"],
    secondaryMuscles: ["Shoulders", "Triceps"],
    formCues: [
      "Set bench to 30-45 degrees",
      "Squeeze shoulder blades together",
      "Lower bar to upper chest",
      "Press straight up over shoulders",
    ],
    commonMistakes: [
      "Bench angle too steep",
      "Flaring elbows out wide",
      "Arching back too much",
    ],
    tip: "Keep your chest up and proud throughout the lift.",
  },
  "Dumbbell Bench Press": {
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Triceps", "Shoulders"],
    formCues: [
      "Start with dumbbells at chest level",
      "Press up and slightly together",
      "Keep wrists straight",
      "Lower with control",
    ],
    commonMistakes: [
      "Dumbbells drifting too wide",
      "Dropping too fast",
      "Not going deep enough",
    ],
    tip: "Imagine hugging a big tree as you press.",
  },
  "Incline DB Press": {
    primaryMuscles: ["Upper Chest"],
    secondaryMuscles: ["Shoulders", "Triceps"],
    formCues: [
      "Set bench to 30-45 degrees",
      "Press dumbbells up and together",
      "Lower to chest level slowly",
      "Keep core tight",
    ],
    commonMistakes: [
      "Going too heavy too soon",
      "Bench angle too steep",
      "Elbows dropping below chest",
    ],
    tip: "Focus on squeezing your chest at the top.",
  },
  "Push-Up": {
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Triceps", "Core"],
    formCues: [
      "Hands just wider than shoulders",
      "Body in a straight line",
      "Lower chest to floor",
      "Push up until arms are straight",
    ],
    commonMistakes: [
      "Hips sagging down",
      "Butt sticking up",
      "Not going low enough",
    ],
    tip: "Keep your body stiff like a plank the whole time.",
  },
  "Chest Fly": {
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Shoulders"],
    formCues: [
      "Slight bend in elbows",
      "Lower arms out to sides slowly",
      "Stop when you feel a stretch",
      "Squeeze chest to bring arms together",
    ],
    commonMistakes: [
      "Arms too straight",
      "Going too heavy",
      "Rushing the movement",
    ],
    tip: "Think of hugging someone with slightly bent arms.",
  },

  // === BACK ===
  "Barbell Rows": {
    primaryMuscles: ["Back"],
    secondaryMuscles: ["Biceps", "Rear Delts"],
    formCues: [
      "Bend over until back is nearly flat",
      "Pull bar to belly button",
      "Squeeze shoulder blades together",
      "Lower with control",
    ],
    commonMistakes: [
      "Standing too upright",
      "Using momentum to swing",
      "Not squeezing at the top",
    ],
    tip: "Pull with your elbows, not your hands.",
  },
  "Pull-ups": {
    primaryMuscles: ["Back"],
    secondaryMuscles: ["Biceps", "Core"],
    formCues: [
      "Grip bar shoulder-width apart",
      "Pull chest toward the bar",
      "Lower all the way down",
      "Keep core tight",
    ],
    commonMistakes: [
      "Swinging or kipping",
      "Not going all the way down",
      "Shrugging shoulders up",
    ],
    tip: "Think about pulling your elbows to your back pockets.",
  },
  "Lat Pulldown": {
    primaryMuscles: ["Back"],
    secondaryMuscles: ["Biceps"],
    formCues: [
      "Grip bar wider than shoulders",
      "Pull bar to upper chest",
      "Lean back slightly",
      "Squeeze shoulder blades down",
    ],
    commonMistakes: [
      "Pulling bar behind head",
      "Leaning back too far",
      "Using momentum",
    ],
    tip: "Pretend you're bending the bar across your chest.",
  },
  "Seated Row": {
    primaryMuscles: ["Back"],
    secondaryMuscles: ["Biceps", "Rear Delts"],
    formCues: [
      "Sit tall with chest up",
      "Pull handles to lower chest",
      "Squeeze shoulder blades together",
      "Return slowly with control",
    ],
    commonMistakes: [
      "Rounding your back",
      "Leaning too far back",
      "Pulling with just arms",
    ],
    tip: "Lead with your elbows and squeeze your back.",
  },

  // === SHOULDERS ===
  "Overhead Press": {
    primaryMuscles: ["Shoulders"],
    secondaryMuscles: ["Triceps", "Core"],
    formCues: [
      "Grip bar just outside shoulders",
      "Tighten core and glutes",
      "Press bar straight up",
      "Lock out arms at the top",
    ],
    commonMistakes: [
      "Arching back too much",
      "Pressing bar forward",
      "Not locking out fully",
    ],
    tip: "Tuck your chin to let the bar pass, then push head through.",
  },
  "Dumbbell Shoulder Press": {
    primaryMuscles: ["Shoulders"],
    secondaryMuscles: ["Triceps"],
    formCues: [
      "Hold dumbbells at shoulder height",
      "Press straight up",
      "Lower with control",
      "Keep core tight",
    ],
    commonMistakes: [
      "Arching lower back",
      "Pressing forward instead of up",
      "Going too heavy",
    ],
    tip: "Imagine pushing the ceiling away from you.",
  },
  "Lateral Raises": {
    primaryMuscles: ["Side Delts"],
    secondaryMuscles: ["Traps"],
    formCues: [
      "Slight bend in elbows",
      "Raise arms out to sides",
      "Stop at shoulder height",
      "Lower slowly",
    ],
    commonMistakes: [
      "Swinging the weights up",
      "Going above shoulder height",
      "Shrugging shoulders",
    ],
    tip: "Lead with your elbows, not your hands.",
  },
  "Rear Delt Fly": {
    primaryMuscles: ["Rear Delts"],
    secondaryMuscles: ["Traps", "Rhomboids"],
    formCues: [
      "Bend over or use machine",
      "Arms slightly bent",
      "Raise arms out to sides",
      "Squeeze at the top",
    ],
    commonMistakes: [
      "Using too much weight",
      "Straightening arms fully",
      "Moving too fast",
    ],
    tip: "Think of opening your arms like spreading wings.",
  },
  "Face Pulls": {
    primaryMuscles: ["Rear Delts"],
    secondaryMuscles: ["Traps", "Rotator Cuff"],
    formCues: [
      "Use rope attachment at face height",
      "Pull toward your face",
      "Spread rope apart at the end",
      "Squeeze shoulder blades",
    ],
    commonMistakes: [
      "Pulling too low",
      "Using too much weight",
      "Not squeezing at the end",
    ],
    tip: "End with thumbs pointing behind you.",
  },

  // === ARMS ===
  "Bicep Curls": {
    primaryMuscles: ["Biceps"],
    secondaryMuscles: ["Forearms"],
    formCues: [
      "Keep elbows at your sides",
      "Curl weight up slowly",
      "Squeeze at the top",
      "Lower with control",
    ],
    commonMistakes: [
      "Swinging your body",
      "Elbows drifting forward",
      "Going too fast",
    ],
    tip: "Pretend your elbows are glued to your ribs.",
  },
  "Hammer Curl": {
    primaryMuscles: ["Biceps"],
    secondaryMuscles: ["Forearms"],
    formCues: [
      "Hold dumbbells with thumbs up",
      "Keep elbows pinned to sides",
      "Curl up to shoulder",
      "Lower slowly",
    ],
    commonMistakes: [
      "Swinging the weights",
      "Rotating wrists during curl",
      "Going too heavy",
    ],
    tip: "Keep the thumbs-up grip the entire time.",
  },
  "Tricep Pushdowns": {
    primaryMuscles: ["Triceps"],
    secondaryMuscles: [],
    formCues: [
      "Pin elbows to your sides",
      "Push handles down until arms straight",
      "Squeeze triceps at bottom",
      "Control the way back up",
    ],
    commonMistakes: [
      "Elbows moving forward",
      "Leaning into the weight",
      "Not fully extending",
    ],
    tip: "Only your forearms should move - elbows stay put.",
  },
  "Tricep Dip": {
    primaryMuscles: ["Triceps"],
    secondaryMuscles: ["Chest", "Shoulders"],
    formCues: [
      "Grip bars or bench firmly",
      "Lower until elbows at 90 degrees",
      "Press up until arms straight",
      "Keep body upright for triceps focus",
    ],
    commonMistakes: [
      "Going too low",
      "Shoulders shrugging up",
      "Swinging legs",
    ],
    tip: "Stay upright to target triceps more than chest.",
  },

  // === LEGS ===
  "Squat": {
    primaryMuscles: ["Quads"],
    secondaryMuscles: ["Glutes", "Hamstrings"],
    formCues: [
      "Feet shoulder-width or wider",
      "Brace your core tight",
      "Sit back and down",
      "Keep knees over toes",
    ],
    commonMistakes: [
      "Knees caving inward",
      "Heels coming off floor",
      "Rounding lower back",
    ],
    tip: "Imagine sitting back into a chair behind you.",
  },
  "Squats": {
    primaryMuscles: ["Quads"],
    secondaryMuscles: ["Glutes", "Hamstrings"],
    formCues: [
      "Feet shoulder-width or wider",
      "Brace your core tight",
      "Sit back and down",
      "Keep knees over toes",
    ],
    commonMistakes: [
      "Knees caving inward",
      "Heels coming off floor",
      "Rounding lower back",
    ],
    tip: "Imagine sitting back into a chair behind you.",
  },
  "Front Squat": {
    primaryMuscles: ["Quads"],
    secondaryMuscles: ["Core", "Glutes"],
    formCues: [
      "Bar rests on front shoulders",
      "Keep elbows high",
      "Stay upright as you descend",
      "Push knees out over toes",
    ],
    commonMistakes: [
      "Elbows dropping",
      "Leaning forward",
      "Not going deep enough",
    ],
    tip: "Keep your elbows pointing forward the whole time.",
  },
  "Leg Press": {
    primaryMuscles: ["Quads"],
    secondaryMuscles: ["Glutes", "Hamstrings"],
    formCues: [
      "Feet shoulder-width on platform",
      "Lower weight with control",
      "Stop before back rounds",
      "Push through full foot",
    ],
    commonMistakes: [
      "Letting lower back round",
      "Locking knees hard at top",
      "Feet too high or low",
    ],
    tip: "Keep your lower back pressed into the seat.",
  },
  "Romanian Deadlift": {
    primaryMuscles: ["Hamstrings"],
    secondaryMuscles: ["Glutes", "Lower Back"],
    formCues: [
      "Slight bend in knees",
      "Push hips back like closing car door",
      "Keep bar close to legs",
      "Feel stretch in hamstrings",
    ],
    commonMistakes: [
      "Bending knees too much",
      "Rounding lower back",
      "Bar drifting away from body",
    ],
    tip: "It's a hip hinge, not a squat - push your butt back.",
  },
  "Lunges": {
    primaryMuscles: ["Quads"],
    secondaryMuscles: ["Glutes", "Hamstrings"],
    formCues: [
      "Take a big step forward",
      "Lower back knee toward floor",
      "Keep front knee over ankle",
      "Push back to start",
    ],
    commonMistakes: [
      "Knee going past toes",
      "Leaning forward",
      "Step too short",
    ],
    tip: "Think of going straight down, not forward.",
  },
  "Leg Curls": {
    primaryMuscles: ["Hamstrings"],
    secondaryMuscles: [],
    formCues: [
      "Lie face down on machine",
      "Curl heels toward butt",
      "Squeeze at the top",
      "Lower slowly",
    ],
    commonMistakes: [
      "Lifting hips off pad",
      "Using momentum",
      "Not full range of motion",
    ],
    tip: "Keep your hips pressed down the entire time.",
  },
  "Leg Extension": {
    primaryMuscles: ["Quads"],
    secondaryMuscles: [],
    formCues: [
      "Sit back in seat",
      "Extend legs until straight",
      "Squeeze quads at top",
      "Lower with control",
    ],
    commonMistakes: [
      "Swinging legs up",
      "Not fully extending",
      "Going too heavy",
    ],
    tip: "Pause and squeeze your quads at the top.",
  },
  "Calf Raises": {
    primaryMuscles: ["Calves"],
    secondaryMuscles: [],
    formCues: [
      "Stand on balls of feet",
      "Rise up on toes",
      "Squeeze at the top",
      "Lower heels below platform",
    ],
    commonMistakes: [
      "Not going through full range",
      "Bouncing at bottom",
      "Bending knees",
    ],
    tip: "Go slow and feel the stretch at the bottom.",
  },

  // === CORE ===
  "Plank": {
    primaryMuscles: ["Core"],
    secondaryMuscles: ["Shoulders", "Glutes"],
    formCues: [
      "Forearms on floor, elbows under shoulders",
      "Body in straight line",
      "Squeeze glutes and abs",
      "Don't hold your breath",
    ],
    commonMistakes: [
      "Hips sagging down",
      "Butt sticking up",
      "Looking up instead of down",
    ],
    tip: "Imagine someone is about to poke your belly.",
  },
  "Hanging Leg Raise": {
    primaryMuscles: ["Core"],
    secondaryMuscles: ["Hip Flexors"],
    formCues: [
      "Hang from bar with straight arms",
      "Lift legs up in front",
      "Lower with control",
      "Avoid swinging",
    ],
    commonMistakes: [
      "Using momentum to swing",
      "Bending knees too much",
      "Not controlling the descent",
    ],
    tip: "Start with bent knees if straight legs are too hard.",
  },
  "Cable Crunch": {
    primaryMuscles: ["Core"],
    secondaryMuscles: [],
    formCues: [
      "Kneel facing cable machine",
      "Hold rope behind head",
      "Crunch down, curling spine",
      "Return slowly",
    ],
    commonMistakes: [
      "Pulling with arms",
      "Hinging at hips instead of curling",
      "Going too heavy",
    ],
    tip: "Focus on curling your ribs toward your hips.",
  },

  // === FULL BODY ===
  "Deadlift": {
    primaryMuscles: ["Back", "Glutes"],
    secondaryMuscles: ["Hamstrings", "Core"],
    formCues: [
      "Bar over middle of foot",
      "Bend down and grip bar",
      "Keep back flat, chest up",
      "Stand up by pushing floor away",
    ],
    commonMistakes: [
      "Rounding lower back",
      "Bar too far from body",
      "Jerking the weight up",
    ],
    tip: "Think of pushing the floor away, not pulling the bar up.",
  },
  "Clean and Press": {
    primaryMuscles: ["Full Body"],
    secondaryMuscles: ["Shoulders", "Legs", "Back"],
    formCues: [
      "Start with bar at thighs",
      "Explosively pull bar to shoulders",
      "Catch in front rack position",
      "Press overhead",
    ],
    commonMistakes: [
      "Using all arms, no legs",
      "Not catching bar properly",
      "Pressing before stable",
    ],
    tip: "Use your legs to help get the bar moving up.",
  },
  "Kettlebell Swing": {
    primaryMuscles: ["Glutes", "Hamstrings"],
    secondaryMuscles: ["Core", "Shoulders"],
    formCues: [
      "Feet shoulder-width apart",
      "Hinge at hips, not squat",
      "Snap hips forward to swing",
      "Arms stay relaxed",
    ],
    commonMistakes: [
      "Squatting instead of hinging",
      "Pulling with arms",
      "Rounding back",
    ],
    tip: "Your hips do the work - arms just hold on.",
  },

  // === CARDIO ===
  "Running": {
    primaryMuscles: ["Legs", "Heart"],
    secondaryMuscles: ["Core"],
    formCues: [
      "Land softly on midfoot",
      "Keep shoulders relaxed",
      "Arms swing naturally",
      "Breathe rhythmically",
    ],
    commonMistakes: [
      "Starting too fast",
      "Tensing up shoulders",
      "Overstriding",
    ],
    tip: "Start slower than you think - build up gradually.",
  },
  "Cycling": {
    primaryMuscles: ["Quads", "Heart"],
    secondaryMuscles: ["Hamstrings", "Calves"],
    formCues: [
      "Adjust seat to proper height",
      "Keep pedaling smooth",
      "Relax upper body",
      "Breathe steadily",
    ],
    commonMistakes: [
      "Seat too low or high",
      "Gripping bars too tight",
      "Mashing pedals",
    ],
    tip: "Your leg should be almost straight at the bottom of the pedal stroke.",
  },
  "Rowing": {
    primaryMuscles: ["Back", "Heart"],
    secondaryMuscles: ["Legs", "Arms"],
    formCues: [
      "Push with legs first",
      "Then pull with back and arms",
      "Return arms, then bend knees",
      "Keep core engaged",
    ],
    commonMistakes: [
      "Pulling before legs extend",
      "Hunching shoulders",
      "Going too fast",
    ],
    tip: "Order is: legs push, back pulls, arms pull. Reverse to return.",
  },
};

type ExerciseDetails = {
  primaryMuscles: string[];
  secondaryMuscles: string[];
  formCues: string[];
  commonMistakes: string[];
  tip: string;
};

type ExerciseInfoProps = {
  exerciseName: string;
  onClose?: () => void;
};

import { EXERCISE_BY_NAME } from "@/lib/workout/exercises/library";

/**
 * Get video info for an exercise - reads directly from the exercise library.
 * No more hardcoded name→ID map.
 */
function getExerciseVideo(exerciseName: string): { videoId: string; startTime: number } | null {
  const exercise = EXERCISE_BY_NAME[exerciseName];
  if (exercise?.youtubeVideoId) {
    return {
      videoId: exercise.youtubeVideoId,
      startTime: exercise.videoStartTime ?? 0,
    };
  }
  // Fallback: try the old defaultExercises demo lookup
  const nameNormalized = exerciseName.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const fallback = defaultExercises.find(
    e => e.id === nameNormalized || e.name.toLowerCase() === exerciseName.toLowerCase()
  );
  if (fallback?.demo?.youtubeVideoId) {
    return { videoId: fallback.demo.youtubeVideoId, startTime: fallback.demo.startTime ?? 0 };
  }
  return null;
}

function YouTubeVideoPlayer({
  videoId,
}: {
  videoId: string;
  startTime?: number;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.videoPlaceholder, { backgroundColor: colors.bgSecondary }]}>
      <Ionicons name="play-circle-outline" size={32} color={colors.textMuted} />
      <Text allowFontScaling={false} style={[styles.videoText, { color: colors.textMuted }]}>
        Video: {videoId}
      </Text>
    </View>
  );
}

export const ExerciseInfo: React.FC<ExerciseInfoProps> = ({ 
  exerciseName,
  onClose,
}) => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<"form" | "mistakes">("form");
  
  const details = EXERCISE_DATA[exerciseName];
  const video = getExerciseVideo(exerciseName);
  
  if (!details) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <Text allowFontScaling={false} style={[styles.title, { color: colors.text }]}>
            {exerciseName}
          </Text>
          {onClose && (
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        <Text allowFontScaling={false} style={[styles.emptyText, { color: colors.textMuted }]}>
          Exercise info coming soon
        </Text>
      </View>
    );
  }

  return (
    <Animated.View 
      entering={FadeIn.duration(200)}
      style={[styles.container, { backgroundColor: colors.card }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text allowFontScaling={false} style={[styles.title, { color: colors.text }]}>
            {exerciseName}
          </Text>
          <View style={styles.muscleRow}>
            {details.primaryMuscles.map((muscle, i) => (
              <View 
                key={muscle}
                style={[styles.muscleBadge, { backgroundColor: colors.primaryMuted }]}
              >
                <Text allowFontScaling={false} style={[styles.muscleBadgeText, { color: colors.primary }]}>
                  {muscle}
                </Text>
              </View>
            ))}
          </View>
        </View>
        {onClose && (
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Muscle Images */}
      <View style={styles.mediaSection}>

        {/* Muscle Image */}
        <View style={styles.muscleWrapper}>
          <MuscleGroupDisplay
            primaryMuscles={details.primaryMuscles}
            secondaryMuscles={details.secondaryMuscles}
            primarySize={120}
            secondarySize={50}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          onPress={() => {
            hapticPress();
            setActiveTab("form");
          }}
          style={[
            styles.tab,
            activeTab === "form" && [styles.tabActive, { borderBottomColor: colors.primary }],
          ]}
        >
          <Ionicons 
            name="checkmark-circle-outline" 
            size={16} 
            color={activeTab === "form" ? colors.primary : colors.textMuted} 
          />
          <Text 
            allowFontScaling={false} 
            style={[
              styles.tabText, 
              { color: activeTab === "form" ? colors.primary : colors.textMuted }
            ]}
          >
            Form Cues
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            hapticPress();
            setActiveTab("mistakes");
          }}
          style={[
            styles.tab,
            activeTab === "mistakes" && [styles.tabActive, { borderBottomColor: colors.primary }],
          ]}
        >
          <Ionicons 
            name="alert-circle-outline" 
            size={16} 
            color={activeTab === "mistakes" ? colors.primary : colors.textMuted} 
          />
          <Text 
            allowFontScaling={false} 
            style={[
              styles.tabText, 
              { color: activeTab === "mistakes" ? colors.primary : colors.textMuted }
            ]}
          >
            Avoid
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === "form" ? (
          <View style={styles.list}>
            {details.formCues.map((cue, i) => (
              <View key={i} style={styles.listItem}>
                <View style={[styles.listNumber, { backgroundColor: colors.primaryMuted }]}>
                  <Text allowFontScaling={false} style={[styles.listNumberText, { color: colors.primary }]}>
                    {i + 1}
                  </Text>
                </View>
                <Text allowFontScaling={false} style={[styles.listText, { color: colors.text }]}>
                  {cue}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {details.commonMistakes.map((mistake, i) => (
              <View key={i} style={styles.listItem}>
                <View style={[styles.listNumber, { backgroundColor: colors.errorMuted }]}>
                  <Ionicons name="close" size={12} color={colors.error} />
                </View>
                <Text allowFontScaling={false} style={[styles.listText, { color: colors.text }]}>
                  {mistake}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Pro Tip */}
      <View style={[styles.tipBox, { backgroundColor: colors.primaryMuted }]}>
        <Ionicons name="bulb" size={18} color={colors.primary} />
        <Text allowFontScaling={false} style={[styles.tipText, { color: colors.primary }]}>
          {details.tip}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  muscleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  muscleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  muscleBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  closeButton: {
    padding: 4,
  },
  // Video & Muscle Layout
  mediaSection: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  videoWrapper: {
    flex: 1,
  },
  muscleWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  videoContainer: {
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
  },
  videoLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    borderRadius: 12,
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  videoPlaceholder: {
    height: 160,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  videoText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  content: {
    marginBottom: 12,
  },
  list: {
    gap: 10,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  listNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  listNumberText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  listText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 20,
  },
});

export default ExerciseInfo;
