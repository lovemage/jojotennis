import { StyleSheet, View } from 'react-native';

type Props = { count?: number };

/** 極簡骨架：圓角灰塊 */
export function SkeletonList({ count = 4 }: Props) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.avatar} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={[styles.line, { width: '45%' }]} />
              <View style={[styles.line, { width: '70%' }]} />
              <View style={[styles.line, { width: '90%', height: 10 }]} />
            </View>
          </View>
          <View style={[styles.line, { width: '100%', marginTop: 12, height: 8 }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  card: {
    backgroundColor: '#EDE8E0',
    borderRadius: 12,
    padding: 14,
    opacity: 0.85,
  },
  row: { flexDirection: 'row', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D8D2C8' },
  line: { height: 12, borderRadius: 4, backgroundColor: '#D8D2C8' },
});
