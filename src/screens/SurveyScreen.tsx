import React, { useCallback } from 'react';
import { SurveyOnboardingScreen } from './SurveyOnboardingScreen';
import { usePrinciplesSetup } from '../context/PrinciplesSetupContext';

interface Props {
  navigation: { goBack: () => void; canGoBack?: () => boolean };
}

/** 메뉴·탐색 안내 등 — 온보딩 UI; 저장/스킵 후 탭으로 복귀 + 원칙 필요 여부 갱신 */
export function SurveyScreen({ navigation }: Props) {
  const { refreshNeedsPrinciplesSetup } = usePrinciplesSetup();

  const leaveToMain = useCallback(() => {
    void refreshNeedsPrinciplesSetup();
    if (navigation.canGoBack?.() !== false) navigation.goBack();
  }, [navigation, refreshNeedsPrinciplesSetup]);

  /** 온보딩은 필수 흐름 — 에디터 상단「닫기」비표시(저장 또는 하단 스킵으로만 이탈) */
  return <SurveyOnboardingScreen onComplete={leaveToMain} />;
}
