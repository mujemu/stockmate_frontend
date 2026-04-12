import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Colors } from '../config/colors';
import { PrinciplesParamDragSlider } from './PrinciplesParamDragSlider';
import { mergeServerParamsOverDisk, principlePrefsStorageKey } from '../config/principlePrefsStorage';
import {
  CATEGORY_SECTION_ORDER,
  defaultParamsForRank,
  getParamSpec,
  normalizePrincipleCategory,
  sectionTitle,
} from '../config/principleUiSpecs';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import type { PrincipleDefaultDto } from '../types/stockmateApiV1';

const POOL_SIZE = 23;
/** 시간·비중·매도·매수·감정 각 1개 이상 + 전체 최소 개수 */
const MIN_SELECTED = 5;

const PURPLE = Colors.primary;

function sortIdsByDefaultRank(
  ids: string[],
  byId: Record<string, PrincipleDefaultDto | undefined>
): string[] {
  return [...ids].sort((a, b) => {
    const ra = byId[a]?.default_rank ?? 999;
    const rb = byId[b]?.default_rank ?? 999;
    return ra - rb;
  });
}

export type PrinciplesPriorityEditorProps = {
  userId: string;
  onSaved?: () => void;
  onRequestClose?: () => void;
  variant?: 'onboarding' | 'settings';
};

