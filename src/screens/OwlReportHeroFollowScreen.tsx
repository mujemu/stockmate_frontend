/**
 * 영웅 따라하기 — 데모 영웅 프로필 (간편모드용, 실제 팔로우 API 없음)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { principlePrefsStorageKey } from '../config/principlePrefsStorage';
import {
  CATEGORY_SECTION_ORDER,
  defaultParamsForRank,
  normalizePrincipleCategory,
} from '../config/principleUiSpecs';
import { usePrinciplesSetup } from '../context/PrinciplesSetupContext';
import { useUserSession } from '../context/UserSessionContext';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import type { PrincipleDefaultDto } from '../types/stockmateApiV1';

const P = '#7D3BDD';

type Props = {
  navigation: { goBack: () => void };
};

const HERO = {
  name: '쿠쿠즈',
  initial: '쿠',
  followers: 238,
  principleCount: 5,
  returnPct: '+34.2%',
  compliance: 92,
  months: 14,
  mdd: '-8%',
  rules: [
    '장 시작 직후·급변 구간에는 신규 매매를 하지 않는다.',
    '시가총액 상위 50% 이하 종목은 새로 매수하지 않는다.',
    '손절은 2단계: -8%에서 절반, -15%에서 전량.',
    '분할 매수 시 한 번에 1/3 이하만 진입한다.',
    '손절 직후에는 냉각 시간을 두고, 감정이 가라앉기 전엔 신규 매수하지 않는다.',
  ],
};

const HERO_DETAIL_TIMELINE = [
  { m: '2024 Q4', t: '변동성 구간에서 준수율 회복, 신규 진입 축소' },
  { m: '2025 Q1', t: '손절·분할 규칙 위반 2회 → 다음 주 재정비' },
  { m: '2025 Q2', t: '시총 필터 강화, 대형주 비중 상승' },
];

const HERO_BAR_ROWS = [
  { label: '손절·분할', pct: 88, v: 2, j: 18 },
  { label: '시총 필터', pct: 95, v: 1, j: 20 },
  { label: '충동매매 대기', pct: 78, v: 4, j: 16 },
] as const;

/**
 * 서버 풀에서 시간·비중·매도·매수·감정 각 1개씩 고른다 (default_rank 빠른 순).
 * 카테고리가 비어 있거나 알 수 없는 항목은 건너뛰어 API 검증을 통과한다.
 */
function resolveHeroPresetIds(defaults: PrincipleDefaultDto[]): string[] | null {
  const sorted = defaults.slice().sort((a, b) => a.default_rank - b.default_rank);
  const byCat = new Map<string, PrincipleDefaultDto[]>();
  for (const d of sorted) {
    const cat = normalizePrincipleCategory(d.category);
    if (!(CATEGORY_SECTION_ORDER as readonly string[]).includes(cat)) continue;
    const arr = byCat.get(cat) ?? [];
    arr.push(d);
    byCat.set(cat, arr);
  }
  const out: string[] = [];
  for (const cat of CATEGORY_SECTION_ORDER) {
    const arr = byCat.get(cat);
    if (!arr?.length) return null;
    out.push(arr[0].id);
  }
  return out;
}

