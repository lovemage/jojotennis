import { COURTS, type Court } from '@/constants/courts';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
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
  gold: '#C9A84C',
  ink: '#1A1510',
  muted: '#8A7E6E',
  border: '#E2D9C8',
};

export default function CourtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const court: Court | undefined = COURTS.find((c) => c.id === id);

  if (!court) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>‹ 返回</Text>
          </Pressable>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>找不到此球場</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          球場詳情
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.name}>{court.name}</Text>
          <Text style={styles.addr}>{court.address}</Text>
          <Text style={styles.meta}>
            {court.city} {court.district}
          </Text>

          <View style={styles.row}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{court.surface}</Text>
            </View>
            <View style={[styles.tag, !court.light && styles.tagMuted]}>
              <Text style={styles.tagText}>{court.light ? '有夜燈' : '無夜燈'}</Text>
            </View>
            <Text style={styles.courts}>{court.courts} 面</Text>
          </View>

          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>費用（離峰 / 尖峰）</Text>
            <Text style={styles.priceVal}>
              NT$ {court.price_off} / {court.price_peak}
            </Text>
          </View>
        </View>

        <View style={styles.btnRow}>
          <Pressable
            style={[styles.btn, styles.btnOutline]}
            onPress={() => Linking.openURL(court.gmaps_url)}>
            <Text style={styles.btnOutlineText}>Google Maps 導航</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnGold]}
            onPress={() => Linking.openURL(court.booking_url)}>
            <Text style={styles.btnGoldText}>前往官方預約</Text>
          </Pressable>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
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
  card: {
    margin: 16,
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  name: { fontSize: 20, color: C.pine, fontFamily: 'serif', marginBottom: 8 },
  addr: { fontSize: 14, color: C.ink, marginBottom: 4 },
  meta: { fontSize: 12, color: C.muted, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: C.clay,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
  },
  tagMuted: { backgroundColor: C.muted },
  tagText: { fontSize: 11, color: C.ivory, fontWeight: '700' },
  courts: { fontSize: 12, color: C.pine, fontWeight: '600' },
  priceBox: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  priceLabel: { fontSize: 11, color: C.muted, marginBottom: 4 },
  priceVal: { fontSize: 18, color: C.clay, fontWeight: '700' },
  btnRow: { paddingHorizontal: 16, gap: 10 },
  btn: { paddingVertical: 14, borderRadius: 3, alignItems: 'center' },
  btnOutline: {
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: C.pine,
  },
  btnOutlineText: { color: C.pine, fontSize: 14, fontWeight: '700' },
  btnGold: { backgroundColor: C.gold },
  btnGoldText: { color: C.ink, fontSize: 14, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: C.muted, fontSize: 15 },
});
