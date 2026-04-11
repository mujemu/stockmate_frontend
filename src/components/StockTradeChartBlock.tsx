import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { StockTradeUiConfig } from '../config/stockTradeDetail';

type Props = { d: StockTradeUiConfig; stockName: string };

const CHART_IMG_BY_STOCK: Record<string, ReturnType<typeof require>> = {
  삼성전자: require('../../assets/icons/samsung_chart.png'),
  키움증권: require('../../assets/icons/Kiwoom.png'),
  SK하이닉스: require('../../assets/icons/SK_Hynix.png'),
  에이피알: require('../../assets/icons/APR.png'),
  아모레퍼시픽: require('../../assets/icons/Amore_Pacific.png'),
};

export function StockTradeChartBlock({ stockName }: Props) {
  const img = CHART_IMG_BY_STOCK[stockName];
  if (!img) return <View style={styles.placeholder} />;
  return (
    <View style={styles.wrap}>
      <Image source={img} style={styles.img} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginTop: 4 },
  img: { width: '100%', height: 352 },
  placeholder: { height: 210, backgroundColor: '#FAFAFC', borderRadius: 10 },
});