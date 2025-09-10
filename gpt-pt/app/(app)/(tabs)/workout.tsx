import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { authedFetch } from "../../../lib/api";

type WLog = {
  id: number;
  date: string;           // YYYY-MM-DD from API
  exercise: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  note: string | null;
  created_at: string;
};

const C = {
  bg: "#F7FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#1A202C",
  sub: "#4A5568",
  accent: "#4A5568",
};

function groupByDate(rows: WLog[]): Record<string, WLog[]> {
  return rows.reduce((acc, r) => {
    const key = r.date || r.created_at.slice(0, 10);
    acc[key] = acc[key] || [];
    acc[key].push(r);
    return acc;
  }, {} as Record<string, WLog[]>);
}

export default function WorkoutLog() {
  const [logs, setLogs] = useState<WLog[]>([]);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = useCallback(async () => {
    const res = await authedFetch("/workouts/logs", { method: "GET" });
    const data = await res.json();
    if (Array.isArray(data)) setLogs(data);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const addQuickWorkout = async () => {
    if (adding) return;
    setAdding(true);
    try {
      await authedFetch("/workouts/logs", {
        method: "POST",
        body: JSON.stringify({
          exercise: "Dumbbell Bench Press",
          sets: 3,
          reps: 8,
          weight: 60,
          note: "Felt solid",
          // date omitted → server uses current_date
        }),
      });
      await loadLogs();
    } finally {
      setAdding(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const byDate = groupByDate(logs);
  const dates = Object.keys(byDate).sort((a, b) => (a < b ? 1 : -1)); // newest first

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Text style={{ color: C.text, fontSize: 20, fontWeight: "700" }}>Workout Log</Text>
        <Text style={{ color: C.sub, marginTop: 2 }}>Notes-style logging with history</Text>
      </View>

      {/* Actions */}
      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <TouchableOpacity
          onPress={addQuickWorkout}
          disabled={adding}
          style={{
            backgroundColor: C.accent,
            opacity: adding ? 0.7 : 1,
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {adding ? "Adding…" : "Add Quick Set"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* History */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}
      >
        {dates.length === 0 ? (
          <Text style={{ color: C.sub, textAlign: "center", marginTop: 20 }}>
            No workout logs yet. Add a quick set above.
          </Text>
        ) : (
          dates.map((d) => (
            <View key={d} style={{ marginBottom: 16 }}>
              <Text style={{ color: C.text, fontWeight: "700", marginBottom: 8 }}>
                {new Date(d + "T00:00:00").toLocaleDateString()}
              </Text>

              <View
                style={{
                  backgroundColor: C.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.border,
                  overflow: "hidden",
                }}
              >
                {byDate[d].map((w, idx) => (
                  <View
                    key={w.id}
                    style={{
                      padding: 14,
                      borderTopWidth: idx === 0 ? 0 : 1,
                      borderTopColor: C.border,
                    }}
                  >
                    <Text style={{ color: C.text, fontWeight: "700" }}>
                      {w.exercise}
                    </Text>
                    <Text style={{ color: C.sub, marginTop: 4 }}>
                      {w.sets ?? "-"} x {w.reps ?? "-"} @ {w.weight ?? "-"} kg
                    </Text>
                    {w.note ? (
                      <Text style={{ color: C.sub, marginTop: 4 }}>{w.note}</Text>
                    ) : null}
                    <Text style={{ color: C.sub, marginTop: 4, fontSize: 12 }}>
                      {new Date(w.created_at).toLocaleTimeString()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

