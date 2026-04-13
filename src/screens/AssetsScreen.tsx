import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../config/colors';
import { resolveStockLogo } from '../config/stockLogoAssets';
import { useUserSession } from '../context/UserSessionContext';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import type { SimulatedHoldingDto } from '../types/stockmateApiV1';

interface Props {
  navigation: any;
}

const KEYPAD = ['4', '1', '7', '3', '5', '0', '2', '8', '6', '', '9', '⌫'];
const SERVICE_ICON_REPORT = require('../../assets/services/service_report_icon.png');

export function AssetsScreen({ navigation }: Props) {
  const [pin, setPin] = useState('');
  const { userId, ready: sessionReady } = useUserSession();
  const [simHoldings, setSimHoldings] = useState<SimulatedHoldingDto[]>([]);

  const openReport = () => navigation.getParent()?.navigate('OwlReport' as never);

  /** 탐색에서 종목 눌렀을 때와 동일하게 종목 상세(차트·내종목)로 진입 */
  const openStockTradeFromHolding = (h: SimulatedHoldingDto) => {
    navigation.navigate('Explore' as never, {
      screen: 'StockTrade',
      params: {
        stockName: h.stock_name,
        stockCode: h.stock_code ?? undefined,
        stockPrice: `${h.last_mark_won.toLocaleString('ko-KR')}원`,
        stockChange: `${h.pnl_pct >= 0 ? '+' : ''}${h.pnl_pct.toFixed(2)}%`,
      },
    } as never);
  };

  const unlocked = pin.length >= 6;

  useFocusEffect(
    useCallback(() => {
      if (!unlocked || !sessionReady || !userId) return;
      void StockmateApiV1.holdings
        .listSimulated(userId)
        .then(setSimHoldings)
        .catch(() => setSimHoldings([]));
    }, [unlocked, sessionReady, userId]),
  );

  const simTotals = useMemo(() => {
    if (!simHoldings.length) {
      return { eval: 0, pnl: 0, cost: 0, rows: [] as SimulatedHoldingDto[] };
    }
    const sorted = [...simHoldings].sort((a, b) => b.eval_won - a.eval_won);
    const evalW = sorted.reduce((s, h) => s + h.eval_won, 0);
    const pnlW = sorted.reduce((s, h) => s + h.pnl_won, 0);
    const costW = sorted.reduce((s, h) => s + h.total_cost_won, 0);
    return { eval: evalW, pnl: pnlW, cost: costW, rows: sorted };
  }, [simHoldings]);

  useEffect(() => {
    // PIN 인증 전에는 하단 탭을 숨겨 원본 인증 화면처럼 보이게 한다.
    navigation.setOptions?.({
      tabBarStyle: unlocked
        ? undefined
        : {
            display: 'none',
          },
    });
  }, [navigation, unlocked]);

  const pinDots = useMemo(
    () => Array.from({ length: 6 }, (_, i) => i < pin.length),
    [pin.length]
  );

  const onKeyPress = (key: string) => {
    if (!key) return;
    if (key === '⌫') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    setPin((prev) => (prev.length >= 6 ? prev : `${prev}${key}`));
  };

  if (!unlocked) {
    return (
      <SafeAreaView style={styles.pinSafe}>
        <View style={styles.pinHeader}>
          <Text style={styles.pinHeaderTitle}>간편인증 로그인</Text>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.pinClose}>×</Text>
          </Pressable>
        </View>
        <View style={styles.pinBody}>
          <Text style={styles.pinGuide}>PIN번호 6자리를 입력해주세요.</Text>
          <View style={styles.dotRow}>
            {pinDots.map((filled, i) => (
              <View key={`pin-dot-${i}`} style={[styles.dot, filled && styles.dotFilled]} />
            ))}
          </View>
          <Text style={styles.altLogin}>다른 방법으로 로그인</Text>
        </View>
        <View style={styles.keypad}>
          {KEYPAD.map((key, idx) => (
            <Pressable
              key={`${key}-${idx.toString()}`}
              style={styles.key}
              onPress={() => onKeyPress(key)}
            >
              <Text style={styles.keyText}>{key}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View>
        <View style={styles.topBrandRow}>
          <Text style={styles.brand}>키움자산</Text>
          <Text style={styles.brandMute}>다른자산</Text>
          <Pressable style={styles.bigFontBtn}><Text style={styles.bigFontTxt}>큰글씨</Text></Pressable>
        </View>
        <Text style={styles.accountLine}>위탁종합 6260-1612</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>자산조회</Text>
          <View style={styles.seeBadge}><Text style={styles.seeTxt}>보기</Text></View>
        </View>
        <Text style={styles.sub}>내 계좌의 총 자산을 조회해보세요.</Text>

        <View style={styles.quickRow}>
          <Pressable key="q-fill" style={styles.quickBtn}><Text style={styles.quickText}>채우기</Text></Pressable>
          <View style={styles.quickDivider} />
          <Pressable key="q-send" style={styles.quickBtn}><Text style={styles.quickText}>보내기</Text></Pressable>
          <View style={styles.quickDivider} />
          <Pressable key="q-fx" style={styles.quickBtn}><Text style={styles.quickText}>환전하기</Text></Pressable>
        </View>

        <View style={styles.serviceRow}>
          <Pressable
            style={({ pressed }) => [
              styles.serviceBtn,
              pressed && styles.serviceBtnPressed,
            ]}
            onPress={openReport}
          >
            <View style={styles.serviceInner}>
              <Image source={SERVICE_ICON_REPORT} style={styles.serviceIcon} resizeMode="contain" />
              <View style={styles.serviceTextWrap}>
                <Text style={styles.serviceTopText}>잘 지키고 있을까?</Text>
                <Text style={styles.serviceMainText}>투자 분석 리포트</Text>
              </View>
            </View>
          </Pressable>
        </View>

        <View style={styles.assetTabs}>
          {['국내', '미국', '상품', '현금', '신용/대출'].map((x, i) => (
            <Pressable key={x} style={[styles.assetTab, i === 0 && styles.assetTabOn]}>
              <Text style={[styles.assetTabTxt, i === 0 && styles.assetTabTxtOn]}>{x}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>잔고내역</Text>
          <View style={styles.innerTabRowAsset}>
            <Text key="tab-normal" style={[styles.innerTabAsset, styles.innerTabAssetOn]}>일반</Text>
            <Text key="tab-frac" style={styles.innerTabAsset}>소수점</Text>
            <Text key="tab-eval" style={styles.evalTxt}>평가금액↓</Text>
          </View>
          {simHoldings.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.dividendIcon}>▥</Text>
              <Text style={styles.emptyText}>보유한 국내 주식이 없어요.</Text>
              <Text style={styles.emptyHint}>종목에서 모의 매수를 완료하면 여기에 표시돼요.</Text>
            </View>
          ) : (
            <View style={styles.holdingsBox}>
              <View style={styles.totalEvalRow}>
                <Text style={styles.totalEvalLbl}>총 평가금액</Text>
                <Text style={styles.totalEvalVal}>{simTotals.eval.toLocaleString('ko-KR')}원</Text>
              </View>
              <Text
                style={[
                  styles.totalEvalPnl,
                  simTotals.pnl > 0 ? styles.pnlPos : simTotals.pnl < 0 ? styles.pnlNeg : styles.pnlZero,
                ]}
              >
                {simTotals.pnl >= 0 ? '+' : ''}
                {simTotals.pnl.toLocaleString('ko-KR')}
                {simTotals.cost > 0
                  ? ` (${(simTotals.pnl / simTotals.cost * 100).toFixed(2)}%)`
                  : ''}
              </Text>
              {simTotals.rows.map((h) => (
                <Pressable
                  key={`${h.stock_name}-${h.stock_code ?? ''}`}
                  style={styles.holdingLine}
                  onPress={() => openStockTradeFromHolding(h)}
                  accessibilityRole="button"
                  accessibilityLabel={`${h.stock_name} 종목 상세`}
                >
                  <View style={styles.hLogoSmall}>
                    {(() => {
                      const src = resolveStockLogo(h.stock_code, h.stock_name);
                      return src ? (
                        <Image source={src} style={styles.hLogoSmallImg} resizeMode="contain" />
                      ) : (
                        <Text style={styles.hLogoSmallTxt}>{h.stock_name.slice(0, 1)}</Text>
                      );
                    })()}
                  </View>
                  <View style={styles.holdingMid}>
                    <Text style={styles.holdingName} numberOfLines={1}>
                      {h.stock_name}
                    </Text>
                    <Text style={styles.holdingQty}>{h.quantity.toLocaleString('ko-KR')}주</Text>
                  </View>
                  <View style={styles.holdingRight}>
                    <Text style={styles.holdingEval}>{h.eval_won.toLocaleString('ko-KR')}원</Text>
                    <Text
                      style={[
                        styles.holdingPnl,
                        h.pnl_won > 0 ? styles.pnlPos : h.pnl_won < 0 ? styles.pnlNeg : styles.pnlZero,
                      ]}
                    >
                      {h.pnl_won >= 0 ? '+' : ''}
                      {h.pnl_won.toLocaleString('ko-KR')} ({h.pnl_pct.toFixed(2)}%)
                    </Text>
                  </View>
                </Pressable>
              ))}
              <Pressable style={styles.moreGhost} accessibilityRole="button">
                <Text style={styles.moreGhostTxt}>더보기</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.orderStateRow}>
            <Text key="os-trade" style={styles.orderState}>거래내역</Text>
            <Text key="os-order" style={styles.orderState}>주문내역</Text>
            <Text key="os-pl" style={styles.orderState}>실현손익</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statTitle}>올해 받은 배당(세전)</Text>
          <View style={styles.dividendEmptyBox}>
            <Text style={styles.dividendIcon}>▥</Text>
            <Text style={styles.dividendEmptyText}>배당 받은 이력이 없어요.</Text>
          </View>
          <Pressable style={styles.moreBtn}>
            <Text style={styles.moreBtnText}>더보기</Text>
          </Pressable>
        </View>

        <View style={styles.brandFooter}>
          <Text style={styles.footerBrand}>키움증권</Text>
          <Text style={styles.footerCaption}>대한민국 주식시장 점유율 21년 연속 1위</Text>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F1F1F4' },
  container: { paddingHorizontal: 16, paddingBottom: 30 },
  topBrandRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  brand: { fontSize: 18, fontWeight: '900', color: Colors.text },
  brandMute: { fontSize: 18, fontWeight: '900', color: '#A8ABB7', marginLeft: 10 },
  bigFontBtn: { marginLeft: 'auto', borderWidth: 1, borderColor: '#B9BCC7', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  bigFontTxt: { color: '#2E3240', fontWeight: '700', fontSize: 12 },
  accountLine: { marginTop: 12, color: '#666B7C', fontSize: 16, fontWeight: '500' },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  title: { fontSize: 26, fontWeight: '900', color: Colors.text },
  seeBadge: { borderRadius: 8, backgroundColor: '#D8DAE2', paddingHorizontal: 8, paddingVertical: 3 },
  seeTxt: { color: '#fff', fontWeight: '800', fontSize: 11 },
  sub: { fontSize: 12, color: '#8C90A1', marginTop: 4, marginBottom: 12 },
  serviceRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  serviceBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7C6F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  serviceBtnPressed: { opacity: 0.9 },
  serviceInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  serviceIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  serviceTextWrap: { flex: 1 },
  serviceTopText: { fontSize: 10, color: '#2F3440', fontWeight: '700' },
  serviceMainText: { fontSize: 15, color: '#7D3BDD', fontWeight: '900', marginTop: 2 },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1D8F5',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  quickDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#E7E8EF' },
  quickText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  assetTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  assetTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 22, backgroundColor: '#ECECEF' },
  assetTabOn: { backgroundColor: Colors.primary },
  assetTabTxt: { color: '#232737', fontWeight: '800', fontSize: 13 },
  assetTabTxtOn: { color: '#fff' },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECEAF4',
    padding: 18,
    marginBottom: 14,
  },
  statTitle: { fontSize: 22, fontWeight: '900', color: Colors.text, marginBottom: 14 },
  moreBtn: {
    backgroundColor: '#F3F3F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  moreBtnText: { fontSize: 14, color: '#4D4F58', fontWeight: '600' },
  dividendEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    marginBottom: 10,
  },
  dividendIcon: { fontSize: 42, color: '#D8DBE5', marginBottom: 8 },
  dividendEmptyText: { fontSize: 18, color: '#767B8B', fontWeight: '700' },
  block: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECEAF4',
    minHeight: 330,
    padding: 18,
    marginBottom: 14,
  },
  blockTitle: { fontSize: 22, fontWeight: '900', color: Colors.text },
  innerTabRowAsset: { marginTop: 10, borderBottomWidth: 1, borderBottomColor: '#E7E8EF', paddingBottom: 8, flexDirection: 'row', alignItems: 'center' },
  innerTabAsset: { color: '#7A8092', fontWeight: '700', fontSize: 13, marginRight: 18 },
  innerTabAssetOn: { color: Colors.primary, borderBottomWidth: 2, borderBottomColor: Colors.primary, paddingBottom: 4 },
  evalTxt: { marginLeft: 'auto', color: '#666B7B', fontWeight: '700' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', minHeight: 150 },
  emptyText: { marginTop: 8, textAlign: 'center', fontSize: 14, color: '#666A77', fontWeight: '700' },
  emptyHint: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    color: '#9398A8',
    fontWeight: '600',
    paddingHorizontal: 20,
  },
  holdingsBox: { paddingTop: 8, paddingBottom: 4 },
  totalEvalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 4,
  },
  totalEvalLbl: { fontSize: 14, color: '#5C6068', fontWeight: '700' },
  totalEvalVal: { fontSize: 20, fontWeight: '900', color: Colors.text },
  totalEvalPnl: { fontSize: 15, fontWeight: '800', textAlign: 'right', marginTop: 4, marginBottom: 8 },
  pnlPos: { color: '#E85A7A' },
  pnlNeg: { color: '#2563EB' },
  pnlZero: { color: '#6B7280' },
  holdingLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E7E8EF',
    gap: 10,
  },
  hLogoSmall: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hLogoSmallImg: { width: 46, height: 46 },
  hLogoSmallTxt: { fontSize: 15, fontWeight: '900', color: Colors.primary },
  holdingMid: { flex: 1, minWidth: 0 },
  holdingName: { fontSize: 15, fontWeight: '800', color: Colors.text },
  holdingQty: { fontSize: 12, color: '#7C8193', fontWeight: '600', marginTop: 2 },
  holdingRight: { alignItems: 'flex-end' },
  holdingEval: { fontSize: 16, fontWeight: '900', color: Colors.text },
  holdingPnl: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  moreGhost: {
    marginTop: 10,
    backgroundColor: '#F3F3F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  moreGhostTxt: { fontSize: 14, color: '#4D4F58', fontWeight: '600' },
  orderStateRow: { backgroundColor: '#F3F3F5', borderRadius: 10, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
  orderState: { color: '#9398A8', fontWeight: '700' },
  brandFooter: { alignItems: 'center', marginTop: 14, marginBottom: 14 },
  footerBrand: { color: '#BCBEC8', fontSize: 24, fontWeight: '800' },
  footerCaption: { color: '#BCBEC8', fontSize: 14, marginTop: 6 },

  pinSafe: { flex: 1, backgroundColor: '#F8F8F8' },
  pinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  pinHeaderTitle: { fontSize: 24, fontWeight: '700', color: '#2A2C33' },
  pinClose: { fontSize: 32, color: '#50535E' },
  pinBody: { alignItems: 'center', marginTop: 70 },
  pinGuide: { fontSize: 26, fontWeight: '900', color: '#20222A' },
  dotRow: { flexDirection: 'row', gap: 12, marginTop: 38 },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#DFE1E7' },
  dotFilled: { backgroundColor: Colors.primary },
  altLogin: {
    marginTop: 110,
    fontSize: 16,
    color: '#666A77',
    textDecorationLine: 'underline',
    textDecorationColor: '#666A77',
  },
  keypad: {
    marginTop: 'auto',
    paddingBottom: 22,
    paddingHorizontal: 36,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  key: { width: '30%', height: 70, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 42, color: '#2D2F38', fontWeight: '500' },
});

