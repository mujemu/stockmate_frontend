/**
 * 원칙 일지 — 월간 리포트·설정 갱신을 타임라인으로 정리 (데이터 있을 때만 풍부)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserSession } from '../context/UserSessionContext';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import type { MonthlyReportDto, PrinciplesStatusDto } from '../types/stockmateApiV1';

type DiaryRow = {
  id: string;
  dateLabel: string;
  tag: string;
  tagColor: string;
  title: string;
  body: string;
  afterNote?: string;
};

type Props = {
  navigation: { goBack: () => void };
};

export function OwlReportPrincipleDiaryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { userId, ready } = useUserSession();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DiaryRow[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    const [reports, principles] = await Promise.all([
      StockmateApiV1.reports.listByUser(userId).catch(() => [] as MonthlyReportDto[]),
      StockmateApiV1.principles.getStatus(userId).catch(() => null as PrinciplesStatusDto | null),
    ]);
    const list: DiaryRow[] = [];

    if (principles?.updated_at) {
      const d = new Date(principles.updated_at);
      list.push({
        id: 'setup',
        dateLabel: d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
        tag: '설정',
        tagColor: '#7D3BDD',
        title: '투자 판단 원칙 우선순위 저장',
        body: `현재 ${principles.rankings.length}개 원칙이 순위에 반영돼 있어요. 수정은「투자 판단 설정」에서 할 수 있어요.`,
        afterNote: principles.configured_at
          ? `최초 구성: ${new Date(principles.configured_at).toLocaleDateString('ko-KR')}`
          : undefined,
      });
    }

    const sorted = [...reports].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    for (const r of sorted.slice(0, 12)) {
      const d = new Date(r.created_at);
      const imp = (r.improvements ?? []).filter(Boolean).slice(0, 2);
      list.push({
        id: r.id,
        dateLabel: d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
        tag: '월간 점검',
        tagColor: '#2563EB',
        title: `${r.year}년 ${r.month}월 원칙 코칭 요약`,
        body:
          imp.length > 0
            ? imp.join('\n')
            : r.coaching_text.slice(0, 200) + (r.coaching_text.length > 200 ? '…' : ''),
        afterNote: `당월 행동 ${r.behavior_count}회 · 위반 ${r.violation_count}회 · 점수 ${
          r.principle_score ?? '—'
        }`,
      });
    }

    setRows(list);
  }, [userId]);

  useEffect(() => {
    if (!ready || !userId) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [ready, userId, load]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backHit}>
          <Ionicons name="chevron-back" size={26} color="#1A1D2D" />
        </Pressable>
        <Text style={styles.title}>원칙 진화 이력</Text>
        <View style={styles.backHit} />
      </View>
      <Text style={styles.lead}>
        월간 리포트와 설정 갱신을 한 줄로 모았어요. (상세 변경 전·후 문구는 추후 원칙 버전 API와 연동할 수
        있어요.)
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#7D3BDD" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {rows.map((r, idx) => (
            <View key={r.id} style={styles.rowWrap}>
              <View style={styles.rail}>
                <View style={[styles.dot, { backgroundColor: r.tagColor }]} />
                {idx < rows.length - 1 ? <View style={styles.railLine} /> : null}
              </View>
              <View style={styles.card}>
                <Text style={styles.date}>{r.dateLabel}</Text>
                <View style={[styles.tag, { borderColor: r.tagColor }]}>
                  <Text style={[styles.tagTxt, { color: r.tagColor }]}>{r.tag}</Text>
                </View>
                <Text style={styles.cardTitle}>{r.title}</Text>
                <Text style={styles.cardBody}>{r.body}</Text>
                {r.afterNote ? <Text style={styles.note}>{r.afterNote}</Text> : null}
              </View>
            </View>
          ))}
          {rows.length === 0 ? (
            <Text style={styles.empty}>아직 기록된 이력이 없어요. 한 달이 지나면 월간 리포트가 쌓여요.</Text>
          ) : null}
          <View style={{ height: insets.bottom + 28 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  backHit: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900', color: '#1A1D2D' },
  lead: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    paddingHorizontal: 18,
    marginBottom: 12,
    lineHeight: 18,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 16 },
  rowWrap: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 4 },
  rail: { width: 22, alignItems: 'center', marginRight: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 18 },
  railLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E9F0',
    marginBottom: 12,
  },
  date: { fontSize: 12, color: '#9CA3AF', fontWeight: '700', marginBottom: 6 },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  tagTxt: { fontSize: 11, fontWeight: '800' },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#111827', marginBottom: 8 },
  cardBody: { fontSize: 13, color: '#4B5563', lineHeight: 20, fontWeight: '600' },
  note: {
    marginTop: 10,
    fontSize: 12,
    color: '#7D3BDD',
    fontWeight: '700',
    lineHeight: 18,
  },
  empty: { textAlign: 'center', color: '#9CA3AF', fontWeight: '600', padding: 24 },
});
