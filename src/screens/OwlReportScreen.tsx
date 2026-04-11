/**
 * OwlReportScreen — 투자 원칙 준수 대시보드
 * 키움증권 간편모드 스타일: 밝은 배경, 카드 중심, 핵심 정보만
 *
 * 데이터 흐름:
 *  1. principles.getStatus   → 내 원칙 목록 (랭킹순)
 *  2. behaviorLogs.listByUser → 최근 거래 행동 로그
 *  3. reports.getCompliance  → 이달 준수율
 *  → 클라이언트에서 종목별 준수/위반 집계
 */
import React, { useCallback, useEffect, useState } from 'react';
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
import { useUserSession } from '../context/UserSessionContext';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import { STOCK_PRINCIPLE_DATA } from './StockPrincipleDetailScreen';
import type {
  BehaviorLogDto,
  ComplianceMonthDto,
  PrinciplesStatusDto,
} from '../types/stockmateApiV1';

// ─── 더미 종목 집계 (항상 표시) ───────────────────────────────────────────────
const DUMMY_STOCK_ROWS = Object.values(STOCK_PRINCIPLE_DATA).map((d) => ({
  stockName: d.stockName,
  stockCode: d.stockCode,
  sectorKey: d.sectorKey,
  ok:        d.checks.filter((c) => c.result === 'pass').length,
  violation: d.checks.filter((c) => c.result === 'fail').length,
}));

// ─── 색상 ────────────────────────────────────────────────────────────────────
const C = {
  bg:       '#F5F7FB',
  card:     '#FFFFFF',
  blue:     '#3F51F6',   // 키움 블루
  green:    '#00BFA5',
  red:      '#F44336',
  orange:   '#FF9800',
  textMain: '#1A1D2D',
  textSub:  '#7B7F96',
  border:   '#ECEDF5',
};

// ─── 행동 유형 분류 ───────────────────────────────────────────────────────────
const VIOLATION_TYPES = new Set([
  'against_principle', 'no_principle', 'rule_break', 'panic_sell', 'greed_buy',
]);
const OK_TYPES = new Set(['normal_buy', 'normal_sell', 'hold', 'more_thinking', 'check_numbers']);

function classifyLog(log: BehaviorLogDto): 'violation' | 'ok' | 'neutral' {
  if (log.is_rule_violation)         return 'violation';
  if (VIOLATION_TYPES.has(log.behavior_type)) return 'violation';
  if (OK_TYPES.has(log.behavior_type))        return 'ok';
  return 'neutral';
}

const BEHAVIOR_LABEL: Record<string, string> = {
  against_principle: '원칙 위반',
  no_principle:      '원칙 무시',
  rule_break:        '규칙 파기',
  panic_sell:        '공황 매도',
  greed_buy:         '탐욕 매수',
  normal_buy:        '원칙 매수',
  normal_sell:       '원칙 매도',
  hold:              '홀드 유지',
  more_thinking:     '신중 검토',
  check_numbers:     '숫자 확인',
  quick_enter:       '빠른 진입',
  issues_only:       '이슈 확인',
  view_sector:       '섹터 열람',
  skip:              '패스',
};

// ─── 종목별 집계 ──────────────────────────────────────────────────────────────
type StockSummary = {
  stockName: string;
  stockCode: string | null;
  ok:        number;
  violation: number;
  logs:      BehaviorLogDto[];
};

function buildStockSummaries(logs: BehaviorLogDto[]): StockSummary[] {
  const map = new Map<string, StockSummary>();
  for (const log of logs) {
    const key = log.stock_name ?? log.stock_code ?? '알 수 없음';
    if (!map.has(key)) {
      map.set(key, { stockName: key, stockCode: log.stock_code, ok: 0, violation: 0, logs: [] });
    }
    const s = map.get(key)!;
    const cls = classifyLog(log);
    if (cls === 'violation') s.violation++;
    else if (cls === 'ok')   s.ok++;
    s.logs.push(log);
  }
  // 위반 많은 순 정렬
  return Array.from(map.values()).sort((a, b) => b.violation - a.violation);
}