export function PrinciplesPriorityEditor({
  userId,
  onSaved,
  onRequestClose,
  variant = 'settings',
}: PrinciplesPriorityEditorProps) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [defaults, setDefaults] = useState<PrincipleDefaultDto[]>([]);
  /** 선택된 원칙 id (항목 내 순서는 default_rank — 사용자 순위 편집 없음) */
  const [rankedIds, setRankedIds] = useState<string[]>([]);
  const [paramsByPrinciple, setParamsByPrinciple] = useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const defaultById = useMemo(() => Object.fromEntries(defaults.map((x) => [x.id, x])), [defaults]);

  const selectionState = useMemo(() => {
    const cats = new Set<string>();
    for (const id of rankedIds) {
      const d = defaultById[id];
      if (d) cats.add(normalizePrincipleCategory(d.category));
    }
    const chapterFilled = CATEGORY_SECTION_ORDER.filter((c) => cats.has(c)).length;
    const chaptersOk = chapterFilled === CATEGORY_SECTION_ORDER.length;
    const countOk = rankedIds.length >= MIN_SELECTED && rankedIds.length <= POOL_SIZE;
    const missingCats = CATEGORY_SECTION_ORDER.filter((c) => !cats.has(c));
    return {
      canSave: chaptersOk && countOk,
      chaptersOk,
      chapterFilled,
      countOk,
      missingCats,
    };
  }, [rankedIds, defaultById]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [d, s, rawPrefs] = await Promise.all([
        StockmateApiV1.principles.getDefaults(),
        StockmateApiV1.principles.getStatus(userId),
        AsyncStorage.getItem(principlePrefsStorageKey(userId)),
      ]);
      const sorted = d.slice().sort((a, b) => a.default_rank - b.default_rank);
      if (sorted.length !== POOL_SIZE) {
        setErr(`기본 원칙 풀은 ${POOL_SIZE}개여야 합니다. (서버: ${sorted.length}개) — 백엔드 시드를 확인하세요.`);
        setDefaults(sorted);
        setRankedIds([]);
        return;
      }
      setDefaults(sorted);

      let prefsParsed: unknown = null;
      if (rawPrefs) {
        try {
          prefsParsed = JSON.parse(rawPrefs) as unknown;
        } catch {
          prefsParsed = null;
        }
      }
      setParamsByPrinciple(mergeServerParamsOverDisk(sorted, prefsParsed, s.params));

      if (s.is_configured && s.rankings.length >= MIN_SELECTED) {
        const ordered = s.rankings.slice().sort((a, b) => a.rank - b.rank).map((r) => r.principle_id);
        const byId = Object.fromEntries(sorted.map((x) => [x.id, x]));
        setRankedIds(sortIdsByDefaultRank(ordered, byId));
      } else {
        setRankedIds([]);
      }
      setSaveMsg(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const groupedByCategory = useMemo(() => {
    const m = new Map<string, PrincipleDefaultDto[]>();
    for (const c of CATEGORY_SECTION_ORDER) m.set(c, []);
    for (const d of defaults) {
      const key = normalizePrincipleCategory(d.category);
      let list = m.get(key);
      if (!list) {
        list = [];
        m.set(key, list);
      }
      list.push(d);
    }
    for (const list of m.values()) list.sort((a, b) => a.default_rank - b.default_rank);
    return m;
  }, [defaults]);

  const toggleChip = useCallback((id: string) => {
    setRankedIds((prev) => {
      let next: string[];
      if (prev.includes(id)) next = prev.filter((x) => x !== id);
      else if (prev.length >= POOL_SIZE) return prev;
      else next = [...prev, id];
      return sortIdsByDefaultRank(next, defaultById);
    });
    setSaveMsg(null);
  }, [defaultById]);

  const removeFromRanked = useCallback((id: string) => {
    setRankedIds((prev) => sortIdsByDefaultRank(
      prev.filter((x) => x !== id),
      defaultById
    ));
    setSaveMsg(null);
  }, [defaultById]);

  const setParam = useCallback((principleId: string, key: string, value: number) => {
    setParamsByPrinciple((prev) => ({
      ...prev,
      [principleId]: { ...(prev[principleId] ?? {}), [key]: value },
    }));
    setSaveMsg(null);
  }, []);

  const save = useCallback(async () => {
    if (saving) return;
    if (!selectionState.canSave) {
      setSaveMsg(
        !selectionState.chaptersOk && selectionState.missingCats.length > 0
          ? `조건을 맞춰 주세요: 시간·비중·매도·매수·감정 각 구역에서 최소 1개씩 골라 주세요. (미선택: ${selectionState.missingCats.join('·')})`
          : `조건을 맞춰 주세요: 원칙을 ${MIN_SELECTED}~${POOL_SIZE}개 선택하세요. (현재 ${rankedIds.length}개)`,
      );
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const sortedIds = sortIdsByDefaultRank(rankedIds, defaultById);
      const rankings = sortedIds.map((principle_id, i) => ({ principle_id, rank: i + 1 }));
      await StockmateApiV1.principles.setup(userId, { rankings, params: paramsByPrinciple });
      const prefsPayload = JSON.stringify({ version: 1 as const, params: paramsByPrinciple });
      await AsyncStorage.setItem(principlePrefsStorageKey(userId), prefsPayload);
      await load();
      setSaveMsg('저장했습니다.');
      onSaved?.();
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [
    rankedIds,
    saving,
    userId,
    load,
    onSaved,
    paramsByPrinciple,
    selectionState.canSave,
    selectionState.chaptersOk,
    selectionState.missingCats,
    defaultById,
  ]);

  const renderDetailCard = (pid: string) => {
    const d = defaultById[pid];
    if (!d) return null;
    const spec = getParamSpec(d.default_rank);
    const bag = paramsByPrinciple[pid] ?? defaultParamsForRank(d.default_rank);

    return (
      <View key={pid} style={styles.detailCard}>
        <View style={styles.detailHead}>
          <View style={styles.detailTitleRow}>
            <View style={styles.detailTitleBody}>
              <Text style={styles.detailTitle}>{d.short_label}</Text>
              <View style={styles.catPill}>
                <Text style={styles.catPillTxt}>{normalizePrincipleCategory(d.category)}</Text>
              </View>
            </View>
          </View>
          <Pressable onPress={() => removeFromRanked(pid)} hitSlop={8}>
            <Text style={styles.removeTxt}>제거</Text>
          </Pressable>
        </View>
        {spec?.mode === 'toggle' ? (
          <View style={styles.toggleRow}>
            <Switch
              value={(bag.on ?? 1) === 1}
              onValueChange={(on) => setParam(pid, 'on', on ? 1 : 0)}
              trackColor={{ false: '#E5E5E5', true: '#E8D4F7' }}
              thumbColor={(bag.on ?? 1) === 1 ? PURPLE : '#f4f3f4'}
            />
          </View>
        ) : null}
        {spec && spec.mode !== 'toggle'
          ? spec.fields.map((field) => {
              const raw = bag[field.key] ?? field.min;
              return (
                <PrinciplesParamDragSlider
                  key={`${pid}-${field.key}`}
                  principleId={pid}
                  field={field}
                  value={raw}
                  onValueChange={setParam}
                />
              );
            })
          : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PURPLE} />
        <Text style={styles.hint}>불러오는 중…</Text>
      </View>
    );
  }

  if (err && !defaults.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{err}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryTxt}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  const { width: winW } = Dimensions.get('window');
  const hPad = 14;
  /** 좁은 폰: 3열, 넓은 폰·태블릿: 4열로 23개가 더 많이 한 화면에 들어오게 */
  const chipCols = winW >= 400 ? 4 : 3;
  const chipGap = 5;
  const chipInnerW = winW - hPad * 2;
  const chipW = (chipInnerW - chipGap * (chipCols - 1)) / chipCols;

  const title = '투자 판단 설정';
  const sub =
    variant === 'onboarding'
      ? `구역마다 1개 이상, 전체 ${MIN_SELECTED}~${POOL_SIZE}개 선택.`
      : `구역별 1개 이상 · 전체 ${MIN_SELECTED}~${POOL_SIZE}개 후 저장.`;

  const progressPct = Math.min(
    100,
    Math.round((selectionState.chapterFilled / 5) * 55 + Math.min(1, rankedIds.length / MIN_SELECTED) * 45)
  );

  const statusLine = `선택 ${rankedIds.length} · 구역 ${selectionState.chapterFilled}/5`;

  return (
    <View style={styles.root}>
      {onRequestClose ? (
        <View style={styles.topRow}>
          <Pressable onPress={onRequestClose} hitSlop={12} style={styles.closeHit}>
            <Text style={styles.closeTxt}>닫기</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSub} numberOfLines={2}>
        {sub}
      </Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      {err ? (
        <View style={styles.warnBanner}>
          <Text style={styles.warnTxt}>{err}</Text>
        </View>
      ) : null}

      <View style={styles.statusStrip}>
        <Text style={styles.statusStripTxt}>{statusLine}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: hPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces
      >
        {CATEGORY_SECTION_ORDER.map((cat, sectionIdx) => {
          const items = groupedByCategory.get(cat) ?? [];
          if (!items.length) return null;
          return (
            <View
              key={cat}
              style={[styles.categoryBlock, sectionIdx === 0 && styles.categoryBlockFirst]}
            >
              <Text style={styles.categoryTitle}>{sectionTitle(cat)}</Text>
              <View style={[styles.chipRow, { columnGap: chipGap, rowGap: chipGap }]}>
                {items.map((d) => {
                  const on = rankedIds.includes(d.id);
                  return (
                    <Pressable
                      key={d.id}
                      onPress={() => toggleChip(d.id)}
                      disabled={rankedIds.length >= POOL_SIZE && !on}
                      style={({ pressed }) => [
                        styles.chip,
                        { width: chipW },
                        on && styles.chipSelected,
                        pressed && styles.chipPressed,
                        rankedIds.length >= POOL_SIZE && !on && styles.chipDisabled,
                      ]}
                    >
                      <Text style={[styles.chipLabel, on && styles.chipLabelSelected]}>
                        {d.short_label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionLabel}>세부 설정</Text>
        {rankedIds.length === 0 ? (
          <Text style={styles.empty}>원칙을 선택하면 여기서 수치를 바꿀 수 있어요.</Text>
        ) : (
          rankedIds.map((id) => renderDetailCard(id))
        )}
      </ScrollView>

      {saveMsg ? (
        <Text
          style={[
            styles.saveBanner,
            saveMsg === '저장했습니다.'
              ? styles.saveBannerOk
              : saveMsg.startsWith('조건을')
                ? styles.saveBannerHint
                : styles.saveBannerErr,
          ]}
        >
          {saveMsg}
        </Text>
      ) : null}

      <View style={styles.footer}>
        {!selectionState.canSave ? (
          <Text style={styles.footerHint}>
            {!selectionState.chaptersOk && selectionState.missingCats.length > 0
              ? `미선택: ${selectionState.missingCats.join('·')} · ${rankedIds.length}/${POOL_SIZE}개`
              : `구역 ${selectionState.chapterFilled}/5 · ${rankedIds.length}/${POOL_SIZE}개`}
          </Text>
        ) : null}
        <Pressable
          style={[styles.saveBtn, (!selectionState.canSave || saving) && styles.saveBtnOff]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnTxt}>저장</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  hint: { marginTop: 16, fontSize: 14, color: '#666', fontWeight: '600' },
  err: { color: '#B42318', fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  retryTxt: { color: PURPLE, fontWeight: '800' },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 8, paddingTop: 6 },
  closeHit: { paddingVertical: 8, paddingHorizontal: 12 },
  closeTxt: { fontSize: 14, color: '#333', fontWeight: '700' },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
    paddingHorizontal: 14,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  heroSub: {
    fontSize: 11,
    color: '#666',
    paddingHorizontal: 14,
    marginTop: 4,
    lineHeight: 15,
    fontWeight: '500',
  },
  progressTrack: {
    height: 2,
    backgroundColor: '#EDE4F7',
    marginHorizontal: 14,
    marginTop: 6,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PURPLE,
    borderRadius: 2,
  },
  warnBanner: {
    marginHorizontal: 14,
    marginTop: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8D4A8',
    backgroundColor: '#FFF9E6',
  },
  warnTxt: { fontSize: 12, color: '#5C4A00', fontWeight: '700' },
  statusStrip: {
    marginHorizontal: 14,
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  statusStripTxt: {
    color: '#444',
    fontSize: 11,
    fontWeight: '600',
  },
  scroll: { flex: 1, marginTop: 4 },
  scrollContent: { paddingBottom: 28 },
  categoryBlock: {
    marginTop: 10,
  },
  categoryBlockFirst: {
    marginTop: 2,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111',
    marginBottom: 5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: PURPLE,
    borderWidth: 1,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    textAlign: 'center',
    lineHeight: 14,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  chipLabelSelected: {
    color: PURPLE,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111',
    marginTop: 14,
    marginBottom: 8,
  },
  empty: { fontSize: 13, color: '#666', lineHeight: 20, fontWeight: '500', marginBottom: 8 },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 14,
    marginBottom: 12,
  },
  detailHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  detailTitleRow: { flexDirection: 'row', flex: 1, marginRight: 8 },
  detailRank: {
    fontSize: 16,
    fontWeight: '800',
    color: PURPLE,
    width: 28,
    marginTop: 0,
  },
  detailTitleBody: { flex: 1 },
  detailTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  catPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F7F7F7',
    borderRadius: 8,
  },
  catPillTxt: { fontSize: 10, fontWeight: '700', color: '#666' },
  removeTxt: { fontSize: 13, fontWeight: '700', color: '#999' },
  toggleRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  saveBanner: { textAlign: 'center', fontSize: 12, fontWeight: '700', paddingVertical: 8, paddingHorizontal: 12 },
  saveBannerOk: { color: '#14532D', backgroundColor: '#DCFCE7' },
  saveBannerHint: { color: '#5C4A00', backgroundColor: '#FFF9E6' },
  saveBannerErr: { color: '#991B1B', backgroundColor: '#FEE2E2' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
  footerHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
    lineHeight: 18,
  },
  saveBtn: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnOff: { backgroundColor: '#C4C4C4' },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
