import postsData from '@/data/mock_match_posts.json';
import { SkeletonList } from '@/components/skeleton-list';
import { COURTS } from '@/constants/courts';
import { mockFetch } from '@/lib/mockApi';
import { TW_CITIES, TW_DISTRICTS, type TwCity } from '@/constants/twRegions';
import { useRouter } from 'expo-router';
import {
  DEFAULT_MATCH_FILTERS,
  filterMatchPosts,
  formatFilterSummary,
  sortMatchPosts,
  type MatchFilters,
  type MatchPeriod,
  type MatchPost,
  type MatchSortMode,
} from '@/types/match';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
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
  nordic: '#1B4F72',
  nordicBg: '#F4F6F8',
  warmSand: '#D4C4A8',
};

const RAW_POSTS = postsData as MatchPost[];

const NTRP_LEVELS: number[] = (() => {
  const out: number[] = [];
  for (let i = 2; i <= 14; i += 1) out.push(i * 0.5);
  return out;
})();

const PERIOD_DEF: { key: MatchPeriod; label: string; sub: string }[] = [
  { key: 'morning', label: '早', sub: '06–12' },
  { key: 'noon', label: '中', sub: '12–18' },
  { key: 'evening', label: '晚', sub: '18–24' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i + 1);

function cloneFilters(f: MatchFilters): MatchFilters {
  return {
    ...f,
    periods: [...f.periods],
    hours: [...f.hours],
  };
}

function ntrpBadgeStyle(ntrp: number) {
  if (ntrp >= 4.0) return { bg: C.nordic, fg: C.ivory };
  if (ntrp <= 2.0) return { bg: C.warmSand, fg: C.ink };
  return { bg: C.clay, fg: C.ivory };
}

export default function MatchScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<MatchPost[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [applied, setApplied] = useState<MatchFilters>(() => cloneFilters(DEFAULT_MATCH_FILTERS));
  const [draft, setDraft] = useState<MatchFilters>(() => cloneFilters(DEFAULT_MATCH_FILTERS));
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortMode, setSortMode] = useState<MatchSortMode>('latest');

  const [formOpen, setFormOpen] = useState(false);
  const [court, setCourt] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [ntrpReq, setNtrpReq] = useState('');

  const [detailPost, setDetailPost] = useState<MatchPost | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setListLoading(true);
        setListError(null);
        const data = await mockFetch(RAW_POSTS, { delayMs: 500 });
        if (alive) setPosts(data);
      } catch {
        if (alive) setListError('無法載入約球列表，請稍後再試。');
      } finally {
        if (alive) setListLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const f = filterMatchPosts(posts, applied);
    return sortMatchPosts(f, sortMode);
  }, [posts, applied, sortMode]);

  const summary = useMemo(() => formatFilterSummary(applied), [applied]);

  const suggestedCourts = useMemo(() => {
    let list = [...COURTS];
    if (applied.city) {
      const byCity = list.filter((c) => c.city === applied.city);
      if (byCity.length) list = byCity;
    }
    if (applied.district) {
      const byDist = list.filter((c) => c.district === applied.district);
      if (byDist.length) list = byDist;
    }
    return list.slice(0, 3);
  }, [applied.city, applied.district]);

  const openFilter = useCallback(() => {
    setDraft(cloneFilters(applied));
    setFilterOpen(true);
  }, [applied]);

  const saveFilter = useCallback(() => {
    const next = cloneFilters(draft);
    if (next.ntrpMin > next.ntrpMax) {
      const t = next.ntrpMin;
      next.ntrpMin = next.ntrpMax;
      next.ntrpMax = t;
    }
    setApplied(next);
    setFilterOpen(false);
  }, [draft]);

  const resetDraft = useCallback(() => {
    setDraft(cloneFilters(DEFAULT_MATCH_FILTERS));
  }, []);

  const togglePeriod = (p: MatchPeriod) => {
    setDraft((d) => {
      const has = d.periods.includes(p);
      return {
        ...d,
        periods: has ? d.periods.filter((x) => x !== p) : [...d.periods, p],
      };
    });
  };

  const toggleHour = (h: number) => {
    setDraft((d) => {
      const has = d.hours.includes(h);
      return { ...d, hours: has ? d.hours.filter((x) => x !== h) : [...d.hours, h].sort((a, b) => a - b) };
    });
  };

  const districts = draft.city ? TW_DISTRICTS[draft.city as TwCity] ?? [] : [];

  const renderPost = ({ item: p }: { item: MatchPost }) => {
    const badge = ntrpBadgeStyle(p.ntrp);
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.94 }]}
        onPress={() => setDetailPost(p)}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{p.organizer_name.slice(0, 1)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{p.organizer_name}</Text>
            <Text style={styles.meta}>
              NTRP {p.ntrp} · {p.city} {p.district}
            </Text>
            <Text style={styles.slots}>空閒：{p.slots_label}</Text>
            <Text style={styles.descPreview} numberOfLines={2}>
              {p.description}
            </Text>
          </View>
          <View style={[styles.ntrpBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.ntrpBadgeText, { color: badge.fg }]}>NTRP {p.ntrp}</Text>
          </View>
        </View>
        <View style={styles.matchRow}>
          <Text style={styles.matchLabel}>配對度</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${p.match_pct}%` }]} />
          </View>
          <Text style={styles.matchPct}>{p.match_pct}%</Text>
        </View>
        <Text style={styles.tapHint}>點擊閱讀完整簡介</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topbar}>
        <Text style={styles.title}>約球配對</Text>
        <Text style={styles.sub}>依條件為你推薦球友</Text>
      </View>

      <Pressable style={styles.filterBar} onPress={openFilter}>
        <View style={styles.filterLeft}>
          <Text style={styles.filterLabel}>目前篩選</Text>
          <Text style={styles.filterValue} numberOfLines={3}>
            {summary}
          </Text>
        </View>
        <Text style={styles.filterChevron}>調整</Text>
      </Pressable>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>排序</Text>
        <Pressable
          onPress={() => setSortMode('latest')}
          style={[styles.sortChip, sortMode === 'latest' && styles.sortChipOn]}>
          <Text style={[styles.sortChipText, sortMode === 'latest' && styles.sortChipTextOn]}>最新發布</Text>
        </Pressable>
        <Pressable
          onPress={() => setSortMode('ntrp')}
          style={[styles.sortChip, sortMode === 'ntrp' && styles.sortChipOn]}>
          <Text style={[styles.sortChipText, sortMode === 'ntrp' && styles.sortChipTextOn]}>依等級</Text>
        </Pressable>
      </View>

      {listLoading ? (
        <SkeletonList count={4} />
      ) : listError ? (
        <View style={styles.emptyBox}>
          <Text style={styles.errText}>{listError}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={[styles.list, filtered.length === 0 && { flexGrow: 1 }]}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyHintLine}>沒有符合目前篩選條件的約球。</Text>
              <Text style={styles.guideTitle}>附近的球場攻略</Text>
              <Text style={styles.guideSub}>先找場地，之後再邀球友一起打。</Text>
              {suggestedCourts.map((court) => (
                <View key={court.id} style={styles.guideCard}>
                  <Text style={styles.guideName}>{court.name}</Text>
                  <Text style={styles.guideMeta}>
                    {court.city}
                    {court.district} · {court.surface} · {court.courts} 面
                    {court.light ? ' · 有夜燈' : ''}
                  </Text>
                  <Text style={styles.guidePrice}>
                    離峰 NT${court.price_off} 起 · 尖峰 NT${court.price_peak}
                  </Text>
                </View>
              ))}
              <Pressable style={styles.guideCta} onPress={() => router.push('/court')}>
                <Text style={styles.guideCtaText}>前往找球場</Text>
              </Pressable>
            </View>
          }
        />
      )}

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={() => setFormOpen(true)}>
          <Text style={styles.ctaText}>發起約球</Text>
        </Pressable>
      </View>

      {/* Nordic 篩選 Bottom Sheet */}
      <Modal visible={filterOpen} animationType="slide" transparent onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <Pressable style={styles.sheetBackdropFill} onPress={() => setFilterOpen(false)} />
          <View style={styles.filterSheet}>
            <View style={styles.sheetGrab} />
            <Text style={styles.sheetHeroTitle}>調整篩選</Text>
            <Text style={styles.sheetHeroSub}>以時間、地點與等級找到最合適的球友</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetSection}>NTRP 等級</Text>
              <Text style={styles.sheetHint}>最低 — 最高（0.5 級距）</Text>
              <Text style={styles.microLabel}>最低</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {NTRP_LEVELS.map((v) => (
                  <Pressable
                    key={`min-${v}`}
                    onPress={() => setDraft((d) => ({ ...d, ntrpMin: v, ntrpMax: Math.max(d.ntrpMax, v) }))}
                    style={[styles.ntrpChip, draft.ntrpMin === v && styles.ntrpChipOn]}>
                    <Text style={[styles.ntrpChipText, draft.ntrpMin === v && styles.ntrpChipTextOn]}>{v}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.microLabel}>最高</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {NTRP_LEVELS.map((v) => (
                  <Pressable
                    key={`max-${v}`}
                    onPress={() => setDraft((d) => ({ ...d, ntrpMax: v, ntrpMin: Math.min(d.ntrpMin, v) }))}
                    style={[styles.ntrpChip, draft.ntrpMax === v && styles.ntrpChipOn]}>
                    <Text style={[styles.ntrpChipText, draft.ntrpMax === v && styles.ntrpChipTextOn]}>{v}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.sheetSection, { marginTop: 28 }]}>地點</Text>
              <Text style={styles.sheetHint}>縣市、行政區（兩層）</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Pressable
                  onPress={() => setDraft((d) => ({ ...d, city: '', district: '' }))}
                  style={[styles.locChip, !draft.city && styles.locChipOn]}>
                  <Text style={[styles.locChipText, !draft.city && styles.locChipTextOn]}>不限</Text>
                </Pressable>
                {TW_CITIES.map((city) => (
                  <Pressable
                    key={city}
                    onPress={() => setDraft((d) => ({ ...d, city, district: '' }))}
                    style={[styles.locChip, draft.city === city && styles.locChipOn]}>
                    <Text style={[styles.locChipText, draft.city === city && styles.locChipTextOn]}>{city}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {draft.city ? (
                <>
                  <Text style={styles.microLabel}>行政區</Text>
                  <View style={styles.wrapChips}>
                    <Pressable
                      onPress={() => setDraft((d) => ({ ...d, district: '' }))}
                      style={[styles.locChip, !draft.district && styles.locChipOn]}>
                      <Text style={[styles.locChipText, !draft.district && styles.locChipTextOn]}>全區</Text>
                    </Pressable>
                    {districts.map((dist) => (
                      <Pressable
                        key={dist}
                        onPress={() => setDraft((d) => ({ ...d, district: dist }))}
                        style={[styles.locChip, draft.district === dist && styles.locChipOn]}>
                        <Text style={[styles.locChipText, draft.district === dist && styles.locChipTextOn]}>{dist}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <Text style={[styles.sheetSection, { marginTop: 28 }]}>時間</Text>
              <Text style={styles.sheetHint}>
                時段與小時皆可多選；兩項都選時只要符合其一即可。未選表示不限制該項。
              </Text>
              <View style={styles.periodRow}>
                {PERIOD_DEF.map((p) => {
                  const on = draft.periods.includes(p.key);
                  return (
                    <Pressable
                      key={p.key}
                      onPress={() => togglePeriod(p.key)}
                      style={[styles.periodChip, on && styles.periodChipOn]}>
                      <Text style={[styles.periodTitle, on && styles.periodTitleOn]}>{p.label}</Text>
                      <Text style={[styles.periodSub, on && styles.periodSubOn]}>{p.sub}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.hourGrid}>
                {HOURS.map((h) => {
                  const on = draft.hours.includes(h);
                  return (
                    <Pressable
                      key={h}
                      onPress={() => toggleHour(h)}
                      style={[styles.hourCell, on && styles.hourCellOn]}>
                      <Text style={[styles.hourText, on && styles.hourTextOn]}>{h}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.sheetSection, { marginTop: 28 }]}>場地屬性</Text>
              <View style={styles.rowChecks}>
                <Pressable
                  onPress={() => setDraft((d) => ({ ...d, requireIndoor: !d.requireIndoor }))}
                  style={[styles.check, draft.requireIndoor && styles.checkOn]}>
                  <Text style={[styles.checkText, draft.requireIndoor && styles.checkTextOn]}>室內</Text>
                </Pressable>
                <Pressable
                  onPress={() => setDraft((d) => ({ ...d, requireOutdoor: !d.requireOutdoor }))}
                  style={[styles.check, draft.requireOutdoor && styles.checkOn]}>
                  <Text style={[styles.checkText, draft.requireOutdoor && styles.checkTextOn]}>室外</Text>
                </Pressable>
              </View>

              <Text style={[styles.sheetSection, { marginTop: 28 }]}>關鍵字</Text>
              <Text style={styles.sheetHint}>搜尋簡介與球友資訊</Text>
              <TextInput
                style={styles.nordicInput}
                placeholder="例如：雙打、紅土、新手"
                placeholderTextColor="#8A9BA8"
                value={draft.keyword}
                onChangeText={(t) => setDraft((d) => ({ ...d, keyword: t }))}
              />

              <View style={{ height: 24 }} />
            </ScrollView>

            <View style={styles.sheetActions}>
              <Pressable onPress={resetDraft} style={styles.ghostBtn}>
                <Text style={styles.ghostBtnText}>重設</Text>
              </Pressable>
              <Pressable onPress={() => setFilterOpen(false)} style={styles.ghostBtn}>
                <Text style={styles.ghostBtnText}>取消</Text>
              </Pressable>
              <Pressable onPress={saveFilter} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>儲存並套用</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 發起約球 */}
      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetIvory}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitleIvory}>發起約球</Text>
              <Pressable onPress={() => setFormOpen(false)} hitSlop={12}>
                <Text style={styles.sheetClose}>關閉</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>球場</Text>
              <TextInput
                style={styles.input}
                placeholder="例如：大安森林公園網球場"
                placeholderTextColor={C.muted}
                value={court}
                onChangeText={setCourt}
              />
              <Text style={styles.fieldLabel}>日期</Text>
              <TextInput
                style={styles.input}
                placeholder="例如：5/18（六）"
                placeholderTextColor={C.muted}
                value={date}
                onChangeText={setDate}
              />
              <Text style={styles.fieldLabel}>時間</Text>
              <TextInput
                style={styles.input}
                placeholder="例如：14:00–16:00"
                placeholderTextColor={C.muted}
                value={time}
                onChangeText={setTime}
              />
              <Text style={styles.fieldLabel}>NTRP 要求</Text>
              <TextInput
                style={styles.input}
                placeholder="例如：2.0–3.0"
                placeholderTextColor={C.muted}
                value={ntrpReq}
                onChangeText={setNtrpReq}
              />
              <Pressable
                style={styles.submit}
                onPress={() => {
                  setFormOpen(false);
                  setCourt('');
                  setDate('');
                  setTime('');
                  setNtrpReq('');
                }}>
                <Text style={styles.submitText}>送出邀請</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 簡介詳情 */}
      <Modal visible={!!detailPost} animationType="fade" transparent onRequestClose={() => setDetailPost(null)}>
        <Pressable style={styles.detailBackdrop} onPress={() => setDetailPost(null)}>
          <Pressable style={styles.detailCard} onPress={() => {}}>
            {detailPost ? (
              <>
                <Text style={styles.detailName}>{detailPost.organizer_name}</Text>
                <Text style={styles.detailMeta}>
                  NTRP {detailPost.ntrp} · {detailPost.city} {detailPost.district}
                </Text>
                <View style={styles.detailDivider} />
                <Text style={styles.detailLabel}>約球簡介</Text>
                <ScrollView style={{ maxHeight: 280 }}>
                  <Text style={styles.detailBody}>{detailPost.description}</Text>
                </ScrollView>
                <Pressable style={styles.detailClose} onPress={() => setDetailPost(null)}>
                  <Text style={styles.detailCloseText}>關閉</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
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
  filterBar: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterLeft: { flex: 1 },
  filterLabel: { fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 4 },
  filterValue: { fontSize: 13, color: C.pine, fontWeight: '600', lineHeight: 20 },
  filterChevron: { fontSize: 13, color: C.nordic, fontWeight: '700' },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  sortLabel: { fontSize: 12, color: C.muted, marginRight: 4 },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 3,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  sortChipOn: { backgroundColor: C.pine, borderColor: C.pine },
  sortChipText: { fontSize: 12, color: C.pine, fontWeight: '600' },
  sortChipTextOn: { color: C.ivory },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 },
  card: {
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.ivory, fontSize: 16, fontWeight: '700' },
  name: { fontSize: 16, color: C.pine, fontWeight: '600', marginBottom: 2 },
  meta: { fontSize: 12, color: C.muted, marginBottom: 4 },
  slots: { fontSize: 12, color: C.ink, marginBottom: 6 },
  descPreview: { fontSize: 12, color: C.muted, lineHeight: 18 },
  ntrpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    alignSelf: 'flex-start',
  },
  ntrpBadgeText: { fontSize: 10, fontWeight: '700' },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  matchLabel: { fontSize: 11, color: C.muted, width: 40 },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.border,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: C.gold, borderRadius: 4 },
  matchPct: { fontSize: 12, color: C.clay, fontWeight: '700', width: 36, textAlign: 'right' },
  tapHint: { fontSize: 10, color: C.nordic, marginTop: 8, fontWeight: '600' },
  emptyBox: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },
  emptyHintLine: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  guideTitle: {
    fontSize: 18,
    color: C.pine,
    fontFamily: 'serif',
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  guideSub: { fontSize: 12, color: C.muted, marginBottom: 14, alignSelf: 'flex-start' },
  guideCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    width: '100%',
  },
  guideName: { fontSize: 15, color: C.pine, fontWeight: '600', marginBottom: 4 },
  guideMeta: { fontSize: 12, color: C.muted, marginBottom: 4 },
  guidePrice: { fontSize: 12, color: C.clay, fontWeight: '700' },
  guideCta: {
    marginTop: 8,
    backgroundColor: C.pine,
    paddingVertical: 14,
    borderRadius: 3,
    alignItems: 'center',
    width: '100%',
  },
  guideCtaText: { color: C.ivory, fontSize: 14, fontWeight: '700' },
  errText: { fontSize: 14, color: C.muted, textAlign: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 10,
    backgroundColor: C.ivory,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  cta: {
    backgroundColor: C.clay,
    paddingVertical: 14,
    borderRadius: 3,
    alignItems: 'center',
  },
  ctaText: { color: C.ivory, fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(26,38,46,0.35)' },
  sheetBackdropFill: { flex: 1 },
  filterSheet: {
    backgroundColor: C.nordicBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 22,
    paddingBottom: 20,
    maxHeight: '92%',
  },
  sheetGrab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C5CED6',
    marginTop: 10,
    marginBottom: 16,
  },
  sheetHeroTitle: { fontSize: 24, color: '#14232F', fontFamily: 'serif', marginBottom: 6 },
  sheetHeroSub: { fontSize: 13, color: '#5C6B78', marginBottom: 20, lineHeight: 20 },
  sheetSection: { fontSize: 12, letterSpacing: 2, color: '#14232F', fontWeight: '700', marginBottom: 6 },
  sheetHint: { fontSize: 12, color: '#6B7C8A', marginBottom: 12, lineHeight: 18 },
  microLabel: { fontSize: 11, color: '#6B7C8A', marginBottom: 8, marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  ntrpChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E0E6',
  },
  ntrpChipOn: { backgroundColor: C.nordic, borderColor: C.nordic },
  ntrpChipText: { fontSize: 13, color: '#14232F', fontWeight: '600' },
  ntrpChipTextOn: { color: '#FFFFFF' },
  locChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E0E6',
  },
  locChipOn: { backgroundColor: C.nordic, borderColor: C.nordic },
  locChipText: { fontSize: 13, color: '#14232F', fontWeight: '600' },
  locChipTextOn: { color: '#FFFFFF' },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  periodRow: { flexDirection: 'row', gap: 10 },
  periodChip: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E0E6',
    alignItems: 'center',
  },
  periodChipOn: { backgroundColor: '#E8EEF2', borderColor: C.nordic },
  periodTitle: { fontSize: 18, color: '#14232F', fontFamily: 'serif' },
  periodTitleOn: { color: C.nordic },
  periodSub: { fontSize: 11, color: '#6B7C8A', marginTop: 4 },
  periodSubOn: { color: '#14232F' },
  hourGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  hourCell: {
    width: '14.5%',
    aspectRatio: 1,
    maxWidth: 48,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E0E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourCellOn: { backgroundColor: C.nordic, borderColor: C.nordic },
  hourText: { fontSize: 12, color: '#14232F', fontWeight: '600' },
  hourTextOn: { color: '#FFFFFF' },
  rowChecks: { flexDirection: 'row', gap: 12 },
  check: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#D9E0E6',
    backgroundColor: '#FFFFFF',
  },
  checkOn: { borderColor: C.nordic, backgroundColor: '#E8EEF2' },
  checkText: { fontSize: 14, color: '#14232F', fontWeight: '600' },
  checkTextOn: { color: C.nordic },
  nordicInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E0E6',
    borderRadius: 3,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#14232F',
  },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#D9E0E6',
  },
  ghostBtn: { paddingVertical: 12, paddingHorizontal: 8 },
  ghostBtnText: { fontSize: 14, color: '#5C6B78', fontWeight: '600' },
  primaryBtn: {
    flex: 1,
    backgroundColor: C.nordic,
    paddingVertical: 14,
    borderRadius: 3,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetIvory: {
    backgroundColor: C.ivory,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 12,
  },
  sheetTitleIvory: { fontSize: 18, color: C.pine, fontFamily: 'serif' },
  sheetClose: { fontSize: 14, color: C.clay, fontWeight: '700' },
  fieldLabel: { fontSize: 11, color: C.muted, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.ink,
  },
  submit: {
    marginTop: 22,
    backgroundColor: C.gold,
    paddingVertical: 14,
    borderRadius: 3,
    alignItems: 'center',
    marginBottom: 8,
  },
  submitText: { color: C.ink, fontSize: 15, fontWeight: '700' },
  detailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  detailCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  detailName: { fontSize: 20, color: C.pine, fontFamily: 'serif', marginBottom: 4 },
  detailMeta: { fontSize: 13, color: C.muted },
  detailDivider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
  detailLabel: { fontSize: 11, color: C.muted, letterSpacing: 1, marginBottom: 8 },
  detailBody: { fontSize: 15, color: C.ink, lineHeight: 24 },
  detailClose: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 3,
    backgroundColor: C.nordic,
    alignItems: 'center',
  },
  detailCloseText: { color: C.ivory, fontSize: 14, fontWeight: '700' },
});
