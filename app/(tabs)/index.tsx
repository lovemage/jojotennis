import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';

const C = {
  clay: '#B85C38',
  clayDark: '#8B3A1F',
  pine: '#1E3D2F',
  pineMid: '#2E5C44',
  ivory: '#F7F2EB',
  parchment: '#EDE5D6',
  stone: '#C4B89A',
  ink: '#1A1510',
  gold: '#C9A84C',
  white: '#FDFAF6',
  muted: '#8A7E6E',
  border: '#E2D9C8',
};

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 頂部導覽列 */}
      <View style={styles.topbar}>
        <Text style={styles.logo}>Tennis<Text style={styles.logoAccent}>TW</Text></Text>
        <View style={styles.topbarRight}>
          <Text style={styles.topbarCity}>台北市</Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>明</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero 卡片 */}
        <View style={styles.hero}>
          <Text style={styles.heroGreeting}>下午好，小明 👋</Text>
          <Text style={styles.heroTitle}>今天想打球嗎？</Text>
          <Text style={styles.heroSub}>NTRP 2.0 · 大安區 · 本週已打 1 場</Text>
          <TouchableOpacity style={styles.heroBtn}>
            <Text style={styles.heroBtnText}>立即找球友 →</Text>
          </TouchableOpacity>
        </View>

        {/* 快捷功能 */}
        <View style={styles.quickGrid}>
          {[
            { icon: '🗺', title: '找球場', sub: '附近 12 個場地' },
            { icon: '🎾', title: '約球配對', sub: '5 位球友在線' },
            { icon: '💬', title: '聊天室', sub: '揪球訊息' },
            { icon: '📅', title: '我的活動', sub: '週六 09:00' },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={styles.quickCard}>
              <Text style={styles.quickIcon}>{item.icon}</Text>
              <Text style={styles.quickTitle}>{item.title}</Text>
              <Text style={styles.quickSub}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* NTRP 等級卡 */}
        <View style={styles.ntrpBar}>
          <View style={styles.ntrpCircle}>
            <Text style={styles.ntrpNum}>2.0</Text>
          </View>
          <View style={styles.ntrpInfo}>
            <Text style={styles.ntrpLabel}>你的 NTRP 等級</Text>
            <Text style={styles.ntrpDesc}>初學進階 · 已能持續對打</Text>
          </View>
          <Text style={styles.ntrpCta}>更新 ›</Text>
        </View>

        {/* 最新約球 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>附近最新約球</Text>
            <Text style={styles.sectionMore}>查看全部</Text>
          </View>

          {[
            { title: '週日下午雙打練習', place: '大安森林公園', time: '5/18 14:00', ntrp: 'NTRP 2.0', left: '還差 2 人' },
            { title: '初學互練，互相成長', place: '中正紀念堂', time: '5/19 09:00', ntrp: 'NTRP 1.5–2.5', left: '還差 1 人' },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={styles.matchCard}>
              <View style={styles.matchCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchTitle}>{item.title}</Text>
                  <Text style={styles.matchMeta}>📍 {item.place} · ⏰ {item.time}</Text>
                </View>
                <View style={styles.badgeOpen}>
                  <Text style={styles.badgeOpenText}>報名中</Text>
                </View>
              </View>
              <View style={styles.matchCardBottom}>
                <View style={styles.badgeClay}>
                  <Text style={styles.badgeClayText}>{item.ntrp}</Text>
                </View>
                <Text style={styles.matchLeft}>{item.left}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ivory },
  topbar: {
    backgroundColor: C.pine,
    paddingTop: 56, paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 3,
    borderBottomColor: C.clay,
  },
  logo: { fontFamily: 'serif', fontSize: 22, color: C.ivory },
  logoAccent: { color: C.clay },
  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topbarCity: { fontSize: 11, color: C.stone },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.clay,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: C.ivory, fontSize: 14, fontWeight: '600' },
  scroll: { flex: 1 },
  hero: {
    margin: 16, borderRadius: 16,
    backgroundColor: C.clay,
    padding: 24,
  },
  heroGreeting: { fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  heroTitle: { fontSize: 26, color: C.ivory, fontWeight: '400', marginBottom: 6, lineHeight: 32 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 18 },
  heroBtn: {
    alignSelf: 'flex-start',
    backgroundColor: C.gold,
    paddingHorizontal: 22, paddingVertical: 9,
    borderRadius: 2,
  },
  heroBtnText: { color: C.ink, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  quickGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 10, marginBottom: 16,
  },
  quickCard: {
    width: '47%',
    backgroundColor: C.white,
    borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  quickIcon: { fontSize: 24, marginBottom: 8 },
  quickTitle: { fontSize: 14, color: C.pine, fontWeight: '600', marginBottom: 2 },
  quickSub: { fontSize: 11, color: C.muted },
  ntrpBar: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: C.white,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  ntrpCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.clay,
    alignItems: 'center', justifyContent: 'center',
  },
  ntrpNum: { color: C.ivory, fontSize: 15, fontWeight: '600' },
  ntrpInfo: { flex: 1 },
  ntrpLabel: { fontSize: 11, fontWeight: '700', color: C.ink },
  ntrpDesc: { fontSize: 11, color: C.muted, marginTop: 2 },
  ntrpCta: { fontSize: 11, color: C.clay, fontWeight: '700' },
  section: { paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, color: C.pine, fontWeight: '400' },
  sectionMore: { fontSize: 12, color: C.clay, fontWeight: '600' },
  matchCard: {
    backgroundColor: C.white,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 10,
  },
  matchCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  matchTitle: { fontSize: 15, color: C.pine, fontWeight: '500', marginBottom: 3 },
  matchMeta: { fontSize: 11, color: C.muted },
  matchCardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matchLeft: { fontSize: 11, color: C.muted },
  badgeOpen: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  badgeOpenText: { fontSize: 10, color: '#2E7D32', fontWeight: '700' },
  badgeClay: { backgroundColor: C.clay, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  badgeClayText: { fontSize: 10, color: C.ivory, fontWeight: '700' },
});
