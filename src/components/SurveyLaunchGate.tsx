import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../config/colors';
import { useUserSession } from '../context/UserSessionContext';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import { SurveyOnboardingScreen } from '../screens/SurveyOnboardingScreen';
import { KiwoomStyleLaunchScreen } from '../screens/KiwoomStyleLaunchScreen';

type GatePhase = 'boot' | 'survey' | 'main';

const MIN_LAUNCH_MS = 2400;

/** 테스트용: 매 앱 진입마다 원칙 화면을 연다. false면 서버 `is_configured`만 보고 건너뜀(추후 복구). */
export const FORCE_PRINCIPLES_SCREEN_EACH_LAUNCH = true;

/**
 * 앱·QR 진입 흐름:
 * 1) 키움 스타일 로딩(세션 준비 + 최소 표시 시간)
 * 2) 로그인된 사용자면 매번 투자 원칙 온보딩 화면(테스트 플래그) → 저장 시에만 DB 반영
 * 3) 비로그인 → 메인
 */
export function SurveyLaunchGate({ children }: { children: React.ReactNode }) {
  const { userId, ready } = useUserSession();
  const [phase, setPhase] = useState<GatePhase>('boot');
  const bootRunId = useRef(0);

  useEffect(() => {
    if (!ready) return;
    const id = ++bootRunId.current;

    (async () => {
      const minWait = new Promise<void>((resolve) => {
        setTimeout(resolve, MIN_LAUNCH_MS);
      });

      if (!userId) {
        await minWait;
        if (id !== bootRunId.current) return;
        setPhase('main');
        return;
      }

      if (FORCE_PRINCIPLES_SCREEN_EACH_LAUNCH) {
        await minWait;
        if (id !== bootRunId.current) return;
        setPhase('survey');
        return;
      }

      try {
        const [, ps] = await Promise.all([
          minWait,
          StockmateApiV1.principles.getStatus(userId),
        ]);
        if (id !== bootRunId.current) return;
        setPhase(ps.is_configured ? 'main' : 'survey');
      } catch {
        await minWait;
        if (id !== bootRunId.current) return;
        setPhase('survey');
      }
    })();
  }, [ready, userId]);

  if (!ready || phase === 'boot') {
    return (
      <View style={styles.wrap}>
        <KiwoomStyleLaunchScreen waitingSession={!ready} />
      </View>
    );
  }

  if (phase === 'survey' && userId) {
    return (
      <SurveyOnboardingScreen
        onComplete={() => {
          setPhase('main');
        }}
      />
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.background },
});
