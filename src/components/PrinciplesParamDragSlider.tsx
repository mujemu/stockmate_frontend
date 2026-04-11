import React, { useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Colors } from '../config/colors';
import type { ParamField } from '../config/principleUiSpecs';
import { US_INDEX_LABELS } from '../config/principleUiSpecs';

const PURPLE = Colors.primary;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function snapFromRatio(ratio: number, field: ParamField): number {
  const raw = field.min + ratio * (field.max - field.min);
  const stepped =
    field.min + Math.round((raw - field.min) / field.step) * field.step;
  return clamp(stepped, field.min, field.max);
}

function stepValue(v: number, field: ParamField, delta: number): number {
  const next = v + delta * field.step;
  const rounded = Math.round(next / field.step) * field.step;
  return clamp(rounded, field.min, field.max);
}

type Props = {
  principleId: string;
  field: ParamField;
  value: number;
  onValueChange: (principleId: string, key: string, value: number) => void;
};

/**
 * 수치 조절: 트랙을 가로로 끌면 값 변경 (Pan — 세로 22px 넘기면 제스처 실패 → 리스트 스크롤 유지).
 * ± 버튼으로 한 칸씩 조절.
 */
export function PrinciplesParamDragSlider({
  principleId,
  field,
  value,
  onValueChange,
}: Props) {
  const trackWRef = useRef(0);
  const [trackW, setTrackW] = useState(0);
  const applyXRef = useRef<(x: number) => void>(() => {});

  const v = Number.isFinite(value) ? value : field.min;
  const span = field.max - field.min || 1;
  const ratio = (v - field.min) / span;

  const displayText =
    field.key === 'usIndex'
      ? US_INDEX_LABELS[clamp(Math.round(v), 0, US_INDEX_LABELS.length - 1)]
      : `${v}${field.suffix ? ` ${field.suffix}` : ''}`;

  const applyX = useCallback(
    (x: number) => {
      const w = trackWRef.current;
      if (w <= 0) return;
      const clampedX = clamp(x, 0, w);
      const r = clampedX / w;
      const next = snapFromRatio(r, field);
      onValueChange(principleId, field.key, next);
    },
    [field, onValueChange, principleId]
  );

  applyXRef.current = applyX;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .failOffsetY([-22, 22])
        .activeOffsetX([-10, 10])
        .onUpdate((e) => {
          applyXRef.current(e.x);
        }),
    []
  );

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    trackWRef.current = w;
    setTrackW(w);
  };

  const thumbPos = trackW > 0 ? clamp(ratio * (trackW - 22), 0, trackW - 22) : 0;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{field.label}</Text>
      <View style={styles.col}>
        <Text style={styles.value}>{displayText}</Text>
        <GestureDetector gesture={pan}>
          <View style={styles.trackWrap} onLayout={onTrackLayout}>
            <View style={styles.trackBg}>
              <View style={[styles.trackFill, { width: `${ratio * 100}%` }]} />
            </View>
            <View style={[styles.thumb, { left: thumbPos }]} />
          </View>
        </GestureDetector>
        <View style={styles.stepRow}>
          <Pressable
            onPress={() => onValueChange(principleId, field.key, stepValue(v, field, -1))}
            style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
            hitSlop={6}
          >
            <Text style={styles.stepBtnTxt}>−</Text>
          </Pressable>
          <Pressable
            onPress={() => onValueChange(principleId, field.key, stepValue(v, field, 1))}
            style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
            hitSlop={6}
          >
            <Text style={styles.stepBtnTxt}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#444',
    flex: 1,
    paddingTop: 10,
  },
  col: {
    flex: 1.35,
    minWidth: 0,
    maxWidth: 280,
  },
  value: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    marginBottom: 6,
  },
  trackWrap: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5E5',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: PURPLE,
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: PURPLE,
    top: 9,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 6,
  },
  stepBtn: {
    width: 36,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  stepBtnPressed: { opacity: 0.75 },
  stepBtnTxt: {
    fontSize: 18,
    fontWeight: '800',
    color: PURPLE,
    marginTop: -1,
  },
});
