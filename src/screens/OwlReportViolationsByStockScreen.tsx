/**
 * 이번 달 원칙 위반 — 종목별 상세 (나의 투자 원칙 화면에서 진입)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserSession } from '../context/UserSessionContext';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import type { BehaviorLogDto } from '../types/stockmateApiV1';

const VIOLATION_TYPES = new Set([
  'against_principle',
  'no_principle',
  'rule_break',
  'panic_sell',
  'greed_buy',
]);

function classifyViolation(log: BehaviorLogDto): boolean {
  if (log.is_rule_violation) return true;
  return VIOLATION_TYPES.has(log.behavior_type);
}

function inCalendarMonth(iso: string, y: number, m: number): boolean {
  const d = new Date(iso);
  return d.getFullYear() === y && d.getMonth() + 1 === m;
}

type Props = {
  navigation: { goBack: () => void; navigate: (s: string, p?: object) => void };
  route: { params?: { year?: number; month?: number } };
};

export function OwlReportViolationsByStockScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { userId, ready } = useUserSession();
  const now = new Date();
  const y = route.params?.year ?? now.getFullYear();
  const mo = route.params?.month ?? now.getMonth() + 1;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<
    { stockName: string; stockCode: string | null; count: number; items: BehaviorLogDto[] }[]
  >([]);

  const load = useCallback(async () => {
    if (!userId) return;
    const logs = await StockmateApiV1.behaviorLogs.listByUser(userId, 200);
    const v = logs.filter((l) => classifyViolation(l) && inCalendarMonth(l.logged_at, y, mo));
    const map = new Map<string, { stockName: string; stockCode: string | null; items: BehaviorLogDto[] }>();
    for (const log of v) {
      const name = log.stock_name ?? log.stock_code ?? '종목 미상';
      if (!map.has(name)) {
        map.set(name, { stockName: name, stockCode: log.stock_code, items: [] });
      }
      map.get(name)!.items.push(log);
    }
    const out = Array.from(map.values())
      .map((x) => ({ ...x, count: x.items.length }))
      .sort((a, b) => b.count - a.count);
    setRows(out);
  }, [userId, y, mo]);

  useEffect(() => {
    if (!ready || !userId) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [ready, userId, load]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backHit}>
          <Ionicons name="chevron-back" size={26} color="#1A1D2D" />
        </Pressable>
        <Text style={styles.title}>이번 달 위반 · 종목별</Text>
        <View style={styles.backHit} />
      </View>
      <Text style={styles.sub}>
        {y}년 {mo}월 · 원칙 위반으로 집계된 매매·점검 기록만 보여요.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#7D3BDD" />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTxt}>이번 달 기록된 위반이 없어요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {rows.map((r, idx) => (
            <View key={r.stockName} style={[styles.card, idx > 0 && styles.cardGap]}>
              <View style={styles.cardHead}>
                <Text style={styles.stockName}>{r.stockName}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>위반 {r.count}회</Text>
                </View>
              </View>
              {r.stockCode ? (
                <Text style={styles.code}>{r.stockCode}</Text>
              ) : null}
              {r.items.slice(0, 8).map((log) => (
                <View key={log.id} style={styles.line}>
                  <Text style={styles.lineDate}>{log.logged_at.slice(0, 10)}</Text>
                  <Text style={styles.lineType} numberOfLines={1}>
                    {log.behavior_type === 'normal_buy' || log.behavior_type === 'normal_sell'
                      ? '주문 점검'
                      : log.behavior_type}
                  </Text>
                </View>
              ))}
              {r.items.length > 8 ? (
                <Text style={styles.more}>외 {r.items.length - 8}건</Text>
              ) : null}
            </View>
          ))}
          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  backHit: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900', color: '#1A1D2D' },
  sub: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    paddingHorizontal: 18,
    marginBottom: 12,
    lineHeight: 19,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyTxt: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },
  cardGap: { marginTop: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E9F0',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stockName: { fontSize: 16, fontWeight: '900', color: '#111827', flex: 1, marginRight: 8 },
  badge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeTxt: { fontSize: 12, fontWeight: '800', color: '#DC2626' },
  code: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginTop: 4, marginBottom: 10 },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
  },
  lineDate: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  lineType: { fontSize: 12, color: '#374151', fontWeight: '700', flex: 1, marginLeft: 12, textAlign: 'right' },
  more: { fontSize: 12, color: '#7D3BDD', fontWeight: '700', marginTop: 6 },
});
