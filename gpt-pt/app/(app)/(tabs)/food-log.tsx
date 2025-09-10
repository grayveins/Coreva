import { useEffect, useState, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, RefreshControl, Modal, Pressable, Image, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { authedFetch } from "../../../lib/api";

type MealLog = {
  id: number;
  name: string | null;
  qty: number | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  eaten_at: string;
};

const C = {
  bg: "#F7FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#1A202C",
  sub: "#4A5568",
  accent: "#4A5568",
  muted: "#EDF2F7",
  placeholder: "#718096",
};

export default function FoodLog() {
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showManual, setShowManual] = useState(false);
  const [showDescribe, setShowDescribe] = useState(false);

  // Manual form
  const [mName, setMName] = useState("");
  const [mQty, setMQty] = useState("1");
  const [mKcal, setMKcal] = useState("");
  const [mP, setMP] = useState("");
  const [mC, setMC] = useState("");
  const [mF, setMF] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  // Describe form
  const [descText, setDescText] = useState("");
  const [image, setImage] = useState<string | null>(null); // base64 string data URL
  const [savingDescribe, setSavingDescribe] = useState(false);

  const loadLogs = useCallback(async () => {
    const res = await authedFetch("/meals/logs");
    const data = await res.json();
    if (Array.isArray(data)) setLogs(data);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const totals = logs.reduce(
    (acc, m) => ({
      kcal: acc.kcal + (m.kcal || 0),
      p: acc.p + (Number(m.protein_g) || 0),
      c: acc.c + (Number(m.carbs_g) || 0),
      f: acc.f + (Number(m.fat_g) || 0),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );

  // ----- Manual add -----
  const submitManual = async () => {
    if (savingManual) return;
    setSavingManual(true);
    try {
      await authedFetch("/meals/logs", {
        method: "POST",
        body: JSON.stringify({
          name: mName.trim() || "Meal",
          qty: Number(mQty || 1),
          kcal: mKcal ? Number(mKcal) : null,
          protein_g: mP ? Number(mP) : null,
          carbs_g: mC ? Number(mC) : null,
          fat_g: mF ? Number(mF) : null,
        }),
      });
      // reset minimal
      setMQty("1"); setMKcal(""); setMP(""); setMC(""); setMF("");
      setShowManual(false);
      await loadLogs();
    } finally {
      setSavingManual(false);
    }
  };

  // ----- Describe add -----
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      base64: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      setImage(`data:${result.assets[0].mimeType || "image/jpeg"};base64,${result.assets[0].base64}`);
    }
  };

  const submitDescribe = async () => {
    if (savingDescribe) return;
    setSavingDescribe(true);
    try {
      // 1) Ask backend to parse
      const parseRes = await authedFetch("/meals/describe", {
        method: "POST",
        body: JSON.stringify({
          description: descText.trim() || null,
          image_base64: image, // may be null; backend should handle text-only too
        }),
      });
      const parsed = await parseRes.json(); // { name, kcal, protein_g, carbs_g, fat_g }
      // 2) Save the parsed meal immediately
      await authedFetch("/meals/logs", { method: "POST", body: JSON.stringify(parsed) });
      // reset
      setDescText(""); setImage(null); setShowDescribe(false);
      await loadLogs();
    } finally {
      setSavingDescribe(false);
    }
  };

  // ---- UI helpers ----
  const Pill = ({ title, onPress }: { title: string; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginRight: 10 }}>
      <Text style={{ color: C.text, fontWeight: "700" }}>{title}</Text>
    </TouchableOpacity>
  );

  const Input = (p: any) => (
    <TextInput
      {...p}
      placeholderTextColor={C.placeholder}
      style={{
        backgroundColor: C.card, color: C.text,
        borderWidth: 1, borderColor: C.border, borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10
      }}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Text style={{ color: C.text, fontSize: 20, fontWeight: "700" }}>Food Log</Text>
        <Text style={{ color: C.sub, marginTop: 4 }}>Manual entry • Describe with photo/text</Text>
      </View>

      {/* Quick actions */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pill title="Manual Entry" onPress={() => setShowManual(true)} />
        <Pill title="Describe it" onPress={() => setShowDescribe(true)} />
      </View>

      {/* Totals */}
      <View style={{ backgroundColor: C.card, marginHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14 }}>
        <Row label="Calories" value={`${totals.kcal}`} />
        <Row label="Protein" value={`${Math.round(totals.p)} g`} />
        <Row label="Carbs" value={`${Math.round(totals.c)} g`} />
        <Row label="Fat" value={`${Math.round(totals.f)} g`} />
      </View>

      {/* List */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}
      >
        {logs.length === 0 ? (
          <Text style={{ color: C.sub, textAlign: "center", marginTop: 16 }}>No meals yet. Add one above.</Text>
        ) : (
          logs.map((m) => (
            <View key={m.id} style={{ backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10 }}>
              <Text style={{ color: C.text, fontWeight: "700" }}>{m.name || "Meal"}</Text>
              <Text style={{ color: C.sub, fontSize: 12, marginTop: 2 }}>
                {m.kcal ?? 0} kcal • P:{m.protein_g ?? 0}g C:{m.carbs_g ?? 0}g F:{m.fat_g ?? 0}g
              </Text>
              <Text style={{ color: "#A0AEC0", fontSize: 11, marginTop: 4 }}>
                {new Date(m.eaten_at).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Manual Entry Modal */}
      <Modal visible={showManual} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, borderTopWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: "700" }}>Add item</Text>
              <Pressable onPress={() => setShowManual(false)}><Text style={{ color: C.sub, fontWeight: "700" }}>✕</Text></Pressable>
            </View>

            <Input placeholder="Meal" value={mName} onChangeText={setMName} />
            <Input placeholder="Qty" keyboardType="numeric" value={mQty} onChangeText={setMQty} />
            <Input placeholder="Calories" keyboardType="numeric" value={mKcal} onChangeText={setMKcal} />
            <Input placeholder="Protein (g)" keyboardType="numeric" value={mP} onChangeText={setMP} />
            <Input placeholder="Carbs (g)" keyboardType="numeric" value={mC} onChangeText={setMC} />
            <Input placeholder="Fat (g)" keyboardType="numeric" value={mF} onChangeText={setMF} />

            <TouchableOpacity
              onPress={submitManual}
              disabled={savingManual}
              style={{ backgroundColor: C.accent, opacity: savingManual ? 0.7 : 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 4 }}
            >
              {savingManual ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Submit</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowManual(false)} style={{ backgroundColor: C.muted, borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8 }}>
              <Text style={{ color: C.sub, fontWeight: "700" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Describe Modal */}
      <Modal visible={showDescribe} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, borderTopWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: "700" }}>Describe it</Text>
              <Pressable onPress={() => setShowDescribe(false)}><Text style={{ color: C.sub, fontWeight: "700" }}>✕</Text></Pressable>
            </View>

            <TouchableOpacity onPress={pickImage} style={{ backgroundColor: C.muted, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 10 }}>
              <Text style={{ color: C.sub, textAlign: "center", fontWeight: "700" }}>{image ? "Change image" : "Choose an image…"}</Text>
            </TouchableOpacity>
            {image ? <Image source={{ uri: image }} style={{ width: "100%", height: 160, borderRadius: 10, marginBottom: 10 }} /> : null}

            <Input placeholder="Additional description (e.g., 'half the fries')" value={descText} onChangeText={setDescText} />

            <View style={{ backgroundColor: "#FEFCBF", borderColor: "#F6E05E", borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 8 }}>
              <Text style={{ color: "#744210" }}>• Camera roll inputs are more accurate{"\n"}• A brief description improves results</Text>
            </View>

            <TouchableOpacity
              onPress={submitDescribe}
              disabled={savingDescribe}
              style={{ backgroundColor: C.accent, opacity: savingDescribe ? 0.7 : 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 4 }}
            >
              {savingDescribe ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Submit</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowDescribe(false)} style={{ backgroundColor: C.muted, borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8 }}>
              <Text style={{ color: C.sub, fontWeight: "700" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
      <Text style={{ color: "#4A5568" }}>{label}</Text>
      <Text style={{ color: "#1A202C", fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

