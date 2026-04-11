import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Colors } from '../config/colors';
import { useUserSession } from '../context/UserSessionContext';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import type { MonthlyReportDto } from '../types/stockmateApiV1';

const SAMPLE_VIDEO_URI =
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';

interface Props {
  navigation: any;
}

export function MonthlyReportScreen({ navigation }: Props) {
  const { userId, ready } = useUserSession();
  const [serverReport, setServerReport] = useState<MonthlyReportDto | null | undefined>(undefined);
  const floatY = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(SAMPLE_VIDEO_URI, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    if (!ready || !userId) return;
    let cancelled = false;
    (async () => {
      const now = new Date();
      const y = now.getFullYear();
      const mo = now.getMonth() + 1;
      try {
        const rep = await StockmateApiV1.reports.getMonthly(userId, y, mo);
        if (!cancelled) setServerReport(rep);
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 404) {
          try {
            await StockmateApiV1.reports.generateMonthly(userId, y, mo);
            const rep2 = await StockmateApiV1.reports.getMonthly(userId, y, mo);
            if (!cancelled) setServerReport(rep2);
          } catch {
            if (!cancelled) setServerReport(null);
          }
        } else {
          if (!cancelled) setServerReport(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, userId]);

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    floatLoop.start();
    glowLoop.start();
    return () => {
      floatLoop.stop();
      glowLoop.stop();
    };
  }, [floatY, glow]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>월간 투자 리포트</Text>
        <Text style={styles.sub}>단일 캐릭터 애니메이션(1차 목업)</Text>
      </View>

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.characterWrap,
            {
              opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
              transform: [
                {
                  translateY: floatY.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -10],
                  }),
                },
              ],
            },
          ]}
        >
          <VideoView
            player={player}
            style={styles.video}
            nativeControls={false}
            contentFit="cover"
          />
        </Animated.View>
        <Text style={styles.name}>리포트 에이전트</Text>
        <Text style={styles.desc}>월간 투자 요약을 전달하는 캐릭터</Text>
      </View>

      <View style={styles.reportCard}>
        <Text style={styles.reportTitle}>이번 달 핵심 요약</Text>
        {serverReport === undefined ? (
          <Text style={styles.reportLine}>리포트를 불러오는 중…</Text>
        ) : serverReport ? (
          <>
            <Text style={styles.reportBody}>{serverReport.coaching_text}</Text>
            {serverReport.strengths.slice(0, 3).map((t, i) => (
              <Text key={`s-${i}`} style={styles.reportLine}>
                - 강점: {t}
              </Text>
            ))}
            {serverReport.improvements.slice(0, 3).map((t, i) => (
              <Text key={`i-${i}`} style={styles.reportLine}>
                - 개선: {t}
              </Text>
            ))}
            <Text style={styles.reportMeta}>
              행동 {serverReport.behavior_count}건 · 위반 {serverReport.violation_count}건
              {serverReport.principle_score != null
                ? ` · 원칙 점수 ${serverReport.principle_score}`
                : ''}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.reportLine}>- 시장 변동성: 보통 (목업)</Text>
            <Text style={styles.reportLine}>- 추천 행동: 분할 접근 유지</Text>
            <Text style={styles.reportLine}>- 리스크 체크: 이벤트 일정 확인</Text>
            <Text style={styles.reportMeta}>서버 월간 리포트가 없거나 연결에 실패했습니다.</Text>
          </>
        )}
      </View>

      <View style={styles.btnRow}>
        <Pressable style={styles.btnGhost} onPress={() => navigation.goBack()}>
          <Text style={styles.btnGhostText}>뒤로</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7FA' },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  sub: { marginTop: 4, color: Colors.textSub, fontSize: 13, fontWeight: '600' },
  center: { alignItems: 'center', marginTop: 16 },
  characterWrap: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E9EAF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: { width: '100%', height: '100%' },
  name: { marginTop: 12, fontSize: 19, fontWeight: '800', color: Colors.text },
  desc: { marginTop: 4, fontSize: 13, color: Colors.textSub, fontWeight: '600' },
  reportCard: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E9EAF3',
    borderRadius: 14,
    padding: 14,
  },
  reportTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  reportBody: { fontSize: 14, color: Colors.textSub, marginBottom: 10, lineHeight: 20, fontWeight: '600' },
  reportLine: { fontSize: 14, color: Colors.text, marginBottom: 6, fontWeight: '600' },
  reportMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 8, fontWeight: '600' },
  btnRow: { marginTop: 'auto', paddingHorizontal: 16, paddingBottom: 18 },
  btnGhost: {
    borderWidth: 1,
    borderColor: '#D8DCEB',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnGhostText: { color: Colors.text, fontSize: 15, fontWeight: '800' },
});

