import React, { useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type KiwoomOrderQuantitySheetProps = {
  orderType: 'buy' | 'sell';
  stockName: string;
  /** 상단 현재가 표기 (예: 202,500원) */
  displayCurrentPrice: string;
  /** 등락률 (예: -3.80%) */
  displayChange: string;
  /** 지정가 원 단위 숫자 문자열 */
  limitPriceWon: string;
  /** 지정가 수정 (미주입 시 가격 필드는 읽기 전용 표시만) */
  onLimitPriceChange?: (wonDigits: string) => void;
  quantity: string;
  onQuantityChange: (q: string) => void;
  onSubmit: () => void | Promise<void>;
  onClose: () => void;
  /** 홈 인디케이터 영역 (SafeArea bottom) */
  bottomInset?: number;
  /** 하단 고정 영역 — 키문이 원칙 코치 (매매 직전) */
  kimooniTitle?: string;
  /** 한 줄 부가 안내(선택) */
  kimooniScoreLine?: string;
  /** 원칙 위반 요약 불릿 (최대 2줄 권장, 나머지는 moreCount) */
  kimooniBullets?: string[];
  /** 불릿 외 추가 건수 → 공론장에서 확인 */
  kimooniMoreInForumCount?: number;
  /** 불릿 아래 안내 문장 */
  kimooniLead?: string;
  /** 불릿 미사용 시 긴 본문(기존) */
  kimooniBody?: string;
  /** 공론장으로 이동 (주문 전 원칙 논의) */
  onOpenDebate?: () => void;
  /** 행동 로그·개입 문구 로딩 중 */
  loadingBehavior?: boolean;
};

function changeColor(chg: string) {
  const t = chg.trim();
  if (t.startsWith('+')) return '#E53935';
  if (t.startsWith('-')) return '#1E88E5';
  return '#5C6378';
}

function parsePriceDigits(s: string) {
  const n = parseInt(String(s || '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseChangePercent(s: string) {
  const m = String(s || '').trim().match(/[+-]?[\d.]+/);
  if (!m) return 0;
  const v = parseFloat(m[0]);
  return Number.isFinite(v) ? v : 0;
}

function formatSignedPct(n: number) {
  const rounded = Math.round(n * 100) / 100;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(2)}%`;
}

export function KiwoomOrderQuantitySheet({
  orderType,
  stockName,
  displayCurrentPrice,
  displayChange,
  limitPriceWon,
  onLimitPriceChange,
  quantity,
  onQuantityChange,
  onSubmit,
  onClose,
  bottomInset = 0,
  kimooniTitle,
  kimooniScoreLine,
  kimooniBullets,
  kimooniMoreInForumCount,
  kimooniLead,
  kimooniBody,
  onOpenDebate,
  loadingBehavior,
}: KiwoomOrderQuantitySheetProps) {
  const accent = orderType === 'buy' ? '#E53935' : '#5C6BC0';
  const kimooniAvatar = require('../../assets/services/guard_octopus.png');
  const limitFormatted = useMemo(() => {
    const n = parseInt(limitPriceWon || '0', 10);
    return Number.isFinite(n) ? n.toLocaleString('ko-KR') : '0';
  }, [limitPriceWon]);
  const totalWon = useMemo(() => {
    const q = parseInt(quantity || '0', 10);
    const p = parseInt(limitPriceWon || '0', 10);
    if (!Number.isFinite(q) || !Number.isFinite(p)) return '—';
    return (q * p).toLocaleString('ko-KR');
  }, [quantity, limitPriceWon]);
  const priceEditable = typeof onLimitPriceChange === 'function';

  /** 호가 바: 현재가·등락률 기준으로 좌측가·이중 등락·우측가(1틱 차) 표시 */
  const quoteBar = useMemo(() => {
    const leftNum = parsePriceDigits(displayCurrentPrice) || parseInt(limitPriceWon || '0', 10);
    const chg1 = parseChangePercent(displayChange);
    const chg2 = Number.isFinite(chg1) ? chg1 - 0.24 : 0;
    const tick = 500;
    const rightNum = orderType === 'sell' ? Math.max(0, leftNum - tick) : leftNum + tick;
    return {
      leftLabel: `${leftNum.toLocaleString('ko-KR')}원`,
      rightLabel: `${rightNum.toLocaleString('ko-KR')}원`,
      pct1: formatSignedPct(chg1),
      pct2: formatSignedPct(chg2),
    };
  }, [displayCurrentPrice, displayChange, limitPriceWon, orderType]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={onClose} style={styles.backHit} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color="#1A1D2D" />
          </Pressable>
          <View style={styles.topBarRight}>
            <Pressable style={styles.topLink}>
              <Text style={styles.topLinkTxt}>호가</Text>
            </Pressable>
            <Pressable style={styles.topLink}>
              <Text style={styles.topLinkTxt}>안내</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.stockTitle}>{stockName}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.headerPrice}>{displayCurrentPrice}</Text>
            <Text style={[styles.headerChg, { color: changeColor(displayChange) }]}>{displayChange}</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          {(['buy', 'sell', 'unfilled', 'reserved'] as const).map((key) => {
            const labels = { buy: '매수', sell: '매도', unfilled: '미체결', reserved: '예약' };
            const active = (key === 'buy' && orderType === 'buy') || (key === 'sell' && orderType === 'sell');
            const isTradeTab = key === 'buy' || key === 'sell';
            return (
              <View key={key} style={styles.tabCell}>
                <Text
                  style={[
                    styles.tabText,
                    active && { color: isTradeTab ? accent : '#1A1D2D', fontWeight: '800' },
                  ]}
                >
                  {labels[key]}
                </Text>
                {active && isTradeTab ? <View style={[styles.tabUnderline, { backgroundColor: accent }]} /> : null}
              </View>
            );
          })}
        </View>

        <Pressable style={styles.accountRow}>
          <Text style={styles.accountTxt}>위탁종합 0000-0000</Text>
          <Ionicons name="chevron-down" size={18} color="#8B90A0" />
        </Pressable>

        <View style={styles.quoteHintWrap}>
          <Pressable style={styles.quoteBarPressable} onPress={() => {}}>
            <View style={styles.quoteBarStack}>
              <View style={styles.quoteBarColumns}>
                <View style={styles.quotePriceGutter} />
                <View style={[styles.quoteMidGutter, styles.quoteMidGutterBubble]}>
                  <View style={styles.quoteBubble}>
                    <Text style={styles.quoteBubbleTxt}>눌러서 호가 확인!</Text>
                  </View>
                  <View style={styles.quoteBubbleCaret} />
                </View>
                <View style={styles.quotePriceGutter} />
              </View>
              <View style={styles.quoteBarPill}>
                <View style={styles.quotePriceCell}>
                  <Text style={styles.quotePriceTxt} numberOfLines={1}>
                    {quoteBar.leftLabel}
                  </Text>
                </View>
                <View style={[styles.quoteMidGutter, styles.quoteMidGutterBar]}>
                  <View style={styles.quoteMidRow}>
                    <View style={styles.quoteSegMidBlue}>
                      <Text style={[styles.quotePctTxt, styles.quotePctBlue]} numberOfLines={1}>
                        {quoteBar.pct1}
                      </Text>
                    </View>
                    <View style={styles.quoteSegMidRed}>
                      <Text style={[styles.quotePctTxt, styles.quotePctRed]} numberOfLines={1}>
                        {quoteBar.pct2}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.quotePriceCell}>
                  <Text style={styles.quotePriceTxt} numberOfLines={1}>
                    {quoteBar.rightLabel}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.priceCardInner}>
            <Pressable style={styles.orderTypeDrop}>
              <Text style={styles.orderTypeDropTxt}>지정 가격으로</Text>
              <Ionicons name="chevron-down" size={16} color="#5C6378" />
            </Pressable>
            {priceEditable ? (
              <View style={styles.priceInputWrap}>
                <TextInput
                  style={styles.bigLimitPriceInput}
                  value={limitPriceWon}
                  onChangeText={(t) => onLimitPriceChange!(t.replace(/[^0-9]/g, '') || '0')}
                  keyboardType="number-pad"
                  maxLength={12}
                />
                <Text style={styles.wonSuffix}>원</Text>
              </View>
            ) : (
              <Text style={styles.bigLimitPrice}>{limitFormatted}원</Text>
            )}
          </View>
          {priceEditable ? (
            <Text style={styles.priceHint}>지정가를 직접 수정할 수 있어요. 호가창과 다를 수 있습니다.</Text>
          ) : null}
        </View>

        <View style={[styles.card, styles.qtyCard]}>
          <View style={styles.qtySubTabs}>
            <Text style={[styles.qtySubTab, styles.qtySubTabOn]}>일반</Text>
            <Text style={styles.qtySubTabSep}>|</Text>
            <Text style={styles.qtySubTab}>소수점</Text>
          </View>
          <View style={styles.qtyInputRow}>
            <View style={styles.qtyLabels}>
              {orderType === 'buy' ? (
                <Text style={styles.qtyLabelLine}>
                  매수가능 <Text style={styles.qtyLabelStrong}>14원</Text>
                  <Text style={styles.qtyChev}> ›</Text>
                </Text>
              ) : null}
              <Text style={styles.qtyLabelLine}>
                최대주수 <Text style={styles.qtyLabelStrong}>0주</Text>
              </Text>
              <Text style={styles.qtyLabelLine}>
                총 주문금액 <Text style={styles.qtyLabelStrong}>{totalWon}원</Text>
              </Text>
            </View>
            <TextInput
              style={styles.qtyInput}
              placeholder="수량 입력"
              placeholderTextColor="#B8BCC8"
              value={quantity}
              onChangeText={(t) => onQuantityChange(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={12}
            />
          </View>
        </View>

        {(kimooniTitle ||
          kimooniBody ||
          (kimooniBullets && kimooniBullets.length > 0) ||
          Boolean(kimooniScoreLine?.trim())) ? (
          <View style={styles.kimooniBar}>
            <View style={styles.kimooniInner}>
              <Image source={kimooniAvatar} style={styles.kimooniAvatar} resizeMode="cover" />
              <View style={styles.kimooniTextCol}>
                <Text style={styles.kimooniBarTitle}>{kimooniTitle ?? '키문이 원칙 코치'}</Text>
                {loadingBehavior ? (
                  <Text style={styles.kimooniBarBody}>원칙 점검 결과를 불러오는 중이에요…</Text>
                ) : kimooniBullets && kimooniBullets.length > 0 ? (
                  <>
                    {kimooniScoreLine ? (
                      <Text style={styles.kimooniScore}>{kimooniScoreLine}</Text>
                    ) : null}
                    <View style={styles.kimooniBulletBlock}>
                      {kimooniBullets.map((line, i) => (
                        <View key={`${i}-${line.slice(0, 12)}`} style={styles.kimooniBulletRow}>
                          <Text style={styles.kimooniBulletDot}>•</Text>
                          <Text style={styles.kimooniBulletTxt}>{line}</Text>
                        </View>
                      ))}
                    </View>
                    {(kimooniMoreInForumCount ?? 0) > 0 ? (
                      <Text style={styles.kimooniMore}>
                        + {kimooniMoreInForumCount}개 더 있어요 → 공론장에서 확인
                      </Text>
                    ) : null}
                    {kimooniLead ? <Text style={styles.kimooniLead}>{kimooniLead}</Text> : null}
                    {onOpenDebate ? (
                      <Pressable style={styles.kimooniDebateBtnWide} onPress={onOpenDebate}>
                        <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
                        <Text style={styles.kimooniDebateBtnWideTxt}>지금 공론장 입장</Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <>
                    {kimooniScoreLine ? (
                      <Text style={styles.kimooniScore}>{kimooniScoreLine}</Text>
                    ) : null}
                    <Text style={styles.kimooniBarBody}>{kimooniBody ?? ''}</Text>
                    {onOpenDebate ? (
                      <Pressable style={styles.kimooniDebateBtnWide} onPress={onOpenDebate}>
                        <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
                        <Text style={styles.kimooniDebateBtnWideTxt}>지금 공론장 입장</Text>
                      </Pressable>
                    ) : null}
                  </>
                )}
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.ctaRow, { paddingBottom: 56 + bottomInset }]}>
        <Pressable
          style={[styles.ctaBtn, orderType === 'buy' ? styles.ctaBuy : styles.ctaSell]}
          onPress={onSubmit}
        >
          <Text style={styles.ctaBtnTxt}>{orderType === 'buy' ? '살게요' : '팔게요'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    maxHeight: '100%',
    backgroundColor: '#EFEFF4',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 0,
    /** 고정 CTA 위로 호가·수량·키문이 블록을 끝까지 스크롤 */
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#EFEFF4',
  },
  backHit: { padding: 8 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingRight: 8 },
  topLink: { paddingVertical: 4 },
  topLinkTxt: { fontSize: 15, color: '#3D4354', fontWeight: '600' },
  titleBlock: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#EFEFF4',
  },
  stockTitle: { fontSize: 22, fontWeight: '800', color: '#1A1D2D' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 6 },
  headerPrice: { fontSize: 28, fontWeight: '900', color: '#1A1D2D' },
  headerChg: { fontSize: 18, fontWeight: '800' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E6ED',
  },
  tabCell: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 10,
  },
  tabText: { fontSize: 16, color: '#9AA0B1', fontWeight: '600' },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '18%',
    right: '18%',
    height: 3,
    borderRadius: 2,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  accountTxt: { fontSize: 14, color: '#5C6378', fontWeight: '600' },
  quoteHintWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#EFEFF4',
  },
  quoteBarPressable: { borderRadius: 0 },
  quoteBarStack: {
    gap: 4,
  },
  quoteBarColumns: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 36,
  },
  quotePriceGutter: {
    flex: 1,
    minWidth: 0,
  },
  quoteMidGutter: {
    flex: 2,
    minWidth: 0,
    alignItems: 'center',
  },
  quoteMidGutterBubble: {
    justifyContent: 'flex-end',
    minHeight: 36,
  },
  quoteMidGutterBar: {
    justifyContent: 'center',
  },
  quoteMidRow: { flexDirection: 'row', alignItems: 'stretch', alignSelf: 'stretch', flex: 1 },
  quoteBubble: {
    backgroundColor: '#7C4DFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  quoteBubbleTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  /** 말풍선 아래 삼각(호가 바 중앙 쪽) */
  quoteBubbleCaret: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#7C4DFF',
    marginTop: -1,
  },
  quoteBarPill: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#F0F1F5',
    borderRadius: 22,
    overflow: 'hidden',
    minHeight: 48,
  },
  quotePriceCell: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  quotePriceTxt: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1A1D2D',
    letterSpacing: -0.3,
  },
  quoteSegMidBlue: {
    flex: 1,
    minWidth: 52,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  quoteSegMidRed: {
    flex: 1,
    minWidth: 52,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  quotePctTxt: { fontSize: 13, fontWeight: '800' },
  quotePctBlue: { color: '#1565C0' },
  quotePctRed: { color: '#C62828' },
  card: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E9EF',
  },
  /** 가격 카드와 간격을 두어 수량(매수·매도) 블록을 아래로 */
  qtyCard: {
    marginTop: 20,
  },
  priceCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderTypeDrop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F3F4F8',
    borderRadius: 10,
  },
  orderTypeDropTxt: { fontSize: 15, color: '#3D4354', fontWeight: '700' },
  bigLimitPrice: { fontSize: 26, fontWeight: '900', color: '#1A1D2D', flex: 1, textAlign: 'right' },
  priceInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 2,
  },
  bigLimitPriceInput: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1A1D2D',
    textAlign: 'right',
    minWidth: 100,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#C5CAD8',
  },
  wonSuffix: { fontSize: 20, fontWeight: '800', color: '#1A1D2D' },
  priceHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#6E7387',
    lineHeight: 17,
  },
  qtySubTabs: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  qtySubTab: { fontSize: 14, color: '#9AA0B1', fontWeight: '600' },
  qtySubTabOn: { color: '#1A1D2D', fontWeight: '800' },
  qtySubTabSep: { color: '#D0D3DC', fontWeight: '300' },
  qtyInputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  qtyLabels: { flex: 1, gap: 8 },
  qtyLabelLine: { fontSize: 14, color: '#6E7387' },
  qtyLabelStrong: { fontWeight: '800', color: '#3D4354' },
  qtyChev: { color: '#9AA0B1' },
  qtyInput: {
    minWidth: 120,
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1D2D',
    textAlign: 'right',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  turtleCard: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E9EF',
    flexDirection: 'row',
    gap: 10,
  },
  turtleAvatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#5468D4',
    overflow: 'hidden',
    backgroundColor: '#EEF1FF',
  },
  turtleAvatar: { width: '100%', height: '100%' },
  turtleBody: { flex: 1 },
  turtleTitle: { fontSize: 15, fontWeight: '800', color: '#2E3347', marginBottom: 6 },
  turtleDesc: { fontSize: 13, lineHeight: 19, color: '#5E6478' },
  turtleHint: { marginTop: 8, fontSize: 12, color: '#6A5ACD', fontWeight: '700' },
  kimooniBar: {
    marginTop: 16,
    marginHorizontal: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#EDE7F6',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1C4E9',
  },
  kimooniInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F3E5F5',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E1BEE7',
  },
  kimooniAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#7E57C2' },
  kimooniTextCol: { flex: 1, gap: 6 },
  kimooniBarTitle: { fontSize: 14, fontWeight: '800', color: '#4A148C' },
  kimooniBarBody: { fontSize: 13, lineHeight: 19, color: '#4A4A5A', fontWeight: '500' },
  kimooniScore: { fontSize: 12, color: '#6A1B9A', fontWeight: '700', marginBottom: 4 },
  kimooniBulletBlock: { gap: 6 },
  kimooniBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  kimooniBulletDot: { fontSize: 14, fontWeight: '900', color: '#4A148C', marginTop: 1 },
  kimooniBulletTxt: { flex: 1, fontSize: 13, lineHeight: 19, color: '#333', fontWeight: '600' },
  kimooniMore: { fontSize: 12, fontWeight: '700', color: '#5E35B1', marginTop: 4 },
  kimooniLead: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4A4A5A',
    fontWeight: '600',
    marginTop: 8,
  },
  kimooniDebateBtnWide: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#5E35B1',
  },
  kimooniDebateBtnWideTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
  ctaRow: {
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: '#EFEFF4',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DCDDE4',
  },
  ctaBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBuy: { backgroundColor: '#FF5579' },
  ctaSell: { backgroundColor: '#6F64F2' },
  ctaBtnTxt: { color: '#fff', fontSize: 30, fontWeight: '800' },
});
