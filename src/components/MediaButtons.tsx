import React from 'react';
import { Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '../config/colors';

export type MediaType = 'news' | 'analyst' | 'disclosure';

interface Props {
  onSelect: (type: MediaType, label: string) => void;
}

const BUTTONS: { type: MediaType; label: string; message: string }[] = [
  { type: 'news', label: '뉴스', message: '뉴스를 보여줘' },
  { type: 'disclosure', label: '공시', message: '최근 1달간의 공시를 보여줘' },
  { type: 'analyst', label: '애널리스트 리포트', message: '관련 애널리스트 리포트 내용을 알려줘' },
];

export function MediaButtons({ onSelect }: Props) {
  return (
    <ScrollView
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {BUTTONS.map((btn) => (
        <TouchableOpacity
          key={btn.type}
          style={styles.chip}
          onPress={() => onSelect(btn.type, btn.message)}
        >
          <Text style={styles.label}>{btn.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E3F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  label: { color: Colors.text, fontSize: 13, fontWeight: '500' },
});
