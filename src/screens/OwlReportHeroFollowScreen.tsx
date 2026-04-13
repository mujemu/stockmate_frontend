import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { principlePrefsStorageKey } from '../config/principlePrefsStorage';
import { defaultParamsForRank } from '../config/principleUiSpecs';
import { usePrinciplesSetup } from '../context/PrinciplesSetupContext';
import { useUserSession } from '../context/UserSessionContext';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import type { PrincipleDefaultDto, PrinciplesStatusDto } from '../types/stockmateApiV1';

const P = '#7D3BDD';
const MAX_PRESET_COUNT = 20;

type Props = {
  navigation: { goBack: () => void };
};

export function OwlReportHeroFollowScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { userId, ready: sessionReady } = useUserSession();
  const { refreshNeedsPrinciplesSetup } = usePrinciplesSetup();
  const [loading, setLoading] = useState(true);
  const [defaults, setDefaults] = useState<PrincipleDefaultDto[]>([]);
  const [status, setStatus] = useState<PrinciplesStatusDto | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || !sessionReady) return;
    setLoading(true);
    try {
      const [d, s] = await Promise.all([
        StockmateApiV1.principles.getDefaults(),
        StockmateApiV1.principles.getStatus(userId),
      ]);
      const sortedDefaults = d.slice().sort((a, b) => a.default_rank - b.default_rank);
      setDefaults(sortedDefaults.slice(0, MAX_PRESET_COUNT));
      setStatus(s);
    } catch (e) {
      Alert.alert('불러오기 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [userId, sessionReady]);

  useEffect(() => {
    void load();
  }, [load]);

  const addedSet = useMemo(
    () => new Set((status?.rankings ?? []).map((r) => r.principle_id)),
    [status?.rankings],
  );

  const addPrinciple = useCallback(
    async (item: PrincipleDefaultDto) => {
      if (!userId || !sessionReady || !status || addingId) return;
      if (addedSet.has(item.id)) {
        Alert.alert('이미 담김', '이미 내 투자 원칙에 추가된 항목입니다.');
        return;
      }
      setAddingId(item.id);
      try {
        const existing = status.rankings.slice().sort((a, b) => a.rank - b.rank);
        const newRankings = [
          ...existing.map((r) => ({ principle_id: r.principle_id, rank: r.rank })),
          { principle_id: item.id, rank: existing.length + 1 },
        ];
        const params: Record<string, Record<string, number>> = { ...(status.params ?? {}) };
        params[item.id] = { ...defaultParamsForRank(item.default_rank) };

        await StockmateApiV1.principles.setup(userId, { rankings: newRankings, params });
        await AsyncStorage.setItem(
          principlePrefsStorageKey(userId),
          JSON.stringify({ version: 1 as const, params }),
        );
        await refreshNeedsPrinciplesSetup();
        await load();
        Alert.alert('담기 완료', `「${item.short_label}」이(가) 추가됐어요.`);
      } catch (e) {
        Alert.alert('담기 실패', e instanceof Error ? e.message : String(e));
      } finally {
        setAddingId(null);
      }
    },
    [userId, sessionReady, status, addingId, addedSet, refreshNeedsPrinciplesSetup, load],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backHit}>
          <Ionicons name="chevron-back" size={26} color="#1A1D2D" />
        </Pressable>
        <Text style={styles.title}>원칙 따라하기</Text>
        <View style={styles.backHit} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.leadTitle}>추천 원칙 모음</Text>
          <Text style={styles.leadSub}>
            미리 준비된 원칙 {MAX_PRESET_COUNT}개입니다. 필요한 항목만 `담기`로 내 투자 원칙에 추가하세요.
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={P} />
              <Text style={styles.loadingTxt}>원칙 목록을 불러오는 중...</Text>
            </View>
          ) : (
            defaults.map((item, idx) => {
              const isAdded = addedSet.has(item.id);
              const isAdding = addingId === item.id;
              return (
                <View key={item.id} style={styles.ruleRow}>
                  <View style={styles.ruleIdx}>
                    <Text style={styles.ruleIdxTxt}>{idx + 1}</Text>
                  </View>
                  <View style={styles.ruleBody}>
                    <Text style={styles.ruleTxt}>{item.short_label}</Text>
                    <Text style={styles.ruleMeta}>{item.category}</Text>
                  </View>
                  <Pressable
                    style={[
                      styles.addBtn,
                      (isAdded || isAdding) && styles.addBtnDisabled,
                      isAdded && styles.addBtnDone,
                    ]}
                    onPress={() => void addPrinciple(item)}
                    disabled={isAdded || isAdding || addingId !== null}
                  >
                    {isAdding ? (
                      <ActivityIndicator size={12} color="#fff" />
                    ) : (
                      <Text style={styles.addBtnTxt}>{isAdded ? '담김' : '담기'}</Text>
                    )}
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  backHit: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900', color: '#1A1D2D' },
  scroll: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8E9F0',
  },
  leadTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  leadSub: { marginTop: 6, fontSize: 13, color: '#6B7280', fontWeight: '600', lineHeight: 19, marginBottom: 14 },
  loadingBox: { paddingVertical: 18, alignItems: 'center', gap: 8 },
  loadingTxt: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  ruleIdx: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleIdxTxt: { fontSize: 12, fontWeight: '900', color: P },
  ruleBody: { flex: 1 },
  ruleTxt: { fontSize: 13, color: '#374151', fontWeight: '700', lineHeight: 19 },
  ruleMeta: { marginTop: 2, fontSize: 11, color: '#9CA3AF', fontWeight: '700' },
  addBtn: {
    backgroundColor: P,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.7 },
  addBtnDone: { backgroundColor: '#9CA3AF' },
  addBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
