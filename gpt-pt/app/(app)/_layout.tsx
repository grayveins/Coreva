// app/(app)/_layout.tsx
import React from "react";
import { Drawer } from "expo-router/drawer";
import {
  View,
  TouchableOpacity,
  Text,
  SafeAreaView,
  Platform,
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
            color: colors.textPrimary,
            fontSize: 18,
            fontWeight: "bold",
          }}
        >
          GPT Personal Training
        </Text>

        {/* Spacer to balance layout */}
        <View style={{ width: 28 }} />
      </View>
    </SafeAreaView>
  );
}

function CustomDrawerContent(props: any) {
  const onSignOut = async () => {
    try {
      await supabase.auth.signOut();
      props.navigation.closeDrawer?.();
      router.replace("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

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
              User
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
              }}
            >
              example@domain.com
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