// ─── 날짜 헬퍼 ───────────────────────────────────────────────────────────────
function thisMonthRange(): { start: string; end: string } {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  navigation: { goBack: () => void; navigate: (screen: string, params?: object) => void };
  route?: { params?: { sectorKey?: string; stockCode?: string; stockName?: string } };
}

// ════════════════════════════════════════════════════════════════════════════
export function OwlReportScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { userId, ready } = useUserSession();

  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [principles,  setPrinciples]  = useState<PrinciplesStatusDto | null>(null);
  const [logs,        setLogs]        = useState<BehaviorLogDto[]>([]);
  const [compliance,  setCompliance]  = useState<ComplianceMonthDto | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    try {
      const [p, l, c] = await Promise.all([
        StockmateApiV1.principles.getStatus(userId),
        StockmateApiV1.behaviorLogs.listByUser(userId, 50),
        StockmateApiV1.reports.getCompliance(userId, thisMonthRange()).catch(() => [] as ComplianceMonthDto[]),
      ]);
      setPrinciples(p);
      setLogs(l);
      const now = new Date();
      const thisMonth = (c as ComplianceMonthDto[]).find(
        (m) => m.year === now.getFullYear() && m.month === now.getMonth() + 1
      ) ?? null;
      setCompliance(thisMonth);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [userId]);

  useEffect(() => {
    if (!ready || !userId) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [ready, userId, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // ── 집계 ──────────────────────────────────────────────────────────────────
  const totalLogs    = logs.filter((l) => classifyLog(l) !== 'neutral').length;
  const totalOk      = logs.filter((l) => classifyLog(l) === 'ok').length;
  const totalVio     = logs.filter((l) => classifyLog(l) === 'violation').length;
  const complianceRate =
    compliance != null
      ? Math.round(compliance.compliance_rate)
      : totalLogs > 0
      ? Math.round((totalOk / totalLogs) * 100)
      : null;

  const stockSummaries = buildStockSummaries(logs);
  const violations = logs.filter((l) => classifyLog(l) === 'violation').slice(0, 10);

  // ── 준수율 색상 ─────────────────────────────────────────────────────────
  function rateColor(r: number) {
    if (r >= 80) return C.green;
    if (r >= 60) return C.orange;
    return C.red;
  }

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <DashHeader onBack={() => navigation.goBack()} />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={C.blue} />
          <Text style={styles.loadingTxt}>데이터 불러오는 중…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <DashHeader onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />}
      >
        {error && (
          <View style={styles.errBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={C.red} />
            <Text style={styles.errTxt}>{error}</Text>
          </View>
        )}

        {/* ── 1. 요약 지표 3칸 ─────────────────────────────────────────── */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="이달 준수율"
            value={complianceRate != null ? `${complianceRate}%` : '—'}
            color={complianceRate != null ? rateColor(complianceRate) : C.textSub}
            icon="shield-checkmark"
          />
          <MetricCard
            label="원칙 준수"
            value={String(totalOk)}
            color={C.green}
            icon="checkmark-circle"
          />
          <MetricCard
            label="원칙 위반"
            value={String(totalVio)}
            color={totalVio > 0 ? C.red : C.textSub}
            icon="close-circle"
          />
        </View>

        {/* ── 2. 내 투자 원칙 ──────────────────────────────────────────── */}
        <SectionTitle
          icon="list"
          title="내 투자 원칙"
          right={
            <Pressable
              onPress={() => navigation.navigate('Principles')}
              style={({ pressed }) => [styles.principlesEditBtn, pressed && styles.principlesEditBtnPressed]}
              hitSlop={8}
            >
              <Text style={styles.principlesEditBtnTxt}>투자 원칙 수정</Text>
            </Pressable>
          }
        />
        {!principles?.is_configured ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTxt}>원칙이 아직 설정되지 않았어요.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {principles.rankings.slice(0, 5).map((r, idx) => (
              <View
                key={r.principle_id}
                style={[styles.principleRow, idx > 0 && styles.principleRowBorder]}
              >
                <View style={[styles.rankBadge, { backgroundColor: idx < 3 ? C.blue : C.border }]}>
                  <Text style={[styles.rankNum, { color: idx < 3 ? '#fff' : C.textSub }]}>
                    {r.rank}
                  </Text>
                </View>
                <View style={styles.principleMeta}>
                  <Text style={styles.principleShort}>{r.short_label}</Text>
                  <Text style={styles.principleText} numberOfLines={2}>{r.text}</Text>
                </View>
              </View>
            ))}
            {principles.rankings.length > 5 && (
              <Text style={styles.moreHint}>외 {principles.rankings.length - 5}개 더</Text>
            )}
          </View>
        )}

        {/* ── 3. 종목별 원칙 진단 ─────────────────────────────────────── */}
        <SectionTitle icon="bar-chart" title="종목별 원칙 진단" />
        <View style={styles.card}>
          {DUMMY_STOCK_ROWS.map((s, idx) => {
            const total = s.ok + s.violation;
            const rate  = total > 0 ? Math.round((s.ok / total) * 100) : null;
            const isBad = s.violation > 0;
            return (
              <Pressable
                key={s.stockCode}
                style={({ pressed }) => [
                  styles.stockRow,
                  idx > 0 && styles.stockRowBorder,
                  pressed && styles.stockRowPressed,
                ]}
                onPress={() =>
                  navigation.navigate('StockPrincipleDetail', { stockCode: s.stockCode })
                }
              >
                {/* 좌: 상태 점 + 종목명 */}
                <View style={styles.stockLeft}>
                  <View style={[styles.stockDot, { backgroundColor: isBad ? C.red : C.green }]} />
                  <View>
                    <Text style={styles.stockName}>{s.stockName}</Text>
                    <Text style={styles.stockCode}>{s.stockCode} · {s.sectorKey}</Text>
                  </View>
                </View>

                {/* 우: 준수/위반 칩 + 준수율 + 화살표 */}
                <View style={styles.stockRight}>
                  {s.ok > 0 && (
                    <View style={styles.okChip}>
                      <Text style={styles.okChipTxt}>✓ {s.ok}</Text>
                    </View>
                  )}
                  {s.violation > 0 && (
                    <View style={styles.vioChip}>
                      <Text style={styles.vioChipTxt}>✕ {s.violation}</Text>
                    </View>
                  )}
                  {rate != null && (
                    <Text style={[styles.rateText, { color: rateColor(rate) }]}>{rate}%</Text>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={C.textSub} />
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── 4. 최근 위반 목록 ─────────────────────────────────────────── */}
        {violations.length > 0 && (
          <>
            <SectionTitle icon="warning" title="최근 위반 내역" color={C.red} />
            <View style={[styles.card, styles.vioCard]}>
              {violations.map((log, idx) => (
                <View
                  key={log.id}
                  style={[styles.vioRow, idx > 0 && styles.vioRowBorder]}
                >
                  <View style={styles.vioBullet} />
                  <View style={styles.vioInfo}>
                    <View style={styles.vioTop}>
                      <Text style={styles.vioStock}>
                        {log.stock_name ?? log.stock_code ?? '종목 미상'}
                      </Text>
                      <View style={styles.vioTypeBadge}>
                        <Text style={styles.vioTypeTxt}>
                          {BEHAVIOR_LABEL[log.behavior_type] ?? log.behavior_type}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.vioDate}>{log.logged_at.slice(0, 10)}</Text>
                    {log.user_memo && (
                      <Text style={styles.vioMemo} numberOfLines={2}>{log.user_memo}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── 5. 원칙 준수 종목 (좋은 소식) ──────────────────────────── */}
        {stockSummaries.some((s) => s.ok > 0 && s.violation === 0) && (
          <>
            <SectionTitle icon="star" title="원칙 잘 지킨 종목" color={C.green} />
            <View style={styles.card}>
              {stockSummaries
                .filter((s) => s.ok > 0 && s.violation === 0)
                .map((s, idx) => (
                  <View
                    key={s.stockName}
                    style={[styles.goodRow, idx > 0 && styles.goodRowBorder]}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={C.green} />
                    <Text style={styles.goodName}>{s.stockName}</Text>
                    <Text style={styles.goodCount}>{s.ok}회 준수</Text>
                  </View>
                ))}
            </View>
          </>
        )}

        <View style={{ height: Math.max(insets.bottom + 16, 32) }} />
      </ScrollView>
    </View>
  );
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function DashHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.backHit}>
        <Ionicons name="chevron-back" size={28} color={C.textMain} />
      </Pressable>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>투자 원칙 리포트</Text>
        <Text style={styles.headerSub}>내 원칙 기반 거래 진단</Text>
      </View>
      <View style={styles.backHit} />
    </View>
  );
}

function MetricCard({
  label, value, color, icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={styles.metricCard}>
      <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 6 }} />
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({
  icon,
  title,
  color = C.textMain,
  right,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  color?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={[styles.sectionTitle, right ? styles.sectionTitleWithRight : null]}>
      <View style={styles.sectionTitleLeft}>
        <Ionicons name={icon as any} size={16} color={color} />
        <Text style={[styles.sectionTitleTxt, { color }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },
  scroll:     { paddingHorizontal: 16, paddingTop: 8 },
  centerBox:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { fontSize: 14, color: C.textSub, fontWeight: '600' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
    backgroundColor: C.bg,
  },
  backHit:      { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '900', color: C.textMain },
  headerSub:    { fontSize: 11, fontWeight: '700', color: C.textSub, marginTop: 2 },

  // Error
  errBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, marginBottom: 12,
  },
  errTxt: { flex: 1, fontSize: 13, color: C.red, fontWeight: '600' },

  // 지표 카드 행
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  metricCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#0001',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  metricValue: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  metricLabel: { fontSize: 11, fontWeight: '700', color: C.textSub, textAlign: 'center' },

  // Section title
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitleWithRight: {
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  sectionTitleTxt: { fontSize: 14, fontWeight: '800', flexShrink: 1 },
  principlesEditBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#E8EAFF',
    borderWidth: 1,
    borderColor: C.blue,
  },
  principlesEditBtnPressed: { opacity: 0.88 },
  principlesEditBtnTxt: { fontSize: 12, fontWeight: '800', color: C.blue },

  // 공통 카드
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  emptyCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyTxt: { fontSize: 13, color: C.textSub, fontWeight: '600' },

  // 원칙 목록
  principleRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  principleRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  rankBadge: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  rankNum:      { fontSize: 12, fontWeight: '900' },
  principleMeta:{ flex: 1 },
  principleShort: { fontSize: 12, fontWeight: '800', color: C.blue, marginBottom: 3 },
  principleText:  { fontSize: 13, fontWeight: '600', color: C.textMain, lineHeight: 19 },
  moreHint: {
    fontSize: 12, color: C.textSub, fontWeight: '700',
    textAlign: 'center', paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
  },

  // 종목별
  stockRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  stockRowBorder:   { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  stockRowPressed:  { backgroundColor: '#F0F2FF' },
  stockLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  stockDot:   { width: 10, height: 10, borderRadius: 5 },
  stockName:  { fontSize: 14, fontWeight: '800', color: C.textMain },
  stockCode:  { fontSize: 11, color: C.textSub, fontWeight: '600', marginTop: 2 },
  stockRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  okChip:  { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  okChipTxt: { fontSize: 12, fontWeight: '800', color: C.green },
  vioChip: { backgroundColor: '#FFEBEE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  vioChipTxt: { fontSize: 12, fontWeight: '800', color: C.red },
  rateText:   { fontSize: 13, fontWeight: '900', minWidth: 38, textAlign: 'right' },

  // 위반 목록
  vioCard: { borderColor: '#FFCDD2' },
  vioRow:  {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  vioRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#FFCDD2' },
  vioBullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red, marginTop: 6 },
  vioInfo:   { flex: 1 },
  vioTop:    { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  vioStock:  { fontSize: 14, fontWeight: '800', color: C.textMain },
  vioTypeBadge: {
    backgroundColor: '#FFEBEE', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  vioTypeTxt: { fontSize: 11, fontWeight: '800', color: C.red },
  vioDate:    { fontSize: 11, color: C.textSub, fontWeight: '600', marginTop: 4 },
  vioMemo:    { fontSize: 12, color: '#5D4037', fontWeight: '600', marginTop: 4, lineHeight: 18 },

  // 원칙 준수 종목
  goodRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  goodRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  goodName:  { flex: 1, fontSize: 14, fontWeight: '800', color: C.textMain },
  goodCount: { fontSize: 12, fontWeight: '800', color: C.green },
});
