import clubsData from '@/data/mock_clubs.json';
import { mockFetch } from '@/lib/mockApi';
import type { MockClub } from '@/types/club';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const C = {
  clay: '#B85C38',
  pine: '#1E3D2F',
  ivory: '#F7F2EB',
  white: '#FDFAF6',
  ink: '#1A1510',
  muted: '#8A7E6E',
  border: '#E2D9C8',
};

const clubs = clubsData as MockClub[];

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [club, setClub] = useState<MockClub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await mockFetch({}, { delayMs: 350 });
        const found = clubs.find((c) => c.id === id) ?? null;
        if (!alive) return;
        setClub(found);
        if (!found) setError('找不到此社團');
      } catch {
        if (alive) setError('無法載入，請稍後再試。');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const when = club
    ? new Date(club.nextEventAt).toLocaleString('zh-TW', {
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          社團
        </Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.clay} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.err}>{error}</Text>
        </View>
      ) : club ? (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.name}>{club.name}</Text>
            <Text style={styles.meta}>
              {club.district} · {club.memberCount} 位成員
            </Text>
            <View style={styles.divider} />
            <Text style={styles.label}>下一場活動</Text>
            <Text style={styles.eventTitle}>{club.nextEventTitle}</Text>
            <Text style={styles.eventWhen}>{when}</Text>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ivory },
  topbar: {
    backgroundColor: C.pine,
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 3,
    borderBottomColor: C.clay,
  },
  back: { color: C.ivory, fontSize: 15, fontWeight: '600' },
  topTitle: { flex: 1, textAlign: 'center', color: C.ivory, fontSize: 16, fontFamily: 'serif' },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  err: { color: C.muted, fontSize: 15, textAlign: 'center' },
  card: {
    margin: 16,
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  name: { fontSize: 22, color: C.pine, fontFamily: 'serif', marginBottom: 6 },
  meta: { fontSize: 13, color: C.muted },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  label: { fontSize: 11, color: C.muted, letterSpacing: 1, marginBottom: 6 },
  eventTitle: { fontSize: 17, color: C.ink, fontWeight: '600', marginBottom: 4 },
  eventWhen: { fontSize: 14, color: C.clay, fontWeight: '600' },
});
