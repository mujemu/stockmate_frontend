import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrinciplesPriorityEditor } from '../components/PrinciplesPriorityEditor';
import { Colors } from '../config/colors';
import { useUserSession } from '../context/UserSessionContext';
import { notifyPrinciplesSaved } from '../services/principleViolationLedger';

interface Props {
  navigation: { goBack: () => void };
}

/** 메뉴: 투자 판단 설정 — 챕터별 1개↑·최소 5개·최대 23개, 저장 시 `principles.setup` 반영 */
export function PrinciplesScreen({ navigation }: Props) {
  const { userId, ready, error: sessionErr } = useUserSession();

  const onPrinciplesSaved = useCallback(() => {
    if (userId) void notifyPrinciplesSaved(userId);
  }, [userId]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backLink}>〈 뒤로</Text>
        </Pressable>
      </View>
      {!ready ? (
        <View style={styles.center}>
          <Text style={styles.muted}>세션 준비 중…</Text>
        </View>
      ) : !userId ? (
        <Text style={styles.err}>{sessionErr?.message ?? '사용자 세션 없음'}</Text>
      ) : (
        <PrinciplesPriorityEditor userId={userId} variant="settings" onSaved={onPrinciplesSaved} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 18, paddingBottom: 4 },
  backLink: { fontSize: 16, color: Colors.primary, fontWeight: '800', marginBottom: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: Colors.textSub, fontWeight: '600' },
  err: { padding: 16, color: '#C62828', fontWeight: '600' },
});
