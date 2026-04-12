import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StockDailyFluctuationAlertCard } from '../components/stockExplore/StockDailyFluctuationAlertCard';
import { StockExploreSectionDivider } from '../components/stockExplore/StockExploreSectionDivider';
import { StockMyHoldingsSection } from '../components/stockExplore/StockMyHoldingsSection';
import { StockTradeChartBlock } from '../components/StockTradeChartBlock';
import { Colors } from '../config/colors';
import { STOCK_TRADE_UI_KEYS, getStockTradeUi } from '../config/stockTradeDetail';
import { useUserSession } from '../context/UserSessionContext';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import type { SimulatedHoldingDto } from '../types/stockmateApiV1';

interface Props {
  navigation: any;
  route: {
    params?: {
      stockName?: string;
      stockCode?: string;
      sectorKey?: string;
      stockPrice?: string;
      stockChange?: string;
    };
  };
}

const CHART_TAB_ICON = require('../../assets/icons/chart.png');

export function StockTradeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { userId, ready: sessionReady } = useUserSession();
  const [holdings, setHoldings] = useState<SimulatedHoldingDto[]>([]);
  const stockName = route.params?.stockName ?? '삼성전자';
  const stockCode = route.params?.stockCode;
  const sectorKey = route.params?.sectorKey;
  const stockPriceParam = route.params?.stockPrice;
  const stockPrice = stockPriceParam ?? '212,000원';
  const stockChange = route.params?.stockChange ?? '+7.89%';
  const useBuiltUi = STOCK_TRADE_UI_KEYS.has(stockName);
  const d = useBuiltUi ? getStockTradeUi(stockName) : null;

  useFocusEffect(
    useCallback(() => {
      if (!sessionReady || !userId) return;
      void StockmateApiV1.holdings
        .listSimulated(userId)
        .then(setHoldings)
        .catch(() => setHoldings([]));
    }, [sessionReady, userId]),
  );

  const openInput = (type: 'buy' | 'sell') => {
    navigation.navigate('StockOrderQuantity', {
      orderType: type,
      stockName,
      stockCode,
      sectorKey,
      stockPrice: stockPriceParam,
      stockChange,
    });
  };

  const renderTopBar = () => (
    <View style={styles.topBar}>
      <Pressable
        style={styles.topBarIconHit}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="뒤로"
      >
        <Ionicons name="chevron-down" size={22} color="#1A1D2D" />
      </Pressable>
      <View style={styles.topBarRight}>
        <Pressable style={styles.topBarIconHit} accessibilityRole="button" accessibilityLabel="검색">
          <Ionicons name="search-outline" size={20} color="#1A1D2D" />
        </Pressable>
        <Pressable style={styles.topBarIconHit} accessibilityRole="button" accessibilityLabel="관심">
          <Ionicons name="star-outline" size={20} color="#1A1D2D" />
        </Pressable>
        <Pressable
          style={styles.topBarIconHit}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="닫기"
        >
          <Ionicons name="close" size={22} color="#1A1D2D" />
        </Pressable>
      </View>
    </View>
  );

  const renderStockSummary = () => (
    <View style={styles.stockSummary}>
      <View style={styles.stockNameRow}>
        <View style={styles.stockNameChevronCircle}>
          <Ionicons name="chevron-down" size={13} color="#5C6068" />
        </View>
        <Text style={styles.stockName}>{stockName}</Text>
      </View>
      <Text style={styles.stockPrice}>{stockPrice}</Text>
      <Text style={styles.stockChange}>{stockChange}</Text>
      {useBuiltUi && d ? <MetaCodeLabel label={d.codeLabel} /> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={[styles.statusBarFill, { height: insets.top }]} />
      <View style={styles.stickyTopBarWrap}>{renderTopBar()}</View>
      <ScrollView style={styles.scrollFlex} contentContainerStyle={styles.scrollContent}>
        {useBuiltUi && d ? (
          <View style={styles.heroCard}>
            {renderStockSummary()}
            <View style={styles.moodBox}>
              <Text style={styles.moodText}>{d.moodLine}</Text>
            </View>
            <View style={styles.chartScreenSection}>
              <StockTradeChartBlock d={d} stockName={stockName} />
              <View style={styles.chartTabRow}>
                <View style={styles.chartTabLabelsWrap}>
                  <View style={styles.chartTabLabels}>
                    {(['1분', '일', '주', '월', '년'] as const).map((t) => {
                      const cellStyle = [styles.chartTabCell, t === '일' && styles.chartTabCellSelected];
                      if (t === '1분') {
                        return (
                          <View key={t} style={cellStyle}>
                            <View style={styles.chartTabMinuteInner}>
                              <Text style={styles.chartTab}>{t}</Text>
                              <Ionicons name="caret-down" size={10} color="#B8BCC8" />
                            </View>
                          </View>
                        );
                      }
                      if (t === '일') {
                        return (
                          <View key={t} style={cellStyle}>
                            <Text style={styles.chartTabSelected}>{t}</Text>
                          </View>
                        );
                      }
                      return (
                        <View key={t} style={cellStyle}>
                          <Text style={styles.chartTab}>{t}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.chartTabIconSlot} pointerEvents="box-none">
                  <Image source={CHART_TAB_ICON} style={styles.chartTabIcon} resizeMode="contain" />
                </View>
              </View>
              <View style={styles.bidAskWrap}>
                <View style={styles.bidBar} />
                <View style={styles.askBar} />
              </View>
              <View style={styles.bidAskTxtRow}>
                <View style={styles.bidAskColLeft}>
                  <Text style={styles.bidAskLabelSell}>매도대기</Text>
                  <Text style={styles.bidAskValue}>{d.bidVol.replace(/^매도대기\s*/, '')}</Text>
                </View>
                <View style={styles.bidAskColRight}>
                  <Text style={styles.bidAskLabelBuy}>매수대기</Text>
                  <Text style={styles.bidAskValue}>{d.askVol.replace(/^매수대기\s*/, '')}</Text>
                </View>
              </View>
              <Pressable
                style={[styles.featureBtn, styles.featureBtnRealtimeHoga]}
                onPress={() => {}}
                accessibilityRole="button"
                accessibilityLabel="실시간 호가"
              >
                <Text style={styles.featureTxt}>실시간 호가</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.heroCard}>
            {renderStockSummary()}
          </View>
        )}
        <StockDailyFluctuationAlertCard />
        <StockExploreSectionDivider />
        <StockMyHoldingsSection holdings={holdings} highlightStockName={stockName} />
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>종목정보</Text>
          {useBuiltUi && d ? (
            <>
              <Text style={styles.desc}>{d.stockDesc}</Text>
              <View style={styles.featureBtn}>
                <Text style={styles.featureTxt}>이 종목만의 5가지 특징</Text>
              </View>
            </>
          ) : (
            <Text style={styles.desc}>
              {`${stockName}에 대한 상세 종목 정보는 곧 이 영역에 표시될 예정이에요.`}
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.orderRow}>
        <Pressable style={[styles.orderBtn, styles.sell]} onPress={() => openInput('sell')}>
          <Text style={styles.orderText}>팔게요</Text>
        </Pressable>
        <Pressable style={[styles.orderBtn, styles.buy]} onPress={() => openInput('buy')}>
          <Text style={styles.orderText}>살게요</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F8' },
  scrollFlex: { flex: 1 },
  scrollContent: { paddingBottom: 8 },
  /** 상태 표시줄(시간·배터리) 영역 — 상단바와 동일 흰 배경 */
  statusBarFill: {
    backgroundColor: '#fff',
  },
  /** 스크롤과 분리 — 상단 아이콘 바 고정 */
  stickyTopBarWrap: {
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topBarIconHit: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockSummary: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 8 },
  stockNameRow: { flexDirection: 'row', alignItems: 'center' },
  stockNameChevronCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ECEEF3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stockName: { fontSize: 15, color: '#1A1D2D', fontWeight: '800' },
  stockPrice: { fontSize: 24, fontWeight: '900', color: Colors.text, marginTop: 4 },
  stockChange: { fontSize: 16, color: '#D7398A', fontWeight: '700' },
  meta: { marginTop: 4, color: '#8B8FA2', fontSize: 11 },
  metaSep: { color: '#E8EAEF', fontSize: 11 },
  moodBox: {
    marginHorizontal: 14,
    marginTop: 2,
    backgroundColor: '#F0EEF6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  moodText: { color: '#6B4BD8', fontWeight: '700', fontSize: 13, lineHeight: 19 },
  /** 상단~실시간 호가: 화면 너비 흰 배경, 모서리 직각 */
  heroCard: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderRadius: 0,
    paddingBottom: 12,
    marginBottom: 10,
  },
  /** 차트·호가 블록 (heroCard 안쪽 여백) */
  chartScreenSection: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  /** 본문 섹션: 좌우 끝까지, 모서리 직각 */
  card: {
    width: '100%',
    alignSelf: 'stretch',
    marginHorizontal: 0,
    marginTop: 10,
    borderRadius: 0,
    backgroundColor: '#fff',
    padding: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  chartTabRow: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
    width: '100%',
    alignSelf: 'stretch',
  },
  chartTabLabelsWrap: { flex: 1, minWidth: 0, marginRight: 4 },
  chartTabLabels: { flexDirection: 'row', flexWrap: 'nowrap', gap: -6, alignItems: 'center' },
  chartTabIconSlot: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chartTabIcon: { width: 64, height: 64 },
  chartTab: { color: '#888DA0', fontSize: 14, fontWeight: '600' },
  chartTabCell: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  chartTabCellSelected: {
    backgroundColor: '#F3F5F8',
  },
  chartTabMinuteInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chartTabSelected: { color: '#1A1D2D', fontSize: 14, fontWeight: '800' },
  bidAskWrap: { marginTop: 10, height: 4, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
  bidBar: { flex: 0.28, backgroundColor: '#6F64F2' },
  askBar: { flex: 0.72, backgroundColor: '#F05C80' },
  bidAskTxtRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bidAskColLeft: { alignItems: 'flex-start' },
  bidAskColRight: { alignItems: 'flex-end' },
  bidAskLabelSell: { color: '#6F64F2', fontSize: 12, fontWeight: '600' },
  bidAskLabelBuy: { color: '#E85A7A', fontSize: 12, fontWeight: '600' },
  bidAskValue: { marginTop: 4, color: '#1A1D2D', fontSize: 16, fontWeight: '800' },
  desc: { fontSize: 15, color: '#404554', lineHeight: 23 },
  featureBtn: { backgroundColor: '#F1F1F4', borderRadius: 12, alignItems: 'center', paddingVertical: 10, marginTop: 8 },
  featureBtnRealtimeHoga: {
    marginTop: 16,
    marginBottom: 10,
    paddingVertical: 12,
  },
  featureTxt: { color: '#3A3E4E', fontWeight: '700', fontSize: 14 },
  orderRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 60,
    backgroundColor: '#F5F5F8',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8EAF1',
  },
  orderBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  sell: { backgroundColor: '#6F64F2' },
  buy: { backgroundColor: '#FF5579' },
  orderText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});

function MetaCodeLabel({ label }: { label: string }) {
  const parts = label.split(' | ');
  if (parts.length <= 1) {
    return <Text style={styles.meta}>{label}</Text>;
  }
  return (
    <Text style={styles.meta}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <Text style={styles.metaSep}> | </Text> : null}
          {part}
        </React.Fragment>
      ))}
    </Text>
  );
}
