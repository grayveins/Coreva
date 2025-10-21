import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { authedFetch } from "../../../lib/api";

const colors = {
  bg: "#0B0B0B",
  card: "#121212",
  border: "#222",
  text: "#fff",
  sub: "#AAA",
  accent: "#B6F34D",
  danger: "#E53E3E",
};

type WorkoutLog = {
  id: number;
  date: string;
  exercise: string;
  sets: number;
  reps: number;
  weight: number;
  note?: string;
};

export default function WorkoutLogScreen() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"notes" | "summary" | "more">("notes");

  // Modals
  const [showSetDay, setShowSetDay] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modal selections
  const [selectedDayName, setSelectedDayName] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [openDayDropdown, setOpenDayDropdown] = useState(false);
  const [openWorkoutDropdown, setOpenWorkoutDropdown] = useState(false);

  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 4 }), // Thursday-centered
    [selectedDate]
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/workouts/logs");
      const data = await res.json();
      if (Array.isArray(data)) setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
    () => logs.filter((l) => isSameDay(parseISO(l.date), selectedDate)),
    [logs, selectedDate]
  );

  const isRestDay = filteredLogs.length === 0;

  const workouts = ["Full Body", "Push Day", "Pull Day", "Legs", "Cardio"];

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

  const deleteWorkout = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await authedFetch("/workouts/delete", { method: "POST" });
      setShowDelete(false);
      await loadLogs();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Workout Log</Text>
        <Text style={styles.month}>{format(selectedDate, "MMMM - yyyy")}</Text>
      </View>

      {/* Week selector */}
      <View style={styles.weekContainer}>
        {weekDays.map((d) => (
          <DayPill key={d.toISOString()} date={d} />
        ))}
      </View>

      {/* Body */}
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      ) : isRestDay ? (
        <View style={styles.restContainer}>
          <Ionicons name="bed-outline" size={48} color={colors.sub} style={{ marginBottom: 12 }} />
          <Text style={styles.restTitle}>Rest Day</Text>
          <Text style={styles.restSubtitle}>
            Enjoy your recovery — mobility, stretching, or a light walk helps!
          </Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        >
          {activeTab === "notes" &&
            filteredLogs.map((log) => (
              <View key={log.id} style={styles.logCard}>
                <Text style={styles.logTitle}>{log.exercise}</Text>
                <Text style={styles.logMeta}>
                  {log.sets} × {log.reps} • {log.weight} lbs
                </Text>
                {log.note && <Text style={styles.logNote}>{log.note}</Text>}
              </View>
            ))}

          {activeTab === "summary" && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Workout Summary</Text>
              {filteredLogs.map((log) => (
                <View key={log.id} style={styles.summaryItem}>
                  <Text style={styles.summaryExercise}>{log.exercise}</Text>
                  <Text style={styles.summaryStats}>
                    {log.sets} Sets • {log.reps} Reps • {log.weight} lbs
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity onPress={() => setShowSetDay(true)} style={styles.addButton}>
        <Ionicons name="add" size={28} color="#000" />
      </TouchableOpacity>

      {/* Bottom Inline Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => setActiveTab("notes")} style={styles.navItem}>
          <Ionicons
            name="document-text-outline"
            size={22}
            color={activeTab === "notes" ? colors.accent : colors.sub}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === "notes" && { color: colors.accent },
            ]}
          >
            Notes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTab("summary")} style={styles.navItem}>
          <Ionicons
            name="bar-chart-outline"
            size={22}
            color={activeTab === "summary" ? colors.accent : colors.sub}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === "summary" && { color: colors.accent },
            ]}
          >
            Summary
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTab("more")} style={styles.navItem}>
          <Ionicons
            name="ellipsis-horizontal-circle-outline"
            size={22}
            color={activeTab === "more" ? colors.accent : colors.sub}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === "more" && { color: colors.accent },
            ]}
          >
            More
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal: Set Workout Day */}
      <Modal visible={showSetDay} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Workout Day</Text>

            {/* Day Dropdown */}
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setOpenDayDropdown(!openDayDropdown)}
            >
              <Text style={styles.dropdownText}>
                {selectedDayName || "Select Day"}
              </Text>
              <Ionicons
                name={openDayDropdown ? "chevron-up" : "chevron-down"}
                color={colors.sub}
                size={18}
              />
            </TouchableOpacity>
            {openDayDropdown && (
              <View style={styles.dropdownList}>
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                  (day) => (
                    <TouchableOpacity
                      key={day}
                      onPress={() => {
                        setSelectedDayName(day);
                        setOpenDayDropdown(false);
                      }}
                      style={styles.dropdownItem}
                    >
                      <Text style={styles.dropdownItemText}>{day}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            )}

            {/* Workout Dropdown */}
            <TouchableOpacity
              style={[styles.dropdown, { marginTop: 10 }]}
              onPress={() => setOpenWorkoutDropdown(!openWorkoutDropdown)}
            >
              <Text style={styles.dropdownText}>
                {selectedWorkout || "Select Workout"}
              </Text>
              <Ionicons
                name={openWorkoutDropdown ? "chevron-up" : "chevron-down"}
                color={colors.sub}
                size={18}
              />
            </TouchableOpacity>
            {openWorkoutDropdown && (
              <View style={styles.dropdownList}>
                {workouts.map((w) => (
                  <TouchableOpacity
                    key={w}
                    onPress={() => {
                      setSelectedWorkout(w);
                      setOpenWorkoutDropdown(false);
                    }}
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.dropdownItemText}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowSetDay(false)}
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
              >
                <Text style={{ color: colors.sub, fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowSetDay(false)}
                style={[styles.modalBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={{ color: "#000", fontWeight: "700" }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Delete Item */}
      <Modal visible={showDelete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Item</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete this item? This action cannot be undone.
            </Text>
            <TouchableOpacity
              onPress={deleteWorkout}
              style={[styles.modalBtn, { backgroundColor: colors.danger, marginBottom: 10 }]}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "700" }}>Delete</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDelete(false)}
              style={[styles.modalBtn, { backgroundColor: colors.border }]}
            >
              <Text style={{ color: colors.sub, fontWeight: "700" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 60, alignItems: "center" },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  month: { color: colors.sub, marginTop: 6, fontSize: 13 },
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
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { color: colors.sub, fontSize: 12, fontWeight: "700" },
  dayNum: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 4 },
  restContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  restTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  restSubtitle: { color: colors.sub, textAlign: "center", marginTop: 6, fontSize: 14 },
  logCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  logTitle: { color: colors.text, fontWeight: "700", fontSize: 16 },
  logMeta: { color: colors.sub, fontSize: 13, marginTop: 4 },
  logNote: { color: colors.sub, fontSize: 12, marginTop: 4 },
  summaryContainer: { marginTop: 20 },
  summaryTitle: { color: colors.accent, fontWeight: "800", fontSize: 18, marginBottom: 10 },
  summaryItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryExercise: { color: colors.text, fontWeight: "700" },
  summaryStats: { color: colors.sub, marginTop: 4, fontSize: 13 },
  addButton: {
    position: "absolute",
    right: 20,
    bottom: 100,
    backgroundColor: colors.accent,
    borderRadius: 30,
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: colors.card,
    paddingVertical: 10,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  navItem: { alignItems: "center" },
  navLabel: { fontSize: 12, color: colors.sub, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    width: "100%",
  },
  modalTitle: { color: colors.text, fontWeight: "700", fontSize: 18, marginBottom: 10 },
  modalText: { color: colors.sub, marginBottom: 20 },
  dropdown: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: { color: colors.text, fontSize: 14 },
  dropdownList: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginTop: 6,
  },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12 },
  dropdownItemText: { color: colors.text },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 4,
  },
});
