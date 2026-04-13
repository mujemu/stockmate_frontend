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
  MonthlyReportDto,
  PrincipleDefaultDto,
  PrincipleStatMonthDto,
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

function getYearMonth(ref: Date): { year: number; month: number } {
  return { year: ref.getFullYear(), month: ref.getMonth() + 1 };
}

function getPrevYearMonth(ref: Date): { year: number; month: number } {
  const d = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
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
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReportDto[]>([]);
  const [principleStatsCurrent, setPrincipleStatsCurrent] = useState<PrincipleStatMonthDto[]>([]);
  const [principleStatsPrev, setPrincipleStatsPrev] = useState<PrincipleStatMonthDto[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    const { start, end } = complianceRangeParams(now);
    const currentYm = getYearMonth(now);
    const prevYm = getPrevYearMonth(now);
    const [p, defs, l, comp, reports, statsCurrent, statsPrev] = await Promise.all([
      StockmateApiV1.principles.getStatus(userId),
      StockmateApiV1.principles.getDefaults(),
      StockmateApiV1.behaviorLogs.listByUser(userId, 180),
      StockmateApiV1.reports.getCompliance(userId, { start, end }).catch(() => [] as ComplianceMonthDto[]),
      StockmateApiV1.reports.listByUser(userId).catch(() => [] as MonthlyReportDto[]),
      StockmateApiV1.reports
        .getPrincipleStats(userId, currentYm)
        .catch(() => [] as PrincipleStatMonthDto[]),
      StockmateApiV1.reports.getPrincipleStats(userId, prevYm).catch(() => [] as PrincipleStatMonthDto[]),
    ]);
    const sortedDefs = defs.slice().sort((a, b) => a.default_rank - b.default_rank);
    const pmap = await loadPrincipleParamsMap(userId, sortedDefs, p.params);
    setDefaults(sortedDefs);
    setParamsByPid(pmap);
    setPrinciples(p);
    setLogs(l);
    setComplianceSeries(Array.isArray(comp) ? comp : []);
    setMonthlyReports(Array.isArray(reports) ? reports : []);
    setPrincipleStatsCurrent(Array.isArray(statsCurrent) ? statsCurrent : []);
    setPrincipleStatsPrev(Array.isArray(statsPrev) ? statsPrev : []);
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

  const principleChangeJournal = useMemo(() => {
    const rows: { id: string; date: Date; title: string; detail: string; source: string }[] = [];
    if (principles?.configured_at) {
      rows.push({
        id: `configured-${principles.configured_at}`,
        date: new Date(principles.configured_at),
        title: '원칙 최초 구성',
        detail: `우선순위 ${principles.rankings.length}개 기준으로 설정이 완료되었어요.`,
        source: '설정 시각 기반',
      });
    }
    if (principles?.updated_at) {
      rows.push({
        id: `updated-${principles.updated_at}`,
        date: new Date(principles.updated_at),
        title: '원칙 최근 수정',
        detail: '세부 전/후 문구는 전용 버전 이력 API 없이 현재 설정 시각으로만 추정해요.',
        source: '업데이트 시각 기반(추정)',
      });
    }
    for (const r of monthlyReports.slice(0, 6)) {
      const hint = (r.improvements ?? []).filter(Boolean).slice(0, 1)[0];
      rows.push({
        id: `report-${r.id}`,
        date: new Date(r.created_at),
        title: `${r.year}년 ${r.month}월 원칙 점검`,
        detail:
          hint ??
          `행동 ${r.behavior_count}회 · 위반 ${r.violation_count}회 · 원칙 점수 ${r.principle_score ?? '—'}`,
        source: '월간 리포트 생성 시각 기반',
      });
    }
    return rows
      .filter((r) => !Number.isNaN(r.date.getTime()))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)
      .map((r) => ({
        ...r,
        dateLabel: r.date.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      }));
  }, [principles?.configured_at, principles?.updated_at, principles?.rankings.length, monthlyReports]);

  const principleComplianceRows = useMemo(() => {
    const fallback = rankingSource.slice(0, 5).map((r) => ({
      principle_id: r.principle_id,
      rank: r.rank,
      text: displayPrincipleText(r.principle_id, r.text),
      complianceRate: null as number | null,
      violationCount: null as number | null,
      basisLabel: '원칙별 통계 데이터 없음',
    }));
    if (principleStatsCurrent.length === 0) return fallback;
    return principleStatsCurrent
      .map((s) => {
        const checks = (s.practice_ok_count ?? 0) + s.violation_count;
        const hasChecks = checks > 0;
        return {
          principle_id: s.principle_id,
          rank: s.rank ?? 999,
          text: displayPrincipleText(s.principle_id, s.text),
          complianceRate: hasChecks ? Math.round(((s.practice_ok_count ?? 0) / checks) * 100) : null,
          violationCount: s.violation_count,
          basisLabel:
            s.practice_ok_count != null
              ? `점검 ${checks}건 기준`
              : '위반 건수 기준(준수 건수 미제공)',
        };
      })
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 6);
  }, [principleStatsCurrent, rankingSource, displayPrincipleText]);

  const upwardPrincipleComparisons = useMemo(() => {
    if (principleStatsCurrent.length === 0 || principleStatsPrev.length === 0) return [];
    const prevById = new Map(principleStatsPrev.map((p) => [p.principle_id, p]));
    return principleStatsCurrent
      .map((cur) => {
        const prev = prevById.get(cur.principle_id);
        if (!prev) return null;
        const curChecks = (cur.practice_ok_count ?? 0) + cur.violation_count;
        const prevChecks = (prev.practice_ok_count ?? 0) + prev.violation_count;
        if (cur.practice_ok_count != null && prev.practice_ok_count != null && curChecks > 0 && prevChecks > 0) {
          const curRate = (cur.practice_ok_count / curChecks) * 100;
          const prevRate = (prev.practice_ok_count / prevChecks) * 100;
          const diff = Math.round(curRate - prevRate);
          if (diff <= 0) return null;
          return {
            id: cur.principle_id,
            text: displayPrincipleText(cur.principle_id, cur.text),
            metric: `준수율 +${diff}%p`,
          };
        }
        const diffViolation = prev.violation_count - cur.violation_count;
        if (diffViolation <= 0) return null;
        return {
          id: cur.principle_id,
          text: displayPrincipleText(cur.principle_id, cur.text),
          metric: `위반 ${diffViolation}건 감소`,
        };
      })
      .filter((v): v is { id: string; text: string; metric: string } => v != null)
      .slice(0, 2);
  }, [principleStatsCurrent, principleStatsPrev, displayPrincipleText]);

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

        <Text style={[styles.sectionTitle, styles.sectionTitleBlock]}>원칙 변경 일지</Text>
        <Text style={styles.sectionSub}>
          전용 변경 이력 API가 없어 설정/리포트 시각 기반으로 정리했어요.
        </Text>
        <View style={styles.card}>
          {principleChangeJournal.length === 0 ? (
            <View style={styles.journalRow}>
              <Text style={styles.journalTitle}>아직 기록이 충분하지 않아요.</Text>
              <Text style={styles.journalMeta}>원칙 저장 또는 월간 리포트가 쌓이면 자동으로 표시돼요.</Text>
            </View>
          ) : (
            principleChangeJournal.map((row, idx) => (
              <View key={row.id} style={[styles.journalRow, idx > 0 && styles.principleLineBorder]}>
                <Text style={styles.journalDate}>{row.dateLabel}</Text>
                <Text style={styles.journalTitle}>{row.title}</Text>
                <Text style={styles.journalBody} numberOfLines={2}>
                  {row.detail}
                </Text>
                <Text style={styles.journalMeta}>{row.source}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={[styles.sectionTitle, styles.sectionTitleBlock]}>원칙별 준수율</Text>
        <Text style={styles.sectionSub}>당월 원칙 통계를 우선 사용하고, 일부 항목은 위반 건수 중심으로 보여줘요.</Text>
        <View style={styles.card}>
          {principleComplianceRows.map((row, idx) => (
            <View key={row.principle_id} style={[styles.complianceRow, idx > 0 && styles.principleLineBorder]}>
              <Text style={styles.complianceText} numberOfLines={2}>
                {row.text}
              </Text>
              <View style={styles.complianceRight}>
                <Text style={styles.complianceRate}>
                  {row.complianceRate == null ? `위반 ${row.violationCount ?? 0}건` : `${row.complianceRate}%`}
                </Text>
                <Text style={styles.complianceBasis}>{row.basisLabel}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, styles.sectionTitleBlock]}>우상향 원칙 비교</Text>
        <Text style={styles.sectionSub}>전월 대비 개선된 원칙만 간단히 노출해요.</Text>
        <View style={styles.card}>
          {upwardPrincipleComparisons.length === 0 ? (
            <View style={styles.journalRow}>
              <Text style={styles.journalTitle}>이번 달 비교 데이터가 아직 부족해요.</Text>
              <Text style={styles.journalMeta}>연속 월 통계가 쌓이면 개선 항목을 자동 표시해요.</Text>
            </View>
          ) : (
            upwardPrincipleComparisons.map((row, idx) => (
              <View key={row.id} style={[styles.comparisonRow, idx > 0 && styles.principleLineBorder]}>
                <Text style={styles.comparisonText} numberOfLines={2}>
                  {row.text}
                </Text>
                <Text style={styles.comparisonMetric}>{row.metric}</Text>
              </View>
            ))
          )}
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

  journalRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  journalDate: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  journalTitle: { fontSize: 14, fontWeight: '800', color: C.text },
  journalBody: { fontSize: 13, fontWeight: '600', color: C.sub, lineHeight: 19 },
  journalMeta: { fontSize: 11, fontWeight: '700', color: P },

  complianceRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  complianceText: { flex: 1, fontSize: 13, fontWeight: '700', color: C.text, lineHeight: 19 },
  complianceRight: { alignItems: 'flex-end', minWidth: 110 },
  complianceRate: { fontSize: 15, fontWeight: '900', color: PINK },
  complianceBasis: { marginTop: 2, fontSize: 10, fontWeight: '700', color: '#9CA3AF' },

  comparisonRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  comparisonText: { flex: 1, fontSize: 13, fontWeight: '700', color: C.text, lineHeight: 19 },
  comparisonMetric: { fontSize: 12, fontWeight: '900', color: C.green },

});
