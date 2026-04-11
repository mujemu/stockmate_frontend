/**
 * StockPrincipleDetailScreen — 종목별 투자 원칙 준수 상세 진단
 * 키움증권 간편모드 스타일: 밝은 배경, 카드 중심
 */
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// ─── 색상 ────────────────────────────────────────────────────────────────────
const C = {
  bg:       '#F5F7FB',
  card:     '#FFFFFF',
  blue:     '#3F51F6',
  green:    '#00BFA5',
  red:      '#F44336',
  orange:   '#FF9800',
  yellow:   '#FFC107',
  textMain: '#1A1D2D',
  textSub:  '#7B7F96',
  border:   '#ECEDF5',
};

// ─── 더미 데이터 ──────────────────────────────────────────────────────────────
export type PrincipleCheck = {
  id:         string;
  shortLabel: string;
  text:       string;
  category:   string;
  result:     'pass' | 'fail';
  detail:     string;
};

export type StockPrincipleData = {
  stockName:  string;
  stockCode:  string;
  sectorKey:  string;
  checks:     PrincipleCheck[];
  logs:       { date: string; label: string; type: 'ok' | 'violation'; memo: string }[];
};

/** 5개 종목 더미 데이터 */
export const STOCK_PRINCIPLE_DATA: Record<string, StockPrincipleData> = {
  '278470': {
    stockName: '에이피알',
    stockCode: '278470',
    sectorKey: '필수소비재',
    checks: [
      {
        id: 'p1', shortLabel: '비중 분산', category: '리스크 관리',
        text: '한 종목에 자산의 20% 이상 투자하지 않는다',
        result: 'pass',
        detail: '포트폴리오 15% 비중 유지 — 원칙 준수',
      },
      {
        id: 'p2', shortLabel: '손절 원칙', category: '손절/익절',
        text: '8% 이상 손실 시 감정 없이 즉시 손절한다',
        result: 'fail',
        detail: '15% 손실 구간에서 원칙 무시, 오히려 추가 매수',
      },
      {
        id: 'p3', shortLabel: '장기 보유', category: '보유 전략',
        text: '매수 후 최소 3개월은 보유한다',
        result: 'pass',
        detail: '6개월 보유 후 목표가 도달 시 매도 — 원칙 준수',
      },
      {
        id: 'p4', shortLabel: '분석 후 진입', category: '매수 조건',
        text: '재무제표와 밸류에이션 확인 후 매수한다',
        result: 'pass',
        detail: '필수소비재 섹터 분석 및 PER 22배 확인 후 진입',
      },
      {
        id: 'p5', shortLabel: '감정 배제', category: '심리 관리',
        text: '뉴스·공황에 즉각 반응하지 않는다',
        result: 'fail',
        detail: '4Q 실적 실망 직후 충동적 패닉 매도 발생',
      },
    ],
    logs: [
      { date: '2026-03-12', label: '원칙 매수', type: 'ok',        memo: 'PER 분석 완료 후 진입, 분할매수 1차' },
      { date: '2026-03-28', label: '추가 매수', type: 'ok',        memo: '분할매수 2차, 목표 비중 달성' },
      { date: '2026-04-03', label: '패닉 매도', type: 'violation', memo: '실적 발표 실망 후 즉시 전량 매도 — 원칙 위반' },
      { date: '2026-04-07', label: '추격 매수', type: 'violation', memo: '손실 회복 목적 재매수, 손절 원칙 무시' },
    ],
  },

  '090430': {
    stockName: '아모레퍼시픽',
    stockCode: '090430',
    sectorKey: '필수소비재',
    checks: [
      {
        id: 'p1', shortLabel: '비중 분산', category: '리스크 관리',
        text: '한 종목에 자산의 20% 이상 투자하지 않는다',
        result: 'pass',
        detail: '포트폴리오 12% 비중 유지 — 원칙 준수',
      },
      {
        id: 'p2', shortLabel: '손절 원칙', category: '손절/익절',
        text: '8% 이상 손실 시 감정 없이 즉시 손절한다',
        result: 'fail',
        detail: '12% 손실에도 손절 미실행, "곧 반등하겠지"로 버팀',
      },
      {
        id: 'p3', shortLabel: '장기 보유', category: '보유 전략',
        text: '매수 후 최소 3개월은 보유한다',
        result: 'pass',
        detail: '8개월 보유 — 원칙 준수',
      },
      {
        id: 'p4', shortLabel: '분석 후 진입', category: '매수 조건',
        text: '재무제표와 밸류에이션 확인 후 매수한다',
        result: 'fail',
        detail: '"중국 리오프닝 수혜" 기사 하나만 보고 분석 없이 매수',
      },
      {
        id: 'p5', shortLabel: '감정 배제', category: '심리 관리',
        text: '뉴스·공황에 즉각 반응하지 않는다',
        result: 'fail',
        detail: '중국 수출 규제 뉴스 당일 보유분 전량 매도',
      },
    ],
    logs: [
      { date: '2026-02-15', label: '뉴스 보고 매수', type: 'violation', memo: '재무 분석 없이 리오프닝 기사만 보고 진입' },
      { date: '2026-03-20', label: '홀드 유지', type: 'ok',        memo: '손실 중이지만 장기보유 원칙대로 보유' },
      { date: '2026-04-02', label: '공황 매도', type: 'violation', memo: '규제 뉴스 발표 30분 후 즉시 매도 — 2번 원칙 위반' },
    ],
  },

  '039490': {
    stockName: '키움증권',
    stockCode: '039490',
    sectorKey: '금융',
    checks: [
      {
        id: 'p1', shortLabel: '비중 분산', category: '리스크 관리',
        text: '한 종목에 자산의 20% 이상 투자하지 않는다',
        result: 'pass',
        detail: '포트폴리오 10% 비중 유지 — 원칙 철저히 준수',
      },
      {
        id: 'p2', shortLabel: '손절 원칙', category: '손절/익절',
        text: '8% 이상 손실 시 감정 없이 즉시 손절한다',
        result: 'pass',
        detail: '5% 손실 시 사전 설정 가격에 즉시 손절 실행',
      },
      {
        id: 'p3', shortLabel: '장기 보유', category: '보유 전략',
        text: '매수 후 최소 3개월은 보유한다',
        result: 'pass',
        detail: '1년 이상 장기 보유, 배당 수령 — 모범 사례',
      },
      {
        id: 'p4', shortLabel: '분석 후 진입', category: '매수 조건',
        text: '재무제표와 밸류에이션 확인 후 매수한다',
        result: 'pass',
        detail: 'PBR 0.8배 저평가 구간, ROE 12% 확인 후 진입',
      },
      {
        id: 'p5', shortLabel: '감정 배제', category: '심리 관리',
        text: '뉴스·공황에 즉각 반응하지 않는다',
        result: 'pass',
        detail: '금리 인상 공포 장세에도 원칙대로 보유 유지',
      },
    ],
    logs: [
      { date: '2026-01-10', label: '원칙 매수', type: 'ok',  memo: 'PBR/ROE 분석 후 저평가 구간 1차 진입' },
      { date: '2026-02-03', label: '원칙 매수', type: 'ok',  memo: '분할매수 2차, 목표 비중 완성' },
      { date: '2026-03-15', label: '홀드 유지', type: 'ok',  memo: '금리 이슈 無시, 보유 유지' },
      { date: '2026-04-01', label: '홀드 유지', type: 'ok',  memo: '목표가 미달, 장기보유 원칙 준수' },
    ],
  },

  '005930': {
    stockName: '삼성전자',
    stockCode: '005930',
    sectorKey: '정보기술',
    checks: [
      {
        id: 'p1', shortLabel: '비중 분산', category: '리스크 관리',
        text: '한 종목에 자산의 20% 이상 투자하지 않는다',
        result: 'fail',
        detail: '포트폴리오 35% 집중 — 비중 제한 초과, 원칙 위반',
      },
      {
        id: 'p2', shortLabel: '손절 원칙', category: '손절/익절',
        text: '8% 이상 손실 시 감정 없이 즉시 손절한다',
        result: 'pass',
        detail: '10% 손실 구간에서 규정대로 일부 손절 실행',
      },
      {
        id: 'p3', shortLabel: '장기 보유', category: '보유 전략',
        text: '매수 후 최소 3개월은 보유한다',
        result: 'fail',
        detail: '단기 차익 목적으로 매수 3주 후 전량 매도',
      },
      {
        id: 'p4', shortLabel: '분석 후 진입', category: '매수 조건',
        text: '재무제표와 밸류에이션 확인 후 매수한다',
        result: 'pass',
        detail: '반도체 업황 사이클 및 EPS 성장률 분석 후 진입',
      },
      {
        id: 'p5', shortLabel: '감정 배제', category: '심리 관리',
        text: '뉴스·공황에 즉각 반응하지 않는다',
        result: 'pass',
        detail: '외국인 순매도 지속에도 원칙대로 보유 판단',
      },
    ],
    logs: [
      { date: '2026-02-20', label: '과잉 매수', type: 'violation', memo: '비중 35% 집중, 분산 원칙 위반' },
      { date: '2026-03-10', label: '원칙 손절', type: 'ok',        memo: '10% 손실 도달, 규정대로 일부 손절' },
      { date: '2026-03-18', label: '단기 매도', type: 'violation', memo: '3주 만에 전량 매도, 장기보유 원칙 위반' },
      { date: '2026-04-05', label: '원칙 매수', type: 'ok',        memo: '분석 후 재진입, 비중 15%로 조정' },
    ],
  },

  '000660': {
    stockName: 'SK하이닉스',
    stockCode: '000660',
    sectorKey: '정보기술',
    checks: [
      {
        id: 'p1', shortLabel: '비중 분산', category: '리스크 관리',
        text: '한 종목에 자산의 20% 이상 투자하지 않는다',
        result: 'fail',
        detail: '포트폴리오 28% 집중 — 비중 제한 8%p 초과',
      },
      {
        id: 'p2', shortLabel: '손절 원칙', category: '손절/익절',
        text: '8% 이상 손실 시 감정 없이 즉시 손절한다',
        result: 'fail',
        detail: '9% 손실에도 손절 미실행, "반도체는 기다려야" 버팀',
      },
      {
        id: 'p3', shortLabel: '장기 보유', category: '보유 전략',
        text: '매수 후 최소 3개월은 보유한다',
        result: 'fail',
        detail: '급등 2주 후 단기 차익 실현으로 즉시 매도',
      },
      {
        id: 'p4', shortLabel: '분석 후 진입', category: '매수 조건',
        text: '재무제표와 밸류에이션 확인 후 매수한다',
        result: 'fail',
        detail: '"HBM 수혜 종목" 커뮤니티 글 보고 분석 없이 추격 매수',
      },
      {
        id: 'p5', shortLabel: '감정 배제', category: '심리 관리',
        text: '뉴스·공황에 즉각 반응하지 않는다',
        result: 'fail',
        detail: 'HBM 공급 과잉 뉴스에 충동적 추가 매수 후 손실 확대',
      },
    ],
    logs: [
      { date: '2026-02-28', label: '추격 매수', type: 'violation', memo: 'HBM 테마 소식에 분석 없이 급매수, 비중 28%' },
      { date: '2026-03-05', label: '충동 매수', type: 'violation', memo: '추가 호재 기대로 비중 더 늘림' },
      { date: '2026-03-14', label: '단기 매도', type: 'violation', memo: '급등 후 2주 만에 차익 실현, 장기원칙 위반' },
      { date: '2026-03-25', label: '공황 매수', type: 'violation', memo: '다시 급락 후 평균 낮추려 추가 매수 — 손실 확대' },
    ],
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  navigation: { goBack: () => void };
  route: { params: { stockCode: string } };
}

// ─── 등급 계산 ────────────────────────────────────────────────────────────────
function getGrade(pass: number, total: number): { label: string; color: string } {
  const rate = pass / total;
  if (rate >= 1.0) return { label: 'S', color: C.blue };
  if (rate >= 0.8) return { label: 'A', color: C.green };
  if (rate >= 0.6) return { label: 'B', color: C.green };
  if (rate >= 0.4) return { label: 'C', color: C.orange };
  if (rate >= 0.2) return { label: 'D', color: C.red };
  return { label: 'F', color: '#B71C1C' };
}

// ════════════════════════════════════════════════════════════════════════════
export function StockPrincipleDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { stockCode } = route.params;

  const data = STOCK_PRINCIPLE_DATA[stockCode];

  if (!data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backHit}>
            <Ionicons name="chevron-back" size={28} color={C.textMain} />
          </Pressable>
          <Text style={styles.headerTitle}>종목 진단</Text>
          <View style={styles.backHit} />
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.emptyTxt}>해당 종목의 데이터가 없습니다.</Text>
        </View>
      </View>
    );
  }

  const passCount = data.checks.filter((c) => c.result === 'pass').length;
  const total     = data.checks.length;
  const rate      = Math.round((passCount / total) * 100);
  const grade     = getGrade(passCount, total);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backHit}>
          <Ionicons name="chevron-back" size={28} color={C.textMain} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{data.stockName} 원칙 진단</Text>
        <View style={styles.backHit} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 1. 종목 스코어 카드 ─────────────────────────────────────── */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreLeft}>
            <View style={[styles.gradeCircle, { borderColor: grade.color }]}>
              <Text style={[styles.gradeText, { color: grade.color }]}>{grade.label}</Text>
            </View>
          </View>
          <View style={styles.scoreRight}>
            <Text style={styles.stockNameLg}>{data.stockName}</Text>
            <Text style={styles.stockMeta}>{data.stockCode} · {data.sectorKey}</Text>
            <View style={styles.scoreRow}>
              <View style={styles.scoreBadge}>
                <Text style={[styles.scoreNum, { color: C.green }]}>{passCount}</Text>
                <Text style={styles.scoreNumLabel}>준수</Text>
              </View>
              <View style={[styles.scoreDivider]} />
              <View style={styles.scoreBadge}>
                <Text style={[styles.scoreNum, { color: C.red }]}>{total - passCount}</Text>
                <Text style={styles.scoreNumLabel}>위반</Text>
              </View>
              <View style={[styles.scoreDivider]} />
              <View style={styles.scoreBadge}>
                <Text style={[styles.scoreNum, { color: grade.color }]}>{rate}%</Text>
                <Text style={styles.scoreNumLabel}>준수율</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 2. 원칙별 체크 ──────────────────────────────────────────── */}
        <SectionTitle icon="shield-checkmark" title="원칙별 진단" />
        <View style={styles.card}>
          {data.checks.map((check, idx) => (
            <View
              key={check.id}
              style={[styles.checkRow, idx > 0 && styles.checkRowBorder]}
            >
              {/* 아이콘 */}
              <View style={[
                styles.checkIcon,
                { backgroundColor: check.result === 'pass' ? '#E8F5E9' : '#FFEBEE' },
              ]}>
                <Ionicons
                  name={check.result === 'pass' ? 'checkmark' : 'close'}
                  size={16}
                  color={check.result === 'pass' ? C.green : C.red}
                />
              </View>

              {/* 내용 */}
              <View style={styles.checkBody}>
                <View style={styles.checkTopRow}>
                  <Text style={[
                    styles.checkShortLabel,
                    { color: check.result === 'pass' ? C.green : C.red },
                  ]}>
                    {check.shortLabel}
                  </Text>
                  <View style={[
                    styles.categoryTag,
                    { backgroundColor: C.blue + '14' },
                  ]}>
                    <Text style={styles.categoryTagTxt}>{check.category}</Text>
                  </View>
                </View>
                <Text style={styles.checkText} numberOfLines={2}>{check.text}</Text>
                <Text style={[
                  styles.checkDetail,
                  { color: check.result === 'pass' ? '#1B5E20' : '#B71C1C' },
                ]}>
                  {check.detail}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── 3. 최근 거래 내역 ────────────────────────────────────────── */}
        <SectionTitle icon="time" title="최근 거래 내역" />
        <View style={styles.card}>
          {data.logs.map((log, idx) => (
            <View
              key={idx}
              style={[styles.logRow, idx > 0 && styles.logRowBorder]}
            >
              <View style={[
                styles.logDot,
                { backgroundColor: log.type === 'ok' ? C.green : C.red },
              ]} />
              <View style={styles.logBody}>
                <View style={styles.logTopRow}>
                  <Text style={styles.logDate}>{log.date}</Text>
                  <View style={[
                    styles.logTypeBadge,
                    { backgroundColor: log.type === 'ok' ? '#E8F5E9' : '#FFEBEE' },
                  ]}>
                    <Text style={[
                      styles.logTypeTxt,
                      { color: log.type === 'ok' ? C.green : C.red },
                    ]}>
                      {log.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.logMemo}>{log.memo}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── 4. 요약 코멘트 ───────────────────────────────────────────── */}
        <View style={[styles.summaryCard, {
          borderColor: passCount >= 4 ? C.green : passCount >= 3 ? C.orange : C.red,
        }]}>
          <Ionicons
            name={passCount >= 4 ? 'trophy' : passCount >= 3 ? 'alert-circle' : 'warning'}
            size={20}
            color={passCount >= 4 ? C.green : passCount >= 3 ? C.orange : C.red}
          />
          <Text style={styles.summaryTxt}>
            {passCount === total
              ? `${data.stockName} 모든 원칙을 완벽히 지켰습니다. 이 투자 방식을 유지하세요.`
              : passCount >= 4
              ? `${data.stockName} 대부분의 원칙을 준수했습니다. ${data.checks.find(c => c.result === 'fail')?.shortLabel} 보완이 필요합니다.`
              : passCount >= 3
              ? `${data.stockName} 원칙 준수가 보통 수준입니다. 위반 항목을 반드시 개선하세요.`
              : passCount >= 2
              ? `${data.stockName} 원칙 위반이 많습니다. 매수 전 체크리스트를 다시 확인하세요.`
              : `${data.stockName} 원칙이 거의 지켜지지 않았습니다. 투자 원칙을 재정립하세요.`
            }
          </Text>
        </View>

        <View style={{ height: Math.max(insets.bottom + 16, 32) }} />
      </ScrollView>
    </View>
  );
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────
function SectionTitle({ icon, title }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Ionicons name={icon as any} size={15} color={C.textSub} />
      <Text style={styles.sectionTitleTxt}>{title}</Text>
    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: C.bg },
  scroll:   { paddingHorizontal: 16, paddingTop: 8 },
  centerBox:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { fontSize: 14, color: C.textSub },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingBottom: 8,
    backgroundColor: C.bg,
  },
  backHit:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900', color: C.textMain },

  // 스코어 카드
  scoreCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  scoreLeft: { alignItems: 'center' },
  gradeCircle: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bg,
  },
  gradeText: { fontSize: 30, fontWeight: '900' },
  scoreRight: { flex: 1 },
  stockNameLg: { fontSize: 20, fontWeight: '900', color: C.textMain, marginBottom: 4 },
  stockMeta:   { fontSize: 12, color: C.textSub, fontWeight: '700', marginBottom: 12 },
  scoreRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoreBadge:  { alignItems: 'center' },
  scoreNum:    { fontSize: 20, fontWeight: '900' },
  scoreNumLabel: { fontSize: 11, color: C.textSub, fontWeight: '700', marginTop: 2 },
  scoreDivider: { width: 1, height: 28, backgroundColor: C.border },

  // 섹션 타이틀
  sectionTitle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 8, marginTop: 4,
  },
  sectionTitleTxt: { fontSize: 13, fontWeight: '800', color: C.textSub },

  // 카드
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
    overflow: 'hidden',
  },

  // 원칙 체크 행
  checkRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  checkRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  checkIcon: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  checkBody:     { flex: 1 },
  checkTopRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  checkShortLabel:{ fontSize: 13, fontWeight: '900' },
  categoryTag:   { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  categoryTagTxt:{ fontSize: 10, fontWeight: '800', color: C.blue },
  checkText:     { fontSize: 12, color: C.textSub, fontWeight: '600', lineHeight: 17, marginBottom: 6 },
  checkDetail:   { fontSize: 13, fontWeight: '700', lineHeight: 18 },

  // 로그 행
  logRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  logRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  logDot:  { width: 10, height: 10, borderRadius: 5, marginTop: 5, flexShrink: 0 },
  logBody: { flex: 1 },
  logTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  logDate:   { fontSize: 11, color: C.textSub, fontWeight: '700' },
  logTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  logTypeTxt:   { fontSize: 11, fontWeight: '800' },
  logMemo:  { fontSize: 13, color: C.textMain, fontWeight: '600', lineHeight: 19 },

  // 요약 코멘트
  summaryCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  summaryTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: C.textMain, lineHeight: 20 },
});