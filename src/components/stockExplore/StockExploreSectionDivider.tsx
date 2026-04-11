import React from 'react';
import { StyleSheet, View } from 'react-native';

/** 탐색 종목 상세에서 섹션 사이 두꺼운 구분선 (키움형 UI) */
export function StockExploreSectionDivider() {
  return <View style={styles.root} accessibilityElementsHidden />;
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: 10,
    backgroundColor: '#E4E6ED',
    alignSelf: 'stretch',
  },
});
