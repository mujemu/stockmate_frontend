import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrinciplesPriorityEditor } from '../components/PrinciplesPriorityEditor';
import { Colors } from '../config/colors';
import { useUserSession } from '../context/UserSessionContext';

export type SurveyOnboardingScreenProps = {
  onComplete?: () => void;
  onRequestClose?: () => void;
};

/**
 * 첫 실행 게이트: 23개 풀에서 원칙 10개를 고른 뒤 DB(`principles.setup`) 저장 시 메인으로 진입.
 * 저장 없이 메인으로: DB 요청 없이 콜백만 호출(테스트용).
 */
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
      {onComplete ? (
        <View style={styles.skipBar}>
          <Pressable onPress={() => onComplete()} style={styles.skipBtn} hitSlop={8}>
            <Text style={styles.skipTxt}>저장 없이 메인으로 (테스트)</Text>
          </Pressable>
          <Text style={styles.skipHint}>DB에는 「저장 (DB 반영)」을 눌렀을 때만 기록됩니다.</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  pad: { flex: 1, paddingTop: 8 },
  skipBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  skipBtn: { paddingVertical: 10, alignItems: 'center' },
  skipTxt: { fontSize: 14, fontWeight: '800', color: Colors.textSub },
  skipHint: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
});
