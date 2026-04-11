import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../config/colors';

type Params = {
  title?: string;
  subtitle?: string;
  next?: string;
  prev?: string;
};

interface Props {
  navigation: any;
  route: { name: string; params?: Params };
}

export function FlowStepScreen({ navigation, route }: Props) {
  const title = route.params?.title ?? route.name;
  const subtitle = route.params?.subtitle ?? '목업 화면 (UI만)';
  const next = route.params?.next;
  const prev = route.params?.prev;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.kicker}>Prototype Flow</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>이 화면에서 할 일</Text>
          <Text style={styles.cardBody}>
            - 실제 기능/데이터 연결 없이{'\n'}- 버튼 클릭 시 다음 화면으로 이동만 합니다.
          </Text>
        </View>

        <View style={styles.btnRow}>
          <Pressable
            style={[styles.btn, !prev && styles.btnDisabled]}
            disabled={!prev}
            onPress={() => prev && navigation.navigate(prev)}
          >
            <Text style={[styles.btnText, !prev && styles.btnTextDisabled]}>이전</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnPrimary, !next && styles.btnDisabled]}
            disabled={!next}
            onPress={() => next && navigation.navigate(next)}
          >
            <Text style={[styles.btnText, styles.btnTextPrimary, !next && styles.btnTextDisabled]}>
              다음
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.link} onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>닫기(뒤로)</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  kicker: { fontSize: 12, color: Colors.textSub, fontWeight: '700', letterSpacing: 0.6 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, marginTop: 8 },
  subtitle: { fontSize: 14, color: Colors.textSub, marginTop: 10, lineHeight: 20 },
  card: {
    marginTop: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  cardBody: { fontSize: 13, color: Colors.textSub, lineHeight: 18 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 22 },
  btn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontSize: 15, fontWeight: '800', color: Colors.text },
  btnTextPrimary: { color: '#fff' },
  btnTextDisabled: { color: Colors.textMuted },
  link: { marginTop: 14, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 12 },
  linkText: { fontSize: 13, color: Colors.textMuted, fontWeight: '700' },
});

