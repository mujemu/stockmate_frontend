import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { KiwoomOrderQuantitySheet } from '../components/KiwoomOrderQuantitySheet';
import { StockDailyFluctuationAlertCard } from '../components/stockExplore/StockDailyFluctuationAlertCard';
import { StockExploreSectionDivider } from '../components/stockExplore/StockExploreSectionDivider';
import { StockMyHoldingsSection } from '../components/stockExplore/StockMyHoldingsSection';
import { StockTradeChartBlock } from '../components/StockTradeChartBlock';
import { Colors } from '../config/colors';
import { buildKimooniOrderViolationPreview } from '../config/orderPrincipleViolationCopy';
import type { OrderPrincipleViolationDetailDto } from '../types/stockmateApiV1';
import {
  STOCK_TRADE_UI_KEYS,
  getStockOrderModalCopy,
  getStockTradeUi,
  resolveStockOrderPriceWon,
} from '../config/stockTradeDetail';
import { useUserSession } from '../context/UserSessionContext';
import { navigationRef } from '../navigation/navigationRef';
import type { ViolationLedger } from '../services/principleViolationLedger';
import { recordPostTradeViolation } from '../services/principleViolationLedger';
import { StockmateApiV1 } from '../services/stockmateApiV1';

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

const STOCK_LOGO: Record<string, ReturnType<typeof require>> = {
  키움증권: require('../../assets/logos/kiwoom.png'),
  삼성전자: require('../../assets/logos/samsung_new.png'),
  삼성E앤에이: require('../../assets/logos/samsung_new.png'),
  '삼성E&A': require('../../assets/logos/samsung_new.png'),
  SK하이닉스: require('../../assets/logos/skhynix_new.png'),
  에이피알: require('../../assets/logos/apr.png'),
  아모레퍼시픽: require('../../assets/logos/amorepacific.png'),
};

const OCTOPUS_GUARD_AVATAR = require('../../assets/services/guard_octopus.png');
const CHART_TAB_ICON = require('../../assets/icons/chart.png');

