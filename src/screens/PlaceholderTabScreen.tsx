import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../config/colors';

interface Props {
  route: { params?: { title?: string; hint?: string } };
}

export function PlaceholderTabScreen({ route }: Props) {
  const title = route.params?.title ?? '화면';
  const hint = route.params?.hint ?? '목업 탭입니다.';
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.box}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  box: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  hint: { fontSize: 14, color: Colors.textSub, textAlign: 'center' },
});
