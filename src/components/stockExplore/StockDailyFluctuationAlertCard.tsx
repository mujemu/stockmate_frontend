import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../config/colors';

const CHIP_LABELS = ['-10%', '-5%', '+5%', '+10%', '설정'] as const;

type Props = {
  onChipPress?: (label: (typeof CHIP_LABELS)[number]) => void;
};

export function StockDailyFluctuationAlertCard({ onChipPress }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>오늘 등락률 알림</Text>
      <Text style={styles.helper}>오늘 시작 가격 기준으로 도달 시 알려드릴게요.</Text>
      <View style={styles.chipRow}>
        {CHIP_LABELS.map((c) => (
          <Pressable
            key={c}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            onPress={() => onChipPress?.(c)}
            accessibilityRole="button"
            accessibilityLabel={`등락률 알림 ${c}`}
          >
            <Text style={styles.chipTxt}>{c}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    alignSelf: 'stretch',
    marginTop: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  helper: {
    color: '#8B90A3',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#EFEFF4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipPressed: { opacity: 0.88 },
  chipTxt: { color: '#3E4150', fontWeight: '700', fontSize: 13 },
});
