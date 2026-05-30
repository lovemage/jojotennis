import profileData from '@/data/mock_profile.json';
import { SkeletonList } from '@/components/skeleton-list';
import { mockFetch } from '@/lib/mockApi';
import type { MockProfile } from '@/types/profile';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

const C = {
  clay: '#B85C38',
  pine: '#1E3D2F',
  ivory: '#F7F2EB',
  white: '#FDFAF6',
  ink: '#1A1510',
  muted: '#8A7E6E',
  border: '#E2D9C8',
  nordic: '#1B4F72',
};

const rawProfile = profileData as MockProfile;

export default function ProfileScreen() {
  const [profile, setProfile] = useState<MockProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await mockFetch(rawProfile, { delayMs: 450 });
        if (alive) setProfile(data);
      } catch {
        if (alive) setError('無法載入個人資料，請稍後再試。');
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
        <Text style={styles.title}>我的</Text>
        <Text style={styles.sub}>帳號、NTRP 與偏好設定</Text>
      </View>

      {loading ? (
        <SkeletonList count={2} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.err}>{error}</Text>
        </View>
      ) : profile ? (
        <View style={styles.body}>
          <View style={styles.card}>
            <View style={styles.row}>
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{profile.displayName}</Text>
                <Text style={styles.meta}>
                  NTRP {profile.ntrp_level} · {profile.city_district}
                </Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>已驗證</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <Text style={styles.introLabel}>簡介</Text>
            <Text style={styles.intro}>{profile.intro_text}</Text>
          </View>
        </View>
      ) : null}
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
  body: { padding: 16 },
  card: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.border },
  name: { fontSize: 20, color: C.pine, fontFamily: 'serif', marginBottom: 4 },
  meta: { fontSize: 13, color: C.muted },
  badge: {
    backgroundColor: C.nordic,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  badgeText: { fontSize: 10, color: C.ivory, fontWeight: '700' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  introLabel: { fontSize: 11, color: C.muted, letterSpacing: 1, marginBottom: 8 },
  intro: { fontSize: 14, color: C.ink, lineHeight: 22 },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  err: { textAlign: 'center', color: C.muted, fontSize: 15, lineHeight: 22 },
});
