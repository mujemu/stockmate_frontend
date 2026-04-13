/**
 * OwlReportScreen — 나의 투자 원칙 (키움증권 간편모드 톤)
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
  ComplianceMonthDto,
  PrincipleDefaultDto,
  PrinciplesStatusDto,
} from '../types/stockmateApiV1';

const P = '#7D3BDD';
const PINK = '#E85A8A';
const C = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  green: '#059669',
  red: '#DC2626',
  text: '#111827',
  sub: '#6B7280',
  line: '#E8E9F0',
  lilac: '#EDE9FE',
  lilacSoft: '#F5F0FF',
  ghostBtn: '#ECECEF',
};

/** 목록 마커: a, b, c, … (26개 초과 시 숫자) */
function markerLetter(index: number): string {
  if (index >= 0 && index < 26) return String.fromCharCode(97 + index);
  return String(index + 1);
}

function sameCalendarMonth(iso: string | undefined | null, ref: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

const MONTHLY_EDIT_CAP = 3;

const BAR_CHART_MAX_H = 104;

function formatYm(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** 기준일 포함 최근 6개월(달 단위) */
function lastSixMonthSlots(ref: Date): { year: number; month: number; label: string }[] {
  const slots: { year: number; month: number; label: string }[] = [];
  for (let back = 5; back >= 0; back--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - back, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    slots.push({ year: y, month: m, label: `${m}월` });
  }
  return slots;
}

function complianceRangeParams(ref: Date): { start: string; end: string } {
  const slots = lastSixMonthSlots(ref);
  const first = slots[0];
  const last = slots[slots.length - 1];
  return { start: formatYm(first.year, first.month), end: formatYm(last.year, last.month) };
}

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
  const [principlesExpanded, setPrinciplesExpanded] = useState(false);
  const [defaults, setDefaults] = useState<PrincipleDefaultDto[]>([]);
  const [paramsByPid, setParamsByPid] = useState<Record<string, Record<string, number>>>({});
  const [complianceSeries, setComplianceSeries] = useState<ComplianceMonthDto[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    const { start, end } = complianceRangeParams(now);
    const [p, defs, l, comp] = await Promise.all([
      StockmateApiV1.principles.getStatus(userId),
      StockmateApiV1.principles.getDefaults(),
      StockmateApiV1.behaviorLogs.listByUser(userId, 180),
      StockmateApiV1.reports.getCompliance(userId, { start, end }).catch(() => [] as ComplianceMonthDto[]),
    ]);
    const sortedDefs = defs.slice().sort((a, b) => a.default_rank - b.default_rank);
    const pmap = await loadPrincipleParamsMap(userId, sortedDefs, p.params);
    setDefaults(sortedDefs);
    setParamsByPid(pmap);
    setPrinciples(p);
    setLogs(l);
    setComplianceSeries(Array.isArray(comp) ? comp : []);
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

  const editRemaining = useMemo(() => {
    let used = 0;
    if (principles?.updated_at && sameCalendarMonth(principles.updated_at, now)) used += 1;
    return Math.max(0, MONTHLY_EDIT_CAP - used);
  }, [principles?.updated_at, now]);

  const defaultById = useMemo(
    () => Object.fromEntries(defaults.map((d) => [d.id, d])),
    [defaults],
  );

  const displayPrincipleText = useCallback(
    (principleId: string, fallbackText: string) => {
      const def = defaultById[principleId];
      if (!def) return fallbackText;
      const bag = paramsByPid[principleId] ?? defaultParamsForRank(def.default_rank);
      return formatPrincipleTemplateText(def.text, def.default_rank, bag);
    },
    [defaultById, paramsByPid],
  );

  const monthLogs = useMemo(() => {
    const y = now.getFullYear();
    const mo = now.getMonth() + 1;
    return logs.filter((l) => {
      const d = new Date(l.logged_at);
      return d.getFullYear() === y && d.getMonth() + 1 === mo;
    });
  }, [logs, now]);

  const compliancePct = useMemo(() => {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const apiRow = complianceSeries.find((c) => c.year === y && c.month === m);
    if (apiRow && apiRow.total > 0) {
      return Math.round(apiRow.compliance_rate);
    }
    if (monthLogs.length === 0) return null;
    const v = monthLogs.filter((l) => l.is_rule_violation).length;
    return Math.max(0, Math.min(100, Math.round(100 * (1 - v / monthLogs.length))));
  }, [monthLogs, complianceSeries, now]);

  const complianceByYm = useMemo(() => {
    const map = new Map<string, ComplianceMonthDto>();
    for (const row of complianceSeries) {
      map.set(`${row.year}-${row.month}`, row);
    }
    return map;
  }, [complianceSeries]);

  const chartSlots = useMemo(() => {
    return lastSixMonthSlots(now).map((slot) => {
      const row = complianceByYm.get(`${slot.year}-${slot.month}`);
      const hasData = row != null && row.total > 0;
      const rate = hasData ? row.compliance_rate : null;
      const barH = rate == null ? 6 : Math.max(10, (rate / 100) * BAR_CHART_MAX_H);
      return { ...slot, row, hasData, rate, barH };
    });
  }, [now, complianceByYm]);

  const rankingSource = useMemo(() => {
    const rankings = principles?.rankings ?? [];
    if (rankings.length > 0) return rankings;
    return defaults.slice(0, 5).map((d, i) => ({
      principle_id: d.id,
      rank: i + 1,
      short_label: d.short_label,
      text: d.text,
      category: d.category,
      default_rank: d.default_rank,
    }));
  }, [principles?.rankings, defaults]);

  const heroPrincipleLines = useMemo(() => {
    return rankingSource.slice(0, 5).map((r, i) => ({
      key: r.principle_id,
      marker: markerLetter(i),
      line: displayPrincipleText(r.principle_id, r.text),
    }));
  }, [rankingSource, displayPrincipleText]);

  const principleExtraRows = useMemo(() => {
    if (!principles?.is_configured || !principlesExpanded) return [];
    return rankingSource.slice(5).map((r, j) => ({
      key: r.principle_id,
      marker: markerLetter(5 + j),
      short_label: r.short_label,
      line: displayPrincipleText(r.principle_id, r.text),
    }));
  }, [principles?.is_configured, principlesExpanded, rankingSource, displayPrincipleText]);

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <SimpleHeader onBack={() => navigation.goBack()} title="나의 투자 원칙" />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={P} />
          <Text style={styles.loadingTxt}>불러오는 중…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28, backgroundColor: C.bg }}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={14} style={styles.heroBack}>
            <Ionicons name="chevron-back" size={26} color={C.text} />
          </Pressable>
          <Text style={styles.screenTitle}>나의 투자 원칙</Text>
          <View style={{ width: 44 }} />
        </View>

        <Text style={styles.leadQuestion}>이번 달은 얼마나 원칙을 잘 준수하셨나요?</Text>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statCardLbl}>원칙준수율</Text>
            <Text style={[styles.statCardVal, { color: PINK }]}>
              {compliancePct == null ? '—' : `${compliancePct}%`}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLbl}>위반 횟수</Text>
            <Pressable
              onPress={() =>
                navigation.navigate('OwlReportViolations', {
                  year: now.getFullYear(),
                  month: now.getMonth() + 1,
                })
              }
            >
              <Text style={[styles.statCardVal, { color: PINK }]}>{violationMonthCount}회</Text>
            </Pressable>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLbl}>수정 잔여횟수</Text>
            <Text style={[styles.statCardVal, { color: PINK }]}>{editRemaining}회</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errBanner}>
            <Text style={styles.errTxt}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.rowHead}>
          <Text style={styles.sectionTitle}>나의 투자 원칙</Text>
          <Pressable onPress={() => navigation.navigate('Principles')} hitSlop={8}>
            <Text style={styles.editLink}>수정</Text>
          </Pressable>
        </View>

        {!principles?.is_configured && defaults.length === 0 ? (
          <View style={styles.cardMuted}>
            <Text style={styles.muted}>아직 설정된 원칙이 없어요.</Text>
            <Pressable style={styles.linkBtn} onPress={() => navigation.navigate('Principles')}>
              <Text style={styles.linkBtnTxt}>투자 판단 설정하기</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.principleListWrap}>
            {heroPrincipleLines.map((row, idx) => (
              <View key={row.key} style={[styles.principleLine, idx > 0 && styles.principleLineBorder]}>
                <View style={styles.circleMark}>
                  <Text style={styles.circleMarkTxt}>{row.marker}</Text>
                </View>
                <Text style={styles.principleLineTxt} numberOfLines={3}>
                  {row.line}
                </Text>
              </View>
            ))}
            {principleExtraRows.map((row) => (
              <View key={row.key} style={[styles.principleLine, styles.principleLineBorder]}>
                <View style={styles.circleMark}>
                  <Text style={styles.circleMarkTxt}>{row.marker}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.principleLineSub} numberOfLines={1}>
                    {row.short_label}
                  </Text>
                  <Text style={styles.principleLineTxtFull}>{row.line}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {principles?.is_configured && (principles?.rankings?.length ?? 0) > 5 ? (
          <Pressable
            style={styles.ghostWide}
            onPress={() => setPrinciplesExpanded((v) => !v)}
          >
            <Text style={styles.ghostWideTxt}>
              {principlesExpanded
                ? '접기'
                : `투자 원칙 더보기 (+${(principles?.rankings?.length ?? 0) - 5})`}
            </Text>
          </Pressable>
        ) : (
          <Pressable style={styles.ghostWide} onPress={() => navigation.navigate('Principles')}>
            <Text style={styles.ghostWideTxt}>투자 원칙 설정·추가</Text>
          </Pressable>
        )}

        <Text style={[styles.sectionTitle, styles.sectionTitleBlock]}>월별 준수율 추이</Text>
        <Text style={styles.sectionSub}>최근 6개월간 준수율 추이를 알아보아요.</Text>
        <View style={styles.graphCard}>
          <View style={styles.graphYAxis}>
            <Text style={styles.graphYLbl}>100</Text>
            <Text style={styles.graphYLbl}>50</Text>
            <Text style={styles.graphYLbl}>0</Text>
          </View>
          <View style={styles.graphPlot}>
            <View style={styles.graphBarsRow}>
              {chartSlots.map((s) => (
                <View key={`${s.year}-${s.month}`} style={styles.graphBarCol}>
                  <View style={styles.graphBarTrack}>
                    <View
                      style={[
                        styles.graphBarFill,
                        { height: s.barH },
                        !s.hasData && styles.graphBarFillMuted,
                      ]}
                    />
                  </View>
                  <Text style={styles.graphBarPct} numberOfLines={1}>
                    {s.hasData && s.rate != null ? `${Math.round(s.rate)}%` : '—'}
                  </Text>
                  <Text style={styles.graphBarMonth}>{s.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.graphFootnote}>
              행동 로그 기준 월별 준수율입니다. 해당 월 기록이 없으면 막대가 비어 있어요.
            </Text>
          </View>
        </View>
        <View style={styles.insightBox}>
          <Text style={styles.insightTitle}>👀 원칙 수정이 유효했을까?</Text>
          <Text style={styles.insightBody}>지난 원칙 수정 후 2개월간 준수율 연속 상승 중</Text>
        </View>

        <Text style={[styles.sectionTitle, styles.sectionTitleBlock]}>영웅 따라하기</Text>
        <Text style={styles.sectionSub}>영웅전 TOP50이 많이 선택한 원칙이에요.</Text>
        <View style={styles.principleListWrap}>
          {heroPrincipleLines.map((row, idx) => (
            <View key={`hero-${row.key}`} style={[styles.principleLine, idx > 0 && styles.principleLineBorder]}>
              <View style={styles.circleMark}>
                <Text style={styles.circleMarkTxt}>{row.marker}</Text>
              </View>
              <Text style={styles.principleLineTxt} numberOfLines={3}>
                {row.line}
              </Text>
            </View>
          ))}
        </View>
        <Pressable style={styles.ghostWide} onPress={() => navigation.navigate('OwlReportHeroFollow')}>
          <Text style={styles.ghostWideTxt}>원칙 따라하기</Text>
        </Pressable>
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

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  screenTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900', color: C.text },
  heroBack: { width: 44, height: 40, justifyContent: 'center' },
  leadQuestion: {
    marginHorizontal: 16,
    marginTop: 8,
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
    lineHeight: 22,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.lilacSoft,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0FA',
  },
  statCardLbl: { fontSize: 11, color: C.sub, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  statCardVal: { fontSize: 20, fontWeight: '900' },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: C.text },
  sectionTitleBlock: { marginHorizontal: 16, marginTop: 28 },
  sectionSub: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
    fontSize: 13,
    color: C.sub,
    fontWeight: '600',
    lineHeight: 19,
  },
  editLink: { fontSize: 14, fontWeight: '800', color: P },

  errBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
  },
  errTxt: { color: C.red, fontWeight: '600', fontSize: 13 },

  rowHead: {
    marginTop: 24,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  principleListWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  principleLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  principleLineBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
  },
  circleMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: P,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleMarkTxt: { fontSize: 13, fontWeight: '900', color: '#fff' },
  principleLineTxt: { flex: 1, fontSize: 14, fontWeight: '700', color: C.text, lineHeight: 21 },
  principleLineSub: {
    fontSize: 12,
    fontWeight: '800',
    color: P,
    marginBottom: 4,
  },
  principleLineTxtFull: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    lineHeight: 21,
  },

  ghostWide: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: C.ghostBtn,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ghostWideTxt: { fontSize: 14, fontWeight: '700', color: '#4D4F58' },

  graphCard: {
    marginHorizontal: 16,
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingLeft: 6,
    paddingRight: 10,
    borderWidth: 1,
    borderColor: C.line,
  },
  graphYAxis: {
    width: 28,
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 52,
  },
  graphYLbl: { fontSize: 10, color: '#9CA3AF', fontWeight: '700' },
  graphPlot: { flex: 1 },
  graphBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
    minHeight: BAR_CHART_MAX_H + 4,
  },
  graphBarCol: { flex: 1, alignItems: 'center', minWidth: 0 },
  graphBarTrack: {
    width: '100%',
    maxWidth: 36,
    height: BAR_CHART_MAX_H,
    justifyContent: 'flex-end',
    alignItems: 'center',
    alignSelf: 'center',
  },
  graphBarFill: {
    width: '85%',
    borderRadius: 6,
    backgroundColor: P,
    minHeight: 6,
  },
  graphBarFillMuted: { backgroundColor: '#D1D5DB' },
  graphBarPct: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '800',
    color: C.text,
  },
  graphBarMonth: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: C.sub,
  },
  graphFootnote: {
    marginTop: 10,
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    lineHeight: 14,
  },

  insightBox: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 16,
  },
  insightTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 6 },
  insightBody: { fontSize: 13, color: C.sub, fontWeight: '600', lineHeight: 20 },

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

});
