import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrinciplesPriorityEditor } from '../components/PrinciplesPriorityEditor';
import { Colors } from '../config/colors';
import { useUserSession } from '../context/UserSessionContext';

interface Props {
  navigation: { goBack: () => void };
}

/** 메뉴: 투자 원칙 순위 재설정 — 터치 배치 + 맞교환, 저장 시 `principles.setup`으로 DB 반영 */
export function PrinciplesScreen({ navigation }: Props) {
  const { userId, ready, error: sessionErr } = useUserSession();

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
        <PrinciplesPriorityEditor userId={userId} variant="settings" />
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
