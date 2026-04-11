import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../config/colors';

interface Props {
  navigation: any;
}

/** 데모 랭킹 — `stockCode`/`sectorKey`는 백엔드 seed 섹터·기업과 맞춤 */
const RANKS = [
  {
    rank: 1,
    name: '키움증권',
    stockCode: '039490',
    sectorKey: '금융',
    price: '447,000원',
    chg: '-2.72%',
    logo: require('../../assets/logos/kiwoom.png'),
  },
  {
    rank: 2,
    name: '삼성전자',
    stockCode: '005930',
    sectorKey: '정보기술',
    price: '202,500원',
    chg: '-3.80%',
    logo: require('../../assets/logos/samsung_new.png'),
  },
  {
    rank: 3,
    name: 'SK하이닉스',
    stockCode: '000660',
    sectorKey: '정보기술',
    price: '994,000원',
    chg: '-3.78%',
    logo: require('../../assets/logos/skhynix_new.png'),
  },
  {
    rank: 4,
    name: '에이피알',
    stockCode: '278470',
    sectorKey: '필수소비재',
    price: '362,500원',
    chg: '8.05%',
    logo: require('../../assets/logos/apr.png'),
  },
  {
    rank: 5,
    name: '아모레퍼시픽',
    stockCode: '090430',
    sectorKey: '필수소비재',
    price: '129,000원',
    chg: '-1.00%',
    logo: require('../../assets/logos/amorepacific.png'),
  },
];

const INDEX_CARDS = [
  { id: 'kospi', label: '코스피', value: '5,872.34', chg: '+377.56 (6.87%)' },
  { id: 'kosdaq', label: '코스닥', value: '1,089.85', chg: '+53.12 (5.12%)' },
  { id: 'kospi200', label: '코스피200', value: '882.90', chg: '+61.71 (7.51%)' },
];

const NEWS_ITEMS = [
  { id: 'n1', title: "민간 주도 수출 거점 '글로벌베이스캠프' 첫 도입......", meta: '04.09  17:44  · 머니투데이' },
  { id: 'n2', title: '울산조선소 해군 잠수함 화재...1명 실종', meta: '04.09  17:44  · 한국경제' },
  { id: 'n3', title: '급한 진중오 "정부, 전공 수정으로 중국인 표 사려..."', meta: '04.09  17:44  · 머니투데이' },
] as const;

const STORY_ITEMS = [
  { id: 's1', title: '모두 사이좋게 역대급 실적', category: '증권' },
  { id: 's2', title: '양수겸장', category: '유틸리티' },
  { id: 's3', title: '가치의 귀환', category: '제약/바이오 인싸이트' },
] as const;

const RANK_TABS = ['많이보는', '많이사는', '많이파는', '가격급등', '가격급락'] as const;
const MASTER_AGE_TABS = ['20대', '30대', '40대', '50대', '60대'] as const;

const KIWOOM_HEADER_LOGO = require('../../assets/logos/kiwoom.png');
const NEGATIVE_CHANGE_COLOR = '#3F51F6';
const POSITIVE_CHANGE_COLOR = '#DD3C8A';

function normalizeForSign(input: string): string {
  return input.replace(/\s/g, '').replace('−', '-').replace('–', '-');
}

function resolveChangeColor(changeText: string): string {
  const isNegative = normalizeForSign(changeText).startsWith('-');
  return isNegative ? NEGATIVE_CHANGE_COLOR : POSITIVE_CHANGE_COLOR;
}

function isNegativeChange(chg: string): boolean {
  return /^[-−]/.test(chg.trim());
}

