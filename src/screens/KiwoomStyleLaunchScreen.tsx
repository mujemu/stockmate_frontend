import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BG_TOP = '#120A2A';
const BG_BOTTOM = '#0a0018';
const ACCENT_PINK = '#E84D8A';
const ACCENT_BLUE = '#7D3BDD';

/** 흰 배경 PNG를 그라데이션 위에 자연스럽게 얹기 (완전 제거는 알파 PNG 권장) */
const KNOCKOUT_WHITE: ViewStyle = { mixBlendMode: 'multiply' };

/** 1·2번 제공 로고 → `assets/launch/README.txt` 참고해 PNG 교체 */
const IMG_CART = require('../../assets/icons/Domestic_Market_Map.png');
const IMG_WORDMARK = require('../../assets/icons/kiwoomlogo.png');
const IMG_HERO = require('../../assets/icons/realtime_news.png');

type Props = {
  waitingSession?: boolean;
};

/**
 * 키움 간편모드 스플래시 근사: 1번(카트)·2번(워드마크)가 들어오고 3번 히어로 합성이 드러남.
 */
export function KiwoomStyleLaunchScreen({ waitingSession = false }: Props) {
  const insets = useSafeAreaInsets();
  const { width: winW } = Dimensions.get('window');
  const trackW = winW - 48;

  const progress = useRef(new Animated.Value(0)).current;
  const [pct, setPct] = useState(0);

  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordSlideX = useRef(new Animated.Value(-36)).current;
  const cartTranslateY = useRef(new Animated.Value(-140)).current;
  const cartScale = useRef(new Animated.Value(0.35)).current;
  const cartOverlayOpacity = useRef(new Animated.Value(1)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    setPct(0);
    const sub = progress.addListener(({ value }) => setPct(Math.round(value * 100)));

    if (waitingSession) {
      wordOpacity.setValue(1);
      wordSlideX.setValue(0);
      cartTranslateY.setValue(0);
      cartScale.setValue(1);
      cartOverlayOpacity.setValue(0.85);
      heroOpacity.setValue(0.4);
      Animated.loop(
        Animated.sequence([
          Animated.timing(progress, {
            toValue: 1,
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(progress, {
            toValue: 0,
            duration: 800,
            easing: Easing.in(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
      ).start();
      return () => {
        progress.removeListener(sub);
        progress.stopAnimation();
      };
    }

    wordOpacity.setValue(0);
    wordSlideX.setValue(-36);
    cartTranslateY.setValue(-140);
    cartScale.setValue(0.35);
    cartOverlayOpacity.setValue(1);
    heroOpacity.setValue(0);

    const barAnim = Animated.timing(progress, {
      toValue: 1,
      duration: 2600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    const intro = Animated.sequence([
      Animated.parallel([
        Animated.timing(wordOpacity, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(wordSlideX, {
          toValue: 0,
          friction: 9,
          tension: 70,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(cartTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 55,
          useNativeDriver: true,
        }),
        Animated.spring(cartScale, {
          toValue: 1,
          friction: 8,
          tension: 55,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cartOverlayOpacity, {
        toValue: 0,
        duration: 700,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    Animated.parallel([barAnim, intro]).start();

    return () => {
      progress.removeListener(sub);
      progress.stopAnimation();
      wordOpacity.stopAnimation();
      wordSlideX.stopAnimation();
      cartTranslateY.stopAnimation();
      cartScale.stopAnimation();
      cartOverlayOpacity.stopAnimation();
      heroOpacity.stopAnimation();
    };
  }, [waitingSession, progress, wordOpacity, wordSlideX, cartTranslateY, cartScale, cartOverlayOpacity, heroOpacity]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, trackW],
  });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[BG_TOP, BG_BOTTOM]}
        style={[styles.gradient, { paddingTop: insets.top + 10 }]}
      >
        <Animated.View
          style={[
            styles.brandRow,
            {
              opacity: wordOpacity,
              transform: [{ translateX: wordSlideX }],
            },
          ]}
        >
          <View style={[styles.wordmarkKnockout, KNOCKOUT_WHITE]}>
            <Image
              source={IMG_WORDMARK}
              style={styles.wordmarkImg}
              resizeMode="contain"
              accessibilityLabel="키움증권"
            />
          </View>
          <Text style={styles.brandSep}>|</Text>
          <Text style={styles.modeText}>간편모드</Text>
        </Animated.View>

        <View style={styles.heroBlock}>
          <Text style={styles.headline}>
            주식 더모으기로{'\n'}투자를 더 쉽게
          </Text>

          <View style={styles.candleRow}>
            <View style={[styles.candle, styles.candleLeft, { height: 18, backgroundColor: ACCENT_BLUE }]} />
            <View style={[styles.candle, { height: 26, backgroundColor: ACCENT_PINK }]} />
            <View style={styles.candleDot} />
          </View>

          <View style={[styles.heroStage, { maxHeight: winW * 1.05 }]}>
            <Animated.View style={[styles.heroImg, { opacity: heroOpacity }]}>
              <View style={[styles.knockoutFill, KNOCKOUT_WHITE]}>
                <Image
                  source={IMG_HERO}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="contain"
                  accessibilityLabel="스플래시 히어로"
                />
              </View>
            </Animated.View>
            <Animated.View
              style={[
                styles.cartImg,
                {
                  opacity: cartOverlayOpacity,
                  transform: [{ translateY: cartTranslateY }, { scale: cartScale }],
                },
              ]}
            >
              <View style={[styles.knockoutFill, KNOCKOUT_WHITE]}>
                <Image
                  source={IMG_CART}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="contain"
                  accessibilityLabel="장바구니 로고"
                />
              </View>
            </Animated.View>
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Text style={styles.ver}>Ver.1.5.7</Text>
          <Text style={styles.statusTxt}>
            {waitingSession ? '세션을 준비하는 중입니다.' : '실행 준비중 입니다.'}
          </Text>
          <View style={styles.track}>
            <Animated.View style={[styles.trackFillWrap, { width: barWidth }]}>
              <LinearGradient
                colors={[ACCENT_PINK, ACCENT_BLUE]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.trackFill, { width: trackW }]}
              />
            </Animated.View>
          </View>
          <Text style={styles.pctLabel}>{pct}%</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_BOTTOM },
  gradient: { flex: 1 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  wordmarkKnockout: { marginRight: 4 },
  wordmarkImg: {
    height: 30,
    width: 148,
  },
  knockoutFill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  brandSep: { color: 'rgba(255,255,255,0.35)', marginHorizontal: 8, fontSize: 14 },
  modeText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '700' },
  heroBlock: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  headline: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 34,
    marginBottom: 14,
    textAlign: 'center',
  },
  candleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 16,
  },
  candle: { width: 7, borderRadius: 2, opacity: 0.95 },
  candleLeft: { marginRight: 6 },
  candleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginBottom: 2,
    marginLeft: 6,
  },
  heroStage: {
    flex: 1,
    width: '100%',
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  cartImg: {
    width: 200,
    height: 200,
    maxWidth: '72%',
    maxHeight: '72%',
    overflow: 'hidden',
  },
  footer: { paddingHorizontal: 24 },
  ver: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '600', marginBottom: 6 },
  statusTxt: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  trackFillWrap: { height: '100%' },
  trackFill: { flex: 1, height: '100%', borderRadius: 4 },
  pctLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '800',
    alignSelf: 'flex-end',
    marginTop: 6,
  },
});
