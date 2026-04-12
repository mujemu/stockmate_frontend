/**
 * OwlReportScreen — 투자 원칙 리포트 (키움증권 간편모드 톤)
 */
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { loadPrincipleParamsMap } from '../config/principlePrefsStorage';
import {
  defaultParamsForRank,
  formatPrincipleTemplateText,
} from '../config/principleUiSpecs';
import { useUserSession } from '../context/UserSessionContext';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import type {
  BehaviorLogDto,
  PrincipleDefaultDto,
  PrincipleStatMonthDto,
  PrinciplesStatusDto,
} from '../types/stockmateApiV1';

const P = '#7D3BDD';
const C = {
  bg: '#F4F5FA',
  card: '#FFFFFF',
  green: '#059669',
  red: '#DC2626',
  text: '#111827',
  sub: '#6B7280',
  line: '#E8E9F0',
};

function sameCalendarMonth(iso: string | undefined | null, ref: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

const MONTHLY_EDIT_CAP = 3;

interface Props {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: object) => void;
  };
}

export function OwlReportScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { userId, ready } = useUserSession();
  const now = useMemo(() => new Date(), []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [principles, setPrinciples] = useState<PrinciplesStatusDto | null>(null);
  const [logs, setLogs] = useState<BehaviorLogDto[]>([]);
  const [principleStats, setPrincipleStats] = useState<PrincipleStatMonthDto[]>([]);
  const [principlesExpanded, setPrinciplesExpanded] = useState(false);
  const [defaults, setDefaults] = useState<PrincipleDefaultDto[]>([]);
  const [paramsByPid, setParamsByPid] = useState<Record<string, Record<string, number>>>({});

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const [p, defs, l, ps] = await Promise.all([
      StockmateApiV1.principles.getStatus(userId),
      StockmateApiV1.principles.getDefaults(),
      StockmateApiV1.behaviorLogs.listByUser(userId, 180),
      StockmateApiV1.reports.getPrincipleStats(userId, { year: y, month: m }).catch(() => []),
    ]);
    const sortedDefs = defs.slice().sort((a, b) => a.default_rank - b.default_rank);
    const pmap = await loadPrincipleParamsMap(userId, sortedDefs, p.params);
    setDefaults(sortedDefs);
    setParamsByPid(pmap);
    setPrinciples(p);
    setLogs(l);
    setPrincipleStats(ps);
  }, [userId, now]);

  useEffect(() => {
    if (!ready || !userId) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [ready, userId, load]);

  useFocusEffect(
    useCallback(() => {
      if (!ready || !userId || defaults.length === 0) return;
      void (async () => {
        const st = await StockmateApiV1.principles.getStatus(userId);
        const pmap = await loadPrincipleParamsMap(userId, defaults, st.params);
        setParamsByPid(pmap);
      })();
    }, [ready, userId, defaults]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const violationMonthCount = useMemo(() => {
    const y = now.getFullYear();
    const mo = now.getMonth() + 1;
    return logs.filter((l) => {
      const d = new Date(l.logged_at);
      return d.getFullYear() === y && d.getMonth() + 1 === mo && l.is_rule_violation;
    }).length;
  }, [logs, now]);

  const simulatedFillsThisMonth = useMemo(() => {
    const y = now.getFullYear();
    const mo = now.getMonth() + 1;
    return logs.filter((l) => {
      const d = new Date(l.logged_at);
      if (d.getFullYear() !== y || d.getMonth() + 1 !== mo) return false;
      const cx = l.context_data;
      return Boolean(cx && typeof cx === 'object' && (cx as { simulated_fill?: unknown }).simulated_fill);
    }).length;
  }, [logs, now]);

  const principleFlagTouches = useMemo(
    () => principleStats.reduce((acc, s) => acc + s.violation_count, 0),
    [principleStats],
  );

  const editRemaining = useMemo(() => {
    let used = 0;
    if (principles?.updated_at && sameCalendarMonth(principles.updated_at, now)) used += 1;
    return Math.max(0, MONTHLY_EDIT_CAP - used);
  }, [principles?.updated_at, now]);

  const defaultById = useMemo(
    () => Object.fromEntries(defaults.map((d) => [d.id, d])),
    [defaults],
  );

  const statByPid = useMemo(() => {
    const m = new Map<string, PrincipleStatMonthDto>();
    for (const s of principleStats) m.set(s.principle_id, s);
    return m;
  }, [principleStats]);

  const displayPrincipleText = useCallback(
    (principleId: string, fallbackText: string) => {
      const def = defaultById[principleId];
      if (!def) return fallbackText;
      const bag = paramsByPid[principleId] ?? defaultParamsForRank(def.default_rank);
      return formatPrincipleTemplateText(def.text, def.default_rank, bag);
    },
    [defaultById, paramsByPid],
  );

  const rankingsShow = principlesExpanded
    ? principles?.rankings ?? []
    : (principles?.rankings ?? []).slice(0, 5);

  const recentSimulatedFills = useMemo(() => {
    return logs
      .filter((l) => {
        const cx = l.context_data;
        return Boolean(cx && typeof cx === 'object' && (cx as { simulated_fill?: unknown }).simulated_fill);
      })
      .slice(0, 12);
  }, [logs]);

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <SimpleHeader onBack={() => navigation.goBack()} title="투자 원칙 리포트" />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={P} />
          <Text style={styles.loadingTxt}>불러오는 중…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <LinearGradient colors={[P, '#9B6DEB']} style={styles.hero}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={14} style={styles.heroBack}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </Pressable>
          <Text style={styles.heroBrand}>투자 원칙 리포트</Text>
          <Text style={styles.heroHi}>살게요·팔게요 모의 체결과 원칙 점검 기록이에요</Text>
          <Text style={styles.heroMonth}>
            {now.getFullYear()}년 {now.getMonth() + 1}월
          </Text>
        </LinearGradient>

        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.sumLbl}>모의 체결</Text>
            <Text style={[styles.sumVal, { color: P }]}>{simulatedFillsThisMonth}건</Text>
            <Text style={styles.sumHint}>이번 달 (실주문 없음)</Text>
          </View>
          <View style={styles.sumDivider} />
          <Pressable
            style={styles.summaryCol}
            onPress={() =>
              navigation.navigate('OwlReportViolations', {
                year: now.getFullYear(),
                month: now.getMonth() + 1,
              })
            }
          >
            <Text style={styles.sumLbl}>점검 집계</Text>
            <Text style={[styles.sumVal, { color: violationMonthCount > 0 ? C.red : C.sub }]}>
              {violationMonthCount}건
            </Text>
            <Text style={styles.tapHint}>위반으로 집계된 건 ›</Text>
          </Pressable>
          <View style={styles.sumDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.sumLbl}>수정 잔여</Text>
            <Text style={[styles.sumVal, { color: P }]}>{editRemaining}회</Text>
            <View style={styles.dotRow}>
              {Array.from({ length: MONTHLY_EDIT_CAP }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i < editRemaining ? styles.dotOn : styles.dotOff]}
                />
              ))}
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errBanner}>
            <Text style={styles.errTxt}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.blockTitle}>모의 체결 기록</Text>
        <Text style={styles.blockSub}>
          종목 화면에서 살게요·팔게요를 끝까지 진행하면 서버에 저장돼요. 원칙 점검에 걸린 횟수 합계:{' '}
          {principleFlagTouches}회
        </Text>
        <View style={styles.card}>
          {recentSimulatedFills.length === 0 ? (
            <Text style={[styles.muted, { padding: 14 }]}>
              아직 모의 체결 기록이 없어요. 종목 상세에서 매수·매도를 진행해 보세요.
            </Text>
          ) : (
            recentSimulatedFills.map((log, idx) => {
              const cx = (log.context_data ?? {}) as {
                side?: string;
                quantity?: number;
                limit_price_won?: number;
                order_check?: { flagged?: { short_label: string }[] };
              };
              const flagged = cx.order_check?.flagged ?? [];
              return (
                <View key={log.id} style={[styles.simRow, idx > 0 && styles.pRowBorder]}>
                  <Text style={styles.simDate}>{log.logged_at.slice(0, 16).replace('T', ' ')}</Text>
                  <Text style={styles.simTitle} numberOfLines={1}>
                    {log.stock_name ?? '종목'} · {cx.side === 'sell' ? '모의 매도' : '모의 매수'}{' '}
                    {cx.quantity != null ? `${cx.quantity}주` : ''}{' '}
                    {cx.limit_price_won != null ? `@ ${cx.limit_price_won.toLocaleString('ko-KR')}원` : ''}
                  </Text>
                  <Text style={styles.simSub}>
                    점검 대상 원칙 {flagged.length}개
                    {flagged.length > 0
                      ? ` — ${flagged.map((f) => f.short_label).slice(0, 3).join(', ')}${flagged.length > 3 ? '…' : ''}`
                      : ' (이번 체결은 순위권 점검 리스트에 없음)'}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* 내 투자 원칙 */}
        <View style={styles.rowHead}>
          <Text style={styles.blockTitleFlat}>내 투자 원칙 보기</Text>
          <Pressable
            style={styles.editPill}
            onPress={() => navigation.navigate('Principles')}
            hitSlop={8}
          >
            <Text style={styles.editPillTxt}>수정</Text>
          </Pressable>
        </View>
        <Text style={styles.principleSourceNote}>
          순위·선택·슬라이더 값은 저장 시 Supabase(DB)에 반영되고, 이 기기에 남은 값이 있으면 서버 값이 우선이에요.
        </Text>
        {!principles?.is_configured ? (
          <View style={styles.cardMuted}>
            <Text style={styles.muted}>아직 설정된 원칙이 없어요.</Text>
            <Pressable style={styles.linkBtn} onPress={() => navigation.navigate('Principles')}>
              <Text style={styles.linkBtnTxt}>투자 판단 설정하기</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            {rankingsShow.map((r, idx) => (
              <View
                key={r.principle_id}
                style={[styles.pRow, idx > 0 && styles.pRowBorder]}
              >
                <View style={styles.pBadge}>
                  <Text style={styles.pBadgeTxt}>{r.rank}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pShort}>{r.short_label}</Text>
                  <Text style={styles.pText} numberOfLines={5}>
                    {displayPrincipleText(r.principle_id, r.text)}
                  </Text>
                </View>
              </View>
            ))}
            {(principles?.rankings.length ?? 0) > 5 ? (
              <Pressable
                style={styles.moreRow}
                onPress={() => setPrinciplesExpanded((v) => !v)}
              >
                <Text style={styles.moreTxt}>
                  {principlesExpanded ? '접기' : `더보기 (+${(principles?.rankings.length ?? 0) - 5}개)`}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <Text style={styles.blockTitle}>원칙별 이번 달 집계</Text>
        <Text style={styles.blockSub}>
          모의 체결 때 서버가 다시 계산해 저장한 점검 목록을 기준으로 해요. 「짚힘」은 점검 대상에 올라온 횟수,
          「통과」는 그때 순위에 있었으나 점검 리스트에 없었던 횟수예요.
        </Text>
        {!principles?.is_configured ? null : (
          <View style={styles.card}>
            {principleStats.length === 0 ? (
              <Text style={[styles.muted, { padding: 14 }]}>
                이번 달 모의 체결 기록이 쌓이면 여기에 원칙별로 숫자가 나타나요.
              </Text>
            ) : null}
            {(principles?.rankings ?? []).map((r, idx) => {
              const st = statByPid.get(r.principle_id);
              const v = st?.violation_count ?? 0;
              const ok = st?.practice_ok_count ?? 0;
              return (
                <View key={r.principle_id} style={[idx > 0 && styles.pRowBorder, { padding: 14 }]}>
                  <View style={styles.barTitleRow}>
                    <Text style={styles.pShort} numberOfLines={1}>
                      {r.short_label}
                    </Text>
                    <Text style={styles.pPct}>
                      짚힘 {v} · 통과 {ok}
                    </Text>
                  </View>
                  <Text style={styles.barSubPrinciple} numberOfLines={2}>
                    {displayPrincipleText(r.principle_id, r.text)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SimpleHeader({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.simpleHeader}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.heroBack}>
        <Ionicons name="chevron-back" size={26} color={C.text} />
      </Pressable>
      <Text style={styles.simpleTitle}>{title}</Text>
      <View style={{ width: 44 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingTxt: { fontSize: 14, color: C.sub, fontWeight: '600' },
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 8,
    backgroundColor: C.bg,
  },
  simpleTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900', color: C.text },

  hero: {
    marginHorizontal: 16,
    borderRadius: 18,
    paddingTop: 8,
    paddingBottom: 28,
    paddingHorizontal: 14,
    marginBottom: -18,
  },
  heroBack: { width: 44, height: 40, justifyContent: 'center' },
  heroBrand: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '800', marginTop: 4 },
  heroHi: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '600', marginTop: 10 },
  heroMonth: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 6 },

  summaryCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: C.card,
    borderRadius: 16,
    flexDirection: 'row',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryCol: { flex: 1, alignItems: 'center' },
  sumLbl: { fontSize: 11, color: C.sub, fontWeight: '700', marginBottom: 6 },
  sumVal: { fontSize: 22, fontWeight: '900' },
  sumDelta: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  sumHint: { fontSize: 11, color: C.sub, marginTop: 4, fontWeight: '600' },
  tapHint: { fontSize: 11, color: C.sub, marginTop: 4, fontWeight: '700' },
  sumDivider: { width: 1, backgroundColor: C.line, marginVertical: 4 },
  dotRow: { flexDirection: 'row', gap: 5, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: P },
  dotOff: { backgroundColor: '#E5E7EB' },

  errBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
  },
  errTxt: { color: C.red, fontWeight: '600', fontSize: 13 },

  blockTitle: {
    marginTop: 22,
    marginHorizontal: 16,
    fontSize: 16,
    fontWeight: '900',
    color: C.text,
  },
  blockTitleFlat: { fontSize: 16, fontWeight: '900', color: C.text },
  blockSub: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    fontSize: 12,
    color: C.sub,
    fontWeight: '600',
  },
  rowHead: {
    marginTop: 20,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editPill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: P,
  },
  editPillTxt: { fontSize: 13, fontWeight: '900', color: P },
  linkInline: { fontSize: 13, fontWeight: '800', color: P },
  principleSourceNote: {
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 8,
    fontSize: 11,
    color: C.sub,
    fontWeight: '600',
    lineHeight: 16,
  },

  card: {
    marginHorizontal: 16,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  cardMuted: {
    marginHorizontal: 16,
    padding: 18,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  muted: { fontSize: 13, color: C.sub, fontWeight: '600', lineHeight: 20 },
  linkBtn: { marginTop: 12, alignSelf: 'flex-start' },
  linkBtnTxt: { fontSize: 14, fontWeight: '900', color: P },

  simRow: { paddingHorizontal: 14, paddingVertical: 12 },
  simDate: { fontSize: 11, color: C.sub, fontWeight: '700' },
  simTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginTop: 4 },
  simSub: { fontSize: 12, color: '#4B5563', marginTop: 6, lineHeight: 17, fontWeight: '600' },

  pRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  pRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  pBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pBadgeTxt: { fontSize: 12, fontWeight: '900', color: P },
  pShort: { fontSize: 13, fontWeight: '900', color: C.text },
  pText: { fontSize: 12, color: '#4B5563', fontWeight: '600', marginTop: 4, lineHeight: 18 },
  moreRow: { paddingVertical: 12, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  moreTxt: { fontSize: 13, fontWeight: '800', color: P },

  barTitleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  pPct: { fontSize: 14, fontWeight: '900', color: P },
  barSubPrinciple: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 0,
  },
});
