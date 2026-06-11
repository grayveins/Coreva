// app/(app)/_layout.tsx
import React, { useEffect, useState } from "react";
import { Drawer } from "expo-router/drawer";
import {
  View,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useTheme } from "@/src/context/ThemeContext";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { MessageNotifier } from "@/src/components/MessageNotifier";
import { ActiveWorkoutMiniBar } from "@/src/components/workout/ActiveWorkoutMiniBar";
import { spacing } from "@/src/theme";
import Constants from "expo-constants";

// Menu item component
type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
};

function MenuItem({ icon, label, onPress, color }: MenuItemProps) {
  const { colors } = useTheme();
  const textColor = color ?? colors.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.menuItem}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={22} color={textColor} />
      <Text style={[styles.menuItemText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function CustomDrawerContent(props: any) {
  const { colors } = useTheme();
  const [profileName, setProfileName] = useState<string>("User");
  const [email, setEmail] = useState<string>("");
  const [isCoach, setIsCoach] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get app version
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Error fetching user:", userError);
        setLoading(false);
        return;
      }

      setEmail(user.email || "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();

      // Generated Database types currently resolve this row to `never`; read
      // columns through a narrow cast (consistent with the rest of the app).
      const prof = profile as { first_name?: string } | null;
      if (!profileError && prof?.first_name) setProfileName(prof.first_name);

      // Coach status comes from the authoritative `coaches` table, not
      // profiles.role (a seed-created coaches row never flips profiles.role).
      const { data: coachRow } = await supabase
        .from("coaches")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (coachRow) setIsCoach(true);

      setLoading(false);
    };

    fetchUserData();
  }, []);

  const closeDrawer = () => props.navigation.closeDrawer?.();

  const onMessages = () => {
    closeDrawer();
    router.push("/(app)/(tabs)/chat" as any);
  };

  const onSettings = () => {
    closeDrawer();
    router.push("/settings");
  };

  const onCoachDashboard = () => {
    closeDrawer();
    router.push("/(coach)" as any);
  };

  const onHelp = () => {
    Alert.alert(
      "Help & Support",
      "Need help? Email us at support@adpt.fit\n\nWe typically respond within 24 hours.",
      [{ text: "OK" }]
    );
  };

  const onTerms = () => {
    Alert.alert(
      "Terms & Privacy",
      "By using ADPT, you agree to our Terms of Service and Privacy Policy.\n\nFor full details, visit adpt.fit/legal",
      [{ text: "OK" }]
    );
  };

  const onSignOut = async () => {
    try {
      closeDrawer();
      await supabase.auth.signOut();
      setTimeout(() => {
        router.replace("/sign-in");
      }, 300);
    } catch (error) {
      console.error("Error signing out:", error);
      router.replace("/sign-in");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.drawerSafe, { backgroundColor: colors.bg }]}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.drawerSafe, { backgroundColor: colors.bg }]}>
      {/* Profile Section */}
      <View style={[styles.profileCard, { borderBottomColor: colors.border }]}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {profileName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={[styles.profileName, { color: colors.text }]}>{profileName}</Text>
        <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{email}</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {isCoach && (
          <MenuItem icon="people-outline" label="Coach Dashboard" onPress={onCoachDashboard} />
        )}
        <MenuItem icon="chatbubble-outline" label="Messages" onPress={onMessages} />
        <MenuItem icon="settings-outline" label="Settings" onPress={onSettings} />
        <MenuItem icon="help-circle-outline" label="Help & Support" onPress={onHelp} />
        <MenuItem icon="document-text-outline" label="Terms & Privacy" onPress={onTerms} />
      </View>

      {/* Bottom Section */}
      <View style={[styles.bottomSection, { borderTopColor: colors.border }]}>
        <MenuItem icon="log-out-outline" label="Sign Out" onPress={onSignOut} color={colors.error} />
        
        {/* App Version */}
        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          ADPT v{appVersion}
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function AuthenticatedLayout() {
  const { colors } = useTheme();

  return (
    <ErrorBoundary label="Home">
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MessageNotifier />
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerPosition: "right",
          drawerStyle: {
            backgroundColor: colors.bg,
            width: 280,
          },
          drawerActiveTintColor: colors.primary,
          drawerInactiveTintColor: colors.textMuted,
        }}
        drawerContent={(props) => <CustomDrawerContent {...props} />}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            title: "Home",
          }}
        />
        <Drawer.Screen
          name="progress"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />
        <Drawer.Screen
          name="progress-photos"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />
        <Drawer.Screen
          name="photo-history"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />
        <Drawer.Screen
          name="upload-meal-plan"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />
        <Drawer.Screen
          name="view-meal-plan"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />
      </Drawer>
      {/* Mounted as the View's last child so it z-orders ABOVE the Drawer
          and stays visible across tabs / progress screens / photo flows. */}
      <ActiveWorkoutMiniBar />
    </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  drawerSafe: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileCard: {
    padding: spacing.xl,
    alignItems: "center",
    borderBottomWidth: 1,
  },
  avatarWrap: {
    marginBottom: spacing.base,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
    fontFamily: "Inter_600SemiBold",
  },
  profileName: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: spacing.xs,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  menuSection: {
    flex: 1,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    gap: spacing.md,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  bottomSection: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.base,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: spacing.lg,
  },
});
