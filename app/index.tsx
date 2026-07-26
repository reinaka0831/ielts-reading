import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function StartScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>IELTS Reading</Text>

      <Text style={styles.subtitle}>
        学習方法を選択してください
      </Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#1E5AA8" }]}
        onPress={() => router.replace("/(tabs)")}
      >
        <Text style={styles.buttonText}>ログインせずに始める</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#2E7D32" }]}
        onPress={() => router.push("/login")}
      >
        <Text style={styles.buttonText}>ログイン</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#F57C00" }]}
        onPress={() => router.push("/register")}
      >
        <Text style={styles.buttonText}>新規登録</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
    padding: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
  },
  button: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
});