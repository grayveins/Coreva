import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from "react-native";
import { useRouter } from "expo-router";

export default function Welcome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../assets/images/lifting-stock.jpg")}
        style={styles.backgroundImage}
        imageStyle={styles.imageStyle}
        resizeMode="cover"
      >
        {/* Dark overlay */}
        <View style={styles.overlay} />

        {/* Content */}
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
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backgroundImage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageStyle: {
    transform: [{ scale: 1.05 }], // slight zoom-in for perfect framing
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.78)", // nice dark overlay
  },
  content: {
    width: "80%",
    alignItems: "center",
    zIndex: 2,
  },
  title: {
    fontSize: 48,
    color: "#B9FF66",
    fontWeight: "900",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 28,
    marginBottom: 50,
  },
  signUpButton: {
    backgroundColor: "#B9FF66",
    borderRadius: 30,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
  },
  signUpText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 16,
  },
  loginButton: {
    borderWidth: 1,
    borderColor: "#B9FF66",
    borderRadius: 30,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    marginBottom: 30,
  },
  loginText: {
    color: "#B9FF66",
    fontWeight: "700",
    fontSize: 16,
  },
  orText: {
    color: "#ccc",
    marginBottom: 14,
    fontSize: 14,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  socialPlaceholder: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
});
