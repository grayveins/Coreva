import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";

export default function HomeScreen() {
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const calories = 1021;
  const goal = 2700;
  const percent = (calories / goal) * 100;

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("No user found:", userError);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfileName(data?.name || "User");
      }

      setLoading(false);
    };

    fetchUserProfile();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <Ionicons name="person-circle-outline" size={36} color={colors.accent} />
          <Text style={styles.greeting}>Hi, {profileName}</Text>
        </View>

        {/* Food Log Section */}
        <Text style={styles.sectionTitle}>Food Log</Text>
        <View style={styles.foodCard}>
          <View style={styles.ringContainer}>
            <AnimatedCircularProgress
              size={120}
              width={10}
              fill={percent}
              tintColor={colors.accent}
              backgroundColor="#2A2A2A"
              rotation={0}
              lineCap="round"
            >
              {() => (
                <View style={{ alignItems: "center" }}>
                  <Text style={styles.kcalText}>{calories}</Text>
                  <Text style={styles.kcalGoal}>/{goal} kcal</Text>
                  <Text style={styles.remainingText}>
                    {goal - calories} Remaining
                  </Text>
                </View>
              )}
            </AnimatedCircularProgress>
          </View>

          <View style={styles.macroInfo}>
            <MacroBar label="Protein" current={202} goal={229} color="#4DA3FF" />
            <MacroBar label="Carb" current={202} goal={229} color="#B44DFF" />
            <MacroBar label="Fat" current={202} goal={229} color="#FFD24D" />
          </View>
        </View>

        {/* Workouts Section */}
        <Text style={styles.sectionTitle}>Today’s Workouts</Text>
        <View style={styles.workoutCard}>
          <Text style={styles.workoutHeader}>Full Body Workout</Text>
          <View style={styles.workoutTags}>
            <Tag text="Back" />
            <Tag text="Chest" />
            <Tag text="Arms" />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <WorkoutBox title="Barbell Bent Over Row" sets="3 Sets" />
            <WorkoutBox title="Triceps Rope Pressdown" sets="3 Sets" />
            <WorkoutBox title="Shoulder Press" sets="3 Sets" />
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

// --- Subcomponents --- //

const MacroBar = ({ label, current, goal, color }: any) => {
  const width = (current / goal) * 100;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={styles.macroRow}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroGoal}>
          {current}/{goal}g Goal
        </Text>
      </View>
      <View style={styles.macroBarBg}>
        <View style={[styles.macroBarFill, { width: `${width}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const Tag = ({ text }: any) => (
  <View style={styles.tag}>
    <Text style={styles.tagText}>{text}</Text>
  </View>
);

const WorkoutBox = ({ title, sets }: any) => (
  <View style={styles.workoutBox}>
    <Text style={styles.workoutName}>{title}</Text>
    <Text style={styles.workoutSets}>{sets}</Text>
  </View>
);

// --- Styles --- //

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 80,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "700",
    marginLeft: 6,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 16,
  },
  foodCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ringContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  kcalText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  kcalGoal: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  remainingText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  macroInfo: {
    flex: 1,
    marginLeft: 16,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroLabel: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  macroGoal: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  macroBarBg: {
    height: 6,
    backgroundColor: "#2A2A2A",
    borderRadius: 6,
    marginTop: 4,
  },
  macroBarFill: {
    height: 6,
    borderRadius: 6,
  },
  workoutCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  workoutHeader: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  workoutTags: {
    flexDirection: "row",
    marginBottom: 12,
  },
  tag: {
    backgroundColor: "#2A2A2A",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginRight: 8,
  },
  tagText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  workoutBox: {
    backgroundColor: "#2A2A2A",
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    width: 150,
  },
  workoutName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  workoutSets: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});
