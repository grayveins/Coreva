import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";

export default function Welcome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Background placeholder */}
      <View style={styles.background} />

      {/* Overlay content */}
      <View style={styles.content}>
        <Text style={styles.title}>Coreva</Text>
        <Text style={styles.subtitle}>Intelligent fitness simplified</Text>

        <TouchableOpacity
          style={styles.signUpButton}
          onPress={() => router.push("/sign-up")}
        >
          <Text style={styles.signUpText}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push("/sign-in")}
        >
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>

        <Text style={styles.orText}>Or continue with</Text>

        <View style={styles.socialRow}>
          {/* Placeholder boxes for social buttons */}
          <View style={styles.socialButton}>
            <Text style={styles.socialPlaceholder}></Text>
          </View>
          <View style={styles.socialButton}>
            <Text style={styles.socialPlaceholder}>G</Text>
          </View>
          <View style={styles.socialButton}>
            <Text style={styles.socialPlaceholder}>f</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000", // dark fallback background
    justifyContent: "center",
    alignItems: "center",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111", // subtle dark gray
  },
  content: {
    alignItems: "center",
    width: "80%",
  },
  title: {
    fontSize: 48,
    color: "#B9FF66",
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    marginBottom: 50,
  },
  signUpButton: {
    backgroundColor: "#B9FF66",
    borderRadius: 25,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
  },
  signUpText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 16,
  },
  loginButton: {
    borderWidth: 1,
    borderColor: "#B9FF66",
    borderRadius: 25,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 30,
  },
  loginText: {
    color: "#B9FF66",
    fontWeight: "600",
    fontSize: 16,
  },
  orText: {
    color: "#aaa",
    marginBottom: 10,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  socialPlaceholder: {
    color: "#B9FF66",
    fontSize: 24,
    fontWeight: "bold",
  },
});
