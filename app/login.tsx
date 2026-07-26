import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { router } from "expo-router";
import { auth } from "../firebase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("入力してください", "メールアドレスとパスワードを入力してください。");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      Alert.alert("ログイン成功", "ログインできました。");
      router.replace("/(tabs)");
    } catch {
      Alert.alert(
        "ログインできませんでした",
        "メールアドレスかパスワードを確認してください。"
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ログイン</Text>

      <TextInput
        style={styles.input}
        placeholder="メールアドレス"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="パスワード"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>ログイン</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F7F9FC",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DDDDDD",
  },
  button: {
    backgroundColor: "#1E5AA8",
    padding: 16,
    borderRadius: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
});