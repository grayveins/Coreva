import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { authedFetch } from "../../../lib/api";
import { colors } from "../../../constants/Colors";

type MealLog = {
  id: number;
  name: string | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  eaten_at: string;
};

const GOAL_KCAL = 2700;

export default function FoodLog() {
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [mName, setMName] = useState("");
  const [mKcal, setMKcal] = useState("");
  const [mP, setMP] = useState("");
  const [mC, setMC] = useState("");
  const [mF, setMF] = useState("");
  const [savingManual, setSavingManual] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 4 }), // Thursday-centered like mockup
    [selectedDate]
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const loadLogs = useCallback(async () => {
    try {
      const res = await authedFetch("/meals/logs");
      const data = await res.json();
      if (Array.isArray(data)) setLogs(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const filteredLogs = useMemo(
    () => logs.filter((m) => isSameDay(parseISO(m.eaten_at), selectedDate)),
    [logs, selectedDate]
  );

  const totals = filteredLogs.reduce(
    (a, m) => ({
      kcal: a.kcal + (m.kcal || 0),
      p: a.p + (m.protein_g || 0),
      c: a.c + (m.carbs_g || 0),
      f: a.f + (m.fat_g || 0),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );

  const percent = Math.min(100, (totals.kcal / GOAL_KCAL) * 100);

  const submitManual = async () => {
    if (savingManual) return;
    setSavingManual(true);
    try {
      await authedFetch("/meals/logs", {
        method: "POST",
        body: JSON.stringify({
          name: mName.trim() || "Meal",
          kcal: Number(mKcal),
          protein_g: Number(mP),
          carbs_g: Number(mC),
          fat_g: Number(mF),
          eaten_at: selectedDate.toISOString(),
        }),
      });
      setShowManual(false);
      setMName("");
      setMKcal("");
      setMP("");
      setMC("");
      setMF("");
      await loadLogs();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingManual(false);
    }
  };

  const DayPill = ({ date }: { date: Date }) => {
    const selected = isSameDay(date, selectedDate);
    return (
      <TouchableOpacity
        onPress={() => setSelectedDate(date)}
        style={[
          styles.dayPill,
          selected && { backgroundColor: colors.accent, borderColor: colors.accent },
        ]}
      >
        <Text style={[styles.dayText, selected && { color: "#000" }]}>
          {format(date, "EEE")}
        </Text>
        <Text style={[styles.dayNum, selected && { color: "#000" }]}>
          {format(date, "d")}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Food Log</Text>
        <Text style={styles.month}>{format(selectedDate, "MMMM - yyyy")}</Text>
      </View>

      {/* Week selector */}
      <View style={styles.weekContainer}>
        {weekDays.map((d) => (
          <DayPill key={d.toISOString()} date={d} />
        ))}
      </View>

      {/* Calorie Ring */}
      <View style={styles.card}>
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <AnimatedCircularProgress
            size={160}
            width={10}
            fill={percent}
            tintColor={colors.accent}
            backgroundColor="#202020"
            rotation={0}
            lineCap="round"
          >
            {() => (
              <View style={{ alignItems: "center" }}>
                <Text style={styles.kcal}>{totals.kcal}</Text>
                <Text style={styles.subKcal}>/{GOAL_KCAL} kcal</Text>
                <Text style={styles.remaining}>
                  {GOAL_KCAL - totals.kcal} Remaining
                </Text>
              </View>
            )}
          </AnimatedCircularProgress>
        </View>

        <View style={{ marginTop: 20, width: "100%" }}>
          <View style={styles.macroRow}>
            <Text style={[styles.macroLabel, { color: "#4DA3FF" }]}>Protein</Text>
            <Text style={styles.macroGoal}>
              {totals.p}/200g Goal
            </Text>
          </View>
          <View style={styles.macroRow}>
            <Text style={[styles.macroLabel, { color: "#B44DFF" }]}>Carb</Text>
            <Text style={styles.macroGoal}>
              {totals.c}/200g Goal
            </Text>
          </View>
          <View style={styles.macroRow}>
            <Text style={[styles.macroLabel, { color: "#FFD24D" }]}>Fat</Text>
            <Text style={styles.macroGoal}>
              {totals.f}/200g Goal
            </Text>
          </View>
        </View>
      </View>

      {/* Meals section */}
      <View style={styles.mealsHeader}>
        <Text style={styles.mealsTitle}>Meals</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowManual(true)}
        >
          <Text style={styles.addText}>＋ Add Meal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ flexGrow: 1, padding: 20 }}
      >
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.plate}>🍽️</Text>
            <Text style={styles.emptyTitle}>Add your first meal</Text>
            <Text style={styles.emptySub}>
              Have a good rest, tell the user something to do on rest day
            </Text>
          </View>
        ) : (
          filteredLogs.map((m) => (
            <View key={m.id} style={styles.mealCard}>
              <Text style={styles.mealName}>{m.name}</Text>
              <Text style={styles.mealMeta}>
                {m.kcal} kcal • P:{m.protein_g}g C:{m.carbs_g}g F:{m.fat_g}g
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Manual Entry Modal */}
      <Modal visible={showManual} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Meal</Text>
              <Pressable onPress={() => setShowManual(false)}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            <TextInput placeholder="Meal Name" value={mName} onChangeText={setMName} style={styles.input} />
            <TextInput placeholder="Calories" keyboardType="numeric" value={mKcal} onChangeText={setMKcal} style={styles.input} />
            <TextInput placeholder="Protein (g)" keyboardType="numeric" value={mP} onChangeText={setMP} style={styles.input} />
            <TextInput placeholder="Carbs (g)" keyboardType="numeric" value={mC} onChangeText={setMC} style={styles.input} />
            <TextInput placeholder="Fat (g)" keyboardType="numeric" value={mF} onChangeText={setMF} style={styles.input} />

            <TouchableOpacity
              onPress={submitManual}
              disabled={savingManual}
              style={[styles.submitBtn, savingManual && { opacity: 0.7 }]}
            >
              {savingManual ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.submitText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0B0B0B",
  },
  header: {
    paddingTop: 60,
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  month: {
    color: "#AAA",
    marginTop: 6,
    fontSize: 13,
  },
  weekContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingHorizontal: 12,
  },
  dayPill: {
    width: 52,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    color: "#AAA",
    fontSize: 12,
    fontWeight: "700",
  },
  dayNum: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#121212",
    margin: 16,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
  },
  kcal: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  subKcal: {
    color: "#aaa",
    fontSize: 13,
  },
  remaining: {
    color: "#666",
    fontSize: 12,
    marginTop: 4,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 28,
  },
  macroLabel: {
    fontWeight: "700",
    fontSize: 13,
  },
  macroGoal: {
    color: "#AAA",
    fontSize: 12,
  },
  mealsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 12,
  },
  mealsTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  addBtn: {
    backgroundColor: "#BFFF00",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  addText: {
    color: "#000",
    fontWeight: "800",
  },
  emptyState: {
    marginTop: 30,
    alignItems: "center",
  },
  plate: {
    fontSize: 40,
  },
  emptyTitle: {
    color: "#BFFF00",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 10,
  },
  emptySub: {
    color: "#AAA",
    textAlign: "center",
    marginTop: 8,
    width: width * 0.8,
  },
  mealCard: {
    backgroundColor: "#121212",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  mealName: {
    color: "#fff",
    fontWeight: "800",
  },
  mealMeta: {
    color: "#999",
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#1A1A1A",
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },
  close: {
    color: "#AAA",
    fontSize: 18,
  },
  input: {
    backgroundColor: "#0A0A0A",
    color: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: "#BFFF00",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitText: {
    color: "#000",
    fontWeight: "800",
  },
});
