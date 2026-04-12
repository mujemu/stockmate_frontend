import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../config/colors';

/** 탐색 랭킹(`ExploreMainScreen` RANKS)과 동일 식별자·표시 */
const WATCHLIST = [
  {
    name: '삼성전자',
    stockCode: '005930',
    sectorKey: '정보기술',
    price: '202,500원',
    change: '-3.80%',
    logo: require('../../assets/logos/samsung.png'),
  },
  {
    name: '아모레퍼시픽',
    stockCode: '090430',
    sectorKey: '필수소비재',
    price: '129,000원',
    change: '-1.00%',
    logo: require('../../assets/logos/amorepacific.png'),
  },
  {
    name: '에이피알',
    stockCode: '278470',
    sectorKey: '필수소비재',
    price: '362,500원',
    change: '+8.05%',
    logo: require('../../assets/logos/apr.png'),
  },
  {
    name: 'SK하이닉스',
    stockCode: '000660',
    sectorKey: '정보기술',
    price: '994,000원',
    change: '-3.78%',
    logo: require('../../assets/logos/skhynix.png'),
  },
  {
    name: '키움증권',
    stockCode: '039490',
    sectorKey: '금융',
    price: '447,000원',
    change: '-2.72%',
    logo: require('../../assets/logos/kiwoom.png'),
  },
];

interface Props {
  navigation: any;
}

function isNegativeChange(change: string): boolean {
  return /^[-−]/.test(change.trim());
}

export function WatchlistScreen({ navigation }: Props) {
  const goStockTrade = (item: (typeof WATCHLIST)[number]) => {
    navigation.navigate('Explore', {
      screen: 'StockTrade',
      params: {
        stockName: item.name,
        stockCode: item.stockCode,
        sectorKey: item.sectorKey,
        stockPrice: item.price,
        stockChange: item.change,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.title}>관심</Text>
          <Text style={styles.actions}>큰글씨  +  ✎</Text>
        </View>
        <View style={styles.marketRow}>
          <View style={[styles.chip, styles.chipOn]}><Text style={styles.chipOnTxt}>국내</Text></View>
          <View style={styles.chip}><Text style={styles.chipTxt}>해외</Text></View>
          <Text style={styles.marketTxt}>코스피 <Text style={styles.pink}>5,872.34</Text> <Text style={styles.pink}>6.87%</Text></Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHd}>
            <Text style={styles.cardTitle}>최근조회</Text>
            <Text style={styles.menuIcon}>≡</Text>
          </View>
          {WATCHLIST.map((item) => (
            <Pressable
              key={item.name}
              style={styles.row}
              onPress={() => goStockTrade(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} 종목 상세`}
            >
              <View style={styles.logoWrap}>
                <Image source={item.logo} style={styles.logo} resizeMode="cover" />
              </View>
              <Text style={styles.name}>{item.name}</Text>
              <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
                <Text style={[styles.price, isNegativeChange(item.change) && styles.priceNegative]}>
                  {item.price}
                </Text>
                <Text style={[styles.change, isNegativeChange(item.change) && styles.changeNegative]}>
                  {item.change}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F1F1F4' },
  container: { paddingHorizontal: 14, paddingBottom: 24 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  title: { fontSize: 18, fontWeight: '900', color: Colors.text },
  actions: { marginLeft: 'auto', fontSize: 13, color: '#2C3040', fontWeight: '600' },
  marketRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 10, gap: 7 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 17, backgroundColor: '#ECECEF' },
  chipOn: { backgroundColor: Colors.primary },
  chipTxt: { color: '#292D3A', fontWeight: '700', fontSize: 13 },
  chipOnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  marketTxt: { marginLeft: 'auto', color: '#3E4354', fontSize: 12 },
  pink: { color: '#D34588', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#ECECF3', padding: 12 },
  cardHd: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ECECF3', paddingBottom: 8, marginBottom: 4 },
  cardTitle: { fontSize: 34, fontWeight: '900', color: Colors.primary },
  menuIcon: { marginLeft: 'auto', color: '#6C7082', fontSize: 18 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  logoWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EEF0F6', marginRight: 10, overflow: 'hidden' },
  logo: { width: '100%', height: '100%' },
  name: { fontSize: 16, color: Colors.text, fontWeight: '700' },
  price: { fontSize: 19, color: '#D34588', fontWeight: '800' },
  priceNegative: { color: '#4C61C9' },
  change: { fontSize: 12, color: '#D34588', fontWeight: '700' },
  changeNegative: { color: '#4C61C9' },
});
