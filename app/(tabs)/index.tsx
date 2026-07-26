import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>IELTS Reading 救済措置</Text>

      <Text style={styles.subtitle}>
        本文を全部読む癖を直して、根拠を探す力を身につけよう！
        少しでも上がることを願います。
        　　　アプリについての不満は中Dまで。
      </Text>

      <TouchableOpacity style={styles.button}
      onPress={() => router.push('/reading')}
      >
        <Text style={styles.buttonText}>Practiceを始める</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#1E5AA8',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});