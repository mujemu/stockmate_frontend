import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrinciplesPriorityEditor } from '../components/PrinciplesPriorityEditor';
import { Colors } from '../config/colors';
import { useUserSession } from '../context/UserSessionContext';

export type SurveyOnboardingScreenProps = {
  onComplete?: () => void;
  onRequestClose?: () => void;
};

/** 첫 실행 게이트: 23개 풀에서 원칙 선택 후 DB(`principles.setup`) 저장 시 메인으로 진입. */
export function SurveyOnboardingScreen({ onComplete, onRequestClose }: SurveyOnboardingScreenProps) {
  const { userId } = useUserSession();

  if (!userId) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.pad}>
        <PrinciplesPriorityEditor
          userId={userId}
          variant="onboarding"
          onSaved={onComplete}
          onRequestClose={onRequestClose}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  pad: { flex: 1 },
});
