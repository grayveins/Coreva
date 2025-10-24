// app/(app)/_layout.tsx
import React, { useEffect, useState } from "react";
import { Drawer } from "expo-router/drawer";
import {
  View,
  TouchableOpacity,
  Text,
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { colors } from "../../constants/Colors";

function CustomHeader() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={{ backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.background,
          paddingTop: Platform.OS === "ios" ? 0 : 12,
        }}
      >
        {/* Menu Button */}
        <TouchableOpacity
          onPress={() => navigation.dispatch({ type: "OPEN_DRAWER" })}
        >
          <Ionicons name="menu" size={28} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Title */}
        <Text
          style={{
            color: colors.accent,
            fontSize: 18,
            fontWeight: "bold",
          }}
        >
          Coreva
        </Text>

        {/* Spacer to balance layout */}
        <View style={{ width: 28 }} />
      </View>
    </SafeAreaView>
  );
}

function CustomDrawerContent(props: any) {
  const [profileName, setProfileName] = useState<string>("User");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

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

      // Fetch name from profiles if available
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      if (!profileError && profile?.name) setProfileName(profile.name);

      setLoading(false);
    };

    fetchUserData();
  }, []);

  const onSignOut = async () => {
    try {
      await supabase.auth.signOut();
      props.navigation.closeDrawer?.();
      router.replace("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* User Profile */}
      <View
        style={{
          padding: 20,
          borderBottomWidth: 1,
          borderBottomColor: colors.inputBorder,
          backgroundColor: colors.card,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.textSecondary,
              marginRight: 12,
            }}
          />
          <View>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              {profileName}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
              }}
            >
              {email}
            </Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={onSignOut}
          style={{
            borderWidth: 1,
            borderColor: colors.accent,
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.accent, fontWeight: "700" }}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add drawer links below if needed */}
    </SafeAreaView>
  );
}

export default function AuthenticatedLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Drawer
        screenOptions={{
          header: () => <CustomHeader />,
          drawerStyle: {
            backgroundColor: colors.background,
            width: 300,
          },
          drawerActiveTintColor: colors.accent,
          drawerInactiveTintColor: colors.textSecondary,
        }}
        drawerContent={(props) => <CustomDrawerContent {...props} />}
      >
        {/* Tabs are nested inside drawer */}
        <Drawer.Screen
          name="(tabs)"
          options={{
            title: "Home",
          }}
        />
      </Drawer>
    </View>
  );
}
