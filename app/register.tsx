import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { router } from "expo-router";
import { auth } from "../firebase";

const db = getFirestore();

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("入力してください", "メールアドレスとパスワードを入力してください。");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: email.trim(),
        createdAt: new Date().toISOString(),
        totalScore: 0,
        totalQuestions: 0,
        readingAccuracy: 0,
      });
      
      Alert.alert("新規登録成功", "新規登録できました。");
      
      router.replace("/(tabs)");
    } catch (error: any) {
      console.log(error);
    
      Alert.alert(
        "エラー",
        error.message
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