export function OwlReportHeroFollowScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { userId, ready: sessionReady } = useUserSession();
  const { refreshNeedsPrinciplesSetup } = usePrinciplesSetup();
  const [detailOpen, setDetailOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  const applyHeroPrinciples = useCallback(() => {
    if (applying) return;
    if (!userId || !sessionReady) {
      Alert.alert('로그인 필요', '사용자 정보를 불러온 뒤 다시 시도해 주세요.');
      return;
    }
    Alert.alert(
      '원칙 따라하기',
      `${HERO.name} 세트(원칙 5개: 시간·비중·매도·매수·감정 각 1개)로 나의 투자 원칙을 덮어씁니다. 기존 순위·파라미터는 바뀝니다. 계속할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '적용',
          style: 'default',
          onPress: () => {
            void (async () => {
              setApplying(true);
              try {
                const defaults = await StockmateApiV1.principles.getDefaults();
                const sorted = defaults.slice().sort((a, b) => a.default_rank - b.default_rank);
                const ids = resolveHeroPresetIds(sorted);
                if (!ids) {
                  Alert.alert(
                    '오류',
                    '서버 원칙 풀에서 시간·비중·매도·매수·감정을 각각 채울 수 없습니다. 기본 원칙 시드를 확인해 주세요.',
                  );
                  return;
                }
                const params: Record<string, Record<string, number>> = {};
                for (const id of ids) {
                  const d = sorted.find((x) => x.id === id);
                  if (d) params[id] = { ...defaultParamsForRank(d.default_rank) };
                }
                const rankings = ids.map((principle_id, i) => ({ principle_id, rank: i + 1 }));
                await StockmateApiV1.principles.setup(userId, { rankings, params });
                const prefsPayload = JSON.stringify({ version: 1 as const, params });
                await AsyncStorage.setItem(principlePrefsStorageKey(userId), prefsPayload);
                await refreshNeedsPrinciplesSetup();
                Alert.alert('적용 완료', `나의 투자 원칙이 ${HERO.name} 세트로 바뀌었습니다.`, [
                  { text: '확인', onPress: () => navigation.goBack() },
                ]);
              } catch (e) {
                Alert.alert('적용 실패', e instanceof Error ? e.message : String(e));
              } finally {
                setApplying(false);
              }
            })();
          },
        },
      ],
    );
  }, [applying, userId, sessionReady, refreshNeedsPrinciplesSetup, navigation]);

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

          <Text style={styles.sectionLbl}>원칙별 준수율</Text>
          {HERO_BAR_ROWS.map((x) => (
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

          <Pressable style={styles.btnGhost} onPress={() => setDetailOpen(true)}>
            <Text style={styles.btnGhostTxt}>상세보기</Text>
          </Pressable>
          <Pressable
            style={[styles.btnMain, applying && styles.btnMainDisabled]}
            onPress={applyHeroPrinciples}
            disabled={applying}
          >
            {applying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnMainTxt}>원칙 따라하기</Text>
            )}
          </Pressable>
        </View>
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      <Modal visible={detailOpen} animationType="slide" transparent onRequestClose={() => setDetailOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDetailOpen(false)}>
          <Pressable style={[styles.modalCard, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalGrab}>
              <View style={styles.modalGrabBar} />
            </View>
            <Text style={styles.modalTitle}>{HERO.name} 상세</Text>
            <Text style={styles.modalLead}>
              화면 카드에 보이는 대표 원칙·준수율 막대·운용 정보를 한곳에 모았습니다. 실제 팔로우·실명 공개는 서비스
              정책에 따라 달라질 수 있어요.
            </Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSection}>대표 원칙</Text>
              {HERO.rules.map((t, i) => (
                <View key={i} style={styles.modalRule}>
                  <Text style={styles.modalRuleIdx}>{i + 1}</Text>
                  <Text style={styles.modalRuleTxt}>{t}</Text>
                </View>
              ))}
              <Text style={styles.modalSection}>핵심 지표</Text>
              <View style={styles.modalStatGrid}>
                <View style={styles.modalStatCell}>
                  <Text style={styles.modalStatVal}>{HERO.compliance}%</Text>
                  <Text style={styles.modalStatLbl}>준수율</Text>
                </View>
                <View style={styles.modalStatCell}>
                  <Text style={[styles.modalStatVal, { color: '#EA580C' }]}>{HERO.months}개월</Text>
                  <Text style={styles.modalStatLbl}>운용</Text>
                </View>
                <View style={styles.modalStatCell}>
                  <Text style={[styles.modalStatVal, { color: '#DC2626' }]}>{HERO.mdd}</Text>
                  <Text style={styles.modalStatLbl}>MDD</Text>
                </View>
                <View style={styles.modalStatCell}>
                  <Text style={[styles.modalStatVal, { color: '#059669' }]}>{HERO.returnPct}</Text>
                  <Text style={styles.modalStatLbl}>수익률</Text>
                </View>
              </View>
              <Text style={styles.modalSection}>원칙별 준수율</Text>
              {HERO_BAR_ROWS.map((x) => (
                <View key={`m-${x.label}`} style={styles.barBlock}>
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
              <Text style={styles.modalSection}>운용 타임라인</Text>
              {HERO_DETAIL_TIMELINE.map((row) => (
                <View key={row.m} style={styles.timelineRow}>
                  <Text style={styles.timelineM}>{row.m}</Text>
                  <Text style={styles.timelineT}>{row.t}</Text>
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setDetailOpen(false)}>
              <Text style={styles.modalCloseTxt}>닫기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  btnMainDisabled: { opacity: 0.7 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '88%',
  },
  modalGrab: { alignItems: 'center', paddingBottom: 8 },
  modalGrabBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 8 },
  modalLead: { fontSize: 13, color: '#6B7280', fontWeight: '600', lineHeight: 19, marginBottom: 12 },
  modalScroll: { maxHeight: 420 },
  modalSection: { fontSize: 14, fontWeight: '900', color: '#111827', marginTop: 14, marginBottom: 8 },
  modalRule: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  modalRuleIdx: {
    width: 22,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '900',
    color: P,
    paddingTop: 2,
  },
  modalRuleTxt: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '600', lineHeight: 19 },
  modalStatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modalStatCell: {
    width: '47%',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalStatVal: { fontSize: 16, fontWeight: '900', color: P },
  modalStatLbl: { fontSize: 11, color: '#9CA3AF', fontWeight: '700', marginTop: 4 },
  timelineRow: {
    borderLeftWidth: 3,
    borderLeftColor: '#EDE9FE',
    paddingLeft: 12,
    marginBottom: 12,
  },
  timelineM: { fontSize: 12, fontWeight: '900', color: P, marginBottom: 4 },
  timelineT: { fontSize: 13, color: '#4B5563', fontWeight: '600', lineHeight: 19 },
  modalClose: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCloseTxt: { fontSize: 15, fontWeight: '800', color: P },
});
