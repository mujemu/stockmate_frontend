import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Character } from '../models/Character';
import { AgentState, PastSession, createAgentState, loadMemo } from '../models/AgentState';
import { ApiService } from '../services/ApiService';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { Colors } from '../config/colors';

interface Props {
  navigation: any;
  route: { params: { characters: Character[] } };
}

export function HomeScreen({ navigation, route }: Props) {
  const { characters } = route.params;
  const [agents, setAgents] = useState<Record<number, AgentState>>(() => {
    const init: Record<number, AgentState> = {};
    characters.forEach((_, i) => (init[i] = createAgentState()));
    return init;
  });

  useEffect(() => {
    characters.forEach((char, i) => loadPastSessions(char, i));
  }, []);

  const loadPastSessions = async (char: Character, index: number) => {
    try {
      const sessions = await ApiService.getSessions(char.companyName);
      const completed = sessions
        .filter((s: any) => s.session_status === '저장완료' && s.summary_text)
        .slice(0, 5);
      const pastSessions: PastSession[] = await Promise.all(
        completed.map(async (s: any) => {
          const memo = await loadMemo(s.session_id ?? '');
          return {
            sessionId: s.session_id ?? '',
            summary: s.summary_text ?? '',
            decisionNote: s.decision_note,
            createdAt: new Date(s.created_at ?? Date.now()),
            memo,
          };
        })
      );
      setAgents((prev) => ({
        ...prev,
        [index]: { ...prev[index], pastSessions },
      }));
    } catch (_) {}
  };

  const allReviews = characters.flatMap((char, i) =>
    (agents[i]?.pastSessions ?? []).map((session) => ({ session, character: char }))
  ).sort((a, b) => b.session.createdAt.getTime() - a.session.createdAt.getTime());

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.appTitle}>My Stock Mate</Text>

        {/* 종목 메이트 목록 */}
        <Text style={styles.sectionTitle}>내 메이트</Text>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
          {characters.map((char) => (
            <TouchableOpacity
              key={char.characterId}
              style={styles.mateCard}
              onPress={() =>
                navigation.navigate('Chat', {
                  character: char,
                })
              }
            >
              <CharacterAvatar character={char} size={56} />
              <Text style={styles.mateName}>{char.companyName}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addCard}
            onPress={() => navigation.replace('SelectStocks')}
          >
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addLabel}>추가</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* 복기 카드 */}
        <Text style={styles.sectionTitle}>복기 기록</Text>
        {allReviews.length === 0 ? (
          <Text style={styles.emptyText}>아직 복기 기록이 없습니다.</Text>
        ) : (
          allReviews.map(({ session, character }) => (
            <ReviewCard key={session.sessionId} session={session} character={character} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReviewCard({ session, character }: { session: PastSession; character: Character }) {
  const color = character.themeColor ?? Colors.primary;
  const dateStr = session.createdAt.toLocaleDateString('ko-KR', {
    month: 'short', day: 'numeric',
  });

  return (
    <View style={[styles.reviewCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.reviewHeader}>
        <CharacterAvatar character={character} size={32} />
        <Text style={styles.reviewCompany}>{character.companyName}</Text>
        <Text style={styles.reviewDate}>{dateStr}</Text>
      </View>
      <Text style={styles.reviewSummary} numberOfLines={2}>{session.summary}</Text>
      {session.decisionNote ? (
        <View style={[styles.decisionBadge, { backgroundColor: color + '1A' }]}>
          <Text style={[styles.decisionText, { color }]}>{session.decisionNote}</Text>
        </View>
      ) : null}
      {session.memo ? (
        <Text style={styles.memoText}>메모: {session.memo}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 20, paddingBottom: 40 },
  appTitle: { color: Colors.primary, fontSize: 22, fontWeight: '800', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12, marginTop: 8 },
  mateCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minWidth: 80,
  },
  mateName: { fontSize: 12, fontWeight: '600', color: Colors.text, marginTop: 8, textAlign: 'center' },
  addCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    minWidth: 80,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
    borderStyle: 'dashed',
  },
  addIcon: { fontSize: 24, color: Colors.primary },
  addLabel: { fontSize: 12, color: Colors.primary, marginTop: 4 },
  emptyText: { color: Colors.textSub, fontSize: 14, textAlign: 'center', marginTop: 20 },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  reviewCompany: { fontSize: 14, fontWeight: '700', color: Colors.text, flex: 1 },
  reviewDate: { fontSize: 12, color: Colors.textSub },
  reviewSummary: { fontSize: 13, color: Colors.text, lineHeight: 19 },
  decisionBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  decisionText: { fontSize: 12, fontWeight: '600' },
  memoText: { fontSize: 12, color: Colors.textSub, marginTop: 6, fontStyle: 'italic' },
});
