import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../config/colors';

const TAB_BAR_CLEARANCE = 76;

/** 탐색 상단(`ExploreMainScreen`)과 동일 — `assets/logos/kiwoom.png` */
const KIWOOM_HEADER_LOGO = require('../../assets/logos/kiwoom.png');
/** 오늘 미션 카드 제목 옆 일러스트 — `assets/benefits/today_mission_header.png` 교체 가능 */
const TODAY_MISSION_HEADER_ART = require('../../assets/benefits/today_mission_header.png');

/** 오늘 미션 타일 아이콘 — `assets/benefits/today_mission_*.png` 로 교체 가능 */
const IMG_TODAY_ATTENDANCE = require('../../assets/benefits/today_mission_attendance.png');
const IMG_TODAY_MARKET = require('../../assets/benefits/today_mission_market.png');
const IMG_TODAY_RANKING = require('../../assets/benefits/today_mission_ranking.png');

const TODAY_MISSIONS = [
  { id: '1', title: '4월 출석체크', point: '3~20P', tileImage: IMG_TODAY_ATTENDANCE },
  { id: '2', title: '국내 마켓맵 확인하기', point: '10P', tileImage: IMG_TODAY_MARKET },
  { id: '3', title: '실시간 랭킹 확인하기', point: '5P', tileImage: IMG_TODAY_RANKING },
] as const;

/** 더 많은 미션 줄 아이콘 — 위 세 PNG를 순서대로 돌려 씀 */
const MORE_MISSION_TILE_ROTATION = [IMG_TODAY_ATTENDANCE, IMG_TODAY_MARKET, IMG_TODAY_RANKING] as const;

const MORE_MISSIONS = [
  { title: '다른 자산 확인하기', sub: '자산 연결 확인하고 포인트 받기', reward: '5P', tag: '주간' as const },
  { title: '키움증권 이벤트 구경하기', sub: '10초 구경하고 포인트 받기', reward: '5P', tag: '주간' as const },
  { title: '쿠팡 캐시백 이벤트', sub: '결제 금액 2% 포인트 적립', reward: '2% 적립', tag: '이벤트' as const },
  { title: '투자리포트 웹툰으로 보기', sub: '리포툰 방문하고 포인트 받기', reward: '10P', tag: '주간' as const },
  { title: '조건 검색으로 종목 찾기', sub: '조건 검색으로 종목 찾고 포인트 받기', reward: '10P', tag: '주간' as const },
  { title: '고수의 주식 보유 순위 확인하기', sub: '고수의 주식 보유 순위 보고 포인트 받기', reward: '5P', tag: '매일' as const },
  { title: '영웅전 참가하기', sub: '정규전 참가하고 포인트 받기', reward: '200P', tag: '' as const },
  { title: 'MY자산 서비스 자산 연결', sub: '자산 연결하고 포인트 받기', reward: '500P', tag: '' as const },
];

function BenefitsFixedHeader({
  earnTab,
  setEarnTab,
}: {
  earnTab: 'earn' | 'spend';
  setEarnTab: (t: 'earn' | 'spend') => void;
}) {
  return (
    <View style={styles.headerShell}>
      <View style={styles.headerTop}>
        <View style={styles.titleRow}>
          <Image source={KIWOOM_HEADER_LOGO} style={styles.headerKiwoomLogo} resizeMode="contain" />
          <Text style={styles.screenTitle}>혜택</Text>
        </View>
        <Pressable style={styles.pointGuideHit} hitSlop={8} accessibilityRole="button">
          <Text style={styles.pointGuide}>P 포인트 안내</Text>
          <Ionicons name="chevron-forward" size={17} color="#5C6378" />
        </Pressable>
      </View>

      <View style={styles.segment}>
        <Pressable
          style={[styles.segmentBtn, earnTab === 'earn' && styles.segmentBtnOn]}
          onPress={() => setEarnTab('earn')}
        >
          <Text style={[styles.segmentTxt, earnTab === 'earn' && styles.segmentTxtOn]}>적립</Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, earnTab === 'spend' && styles.segmentBtnOn]}
          onPress={() => setEarnTab('spend')}
        >
          <Text style={[styles.segmentTxt, earnTab === 'spend' && styles.segmentTxtOn]}>사용</Text>
        </Pressable>
      </View>

      <Pressable style={styles.maxPointBlock} accessibilityRole="button">
        <Text style={styles.maxPointCaption}>받을 수 있는 포인트</Text>
        <View style={styles.maxPointRow}>
          <Text style={styles.maxPointValue}>최대 735 P</Text>
          <Ionicons name="chevron-forward" size={22} color="#B8BDCA" />
        </View>
      </Pressable>
    </View>
  );
}

