/**
 * 뉴스 알림 주기 선택 — 탐색 탭 상단 등에 배치
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNewsAlert, type NewsInterval } from '../context/NewsAlertContext';
import { Colors } from '../config/colors';

const OPTIONS: { label: string; value: NewsInterval }[] = [
  { label: '끄기',    value: 0   },
  { label: '1분(테스트)', value: 1   },
  { label: '15분',   value: 15  },
  { label: '30분',   value: 30  },
  { label: '1시간',  value: 60  },
  { label: '2시간',  value: 120 },
];

export function NewsIntervalPicker() {
  const { interval, setInterval, fetchNow } = useNewsAlert();

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>뉴스 알림 주기</Text>
      <View style={styles.row}>
        {OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            style={[styles.chip, interval === o.value && styles.chipOn]}
            onPress={() => setInterval(o.value)}
          >
            <Text style={[styles.chipTxt, interval === o.value && styles.chipTxtOn]}>
              {o.label}
            </Text>
          </Pressable>
        ))}
        <Pressable style={styles.nowBtn} onPress={fetchNow}>
          <Text style={styles.nowTxt}>지금 받기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E9F0',
  },
  label: { fontSize: 11, fontWeight: '800', color: Colors.textSub, marginBottom: 7 },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#ECECF3',
  },
  chipOn: { backgroundColor: Colors.primary },
  chipTxt: { fontSize: 12, fontWeight: '700', color: '#4A4F5C' },
  chipTxtOn: { color: '#fff' },
  nowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F0EEF9',
    borderWidth: 1,
    borderColor: Colors.primary,
    marginLeft: 4,
  },
  nowTxt: { fontSize: 12, fontWeight: '800', color: Colors.primary },
});