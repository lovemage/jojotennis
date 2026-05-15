import clubsData from '@/data/mock_clubs.json';
import { SkeletonList } from '@/components/skeleton-list';
import { mockFetch } from '@/lib/mockApi';
import type { MockClub } from '@/types/club';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
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

const rawClubs = clubsData as MockClub[];

export default function ClubScreen() {
  const router = useRouter();
  const [clubs, setClubs] = useState<MockClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await mockFetch(rawClubs, { delayMs: 450 });
        if (alive) setClubs(data);
      } catch {
        if (alive) setError('無法載入社團資料，請稍後再試。');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topbar}>
        <Text style={styles.title}>社團</Text>
        <Text style={styles.sub}>與球友一起練球、辦活動</Text>
      </View>

      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.err}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const when = new Date(item.nextEventAt).toLocaleString('zh-TW', {
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
                onPress={() => router.push(`/club/${item.id}`)}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {item.district} · {item.memberCount} 人
                </Text>
                <View style={styles.eventRow}>
                  <Text style={styles.eventLabel}>下一場</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle}>{item.nextEventTitle}</Text>
                    <Text style={styles.eventWhen}>{when}</Text>
                  </View>
                  <Text style={styles.chev}>›</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ivory },
  topbar: {
    backgroundColor: C.pine,
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 3,
    borderBottomColor: C.clay,
  },
  title: { fontSize: 22, color: C.ivory, fontFamily: 'serif' },
  sub: { fontSize: 12, color: C.muted, marginTop: 4 },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: { fontSize: 17, color: C.pine, fontWeight: '600', marginBottom: 4 },
  cardMeta: { fontSize: 12, color: C.muted, marginBottom: 12 },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  eventLabel: { fontSize: 10, color: C.muted, marginTop: 2, width: 36 },
  eventTitle: { fontSize: 14, color: C.ink, fontWeight: '600' },
  eventWhen: { fontSize: 12, color: C.clay, marginTop: 2, fontWeight: '600' },
  chev: { fontSize: 22, color: C.clay, fontWeight: '300' },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  err: { textAlign: 'center', color: C.muted, fontSize: 15, lineHeight: 22 },
});
