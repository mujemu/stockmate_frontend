import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../config/colors';
import { resolveStockLogo } from '../../config/stockLogoAssets';
import type { SimulatedHoldingDto } from '../../types/stockmateApiV1';

type HoldingsTab = 'general' | 'decimal';

type Props = {
  accountLabel?: string;
  /** 모의 매매 잔고 — 있으면 잔고 카드로 표시 */
  holdings?: SimulatedHoldingDto[];
  /** 현재 종목명과 일치하면 행을 살짝 강조 */
  highlightStockName?: string;
  onPressAccount?: () => void;
  onPressCollectCta?: () => void;
  onPressOrders?: () => void;
  onPressPending?: () => void;
  /** 잔고 행 탭 → 해당 종목 매도 수량 화면 */
  onPressHoldingRow?: (h: SimulatedHoldingDto) => void;
};

export function StockMyHoldingsSection({
  accountLabel = '위탁종합 6260-1612',
  holdings,
  highlightStockName,
  onPressAccount,
  onPressCollectCta,
  onPressOrders,
  onPressPending,
  onPressHoldingRow,
}: Props) {
  const [tab, setTab] = useState<HoldingsTab>('general');

  const sortedHoldings = useMemo(() => {
    if (!holdings?.length) return [];
    return [...holdings].sort((a, b) => b.eval_won - a.eval_won);
  }, [holdings]);

  const totals = useMemo(() => {
    if (!sortedHoldings.length) return { eval: 0, pnl: 0, cost: 0 };
    const evalW = sortedHoldings.reduce((s, h) => s + h.eval_won, 0);
    const pnlW = sortedHoldings.reduce((s, h) => s + h.pnl_won, 0);
    const costW = sortedHoldings.reduce((s, h) => s + h.total_cost_won, 0);
    return { eval: evalW, pnl: pnlW, cost: costW };
  }, [sortedHoldings]);

  const hasHoldings = sortedHoldings.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>내종목</Text>
          <Ionicons name="information-circle-outline" size={18} color="#A0A5B8" style={styles.infoIcon} />
        </View>
        <Pressable
          style={styles.accountHit}
          onPress={onPressAccount}
          accessibilityRole="button"
          accessibilityLabel="계좌 선택"
        >
          <Text style={styles.account}>{accountLabel}</Text>
          <Ionicons name="chevron-down" size={16} color="#7C8193" />
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={styles.tabCell}
          onPress={() => setTab('general')}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'general' }}
        >
          <Text style={[styles.tabLabel, tab === 'general' && styles.tabLabelActive]}>일반</Text>
          <View style={[styles.tabUnderline, tab === 'general' && styles.tabUnderlineActive]} />
        </Pressable>
        <Pressable
          style={styles.tabCell}
          onPress={() => setTab('decimal')}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'decimal' }}
        >
          <Text style={[styles.tabLabel, tab === 'decimal' && styles.tabLabelActive]}>소수점</Text>
          <View style={[styles.tabUnderline, tab === 'decimal' && styles.tabUnderlineActive]} />
        </Pressable>
      </View>

      {hasHoldings ? (
        <View style={styles.holdingsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLbl}>총 평가금액</Text>
            <Text style={styles.totalVal}>{totals.eval.toLocaleString('ko-KR')}원</Text>
          </View>
          <Text
            style={[
              styles.totalPnl,
              totals.pnl > 0 ? styles.pnlUp : totals.pnl < 0 ? styles.pnlDown : styles.pnlFlat,
            ]}
          >
            {totals.pnl >= 0 ? '+' : ''}
            {totals.pnl.toLocaleString('ko-KR')}
            {totals.cost > 0 ? ` (${(totals.pnl / totals.cost * 100).toFixed(2)}%)` : ''}
          </Text>
          {sortedHoldings.map((h) => {
            const hi = highlightStockName && h.stock_name === highlightStockName;
            const rowInner = (
              <>
                <View style={styles.hLogo}>
                  {(() => {
                    const src = resolveStockLogo(h.stock_code, h.stock_name);
                    return src ? (
                      <Image source={src} style={styles.hLogoImg} resizeMode="contain" />
                    ) : (
                      <Text style={styles.hLogoTxt}>{h.stock_name.slice(0, 1)}</Text>
                    );
                  })()}
                </View>
                <View style={styles.hMid}>
                  <Text style={styles.hName} numberOfLines={1}>
                    {h.stock_name}
                  </Text>
                  <Text style={styles.hQty}>{h.quantity.toLocaleString('ko-KR')}주</Text>
                </View>
                <View style={styles.hRight}>
                  <Text style={styles.hEval}>{h.eval_won.toLocaleString('ko-KR')}원</Text>
                  <Text
                    style={[
                      styles.hPnl,
                      h.pnl_won > 0 ? styles.pnlUp : h.pnl_won < 0 ? styles.pnlDown : styles.pnlFlat,
                    ]}
                  >
                    {h.pnl_won >= 0 ? '+' : ''}
                    {h.pnl_won.toLocaleString('ko-KR')} ({h.pnl_pct.toFixed(2)}%)
                  </Text>
                </View>
              </>
            );
            const key = `${h.stock_name}-${h.stock_code ?? ''}`;
            if (onPressHoldingRow) {
              return (
                <Pressable
                  key={key}
                  style={[styles.hRow, hi && styles.hRowHi]}
                  onPress={() => onPressHoldingRow(h)}
                  accessibilityRole="button"
                  accessibilityLabel={`${h.stock_name} 매도`}
                >
                  {rowInner}
                </Pressable>
              );
            }
            return (
              <View key={key} style={[styles.hRow, hi && styles.hRowHi]}>
                {rowInner}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.holdCard}>
          <View style={styles.holdInner}>
            <View style={styles.alertIconWrap} accessibilityLabel="알림">
              <Ionicons name="alert" size={18} color="#fff" />
            </View>
            <View style={styles.holdTextCol}>
              <Text style={styles.holdMain}>이 종목을 가지고 있지 않아요.</Text>
              <Pressable onPress={onPressCollectCta} accessibilityRole="button">
                <View style={styles.ctaRow}>
                  <Text style={styles.cta}>이 종목을 모아볼까요</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <View style={styles.orderBar}>
        <Pressable
          style={styles.orderBarHalf}
          onPress={onPressOrders}
          accessibilityRole="button"
          accessibilityLabel="주문내역"
        >
          <Text style={styles.orderBarTxt}>주문내역</Text>
        </Pressable>
        <View style={styles.orderBarSep} />
        <Pressable
          style={styles.orderBarHalf}
          onPress={onPressPending}
          accessibilityRole="button"
          accessibilityLabel="미체결"
        >
          <Text style={styles.orderBarTxt}>미체결</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleBlock: { flexDirection: 'row', alignItems: 'center' },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  infoIcon: { marginLeft: 6, marginTop: 1 },
  accountHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingLeft: 8,
  },
  account: { color: '#5C6170', fontSize: 12, fontWeight: '600' },
  tabRow: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 12,
    marginBottom: 14,
  },
  tabCell: { minWidth: 48 },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8A90A3',
    paddingBottom: 6,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
  tabUnderline: {
    height: 2,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  tabUnderlineActive: {
    backgroundColor: Colors.primary,
  },
  holdCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  holdInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  alertIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdTextCol: { flex: 1, paddingTop: 2 },
  holdMain: {
    fontSize: 14,
    color: '#3A3F4E',
    fontWeight: '700',
    lineHeight: 20,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 2,
  },
  cta: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  orderBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#EFEFF4',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 44,
  },
  orderBarHalf: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  orderBarSep: {
    width: StyleSheet.hairlineWidth * 2,
    backgroundColor: '#D8DCE8',
    marginVertical: 10,
  },
  orderBarTxt: {
    color: '#585E72',
    fontWeight: '700',
    fontSize: 13,
  },

  holdingsBlock: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8EE',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLbl: { fontSize: 13, color: '#5C6068', fontWeight: '700' },
  totalVal: { fontSize: 18, fontWeight: '900', color: Colors.text },
  totalPnl: { fontSize: 14, fontWeight: '800', marginTop: 4, textAlign: 'right' },
  pnlUp: { color: '#E85A7A' },
  pnlDown: { color: '#2563EB' },
  pnlFlat: { color: '#6B7280' },
  hRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ECEEF3',
    gap: 10,
  },
  hRowHi: { backgroundColor: '#FAF5FF' },
  hLogo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hLogoImg: { width: 46, height: 46 },
  hLogoTxt: { fontSize: 17, fontWeight: '900', color: Colors.primary },
  hMid: { flex: 1, minWidth: 0 },
  hName: { fontSize: 14, fontWeight: '800', color: Colors.text },
  hQty: { fontSize: 12, color: '#7C8193', fontWeight: '600', marginTop: 2 },
  hRight: { alignItems: 'flex-end' },
  hEval: { fontSize: 15, fontWeight: '900', color: Colors.text },
  hPnl: { fontSize: 12, fontWeight: '800', marginTop: 2 },
});
