import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Link, Stack, useRouter } from "expo-router";
import { supabase, isSupabaseConfigured } from "../src/lib/supabase";

/**
 * Email + password auth — matches what Supabase enables by default.
 * Magic links / OAuth can be added later with expo-auth-session + deep links.
 */
export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isSupabaseConfigured() || !supabase) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Account" }} />
        <Text style={styles.title}>Supabase not configured</Text>
        <Text style={styles.body}>
          Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or ANON_KEY) to your
          .env, then restart Expo with{" "}
          <Text style={{ color: "#22c55e" }}>npx expo start --clear</Text>.
        </Text>
        <Link href="/" asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>Back</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  async function signIn() {
    if (!supabase) return;
    setMessage(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.replace("/");
  }

  async function signUp() {
    if (!supabase) return;
    setMessage(null);
    setBusy(true);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    setMessage(error ? error.message : "Check your email to confirm (if required by project settings).");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <Stack.Screen options={{ title: "Account" }} />
      <Text style={styles.title}>Iris account</Text>
      <Text style={styles.sub}>Same Supabase project as the web app.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#71717a"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#71717a"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {message && <Text style={styles.msg}>{message}</Text>}

      <Pressable style={[styles.btn, busy && styles.btnDisabled]} onPress={signIn} disabled={busy}>
        {busy ? <ActivityIndicator color="#0a0a0b" /> : <Text style={styles.btnText}>Sign in</Text>}
      </Pressable>
      <Pressable
        style={[styles.btnOutline, busy && styles.btnDisabled]}
        onPress={signUp}
        disabled={busy}
      >
        <Text style={styles.btnOutlineText}>Create account</Text>
      </Pressable>

      <Link href="/" asChild>
        <Pressable style={{ marginTop: 24 }}>
          <Text style={{ color: "#22c55e", fontSize: 15 }}>← Dashboard</Text>
        </Pressable>
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 48, backgroundColor: "#0a0a0b" },
  title: { fontSize: 24, fontWeight: "700", color: "#fafafa" },
  sub: { color: "#71717a", marginTop: 8, marginBottom: 24 },
  body: { color: "#a1a1aa", lineHeight: 22, marginBottom: 16 },
  input: {
    backgroundColor: "#141416",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 14,
    color: "#fafafa",
    marginBottom: 12,
    fontSize: 16,
  },
  msg: { color: "#a1a1aa", marginBottom: 12, fontSize: 14 },
  btn: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#0a0a0b", fontWeight: "600", fontSize: 16 },
  btnOutline: {
    borderWidth: 1,
    borderColor: "#22c55e",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  btnOutlineText: { color: "#22c55e", fontWeight: "600", fontSize: 16 },
});