export function BenefitsScreen() {
  const insets = useSafeAreaInsets();
  const [earnTab, setEarnTab] = useState<'earn' | 'spend'>('earn');
  const [missionTab, setMissionTab] = useState<'open' | 'done'>('open');
  const bottomPad = 12 + TAB_BAR_CLEARANCE + insets.bottom;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <BenefitsFixedHeader earnTab={earnTab} setEarnTab={setEarnTab} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        bounces
      >
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardHint}>일일미션 수행하고 포인트 받아가세요</Text>
              <Text style={styles.cardTitle}>오늘 미션</Text>
            </View>
            <Image source={TODAY_MISSION_HEADER_ART} style={styles.todayMissionHeaderArt} resizeMode="contain" />
          </View>
          <ScrollView
            horizontal
            nestedScrollEnabled={Platform.OS === 'android'}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.todayScroll}
          >
            {TODAY_MISSIONS.map((m) => (
              <Pressable key={m.id} style={styles.todayTile} accessibilityRole="button">
                <Text style={styles.todayTitle} numberOfLines={2}>
                  {m.title}
                </Text>
                <View style={styles.todayIconCircle}>
                  <Image source={m.tileImage} style={styles.todayTileImage} resizeMode="contain" />
                </View>
                <View style={styles.todayPointPill}>
                  <Text style={styles.todayPointTxt}>{m.point}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <View style={styles.moreHeader}>
            <Ionicons name="extension-puzzle-outline" size={22} color={Colors.primary} />
            <Text style={[styles.cardTitle, styles.moreTitle]}>더 많은 미션</Text>
          </View>
          <View style={styles.subTabRow}>
            <Pressable onPress={() => setMissionTab('open')}>
              <Text style={[styles.subTab, missionTab === 'open' && styles.subTabOn]}>참여가능 8</Text>
              {missionTab === 'open' ? <View style={styles.subTabLine} /> : <View style={styles.subTabLineHidden} />}
            </Pressable>
            <Pressable style={styles.subTabSecond} onPress={() => setMissionTab('done')}>
              <Text style={[styles.subTab, missionTab === 'done' && styles.subTabOn]}>참여완료</Text>
              {missionTab === 'done' ? <View style={styles.subTabLine} /> : <View style={styles.subTabLineHidden} />}
            </Pressable>
          </View>

          <View style={styles.goldPointBar}>
            <Ionicons name="wallet-outline" size={19} color="#B8860B" />
            <Text style={styles.goldPointTxt}>받을 수 있는 포인트</Text>
            <Text style={styles.goldPointVal}>735 P</Text>
          </View>

          {MORE_MISSIONS.map((item, index) => (
            <Pressable key={item.title} style={styles.missionRow} accessibilityRole="button">
              <View style={styles.listMissionIconCircle}>
                <Image
                  source={MORE_MISSION_TILE_ROTATION[index % MORE_MISSION_TILE_ROTATION.length]}
                  style={styles.listMissionTileImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.missionMid}>
                {item.tag ? <Text style={styles.missionTag}>{item.tag}</Text> : null}
                <Text style={styles.missionTitle}>{item.title}</Text>
                <Text style={styles.missionSub}>{item.sub}</Text>
              </View>
              <View style={styles.rewardPill}>
                <Text style={styles.rewardPillTxt}>{item.reward}</Text>
              </View>
            </Pressable>
          ))}

          <Pressable style={styles.moreMissionsBanner} accessibilityRole="button">
            <Ionicons name="disc-outline" size={19} color={Colors.primary} />
            <Text style={styles.moreMissionsBannerTxt}>
              더 받을 수 있는 포인트가 있어요! 추가 미션 둘러보기
            </Text>
            <Ionicons name="chevron-forward" size={17} color={Colors.primary} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.heroHeader}>
            <Ionicons name="trophy" size={23} color="#C9A227" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.cardHint}>키움증권 실전투자대회</Text>
              <Text style={styles.cardTitle}>2025 영웅전</Text>
            </View>
          </View>
          <View style={styles.heroTwoCol}>
            <Pressable style={styles.heroBtn} accessibilityRole="button">
              <Text style={styles.flag}>🇰🇷</Text>
              <Text style={styles.heroBtnTxt}>국내정규전</Text>
            </Pressable>
            <Pressable style={styles.heroBtn} accessibilityRole="button">
              <Text style={styles.flag}>🇺🇸</Text>
              <Text style={styles.heroBtnTxt}>해외정규전</Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.reportCard} accessibilityRole="button">
          <Ionicons name="chatbubbles-outline" size={23} color={Colors.primary} />
          <Text style={styles.reportTxt}>키움의 투자리포트를 웹툰으로 재미있게</Text>
        </Pressable>

        <View style={styles.footer}>
          <Image
            source={require('../../assets/logos/kiwoom.png')}
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.footerLine}>대한민국 주식시장 점유율 21년 연속 1위</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#EDEEF2' },
  headerShell: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: '#EDEEF2',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D5D8E3',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  /** 탐색 `headerKiwoomLogo`와 동일 크기 */
  headerKiwoomLogo: { width: 42, height: 42 },
  screenTitle: { fontSize: 24, fontWeight: '900', color: '#1A1D2D', letterSpacing: -0.3, marginLeft: 6 },
  pointGuideHit: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  pointGuide: { fontSize: 15, fontWeight: '700', color: '#2E3445' },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E3EC',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentBtnOn: { backgroundColor: Colors.primary },
  segmentTxt: { fontSize: 15, fontWeight: '800', color: '#5C6378' },
  segmentTxtOn: { color: '#fff' },
  maxPointBlock: { marginTop: 14 },
  maxPointCaption: { fontSize: 14, color: '#5C6378', fontWeight: '600' },
  maxPointRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  maxPointValue: { fontSize: 26, fontWeight: '900', color: '#1A1D2D', letterSpacing: -0.5 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 10 },
  card: {
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4E7F0',
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  todayMissionHeaderArt: { width: 48, height: 48, marginTop: 2 },
  cardHint: { fontSize: 13, color: '#6E7589', fontWeight: '600' },
  cardTitle: { fontSize: 19, fontWeight: '900', color: '#1A1D2D', marginTop: 4 },
  todayScroll: { paddingTop: 12, paddingBottom: 2, gap: 10 },
  todayTile: {
    width: 152,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2DCF2',
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    marginRight: 10,
  },
  todayTitle: { fontSize: 14, fontWeight: '800', color: '#232938', textAlign: 'center', minHeight: 38 },
  todayIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    overflow: 'hidden',
  },
  todayTileImage: { width: 48, height: 48 },
  todayPointPill: {
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
  },
  todayPointTxt: { fontSize: 13, fontWeight: '800', color: '#5E35B1' },
  moreHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  moreTitle: { marginTop: 0 },
  subTabRow: {
    flexDirection: 'row',
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF4',
    paddingBottom: 0,
  },
  subTab: { fontSize: 15, fontWeight: '700', color: '#8A90A3', paddingBottom: 8 },
  subTabOn: { color: Colors.primary, fontWeight: '800' },
  subTabSecond: { marginLeft: 22 },
  subTabLine: {
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: -2,
  },
  subTabLineHidden: { height: 3, marginTop: -2, opacity: 0 },
  goldPointBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: '#F7F5EF',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E2D4',
  },
  goldPointTxt: { flex: 1, fontSize: 14, fontWeight: '700', color: '#5E5745' },
  goldPointVal: { fontSize: 16, fontWeight: '900', color: '#1A1D2D' },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    gap: 11,
  },
  /** 오늘 미션 타일과 같은 회색 원 + PNG (리스트용 크기만 축소) */
  listMissionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  listMissionTileImage: { width: 40, height: 40 },
  missionMid: { flex: 1, minWidth: 0 },
  missionTag: { fontSize: 11, fontWeight: '800', color: '#E91E8C', marginBottom: 2 },
  missionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1D2D' },
  missionSub: { fontSize: 13, color: '#6E7589', marginTop: 3, lineHeight: 18 },
  rewardPill: {
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
  },
  rewardPillTxt: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  moreMissionsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 15,
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#F2EEFB',
  },
  moreMissionsBannerTxt: { flex: 1, fontSize: 14, fontWeight: '800', color: '#5D44C6', lineHeight: 20 },
  heroHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  heroTwoCol: { flexDirection: 'row', gap: 10, marginTop: 12 },
  heroBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 70,
    borderRadius: 14,
    backgroundColor: '#EDE7F6',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DCD3EE',
  },
  flag: { fontSize: 21 },
  heroBtnTxt: { fontSize: 15, fontWeight: '800', color: '#2E3347' },
  reportCard: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4E7F0',
  },
  reportTxt: { flex: 1, fontSize: 15, fontWeight: '800', color: '#1F2431', lineHeight: 22 },
  footer: { alignItems: 'center', paddingVertical: 8 },
  footerLogo: { width: 118, height: 34 },
  footerLine: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#7A8194',
    textAlign: 'center',
    lineHeight: 17,
  },
});
