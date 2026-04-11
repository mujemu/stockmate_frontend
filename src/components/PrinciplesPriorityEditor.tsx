import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors } from '../config/colors';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import type { PrincipleDefaultDto, PrinciplesStatusDto } from '../types/stockmateApiV1';

const PRIMARY = Colors.primary;
const PRIMARY_LIGHT = Colors.primaryLight;

const TOTAL = 10;

export type PrinciplesPriorityEditorProps = {
  userId: string;
  /** 온보딩: 저장 후 콜백 */
  onSaved?: () => void;
  /** 상단 닫기 (메뉴에서 모달식으로 열 때 등) */
  onRequestClose?: () => void;
  /** 'onboarding' | 'settings' — 설정만 타이틀 문구에 사용 */
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
  const [status, setStatus] = useState<PrinciplesStatusDto | null>(null);

  /** 상단이 높은 순위 (1위 → 첫 칸) */
  const [rankedIds, setRankedIds] = useState<string[]>([]);
  /** 순위 목록에서 맞교환용 첫 선택 principle_id */
  const [swapPick, setSwapPick] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [d, s] = await Promise.all([
        StockmateApiV1.principles.getDefaults(),
        StockmateApiV1.principles.getStatus(userId),
      ]);
      const sorted = d.slice().sort((a, b) => a.default_rank - b.default_rank);
      if (sorted.length !== TOTAL) {
        setErr(`기본 원칙은 ${TOTAL}개여야 합니다. (서버: ${sorted.length}개)`);
        setDefaults(sorted);
        setStatus(s);
        return;
      }
      setDefaults(sorted);
      setStatus(s);

      if (s.is_configured && s.rankings.length === TOTAL) {
        const ordered = s.rankings.slice().sort((a, b) => a.rank - b.rank).map((r) => r.principle_id);
        setRankedIds(ordered);
      } else {
        setRankedIds([]);
      }
      setSwapPick(null);
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

  const defaultById = useMemo(() => Object.fromEntries(defaults.map((x) => [x.id, x])), [defaults]);

  const poolIds = useMemo(() => {
    const set = new Set(rankedIds);
    return defaults.map((d) => d.id).filter((id) => !set.has(id));
  }, [defaults, rankedIds]);

  const addFromPool = useCallback((id: string) => {
    if (rankedIds.length >= TOTAL) return;
    if (rankedIds.includes(id)) return;
    setRankedIds((prev) => [...prev, id]);
    setSaveMsg(null);
  }, [rankedIds]);

  const removeFromRanked = useCallback((id: string) => {
    setRankedIds((prev) => prev.filter((x) => x !== id));
    setSwapPick((p) => (p === id ? null : p));
    setSaveMsg(null);
  }, []);

  const onTapRanked = useCallback(
    (id: string) => {
      if (swapPick == null) {
        setSwapPick(id);
        return;
      }
      if (swapPick === id) {
        setSwapPick(null);
        return;
      }
      setRankedIds((prev) => {
        const i = prev.indexOf(swapPick);
        const j = prev.indexOf(id);
        if (i < 0 || j < 0) return prev;
        const next = [...prev];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
      setSwapPick(null);
      setSaveMsg(null);
    },
    [swapPick]
  );

  const fillDefaultOrder = useCallback(() => {
    setRankedIds(defaults.map((d) => d.id));
    setSwapPick(null);
    setSaveMsg(null);
  }, [defaults]);

  const save = useCallback(async () => {
    if (rankedIds.length !== TOTAL || saving) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const rankings = rankedIds.map((principle_id, i) => ({ principle_id, rank: i + 1 }));
      await StockmateApiV1.principles.setup(userId, { rankings });
      if (onSaved) {
        onSaved();
        return;
      }
      await load();
      setSaveMsg('서버에 저장했습니다.');
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [rankedIds, saving, userId, load, onSaved]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.hint}>원칙 목록을 불러오는 중…</Text>
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

  const title =
    variant === 'onboarding'
      ? '투자 원칙 순위를 정해 주세요'
      : '투자 원칙 순위 재설정';
  const sub =
    variant === 'onboarding'
      ? `아래에서 원칙을 눌러 순서를 채운 뒤, 순위 목록에서 두 개를 차례로 누르면 자리를 바꿀 수 있어요. (${TOTAL}개 모두 배치 후 저장)`
      : `대기 목록에서 눌러 넣고, 순위에서 두 번 눌러 맞바꿀 수 있어요. 저장 시 서버(DB)에 반영됩니다.`;

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
      <Text style={styles.heroSub}>{sub}</Text>

      {err ? (
        <View style={styles.warnBanner}>
          <Text style={styles.warnTxt}>{err}</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>
          내 순위 ({rankedIds.length}/{TOTAL}) · 높을수록 위가 중요
        </Text>
        {rankedIds.length === 0 ? (
          <Text style={styles.empty}>대기 목록에서 원칙을 눌러 여기에 쌓이면 1위부터 순서대로 들어갑니다.</Text>
        ) : (
          rankedIds.map((id, idx) => {
            const d = defaultById[id];
            if (!d) return null;
            const isPick = swapPick === id;
            return (
              <Pressable
                key={id}
                onPress={() => onTapRanked(id)}
                style={({ pressed }) => [
                  styles.rankedRow,
                  isPick && styles.rankedRowSelected,
                  pressed && styles.rankedRowPressed,
                ]}
              >
                <Text style={[styles.rankBadge, isPick && styles.rankBadgeOn]}>{idx + 1}</Text>
                <View style={styles.rankedBody}>
                  <Text style={styles.rankedTitle}>{d.short_label}</Text>
                  <Text style={styles.rankedCat}>{d.category}</Text>
                </View>
                <Pressable
                  onPress={() => removeFromRanked(id)}
                  hitSlop={10}
                  style={styles.outBtn}
                >
                  <Text style={styles.outBtnTxt}>빼기</Text>
                </Pressable>
              </Pressable>
            );
          })
        )}

        <View style={styles.hintRow}>
          <Text style={styles.swapHint}>순위 줄에서 원칙을 한 번 누르면 선택, 다른 것을 누르면 두 자리가 바뀝니다.</Text>
        </View>

        <Text style={[styles.sectionLabel, styles.sectionSpaced]}>
          대기 중 ({poolIds.length})
        </Text>
        {poolIds.length === 0 ? (
          <Text style={styles.empty}>
            {rankedIds.length === TOTAL ? '모든 원칙이 배치되었습니다. 저장을 눌러 주세요.' : '불러오는 중…'}
          </Text>
        ) : (
          <View style={styles.poolWrap}>
            {poolIds.map((id) => {
              const d = defaultById[id];
              if (!d) return null;
              return (
                <Pressable
                  key={id}
                  onPress={() => addFromPool(id)}
                  style={({ pressed }) => [styles.poolChip, pressed && styles.poolChipPressed]}
                >
                  <Text style={styles.poolChipTxt}>{d.short_label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable onPress={fillDefaultOrder} style={styles.fillDefaultBtn}>
          <Text style={styles.fillDefaultTxt}>기본 순위로 한 번에 채우기</Text>
        </Pressable>

        {status?.is_configured ? (
          <Text style={styles.meta}>이미 저장된 설정이 있습니다. 저장하면 전체 순위가 덮어써집니다.</Text>
        ) : null}
      </ScrollView>

      {saveMsg ? (
        <Text
          style={[
            styles.saveBanner,
            saveMsg.includes('저장') ? styles.saveBannerOk : styles.saveBannerErr,
          ]}
        >
          {saveMsg}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Pressable
          style={[styles.saveBtn, (rankedIds.length !== TOTAL || saving) && styles.saveBtnOff]}
          onPress={save}
          disabled={rankedIds.length !== TOTAL || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnTxt}>저장 (DB 반영)</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  hint: { marginTop: 12, fontSize: 14, color: Colors.textSub, fontWeight: '600' },
  err: { color: '#B91C1C', fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  retryTxt: { color: PRIMARY, fontWeight: '800' },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 4, marginBottom: 4 },
  closeHit: { paddingVertical: 8, paddingHorizontal: 12 },
  closeTxt: { fontSize: 15, color: PRIMARY, fontWeight: '800' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, paddingHorizontal: 16 },
  heroSub: {
    fontSize: 13,
    color: Colors.textSub,
    paddingHorizontal: 16,
    marginTop: 8,
    lineHeight: 19,
    fontWeight: '600',
  },
  warnBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  warnTxt: { fontSize: 13, color: '#92400E', fontWeight: '700' },
  scroll: { flex: 1, marginTop: 12 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: PRIMARY, marginBottom: 10 },
  sectionSpaced: { marginTop: 22 },
  empty: { fontSize: 13, color: Colors.textSub, lineHeight: 19, fontWeight: '600', marginBottom: 8 },
  rankedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  rankedRowSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
  },
  rankedRowPressed: { opacity: 0.92 },
  rankBadge: {
    width: 28,
    fontSize: 16,
    fontWeight: '900',
    color: PRIMARY,
    textAlign: 'center',
  },
  rankBadgeOn: { color: '#5B21B6' },
  rankedBody: { flex: 1, paddingHorizontal: 8 },
  rankedTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },
  rankedCat: { fontSize: 11, color: Colors.textMuted, marginTop: 4, fontWeight: '700' },
  outBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  outBtnTxt: { fontSize: 13, fontWeight: '800', color: Colors.textMuted },
  hintRow: { marginTop: 6, marginBottom: 4 },
  swapHint: { fontSize: 12, color: Colors.textMuted, lineHeight: 17, fontWeight: '600' },
  poolWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  poolChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  poolChipPressed: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
  },
  poolChipTxt: { fontSize: 13, fontWeight: '700', color: Colors.text, maxWidth: 280 },
  fillDefaultBtn: { marginTop: 18, alignSelf: 'flex-start', paddingVertical: 8 },
  fillDefaultTxt: { fontSize: 14, fontWeight: '800', color: PRIMARY },
  meta: { marginTop: 14, fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  saveBanner: { textAlign: 'center', fontSize: 13, fontWeight: '700', paddingVertical: 8, paddingHorizontal: 16 },
  saveBannerOk: { color: '#166534', backgroundColor: '#DCFCE7' },
  saveBannerErr: { color: '#B91C1C', backgroundColor: '#FEF2F2' },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: Colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnOff: { backgroundColor: '#D1D5DB' },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
