import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, RefreshControl, ScrollView, Pressable } from "react-native";
import { Link } from "expo-router";
import { fetchLatest, type LatestReading } from "../src/api";
import { useAuth } from "../src/providers/AuthProvider";
import { isSupabaseConfigured } from "../src/lib/supabase";
import { API_BASE_URL, apiLooksLikeLocalhost } from "../src/config";

/**
 * Mobile home — mirrors web dashboard metrics. Push notifications: enable
 * expo-notifications + FCM/APNs and call a backend worker when waste > threshold.
 */
export default function HomeScreen() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [data, setData] = useState<LatestReading | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      setData(await fetchLatest());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          tintColor="#22c55e"
        />
      }
    >
      <Text style={styles.title}>Iris</Text>
      <Text style={styles.sub}>Live from your home sensors</Text>

      {!authLoading && (
        <View style={styles.authRow}>
          {isSupabaseConfigured() ? (
            user ? (
              <>
                <Text style={styles.authText}>{user.email}</Text>
                <Pressable onPress={() => void signOut()} style={styles.authBtn}>
                  <Text style={styles.authBtnText}>Sign out</Text>
                </Pressable>
              </>
            ) : (
              <Link href="/auth" asChild>
                <Pressable style={styles.authBtn}>
                  <Text style={styles.authBtnText}>Sign in</Text>
                </Pressable>
              </Link>
            )
          ) : (
            <View style={styles.hintBox}>
              <Text style={styles.authHint}>
                Sign-in: add EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to mobile/.env
                (same as web), then restart Expo with --clear.
              </Text>
            </View>
          )}
        </View>
      )}

      {err && (
        <View style={styles.errBox}>
          <Text style={styles.err}>{err}</Text>
          {apiLooksLikeLocalhost() && (
            <Text style={styles.errDetail}>
              You are using {API_BASE_URL} — on a real device that points to the phone itself, not your PC. Use
              your Mac/PC IP and port 3000 (e.g. http://192.168.x.x:3000) in mobile/.env.
            </Text>
          )}
        </View>
      )}
      {data && (
        <>
          <Metric label="Waste score" value={String(data.wasteScore)} highlight />
          <Metric label="Temperature" value={`${data.temperature} C`} />
          <Metric label="Light" value={String(data.lightLevel)} />
          <Metric label="Motion" value={data.motionDetected ? "Yes" : "No"} />
          <Text style={styles.hint}>
            Set EXPO_PUBLIC_API_URL to your computer&apos;s LAN IP when testing on a phone.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.card, highlight && styles.cardHi]}>
      <Text style={styles.lab}>{label}</Text>
      <Text style={styles.val}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: "700", color: "#fafafa" },
  sub: { color: "#71717a", marginTop: 8, marginBottom: 24 },
  authRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  authText: { color: "#a1a1aa", fontSize: 14, flex: 1 },
  authBtn: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  authBtnText: { color: "#0a0a0b", fontWeight: "600", fontSize: 14 },
  hintBox: { marginBottom: 8, maxWidth: "100%" },
  authHint: { color: "#71717a", fontSize: 12, lineHeight: 18 },
  errBox: { marginBottom: 16 },
  err: { color: "#fbbf24", fontSize: 13, lineHeight: 20 },
  errDetail: { color: "#a1a1aa", fontSize: 12, lineHeight: 18, marginTop: 8 },
  card: {
    backgroundColor: "#141416",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  cardHi: { borderColor: "#22c55e55" },
  lab: { color: "#a1a1aa", fontSize: 13 },
  val: { color: "#fff", fontSize: 24, fontWeight: "600", marginTop: 4 },
  hint: { color: "#52525b", fontSize: 12, marginTop: 16 },
});
