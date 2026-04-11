import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUserSession } from '../context/UserSessionContext';
import { PrinciplesSetupProvider } from '../context/PrinciplesSetupContext';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import { KiwoomStyleLaunchScreen } from '../screens/KiwoomStyleLaunchScreen';

type GatePhase = 'boot' | 'main';

const MIN_LAUNCH_MS = 2400;

const SPLASH_BG = '#0F0624';

/**
 * 초기 개발: true면 서버 `is_configured`와 관계없이 탐색 포커스 후 안내 모달을 띄움.
 * 원칙 저장 후 `refreshNeedsPrinciplesSetup`으로 서버가 configured면 자동으로 꺼짐.
 * 스토어 배포 전에는 false 로 두는 것을 권장.
 */
export const FORCE_PRINCIPLES_PROMPT_AFTER_EXPLORE = true;

/**
 * 앱·QR 진입 흐름:
 * 1) 키움 스타일 로딩(세션 준비 + 최소 표시 시간)
 * 2) 메인(탭) — 원칙 미설정이면 탐색 탭에서 3초 뒤 안내 모달 → 설정 화면으로 이동
 * 3) 비로그인 → 메인(안내 없음)
 */
export function SurveyLaunchGate({ children }: { children: React.ReactNode }) {
  const { userId, ready } = useUserSession();
  const [phase, setPhase] = useState<GatePhase>('boot');
  const [needsPrinciplesSetup, setNeedsPrinciplesSetup] = useState(false);
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
        setNeedsPrinciplesSetup(false);
        setPhase('main');
        return;
      }

      if (FORCE_PRINCIPLES_PROMPT_AFTER_EXPLORE) {
        await minWait;
        if (id !== bootRunId.current) return;
        setNeedsPrinciplesSetup(true);
        setPhase('main');
        return;
      }

      try {
        const [, ps] = await Promise.all([
          minWait,
          StockmateApiV1.principles.getStatus(userId),
        ]);
        if (id !== bootRunId.current) return;
        setNeedsPrinciplesSetup(!ps.is_configured);
      } catch {
        await minWait;
        if (id !== bootRunId.current) return;
        setNeedsPrinciplesSetup(true);
      }
      if (id !== bootRunId.current) return;
      setPhase('main');
    })();
  }, [ready, userId]);

  if (!ready || phase === 'boot') {
    return (
      <View style={styles.wrap}>
        <KiwoomStyleLaunchScreen waitingSession={!ready} />
      </View>
    );
  }

  return (
    <PrinciplesSetupProvider
      needsPrinciplesSetup={needsPrinciplesSetup}
      setNeedsPrinciplesSetup={setNeedsPrinciplesSetup}
    >
      {children}
    </PrinciplesSetupProvider>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: SPLASH_BG },
});