export function ExploreMainScreen({ navigation }: Props) {
  const [activeRankTab, setActiveRankTab] = useState(0);
  const [activeMasterAgeTab, setActiveMasterAgeTab] = useState(0);

  const openForumDebate = (item: typeof RANKS[0]) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'DebateRoom',
        params: {
          stockCode: item.stockCode,
          sectorKey: item.sectorKey,
          stockName: item.name,
          forumEntrySource: 'stock',
        },
        merge: false,
      })
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topHeader}>
          <View style={styles.logoTitleRow}>
            <Image
              source={KIWOOM_HEADER_LOGO}
              style={styles.headerKiwoomLogo}
              resizeMode="contain"
            />
            <Text style={styles.header}>탐색</Text>
          </View>
          <View style={styles.quickTop}>
            <View style={styles.simpleToggle}>
              <View style={styles.simpleLeft}>
                <Text style={styles.simpleText}>일반</Text>
              </View>
              <LinearGradient
                colors={['#5B63F5', '#B54DFF', '#E73FA0']}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.simpleOn}
              >
                <Text style={styles.simpleOnText}>간편</Text>
              </LinearGradient>
            </View>
            <Ionicons name="search-outline" size={24} color="#262A35" />
            <Ionicons name="notifications-outline" size={24} color="#262A35" />
          </View>
        </View>
        <View style={styles.marketTabs}>
          <Pressable style={[styles.marketTabBtn, styles.marketTabBtnOn]}>
            <Text style={[styles.marketTabTxt, styles.marketTabTxtOn]}>국내</Text>
          </Pressable>
          <Pressable style={styles.marketTabBtn}>
            <Text style={styles.marketTabTxt}>미국</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.indexScrollContent}
          style={styles.indexScroll}
        >
          {INDEX_CARDS.map((item) => (
            <View key={item.id} style={styles.indexCard}>
              <Text style={styles.indexLabel}>{item.label}</Text>
              <Text style={styles.indexValue}>{item.value}</Text>
              <Text
                style={[
                  styles.indexChange,
                  { color: resolveChangeColor(item.chg) },
                ]}
              >
                {item.chg}
              </Text>
            </View>
          ))}
        </ScrollView>

                <View style={styles.card}>
          <View style={styles.rankHeaderRow}>
            <Text style={[styles.cardTitle, styles.rankCardTitle]}>실시간 랭킹 TOP5</Text>
            <Image
              source={require('../../assets/icons/TOP5.png')}
              style={styles.rankTop5Icon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.rankTabRowOuter}>
            <View style={styles.rankTabBaseLine} />
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rankTabScrollContent}
              style={styles.rankTabScroll}
            >
              {RANK_TABS.map((label, i) => (
                <Pressable
                  key={label}
                  style={styles.rankTabItem}
                  onPress={() => setActiveRankTab(i)}
                >
                  <Text
                    style={[
                      styles.rankTabText,
                      activeRankTab === i && styles.rankTabTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                  {activeRankTab === i ? <View style={styles.rankTabUnderline} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
          {RANKS.map((item) => (
            <Pressable
              key={item.rank}
              style={styles.row}
              onPress={() =>
                navigation.navigate('StockTrade', {
                  stockName: item.name,
                  stockCode: item.stockCode,
                  sectorKey: item.sectorKey,
                  stockPrice: item.price,
                  stockChange: item.chg,
                })
              }
            >
              <Text style={styles.rank}>{item.rank}</Text>
              <View style={styles.logoCircle}>
                <Image source={item.logo} style={styles.logo} resizeMode="cover" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.price, isNegativeChange(item.chg) && styles.priceNegative]}>
                  {item.price}
                </Text>
                <Text style={[styles.change, isNegativeChange(item.chg) && styles.changeNegative]}>
                  {item.chg}
                </Text>
              </View>
            </Pressable>
          ))}
          <Pressable style={[styles.moreBtn, styles.mapMoreBtn]}>
            <Text style={styles.moreText}>더보기</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardSubTitle}>누가 사고 팔고 있을까</Text>
          <View style={styles.trendTitleRow}>
            <Text style={[styles.cardTitle, styles.trendCardTitle]}>투자자별 매매 동향</Text>
            <Ionicons name="refresh-outline" size={22} color="#7A7E8F" />
          </View>
          <View style={styles.tableHead}>
            <View style={styles.tableHeadSpacer} />
            <Text style={[styles.tableHeadTxt, styles.tableHeadTxtPersonal]}>개인</Text>
            <Text style={[styles.tableHeadTxt, styles.tableHeadTxtForeign]}>외국인</Text>
            <Text style={[styles.tableHeadTxt, styles.tableHeadTxtInstitution]}>기관</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>코스피</Text>
            <Text style={styles.tableBlue}>-73,842억</Text>
            <Text style={styles.tablePink}>+31,252억</Text>
            <Text style={styles.tablePink}>+40,550억</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>코스닥</Text>
            <Text style={styles.tableBlue}>-6,438억</Text>
            <Text style={styles.tablePink}>+2,674억</Text>
            <Text style={styles.tablePink}>+4,167억</Text>
          </View>
          <Pressable style={styles.moreBtn}>
            <Text style={styles.moreText}>더보기</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.talkHeaderRow}>
            <View>
              <Text style={styles.cardSubTitle}>모두의 커뮤니티</Text>
              <Text style={[styles.cardTitle, styles.talkCardTitle]}>종목 토론</Text>
            </View>
            <View style={styles.talkHeaderIconsWrap}>
              <Image
                source={require('../../assets/icons/Domestic_Market_Map.png')}
                style={styles.talkHeaderIconPiece}
                resizeMode="contain"
              />
              <Image
                source={require('../../assets/icons/Masters_Shareholding_Rankings.png')}
                style={styles.talkHeaderIconPiece}
                resizeMode="contain"
              />
            </View>
          </View>
          <Pressable style={[styles.talkRow, styles.talkRowFirst]} onPress={() => openForumDebate(RANKS[0])}>
            <View style={styles.logoCircleSmall}>
              <Image source={RANKS[0].logo} style={styles.logo} resizeMode="cover" />
            </View>
            <View style={styles.talkContent}>
              <Text style={styles.talkName}>{RANKS[0].name}</Text>
              <Text style={styles.talkText}>불장 예상됩니다!</Text>
              <Text style={styles.talkTime}>0 분전</Text>
            </View>
            <View style={styles.talkRight}>
              <Text style={styles.talkChange}>{RANKS[0].chg}</Text>
            </View>
          </Pressable>
          <Pressable style={styles.talkRow} onPress={() => openForumDebate(RANKS[1])}>
            <View style={styles.logoCircleSmall}>
              <Image source={RANKS[1].logo} style={styles.logo} resizeMode="cover" />
            </View>
            <View style={styles.talkContent}>
              <Text style={styles.talkName}>{RANKS[1].name}</Text>
              <Text style={styles.talkText}>주주는 이렇게 캐릭터 옆에 주라도 뜸</Text>
              <Text style={styles.talkTime}>1 분전</Text>
            </View>
            <View style={styles.talkRight}>
              <Text style={styles.talkChange}>{RANKS[1].chg}</Text>
            </View>
          </Pressable>
          <Pressable style={styles.moreBtn} onPress={() => openForumDebate(RANKS[0])}>
            <Text style={styles.moreText}>전체 공론장 보기</Text>
          </Pressable>
        </View>

        <View style={[styles.card, styles.newsCard]}>
          <View style={styles.newsHeaderRow}>
            <Text style={[styles.cardTitle, styles.newsCardTitle]}>실시간 뉴스</Text>
            <Image
              source={require('../../assets/icons/realtime_news.png')}
              style={styles.newsHeaderIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.newsBody}>
            {NEWS_ITEMS.map((item, idx) => (
              <View
                key={item.id}
                style={[styles.newsItem, idx === NEWS_ITEMS.length - 1 && styles.newsItemLast]}
              >
                <Text style={styles.newsTitle}>{item.title}</Text>
                <Text style={styles.newsMeta}>{item.meta}</Text>
              </View>
            ))}
            <Pressable style={styles.moreBtn}>
              <Text style={styles.moreText}>더보기</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.card, styles.collectCardPlain]}>
          <View style={styles.collectHeaderRow}>
            <View>
              <Text style={styles.cardSubTitle}>더 쉽고 간편하게 주식을 모아주는</Text>
              <Text style={[styles.cardTitle, styles.collectCardTitle]}>주식 더모으기</Text>
            </View>
            <Ionicons name="add" size={24} color="#5F6372" style={styles.collectAddIcon} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.collectScroll}
            contentContainerStyle={[styles.collectRow, styles.collectRowContent]}
          >
            {RANKS.map((item) => (
              <View key={`collect-${item.rank}`} style={styles.collectItem}>
                <View style={styles.collectLogoCircle}>
                  <Image source={item.logo} style={styles.logo} resizeMode="cover" />
                </View>
                <Text style={styles.collectName} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <View style={styles.storyHeaderRow}>
            <View>
              <Text style={styles.cardSubTitle}>키움이 전해드리는</Text>
              <Text style={[styles.cardTitle, styles.storyCardTitle]}>투자 이야기</Text>
            </View>
            <Image
              source={require('../../assets/icons/investment_story.png')}
              style={styles.storyHeaderIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.storyList}>
            {STORY_ITEMS.map((item, idx) => (
              <View
                key={item.id}
                style={[
                  styles.storyItem,
                  idx === 0 && styles.storyFirstItem,
                  idx === STORY_ITEMS.length - 1 && styles.storyItemLast,
                ]}
              >
                <Text style={styles.storyTitle}>{item.title}</Text>
                <Text style={styles.storyCategory}>{item.category}</Text>
              </View>
            ))}
          </View>
          <Pressable style={[styles.moreBtn, styles.storyMoreBtn]}>
            <Text style={styles.moreText}>더보기</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.masterHeaderRow}>
            <View>
              <Text style={styles.cardSubTitle}>연령대별로 바라본</Text>
              <Text style={[styles.cardTitle, styles.masterCardTitle]}>고수의 주식 보유 순위</Text>
            </View>
            <Image
              source={require('../../assets/icons/Masters_Shareholding_Rankings.png')}
              style={styles.masterHeaderIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.masterAgeTabRow}>
            {MASTER_AGE_TABS.map((label, idx) => (
              <Pressable
                key={label}
                style={styles.masterAgeTabItem}
                onPress={() => setActiveMasterAgeTab(idx)}
              >
                <Text
                  style={[
                    styles.masterAgeTabText,
                    idx === activeMasterAgeTab && styles.masterAgeTabTextActive,
                  ]}
                >
                  {label}
                </Text>
                {idx === activeMasterAgeTab ? <View style={styles.masterAgeUnderline} /> : null}
              </Pressable>
            ))}
            <View style={styles.masterAgeBaseLine} />
          </View>
          {RANKS.map((item) => (
            <View key={`master-${item.rank}`} style={styles.row}>
              <Text style={styles.rank}>{item.rank}</Text>
              <View style={styles.logoCircle}>
                <Image source={item.logo} style={styles.logo} resizeMode="cover" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.price, isNegativeChange(item.chg) && styles.priceNegative]}>
                  {item.price}
                </Text>
                <Text style={[styles.change, isNegativeChange(item.chg) && styles.changeNegative]}>
                  {item.chg}
                </Text>
              </View>
            </View>
          ))}
          <Pressable style={styles.moreBtn}>
            <Text style={styles.moreText}>더보기</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.mapHeaderRow}>
            <View>
              <Text style={styles.cardSubTitle}>오늘 이 테마가 많이 거래돼요</Text>
              <View style={styles.mapTitleRow}>
                <Text style={[styles.cardTitle, styles.mapCardTitle]}>국내 마켓맵</Text>
                <Ionicons name="information-circle-outline" size={18} color="#8B90A1" />
              </View>
            </View>
            <Image
              source={require('../../assets/icons/Domestic_Market_Map.png')}
              style={styles.mapHeaderIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.mapGrid}>
            <View style={[styles.mapBox, styles.mapBoxGray, styles.mapLeftTall]}>
              <Text style={styles.mapTxt}>소캠(SOCAMM){'\n'}-0.79%</Text>
            </View>
            <View style={styles.mapRightCol}>
              <View style={styles.mapMiniRow}>
                <View style={[styles.mapBox, styles.mapBoxBlue, styles.mapHalfWide]}>
                  <Text style={styles.mapTxt}>뉴로모픽 반도체{'\n'}-4.55%</Text>
                </View>
                <View style={[styles.mapBox, styles.mapBoxNavy, styles.mapHalfNarrow]}>
                  <Text style={styles.mapTxt}>CXL(컴...){'\n'}-1.44%</Text>
                </View>
              </View>
              <View style={styles.mapMiniRow}>
                <View style={[styles.mapBox, styles.mapBoxGray, styles.mapThird]}>
                  <Text style={styles.mapTxt}>마이크로...{'\n'}+0.91%</Text>
                </View>
                <View style={[styles.mapBox, styles.mapBoxNavy, styles.mapThird]}>
                  <Text style={styles.mapTxt}>아이폰{'\n'}-1.15%</Text>
                </View>
                <View style={[styles.mapBox, styles.mapBoxBlue, styles.mapThird]}>
                  <Text style={styles.mapTxt}>무선충전...{'\n'}-2.12%</Text>
                </View>
              </View>
              <View style={styles.mapMiniRow}>
                <View style={[styles.mapBox, styles.mapBoxNavy, styles.mapHalfWide]}>
                  <Text style={styles.mapTxt}>공기청정기{'\n'}-1.57%</Text>
                </View>
                <View style={[styles.mapBox, styles.mapBoxBlue, styles.mapHalfWide]}>
                  <Text style={styles.mapTxt}>온디바이스 AI{'\n'}-3.34%</Text>
                </View>
              </View>
            </View>
          </View>
          <Pressable style={styles.moreBtn}>
            <Text style={styles.moreText}>더보기</Text>
          </Pressable>
        </View>

        <Pressable style={styles.homeEdit}>
          <Text style={styles.homeEditText}>⌂  홈 편집</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F5' },
  container: { padding: 14, paddingBottom: 80 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  logoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  /** 글자(fontSize 28)와 시각적 높이를 맞추기 위해 여백 보정(이미지 자체 패딩) */
  headerKiwoomLogo: { width: 42, height: 42 },
  header: { fontSize: 22, fontWeight: '800', color: Colors.text },
  quickTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  /** 일반·간편 공통 흰 트랙 + 얇은 테두리 */
  simpleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  /** 비선택 — 트랙 흰색 위에 글자만 */
  simpleLeft: {
    paddingLeft: 8,
    paddingRight: 2,
    paddingVertical: 3,
    justifyContent: 'center',
  },
  simpleText: { color: '#535868', fontWeight: '700', fontSize: 11 },
  /** 선택 — 그라데이션 pill */
  simpleOn: {
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  simpleOnText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  marketTabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  marketTabBtn: {
    height: 42,
    minWidth: 72,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  marketTabBtnOn: { backgroundColor: Colors.primary },
  marketTabTxt: { fontSize: 14, fontWeight: '700', color: '#232633' },
  marketTabTxtOn: { color: '#fff' },
  indexScroll: { marginBottom: 12 },
  indexScrollContent: { gap: 10, paddingRight: 6 },
  indexCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9EAF3',
    paddingHorizontal: 14,
    paddingVertical: 16,
    minHeight: 104,
  },
  indexLabel: { fontSize: 14, color: '#2C2F3A', fontWeight: '500' },
  indexValue: { fontSize: 20, color: '#1A1D2D', fontWeight: '900', marginTop: 4 },
  indexChange: { fontSize: 12, color: '#E2408E', fontWeight: '700', marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9EAF3',
    padding: 14,
    marginBottom: 12,
  },
  rankHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  /** 랭킹 카드 헤더만: 공용 cardTitle의 marginBottom 제거 */
  rankCardTitle: { marginBottom: 0, fontSize: 20, fontWeight: '900' },
  rankTop5Icon: { width: 102, height: 82, marginRight: -6 },
  rankTabRowOuter: {
    marginTop: 6,
    marginBottom: 6,
    position: 'relative',
  },
  rankTabBaseLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: '#EEF1F6',
  },
  rankTabScroll: { marginHorizontal: -2 },
  rankTabScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 0,
    paddingRight: 8,
  },
  rankTabItem: { marginRight: 20, paddingBottom: 8, flexShrink: 0, position: 'relative' },
  rankTabText: { fontSize: 14, color: '#6D7182', fontWeight: '600' },
  rankTabTextActive: { color: Colors.primary, fontWeight: '800' },
  rankTabUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: 57,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  trendCardTitle: { fontSize: 19, marginBottom: 0 },
  trendTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  apiHint: { fontSize: 12, color: '#6D7182', marginBottom: 8, lineHeight: 17 },
  apiErr: { fontSize: 13, color: '#C62828', marginBottom: 6 },
  sectorRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F7',
  },
  sectorName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  sectorMeta: { fontSize: 12, color: '#6D7182', marginTop: 2 },
  sectorChevron: { fontSize: 19, color: '#9398A8', alignSelf: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 8,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF2FA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoCircleSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFF2FA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: '100%', height: '100%', transform: [{ scale: 1.22 }] },
  rank: { width: 18, fontSize: 14, color: '#434758', fontWeight: '600' },
  name: { fontSize: 15, color: Colors.text, fontWeight: '700' },
  price: { fontSize: 15, color: '#DD3C8A', fontWeight: '800' },
  priceNegative: { color: '#4C61C9' },
  change: { fontSize: 13, color: '#DD3C8A', fontWeight: '600' },
  changeNegative: { color: '#4C61C9' },
  cardSubTitle: { fontSize: 12, color: '#7A7E8F', marginBottom: 4, fontWeight: '600' },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  tableHeadSpacer: { width: 64 },
  tableHeadTxt: { flex: 1, textAlign: 'center', fontSize: 13, color: '#4D4F58', fontWeight: '600' },
  tableHeadTxtPersonal: { marginLeft: 10 },
  tableHeadTxtForeign: { marginLeft: 10 },
  tableHeadTxtInstitution: { marginLeft: 10 },
  tableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F0F1F7', paddingVertical: 10 },
  tableLabel: { width: 52, fontSize: 13, color: '#4D4F58', fontWeight: '600' },
  tableBlue: { color: '#4C61C9', fontSize: 13, fontWeight: '700' },
  tablePink: { color: '#DD3C8A', fontSize: 13, fontWeight: '700' },
  talkHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  talkCardTitle: { fontSize: 20, marginBottom: 0 },
  talkHeaderIconsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginRight: -10,
    gap: 4,
  },
  talkHeaderIconPiece: { width: 52, height: 82 },
  talkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingRight: 92,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F7',
    position: 'relative',
  },
  talkRowFirst: { borderTopWidth: 0 },
  talkContent: { flex: 1 },
  talkName: { fontSize: 14, color: Colors.text, fontWeight: '700' },
  talkText: { fontSize: 13, color: '#4E5261', marginTop: 2 },
  talkTime: { fontSize: 12, color: '#9CA1AF', fontWeight: '600', marginTop: 6 },
  talkRight: { position: 'absolute', right: 0, top: 12, width: 86, alignItems: 'flex-end' },
  talkChange: { fontSize: 14, color: '#DD3C8A', fontWeight: '700', textAlign: 'right' },
  newsCard: { position: 'relative' },
  newsHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  newsBody: { marginTop: 12 },
  newsCardTitle: { fontSize: 19, marginBottom: 0, marginTop: 12 },
  newsHeaderIcon: { width: 92, height: 68, marginTop: -10, marginRight: 2 },
  moreBtn: {
    marginTop: 12,
    height: 44,
    backgroundColor: '#F3F3F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: { color: '#4D4F58', fontSize: 14, fontWeight: '600' },
  newsItem: { borderBottomWidth: 1, borderBottomColor: '#F0F1F7', paddingBottom: 14, marginBottom: 14 },
  newsItemLast: { borderBottomWidth: 0, marginBottom: 0 },
  newsTitle: { fontSize: 15, color: '#272A34' },
  newsMeta: { marginTop: 4, fontSize: 12, color: '#A0A5B3', fontWeight: '600' },
  collectCardPlain: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    marginTop: 30,
    marginBottom: 40,
  },
  collectHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingLeft: 14,
    paddingRight: 4,
  },
  collectAddIcon: { marginTop: 8, marginRight: 10 },
  collectCardTitle: { fontSize: 19 },
  collectScroll: { marginHorizontal: -14 },
  collectRowContent: { paddingHorizontal: 14 },
  collectRow: { flexDirection: 'row', gap: 22, paddingTop: 6 },
  collectItem: { alignItems: 'center', width: 68 },
  collectLogoCircle: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: '#EFF2FA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  collectName: { marginTop: 8, fontSize: 11, color: '#4E5261', fontWeight: '600', textAlign: 'center' },
  storyHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  storyCardTitle: { fontSize: 19, marginBottom: 0 },
  storyHeaderIcon: { width: 100, height: 74, marginTop: -8, marginRight: -10 },
  storyList: { marginTop: 15 },
  storyFirstItem: { marginTop: -10 },
  storyItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F7',
    paddingBottom: 10,
    marginBottom: 10,
  },
  storyItemLast: { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
  storyTitle: { fontSize: 14, color: '#272A34' },
  storyCategory: { marginTop: 4, fontSize: 12, color: Colors.primary, fontWeight: '700' },
  storyMoreBtn: { marginTop: 15 },
  masterHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  masterCardTitle: { fontSize: 19, marginBottom: 0 },
  masterHeaderIcon: { width: 96, height: 72, marginTop: -8, marginRight: -6 },
  masterAgeTabRow: {
    marginTop: 6,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 32,
    position: 'relative',
    paddingBottom: 6,
  },
  masterAgeTabItem: { position: 'relative', paddingBottom: 4, zIndex: 2 },
  masterAgeTabText: { fontSize: 14, color: '#4D4F58', fontWeight: '600' },
  masterAgeTabTextActive: { color: Colors.primary, fontWeight: '800' },
  masterAgeUnderline: {
    position: 'absolute',
    left: '50%',
    marginLeft: -16,
    bottom: -6,
    width: 32,
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    zIndex: 3,
  },
  masterAgeBaseLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: '#EEF1F6',
    zIndex: 1,
  },
  mapHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  mapTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapCardTitle: { fontSize: 19, marginBottom: 0 },
  mapHeaderIcon: { width: 92, height: 68, marginTop: -8, marginRight: 2 },
  mapGrid: { flexDirection: 'row', gap: 6, marginTop: 20 },
  mapRightCol: { flex: 1, gap: 6 },
  mapMiniRow: { flexDirection: 'row', gap: 6 },
  mapLeftTall: { width: 126, height: 312 },
  mapHalfWide: { flex: 2.35, height: 100 },
  mapHalfNarrow: { flex: 1, height: 100 },
  mapThird: { flex: 1, height: 100 },
  mapBox: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  mapBoxGray: { backgroundColor: '#9DA1AD' },
  mapBoxBlue: { backgroundColor: '#4555F2' },
  mapBoxNavy: { backgroundColor: '#3F4BAA' },
  mapTxt: { color: '#fff', fontSize: 11, textAlign: 'center', fontWeight: '700' },
  mapMoreBtn: { marginTop: 20 },
  homeEdit: {
    backgroundColor: '#EDEEF2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  homeEditText: { fontSize: 15, color: '#4C5060', fontWeight: '600' },
});

