import { COURTS, type Court } from '@/constants/courts';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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

const FILTER_CHIPS = [
  { key: 'near', label: '附近優先' },
  { key: 'light', label: '有夜燈' },
  { key: 'clay', label: '紅土' },
  { key: 'hard', label: '硬地' },
] as const;

type FilterKey = (typeof FILTER_CHIPS)[number]['key'];

function filterCourts(
  query: string,
  active: Set<FilterKey>,
  list: Court[],
): Court[] {
  const q = query.trim().toLowerCase();
  let out = list.filter((c) => {
    if (!q) return true;
    const blob = `${c.name} ${c.address} ${c.city} ${c.district}`.toLowerCase();
    return blob.includes(q);
  });

  if (active.has('light')) {
    out = out.filter((c) => c.light);
  }
  if (active.has('clay')) {
    out = out.filter((c) => c.surface.includes('紅土'));
  }
  if (active.has('hard')) {
    out = out.filter((c) => c.surface.includes('硬地'));
  }
  if (active.has('near')) {
    const order = (c: Court) => (c.city === '台北市' ? 0 : c.city === '桃園市' ? 1 : 2);
    out = [...out].sort((a, b) => order(a) - order(b));
  }

  return out;
}

export default function CourtScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Set<FilterKey>>(new Set());

  const data = useMemo(
    () => filterCourts(search, filters, COURTS),
    [search, filters],
  );

  const toggle = (key: FilterKey) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderItem = ({ item }: { item: Court }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/court/${item.id}`)}>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardAddr}>{item.address}</Text>
      <View style={styles.cardRow}>
        <Text style={styles.cardMeta}>
          {item.courts} 面 · {item.surface}
        </Text>
        <View style={[styles.lightBadge, !item.light && styles.lightOff]}>
          <Text style={styles.lightBadgeText}>{item.light ? '有夜燈' : '無夜燈'}</Text>
        </View>
      </View>
      <Text style={styles.price}>
        離峰 NT${item.price_off} · 尖峰 NT${item.price_peak}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topbar}>
        <Text style={styles.title}>找球場</Text>
        <Text style={styles.sub}>搜尋全台公開場地</Text>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="名稱、地址、行政區…"
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
        style={styles.chipsBar}>
        {FILTER_CHIPS.map((chip) => {
          const on = filters.has(chip.key);
          return (
            <Pressable
              key={chip.key}
              onPress={() => toggle(chip.key)}
              style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{chip.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>沒有符合條件的球場，試試調整篩選或關鍵字。</Text>
        }
      />
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: C.ink },
  chipsBar: { maxHeight: 48, marginTop: 12 },
  chipsScroll: { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 3,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipOn: { backgroundColor: C.clay, borderColor: C.clay },
  chipText: { fontSize: 12, color: C.pine, fontWeight: '600' },
  chipTextOn: { color: C.ivory },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardPressed: { opacity: 0.92 },
  cardTitle: { fontSize: 16, color: C.pine, fontWeight: '600', marginBottom: 4 },
  cardAddr: { fontSize: 13, color: C.ink, marginBottom: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardMeta: { fontSize: 12, color: C.muted, flex: 1 },
  lightBadge: {
    backgroundColor: C.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  lightOff: { backgroundColor: C.muted },
  lightBadgeText: { fontSize: 10, color: C.ink, fontWeight: '700' },
  price: { fontSize: 12, color: C.clay, fontWeight: '700' },
  empty: { textAlign: 'center', color: C.muted, marginTop: 24, paddingHorizontal: 24 },
});
