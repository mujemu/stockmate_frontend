import React from 'react';
import { InteractionManager, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { navigationRef } from '../navigation/navigationRef';

const ACCENT = '#4B56C8';
const CTA_BG = '#1A1F3C';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * 탐색 탭 진입 후 지연 표시 — 안내 후「투자 판단 원칙 설정하기」로 `Survey`(온보딩 투자 판단 설정) 스택 이동.
 */
export function PrinciplesSetupPromptModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();

  const goSettings = () => {
    onClose();
    /** 모달이 내려간 뒤 루트 스택에 `Survey`(PrinciplesPriorityEditor 온보딩) 푸시 */
    const pushPrinciples = () => {
      if (!navigationRef.isReady()) return false;
      navigationRef.dispatch(CommonActions.navigate({ name: 'Survey' }));
      return true;
    };
    InteractionManager.runAfterInteractions(() => {
      if (pushPrinciples()) return;
      requestAnimationFrame(() => {
        if (pushPrinciples()) return;
        const t = setInterval(() => {
          if (pushPrinciples()) clearInterval(t);
        }, 40);
        setTimeout(() => clearInterval(t), 2500);
      });
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>투자 판단 설정</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.iconCircle}>
            <Ionicons name="alert" size={28} color="#5C6370" />
          </View>

          <Text style={styles.headline}>
            고객님은{' '}
            <Text style={styles.headlineAccent}>투자 판단 원칙 설정</Text>
            이 필요합니다.
          </Text>

          <View style={styles.bullets}>
            <Text style={styles.bullet}>
              · 투자 판단 원칙은 매매 시 감정적 결정을 방지하고, 일관된 기준으로 투자할 수 있도록 도와주는 나만의 규칙입니다.
            </Text>
            <Text style={styles.bullet}>
              · 시간, 비중, 매도·매수 조건, 감정 관리 등 5가지 영역에서 5~23개의 원칙을 선택하면, 투자 성향에 맞는 판단 기준이 설정됩니다.
            </Text>
            <Text style={styles.bullet}>
              · 설정된 원칙은 매매 전 체크리스트로 활용되며, 언제든지 수정할 수 있습니다.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]} onPress={goSettings}>
            <Text style={styles.ctaTxt}>투자 판단 원칙 설정하기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8EC',
  },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#111' },
  body: { flex: 1, paddingHorizontal: 22, paddingTop: 28 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF0F4',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 22,
  },
  headline: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 22,
  },
  headlineAccent: { color: ACCENT, fontWeight: '900' },
  bullets: { gap: 12 },
  bullet: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    lineHeight: 22,
  },
  footer: { paddingHorizontal: 20, paddingVertical: 16 },
  cta: {
    backgroundColor: CTA_BG,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { opacity: 0.92 },
  ctaTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
