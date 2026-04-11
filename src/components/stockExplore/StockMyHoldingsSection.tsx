import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../config/colors';

type HoldingsTab = 'general' | 'decimal';

type Props = {
  accountLabel?: string;
  onPressAccount?: () => void;
  onPressCollectCta?: () => void;
  onPressOrders?: () => void;
  onPressPending?: () => void;
};

export function StockMyHoldingsSection({
  accountLabel = '위탁종합 6260-1612',
  onPressAccount,
  onPressCollectCta,
  onPressOrders,
  onPressPending,
}: Props) {
  const [tab, setTab] = useState<HoldingsTab>('general');

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
});
