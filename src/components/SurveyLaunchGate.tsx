import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Colors } from '../config/colors';
import { useUserSession } from '../context/UserSessionContext';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import { SurveyOnboardingScreen } from '../screens/SurveyOnboardingScreen';

/**
 * 첫 진입 시 투자 원칙 순위가 서버에 없으면 순위 설정 화면만 보여 주고,
 * `principles.setup` 저장 후 메인 탭으로 진입합니다.
 */
export function SurveyLaunchGate({ children }: { children: React.ReactNode }) {
  const { userId, ready } = useUserSession();
  const [phase, setPhase] = useState<'checking' | 'survey' | 'main'>('checking');

  useEffect(() => {
    if (!ready) return;

    if (!userId) {
      setPhase('main');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const ps = await StockmateApiV1.principles.getStatus(userId);
        if (!cancelled) setPhase(ps.is_configured ? 'main' : 'survey');
      } catch {
        if (!cancelled) setPhase('survey');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, userId]);

  if (!ready || phase === 'checking') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (phase === 'survey' && userId) {
    return <SurveyOnboardingScreen onComplete={() => setPhase('main')} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
