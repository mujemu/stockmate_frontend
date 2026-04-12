import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KiwoomOrderQuantitySheet } from '../components/KiwoomOrderQuantitySheet';
import { Colors } from '../config/colors';
import { buildKimooniOrderViolationPreview } from '../config/orderPrincipleViolationCopy';
import type { OrderPrincipleViolationDetailDto } from '../types/stockmateApiV1';
import { getStockOrderModalCopy, resolveStockOrderPriceWon } from '../config/stockTradeDetail';
import { useUserSession } from '../context/UserSessionContext';
import { navigationRef } from '../navigation/navigationRef';
import type { ViolationLedger } from '../services/principleViolationLedger';
import { recordPostTradeViolation } from '../services/principleViolationLedger';
import { StockmateApiV1 } from '../services/stockmateApiV1';

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

type Phase = 'sheet' | 'done';

type Props = {
  navigation: { goBack: () => void; navigate: (name: string, params?: object) => void };
  route: {
    params?: {
      orderType?: 'buy' | 'sell';
      stockName?: string;
      stockCode?: string;
      sectorKey?: string;
      stockPrice?: string;
      stockChange?: string;
    };
  };
};

export function StockOrderQuantityScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { userId, ready: userReady } = useUserSession();

  const stockName = route.params?.stockName ?? '삼성전자';
  const stockCode = route.params?.stockCode;
  const sectorKey = route.params?.sectorKey;
  const stockPriceParam = route.params?.stockPrice;
  const stockPrice = stockPriceParam ?? '212,000원';
  const stockChange = route.params?.stockChange ?? '+7.89%';
  const [orderType, setOrderType] = useState<'buy' | 'sell'>(route.params?.orderType === 'sell' ? 'sell' : 'buy');

  const defaultLimitPrice = useMemo(
    () => resolveStockOrderPriceWon(stockName, stockPriceParam),
    [stockName, stockPriceParam],
  );
  const [limitPrice, setLimitPrice] = useState(defaultLimitPrice);
  useEffect(() => {
    setLimitPrice(defaultLimitPrice);
  }, [defaultLimitPrice]);

  const [quantity, setQuantity] = useState('1');
  const [phase, setPhase] = useState<Phase>('sheet');
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
      ? `${stockName} ${orderType === 'buy' ? '매수' : '매도'}는 정해 둔 투자 원칙과 맞지 않을 수 있어요.`
      : '지금 점검에서는 급하게 고칠 만한 어긋남은 없어 보여요.';

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
    : '키문이: 원칙만 한 번 더 짚어 볼게요';

  const kimooniLead =
    hasDecisionViolation
      ? '수량이나 가격을 바꾸거나, 공론장에서 이야기한 뒤 다시 시도해 보세요!'
      : undefined;

  const kimooniCoachBody = useMemo(() => {
    if (interventionMessage?.trim()) {
      const tail = topViolationLabel
        ? `\n\n가장 먼저 볼 원칙: 「${topViolationLabel}」 — 위 한 줄 요약을 보시고, 공론장에서 키문이와 맞춰 가 보세요.`
        : '\n\n공론장에서 키문이와 이유를 나눠 보시겠어요?';
      return `${interventionMessage.trim()}${tail}`;
    }
    if (hasDecisionViolation) {
      return `${previewViolationMessage}${topViolationLabel ? `\n\n먼저 볼 곳: 「${topViolationLabel}」` : ''}\n\n수량이나 가격을 바꾸거나, 공론장에서 이야기한 뒤 다시 시도해 보세요.`;
    }
    return `${previewViolationMessage}\n\n그래도 나눠 사고, 적어 두는 습관은 유지하는 게 좋아요.`;
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
    navigation.goBack();
    if (navigationRef.isReady()) {
      navigationRef.navigate('Principles' as never);
    }
  };

  useEffect(() => {
    if (phase !== 'sheet' || !userReady || !userId) return undefined;
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
        /* 오프라인 */
      } finally {
        if (!cancelled) setSubmittingOrder(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, userReady, userId, orderType, stockCode, stockName, sectorKey]);

  useEffect(() => {
    if (phase !== 'done' || !userReady || !userId) return;
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
  }, [phase, doneLedgerToken, userReady, userId, hasDecisionViolation, violatedPrinciples]);

  const onQuantitySheetConfirm = async () => {
    setPostTradeViolationsExpanded(false);
    const qty = Math.max(1, parseInt(quantity || '1', 10) || 1);
    const priceWon = parseInt(limitPrice || '0', 10) || 0;
    if (userReady && userId) {
      try {
        await StockmateApiV1.holdings.applySimulatedTrade(userId, {
          side: orderType === 'buy' ? 'buy' : 'sell',
          stock_code: stockCode ?? null,
          stock_name: stockName,
          quantity: qty,
          limit_price_won: priceWon,
        });
      } catch {
        /* 잔고 API 실패 시에도 아래 원칙 스냅샷·완료 UI는 시도 */
      }
      if (activeBehaviorLogId) {
        try {
          await StockmateApiV1.behaviorLogs.recordSimulatedFill(activeBehaviorLogId, {
            user_id: userId,
            quantity: qty,
            limit_price_won: priceWon,
          });
        } catch {
          /* 오프라인 */
        }
      }
    }
    setDoneLedgerToken((t) => t + 1);
    setPhase('done');
  };

  const exitOrderScreen = () => {
    navigation.goBack();
  };

  const onGoDebateRoomBeforeOrder = () => {
    navigation.goBack();
    requestAnimationFrame(() => {
      if (!navigationRef.isReady()) return;
      const rootNav = navigationRef as unknown as {
        navigate: (name: string, params?: object) => void;
      };
      rootNav.navigate('DebateRoom', {
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
      });
    });
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
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
          onClose={exitOrderScreen}
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

      <Modal
        visible={phase === 'done'}
        animationType="slide"
        transparent
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        statusBarTranslucent
        onRequestClose={exitOrderScreen}
      >
        <View style={styles.doneOverlayRoot}>
          <Pressable style={styles.modalDim} onPress={exitOrderScreen} />
          <View style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={[styles.modalTitle, styles.doneTitle]}>
                {orderType === 'buy' ? '모의 매수 체결이 완료되었어요' : '모의 매도 체결이 완료되었어요'}
              </Text>
              <Text style={styles.doneDisclaimer}>
                실제 주문은 전송되지 않았고, 원칙 점검 스냅샷만 서버(Supabase)에 저장됐어요.
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
                                  onPress={() => setPostTradeViolationsExpanded((v) => !v)}
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
                        투자 원칙 화면에서 고쳐 저장하시면, 지금 바꾸신 내용에 맞춰 횟수가 다시 잡혀요.
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
              <Pressable style={[styles.primaryBtn, styles.doneConfirmBtn]} onPress={exitOrderScreen}>
                <Text style={styles.primaryText}>확인</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EFEFF4' },
  safe: { flex: 1, backgroundColor: '#EFEFF4' },
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
  modalTitle: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  doneTitle: { color: Colors.primary, textAlign: 'center' },
  doneDisclaimer: {
    fontSize: 13,
    color: '#5C6068',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  primaryBtn: {
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryText: { fontSize: 22, color: '#fff', fontWeight: '800' },
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
  stockBrief: {
    borderWidth: 1,
    borderColor: '#EAEBF2',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  logoMock: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DCE0EE' },
  stockBriefLogo: { width: 44, height: 44, borderRadius: 22 },
  stockBriefTxt: { fontSize: 18, color: Colors.text, fontWeight: '700' },
  principleCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E8E8EE',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
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
});
