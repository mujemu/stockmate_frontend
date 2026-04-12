/**
 * 영웅 따라하기 — 데모 영웅 프로필 (간편모드용, 실제 팔로우 API 없음)
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const P = '#7D3BDD';

type Props = {
  navigation: { goBack: () => void };
};

const HERO = {
  name: '김수익',
  initial: '김',
  followers: 238,
  principleCount: 5,
  returnPct: '+34.2%',
  compliance: 92,
  months: 14,
  mdd: '-8%',
  rules: [
    '시가총액 상위 50% 이하 종목은 새로 매수하지 않는다.',
    '손절은 2단계: -8%에서 절반, -15%에서 전량.',
    '분할 매수 시 한 번에 1/3 이하만 진입한다.',
  ],
};

export function OwlReportHeroFollowScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backHit}>
          <Ionicons name="chevron-back" size={26} color="#1A1D2D" />
        </Pressable>
        <Text style={styles.title}>영웅 따라하기</Text>
        <View style={styles.backHit} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>{HERO.initial}</Text>
            </View>
            <View style={styles.profileMeta}>
              <Text style={styles.name}>{HERO.name}</Text>
              <Text style={styles.sub}>
                원칙 {HERO.principleCount}개 · 팔로워 {HERO.followers}명
              </Text>
            </View>
            <Text style={styles.ret}>{HERO.returnPct}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statVal}>{HERO.compliance}%</Text>
              <Text style={styles.statLbl}>준수율</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: '#EA580C' }]}>{HERO.months}개월</Text>
              <Text style={styles.statLbl}>운용</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: '#DC2626' }]}>{HERO.mdd}</Text>
              <Text style={styles.statLbl}>MDD</Text>
            </View>
          </View>

          <Text style={styles.sectionLbl}>대표 원칙</Text>
          {HERO.rules.map((t, i) => (
            <View key={i} style={styles.ruleRow}>
              <View style={styles.ruleIdx}>
                <Text style={styles.ruleIdxTxt}>{i + 1}</Text>
              </View>
              <Text style={styles.ruleTxt}>{t}</Text>
            </View>
          ))}
          <Text style={styles.more}>+ 원칙별 준수율은 데모용으로 표시되며, 실제 서비스에서는 익명 집계와
            동의 기반으로 제공할 수 있어요.</Text>

          <Text style={styles.sectionLbl}>원칙별 준수율 (예시)</Text>
          {[
            { label: '손절·분할', pct: 88, v: 2, j: 18 },
            { label: '시총 필터', pct: 95, v: 1, j: 20 },
            { label: '충동매매 대기', pct: 78, v: 4, j: 16 },
          ].map((x) => (
            <View key={x.label} style={styles.barBlock}>
              <View style={styles.barHead}>
                <Text style={styles.barLbl}>{x.label}</Text>
                <Text style={styles.barPct}>{x.pct}%</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${x.pct}%` }]} />
              </View>
              <Text style={styles.barCap}>
                {x.j}회 판단 중 위반 {x.v}회
              </Text>
            </View>
          ))}

          <Pressable style={styles.btnGhost} onPress={() => {}}>
            <Text style={styles.btnGhostTxt}>상세보기 (준비 중)</Text>
          </Pressable>
          <Pressable style={styles.btnMain} onPress={() => {}}>
            <Text style={styles.btnMainTxt}>원칙 따라하기 (준비 중)</Text>
          </Pressable>
        </View>
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  backHit: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900', color: '#1A1D2D' },
  scroll: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8E9F0',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: P,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { color: '#fff', fontSize: 18, fontWeight: '900' },
  profileMeta: { flex: 1, marginLeft: 12 },
  name: { fontSize: 17, fontWeight: '900', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 2 },
  ret: { fontSize: 17, fontWeight: '900', color: '#059669' },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    marginBottom: 18,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '900', color: P },
  statLbl: { fontSize: 11, color: '#9CA3AF', fontWeight: '700', marginTop: 4 },
  sectionLbl: { fontSize: 13, fontWeight: '900', color: '#111827', marginBottom: 10 },
  ruleRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  ruleIdx: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleIdxTxt: { fontSize: 12, fontWeight: '900', color: P },
  ruleTxt: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '600', lineHeight: 19 },
  more: { fontSize: 11, color: '#9CA3AF', marginBottom: 18, lineHeight: 16 },
  barBlock: { marginBottom: 14 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLbl: { fontSize: 13, fontWeight: '800', color: '#374151' },
  barPct: { fontSize: 13, fontWeight: '900', color: P },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4, backgroundColor: P },
  barCap: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 4 },
  btnGhost: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  btnGhostTxt: { fontSize: 15, fontWeight: '800', color: P },
  btnMain: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: P,
    alignItems: 'center',
  },
  btnMainTxt: { fontSize: 15, fontWeight: '900', color: '#fff' },
});