export function StockTradeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { userId, ready: userReady } = useUserSession();
  const stockName = route.params?.stockName ?? '삼성전자';
  const stockCode = route.params?.stockCode;
  const sectorKey = route.params?.sectorKey;
  const stockPriceParam = route.params?.stockPrice;
  const stockPrice = stockPriceParam ?? '212,000원';
  const stockChange = route.params?.stockChange ?? '+7.89%';
  const useBuiltUi = STOCK_TRADE_UI_KEYS.has(stockName);
  const d = useBuiltUi ? getStockTradeUi(stockName) : null;

  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('1');
  const defaultLimitPrice = useMemo(
    () => resolveStockOrderPriceWon(stockName, stockPriceParam),
    [stockName, stockPriceParam],
  );
  const [limitPrice, setLimitPrice] = useState(defaultLimitPrice);
  useEffect(() => {
    setLimitPrice(defaultLimitPrice);
  }, [defaultLimitPrice]);

  const [orderModalPhase, setOrderModalPhase] = useState<'quantitySheet' | 'done' | null>(null);
  const [sheetMountKey, setSheetMountKey] = useState(0);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [activeBehaviorLogId, setActiveBehaviorLogId] = useState<string | null>(null);
  const [interventionMessage, setInterventionMessage] = useState<string | null>(null);
  const [violatedPrinciples, setViolatedPrinciples] = useState<string[]>([]);
  const [violationDetails, setViolationDetails] = useState<OrderPrincipleViolationDetailDto[]>([]);
  const [postTradeLedger, setPostTradeLedger] = useState<ViolationLedger | null>(null);
  const [postTradeViolationsExpanded, setPostTradeViolationsExpanded] = useState(false);
  const [doneLedgerToken, setDoneLedgerToken] = useState(0);
  const doneLedgerConsumedRef = useRef(-1);

  const totalPrice = useMemo(() => {
    const qty = parseInt(quantity || '0', 10);
    const p = parseInt(limitPrice || '0', 10);
    return (qty * p).toLocaleString('ko-KR');
  }, [quantity, limitPrice]);

  const stockLogo = STOCK_LOGO[stockName];
  const hasDecisionViolation =
    violatedPrinciples.length > 0 || Boolean(interventionMessage?.trim());
  const previewViolationMessage = interventionMessage
    ? interventionMessage
    : hasDecisionViolation
      ? `${stockName} ${orderType === 'buy' ? '매수' : '매도'}는 설정해 둔 투자 원칙과 맞지 않을 수 있어요.`
      : '지금 표시된 원칙 점검에서는 우선 손볼 만한 충돌 신호는 없어요.';

  /** 서버가 준 순서(저장한 원칙 순위) 기준 앵커 — 공론장·후속 점검에 전달 */
  const orderViolationPreview = useMemo(
    () =>
      buildKimooniOrderViolationPreview(
        violatedPrinciples,
        orderType,
        interventionMessage,
        violationDetails,
      ),
    [violatedPrinciples, orderType, interventionMessage, violationDetails],
  );

  const topViolationLabel =
    orderViolationPreview.primaryLabel ??
    violatedPrinciples.map((s) => String(s).trim()).find(Boolean) ??
    null;

  const useKimooniBulletMode =
    hasDecisionViolation && !submittingOrder && orderViolationPreview.bullets.length > 0;

  const kimooniCoachTitle = hasDecisionViolation
    ? '키문이: 원칙 위반 감지'
    : '키문이: 원칙 관점에서 한번 더 짚어볼게요';

  const kimooniLead =
    hasDecisionViolation
      ? '수량·가격을 조정하거나, 공론장에서 논의한 뒤 다시 시도해 보세요!'
      : undefined;

  const kimooniCoachBody = useMemo(() => {
    if (interventionMessage?.trim()) {
      const tail = topViolationLabel
        ? `\n\n가장 먼저 짚을 원칙: 「${topViolationLabel}」 — 왜 충돌나는지는 위 한 줄 요약을 참고하고, 공론장에서 키문이와 맞춰 가 보세요.`
        : '\n\n공론장에서 키문이와 근거를 나눠 보시겠어요?';
      return `${interventionMessage.trim()}${tail}`;
    }
    if (hasDecisionViolation) {
      return `${previewViolationMessage}${topViolationLabel ? `\n\n우선 점검: 「${topViolationLabel}」` : ''}\n\n수량·가격을 조정하거나, 공론장에서 논의한 뒤 다시 시도해 보세요.`;
    }
    return `${previewViolationMessage}\n\n그래도 분할·기록 습관은 유지하는 게 좋아요.`;
  }, [
    interventionMessage,
    hasDecisionViolation,
    previewViolationMessage,
    topViolationLabel,
  ]);

  const orderModalCopy = useMemo(
    () => getStockOrderModalCopy(stockName, orderType),
    [stockName, orderType],
  );

  const postTradePrincipleLines = useMemo(() => {
    if (!postTradeLedger?.principleCounts) return [] as string[];
    return Object.entries(postTradeLedger.principleCounts)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([label, n]) => `「${label}」 누적 ${n}회`);
  }, [postTradeLedger]);

  const goPrinciplesReport = () => {
    closeOrderModal();
    if (navigationRef.isReady()) {
      navigationRef.navigate('Principles' as never);
    }
  };

  const openInput = (type: 'buy' | 'sell') => {
    setOrderType(type);
    setActiveBehaviorLogId(null);
    setInterventionMessage(null);
    setViolatedPrinciples([]);
    setViolationDetails([]);
    setPostTradeLedger(null);
    setPostTradeViolationsExpanded(false);
    doneLedgerConsumedRef.current = -1;
    setSheetMountKey((k) => k + 1);
    setOrderModalPhase('quantitySheet');
  };

  useEffect(() => {
    if (orderModalPhase !== 'quantitySheet' || !userReady || !userId) return undefined;
    let cancelled = false;
    (async () => {
      setSubmittingOrder(true);
      try {
        const bl = await StockmateApiV1.behaviorLogs.create({
          user_id: userId,
          behavior_type: orderType === 'buy' ? 'normal_buy' : 'normal_sell',
          stock_code: stockCode ?? null,
          stock_name: stockName,
          sector_key: sectorKey ?? null,
        });
        if (cancelled) return;
        if (bl.log?.id) setActiveBehaviorLogId(bl.log.id);
        setInterventionMessage(bl.intervention_message ?? null);
        setViolatedPrinciples(bl.violated_principles ?? []);
        setViolationDetails(
          Array.isArray(bl.violation_details) ? bl.violation_details.filter(Boolean) : [],
        );
        if (bl.intervention_message && bl.log?.id) {
          StockmateApiV1.behaviorLogs.patchState(bl.log.id, { state: 'delivered' }).catch(() => {});
        }
      } catch {
        /* 오프라인 시 개입·원칙 목록은 UI 기본값 유지 */
      } finally {
        if (!cancelled) setSubmittingOrder(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    orderModalPhase,
    sheetMountKey,
    userReady,
    userId,
    orderType,
    stockCode,
    stockName,
    sectorKey,
  ]);

  useEffect(() => {
    if (orderModalPhase !== 'done' || !userReady || !userId) return;
    if (doneLedgerConsumedRef.current === doneLedgerToken) return;
    doneLedgerConsumedRef.current = doneLedgerToken;
    let cancelled = false;
    (async () => {
      try {
        const ledger = await recordPostTradeViolation(
          userId,
          violatedPrinciples.map((s) => String(s).trim()).filter(Boolean),
          { orderHadViolation: hasDecisionViolation },
        );
        if (!cancelled) setPostTradeLedger(ledger);
      } catch {
        if (!cancelled) setPostTradeLedger(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    orderModalPhase,
    doneLedgerToken,
    userReady,
    userId,
    hasDecisionViolation,
    violatedPrinciples,
  ]);

  const onQuantitySheetConfirm = () => {
    setPostTradeViolationsExpanded(false);
    setDoneLedgerToken((t) => t + 1);
    setOrderModalPhase('done');
  };

  const closeOrderModal = () => {
    setOrderModalPhase(null);
    setActiveBehaviorLogId(null);
  };

  const onGoDebateRoomBeforeOrder = () => {
    closeOrderModal();
    navigation.navigate({
      name: 'DebateRoom',
      merge: false,
      params: {
        stockCode,
        stockName,
        sectorKey,
        forumEntrySource: 'order_principle_check',
        orderContext: {
          fromOrderFlow: true,
          orderType,
          violatedPrinciples,
          interventionMessage: interventionMessage ?? undefined,
          topViolation: topViolationLabel ?? undefined,
          behaviorLogId: activeBehaviorLogId ?? undefined,
          violationDetails: violationDetails.length > 0 ? violationDetails : undefined,
        },
      },
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
        <StockMyHoldingsSection />
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

      <Modal
        visible={orderModalPhase !== null}
        animationType="slide"
        transparent
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        statusBarTranslucent
      >
        <View style={styles.orderModalWrap}>
          <SafeAreaView
            style={[styles.quantitySheetFullscreen, { backgroundColor: '#EFEFF4' }]}
            edges={['top', 'left', 'right']}
          >
            <KiwoomOrderQuantitySheet
              orderType={orderType}
              stockName={stockName}
              displayCurrentPrice={stockPrice}
              displayChange={stockChange}
              limitPriceWon={limitPrice}
              onLimitPriceChange={setLimitPrice}
              quantity={quantity}
              onQuantityChange={setQuantity}
              onSubmit={onQuantitySheetConfirm}
              onClose={closeOrderModal}
              bottomInset={insets.bottom}
              loadingBehavior={submittingOrder}
              kimooniTitle={kimooniCoachTitle}
              kimooniScoreLine={
                hasDecisionViolation && !submittingOrder ? orderViolationPreview.scoreLine : undefined
              }
              kimooniBullets={useKimooniBulletMode ? orderViolationPreview.bullets : undefined}
              kimooniMoreInForumCount={
                useKimooniBulletMode ? orderViolationPreview.moreInForumCount : undefined
              }
              kimooniLead={useKimooniBulletMode ? kimooniLead : undefined}
              kimooniBody={useKimooniBulletMode ? undefined : kimooniCoachBody}
              onOpenDebate={onGoDebateRoomBeforeOrder}
            />
          </SafeAreaView>
          {orderModalPhase === 'done' ? (
            <View style={styles.doneOverlayRoot}>
              <Pressable style={styles.modalDim} onPress={closeOrderModal} />
              <View style={styles.modalCard}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  <Text style={[styles.modalTitle, styles.doneTitle]}>
                    {orderType === 'buy' ? '매수 주문을 완료했어요' : '매도 주문을 완료했어요'}
                  </Text>
                  <View style={styles.stockBrief}>
                    {stockLogo != null ? (
                      <Image source={stockLogo} style={styles.stockBriefLogo} resizeMode="contain" />
                    ) : (
                      <View style={styles.logoMock} />
                    )}
                    <Text style={styles.stockBriefTxt}>{stockName}</Text>
                  </View>
                  <View style={styles.confirmGrid}>
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>주문구분</Text>
                      <Text style={styles.confirmValue}>{orderType === 'buy' ? '매수' : '매도'}</Text>
                    </View>
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>주문수량</Text>
                      <Text style={styles.confirmValue}>{quantity}주</Text>
                    </View>
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>주문가격</Text>
                      <Text style={[styles.confirmValue, styles.orderPriceRed]}>
                        {parseInt(limitPrice || '0', 10).toLocaleString('ko-KR')}원
                      </Text>
                    </View>
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>총 주문금액</Text>
                      <Text style={[styles.confirmValue, styles.totalAmountStrong]}>{totalPrice}원</Text>
                    </View>
                  </View>
                  <View style={styles.principleCard}>
                    <View style={styles.guardCircle}>
                      <Image source={OCTOPUS_GUARD_AVATAR} style={styles.kimooniAvatar} resizeMode="cover" />
                    </View>
                    <View style={styles.principleBody}>
                      {hasDecisionViolation ? (
                        <>
                          <Text style={styles.principleTitle}>이번 주문은 원칙과 어긋난 거래로 집계됐어요</Text>
                          <Text style={styles.principleDesc}>
                            {interventionMessage ??
                              `${stockName} ${orderType === 'buy' ? '매수' : '매도'}에서 미리 잡아둔 기준과 맞지 않을 수 있어요.`}
                          </Text>
                          {postTradeLedger ? (
                            <>
                              <Text style={styles.strikeLine}>
                                누적 위반 {postTradeLedger.globalStrikes}회
                              </Text>
                              {postTradePrincipleLines.length > 0 ? (
                                <>
                                  <Text style={styles.violationList}>
                                    {postTradeViolationsExpanded
                                      ? postTradePrincipleLines.join('\n')
                                      : postTradePrincipleLines[0]}
                                  </Text>
                                  {postTradePrincipleLines.length > 1 ? (
                                    <Pressable
                                      style={styles.violationToggleBtn}
                                      onPress={() =>
                                        setPostTradeViolationsExpanded((v) => !v)
                                      }
                                      hitSlop={8}
                                    >
                                      <Text style={styles.violationToggleTxt}>
                                        {postTradeViolationsExpanded ? '접기' : '더보기'}
                                      </Text>
                                    </Pressable>
                                  ) : null}
                                </>
                              ) : null}
                            </>
                          ) : (
                            <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />
                          )}
                          <Text style={styles.principleLead}>
                            투자 원칙 리포트에서 수정·저장하면, 이번 수정 경로에 따라 누적이 정리돼요.
                          </Text>
                          {postTradeLedger && postTradeLedger.globalStrikes >= 5 ? (
                            <Pressable style={styles.principlesCta} onPress={goPrinciplesReport}>
                              <Text style={styles.principlesCtaTxt}>투자 원칙 리포트 보기</Text>
                            </Pressable>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <Text style={styles.principleTitle}>{orderModalCopy.donePrincipleTitle}</Text>
                          <Text style={styles.principleDesc}>{orderModalCopy.donePrincipleDesc}</Text>
                          <Text style={styles.principleLead}>원칙을 잘 지키셨어요. 차분한 판단이에요.</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <Pressable style={[styles.primaryBtn, styles.doneConfirmBtn]} onPress={closeOrderModal}>
                    <Text style={styles.primaryText}>확인</Text>
                  </Pressable>
                </ScrollView>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
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
  /** 수량 시트 + 완료 오버레이를 한 Modal 안에서 겹침 */
  orderModalWrap: { flex: 1, backgroundColor: '#EFEFF4' },
  doneOverlayRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  modalDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    marginTop: 30,
    maxHeight: '82%',
  },
  quantitySheetCard: {
    width: '100%',
    marginTop: 56,
    maxHeight: '66%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#EFEFF4',
    flexGrow: 1,
  },
  quantitySheetFullscreen: {
    flex: 1,
    backgroundColor: '#EFEFF4',
  },
  modalTitle: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  doneTitle: { color: Colors.primary, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E8F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 24,
    marginBottom: 10,
  },
  modalRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  grayBtn: { flex: 1, borderRadius: 12, backgroundColor: '#EFEFF2', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  grayText: { fontSize: 22, color: '#4D4F58', fontWeight: '700' },
  primaryBtn: { flex: 1, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  buyConfirmBtn: { flex: 1, borderRadius: 12, backgroundColor: '#FF5579', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, minHeight: 50 },
  buyConfirmBtnBusy: { opacity: 0.85 },
  primaryText: { fontSize: 22, color: '#fff', fontWeight: '800' },
  confirmLine: { fontSize: 22, color: Colors.text, marginBottom: 8, fontWeight: '600' },
  confirmTotal: { fontSize: 26, color: '#E3448F', marginTop: 4, fontWeight: '800' },
  confirmGrid: { marginTop: 6, marginBottom: 4 },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 12,
  },
  confirmLabel: { fontSize: 16, color: '#6E7387', fontWeight: '600', flexShrink: 0 },
  confirmValue: { fontSize: 18, color: '#232737', fontWeight: '700', textAlign: 'right', flex: 1 },
  orderPriceRed: { color: '#E53935', fontSize: 18, fontWeight: '900' },
  totalAmountStrong: { color: '#1A1D3A', fontSize: 18, fontWeight: '900' },
  stockBrief: { borderWidth: 1, borderColor: '#EAEBF2', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  logoMock: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DCE0EE' },
  stockBriefLogo: { width: 44, height: 44, borderRadius: 22 },
  stockBriefTxt: { fontSize: 18, color: Colors.text, fontWeight: '700' },
  principleCard: { marginTop: 12, borderWidth: 1, borderColor: '#E8E8EE', borderRadius: 14, padding: 12, flexDirection: 'row', gap: 10 },
  guardCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#7D3BDD',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0E8FF',
    overflow: 'hidden',
  },
  kimooniAvatar: { width: '100%', height: '100%', transform: [{ scale: 1.18 }] },
  principleBody: { flex: 1 },
  principleTitle: { fontSize: 16, fontWeight: '800', color: '#3A3F4E', marginBottom: 6 },
  principleDesc: { fontSize: 14, color: '#585D70', lineHeight: 21 },
  principleLead: { color: Colors.primary, fontSize: 16, fontWeight: '800', marginTop: 10, marginBottom: 10 },
  violationList: {
    color: '#6D7182',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 20,
  },
  strikeLine: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '800',
    color: '#4A148C',
    lineHeight: 22,
  },
  principlesCta: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  principlesCtaTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  violationToggleBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  violationToggleTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  doneConfirmBtn: { marginTop: 16, alignSelf: 'stretch', flex: 0 },
  ruleBtnSingleDanger: { backgroundColor: '#7D3BDD', borderRadius: 8, alignItems: 'center', paddingVertical: 10 },
  ruleBtnDangerTxt: { color: '#fff', fontWeight: '800' },
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