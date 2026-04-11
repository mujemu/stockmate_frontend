import React from 'react';
import { SurveyOnboardingScreen } from './SurveyOnboardingScreen';

interface Props {
  navigation: { goBack: () => void };
}

/** 메뉴 등 스택에서 열 때 — 동일 UI, 닫기 버튼 제공 */
export function SurveyScreen({ navigation }: Props) {
  return <SurveyOnboardingScreen onRequestClose={() => navigation.goBack()} />;
}
