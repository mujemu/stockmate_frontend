/**
 * 글로벌 뉴스 알림 모달 — 상단에서 슬라이드 다운
 * bullet 탭 시 해당 종목의 공론장(DebateRoom)으로 이동
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNewsAlert } from '../context/NewsAlertContext';
import { navigationRef } from '../navigation/navigationRef';
import type { NewsBulletDto } from '../types/stockmateApiV1';

const OWL_IMG = require('../../assets/debate/owl.png');

export function GlobalNewsModal() {
  const { brief, visible, dismiss } = useNewsAlert();
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(-400)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
      const t = setTimeout(() => dismiss(), 8000);
      return () => clearTimeout(t);
    } else {
      Animated.timing(slideY, {
        toValue: -400,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, dismiss, slideY]);

  const handleBulletPress = (bullet: NewsBulletDto) => {
    if (!bullet.stock_code) return;
    dismiss();
    if (navigationRef.isReady()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigationRef as any).navigate({
        name: 'DebateRoom',
        merge: false,
        params: {
          stockCode: bullet.stock_code,
          stockName: bullet.stock_name,
          forumEntrySource: 'news',
          newsBulletText: bullet.text,
        },
      });
    }
  };

  if (!brief) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 8, transform: [{ translateY: slideY }] },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        {/* 상단 타이틀 행 */}
        <View style={styles.header}>
          <View style={styles.owlCircle}>
            <Image source={OWL_IMG} style={styles.owlImg} resizeMode="cover" />
          </View>
          <Text style={styles.title}>뉴스 브리핑</Text>
          <Pressable onPress={dismiss} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </Pressable>
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 불릿 목록 */}
        {brief.bullets.map((b, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [styles.bulletRow, pressed && styles.bulletRowPressed]}
            onPress={() => handleBulletPress(b)}
          >
            <Text style={styles.bullet}>•</Text>
            <View style={styles.bulletContent}>
              <Text style={styles.bulletText}>{b.text}</Text>
              {b.stock_name ? (
                <View style={styles.stockTag}>
                  <Text style={styles.stockTagTxt}>{b.stock_name}</Text>
                </View>
              ) : null}
            </View>
            {b.stock_code ? <Text style={styles.chevron}>›</Text> : null}
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E4EF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  owlCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: '#D8DBE9',
    overflow: 'hidden',
    backgroundColor: '#F3F3F7',
  },
  owlImg: { width: '100%', height: '100%' },
  title: { flex: 1, fontSize: 15, fontWeight: '800', color: '#1F2430' },
  closeBtn: { padding: 4 },
  closeTxt: { color: '#AAAFC2', fontSize: 16, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#ECEDF5', marginBottom: 10 },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    alignItems: 'flex-start',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  bulletRowPressed: { backgroundColor: '#F4F2FB' },
  bullet: { color: '#7D3BDD', fontSize: 14, fontWeight: '900', lineHeight: 20 },
  bulletContent: { flex: 1, gap: 4 },
  bulletText: { color: '#3A3F52', fontSize: 13, fontWeight: '600', lineHeight: 20 },
  stockTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FB',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  stockTagTxt: { fontSize: 11, fontWeight: '700', color: '#7D3BDD' },
  chevron: { fontSize: 18, color: '#C5C8D4', lineHeight: 20, marginTop: 2 },
});