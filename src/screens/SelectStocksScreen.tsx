import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Character } from '../models/Character';
import { ApiService } from '../services/ApiService';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { Colors } from '../config/colors';

interface Props {
  navigation: any;
}

const MAX_SELECT = 5;

export function SelectStocksScreen({ navigation }: Props) {
  const [all, setAll] = useState<Character[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [knownById, setKnownById] = useState<Record<string, Character>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Character[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    ApiService.getCharacters().then((chars) => {
      setAll(chars);
      const map: Record<string, Character> = {};
      chars.forEach((c) => (map[c.characterId] = c));
      setKnownById(map);
      setLoading(false);
    });
  }, []);

  const onSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    try {
      const results = await ApiService.searchCharacters(q.trim());
      setKnownById((prev) => {
        const next = { ...prev };
        results.forEach((c) => (next[c.characterId] = c));
        return next;
      });
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const toggle = (char: Character) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(char.characterId)) {
        next.delete(char.characterId);
      } else if (next.size < MAX_SELECT) {
        next.add(char.characterId);
        setKnownById((m) => ({ ...m, [char.characterId]: char }));
      }
      return next;
    });
  };

  const confirm = async () => {
    if (selectedIds.size === 0) return;
    const dbIds = new Set(all.map((c) => c.characterId));
    for (const id of selectedIds) {
      if (!dbIds.has(id)) {
        const char = knownById[id];
        if (char) await ApiService.registerCharacter(char.companyName, char.themeColor);
      }
    }
    const selected = [...selectedIds].map((id) => knownById[id]).filter(Boolean);
    navigation.replace('Home', { characters: selected });
  };

  const displayList = query.trim() ? searchResults : all;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.appTitle}>My Stock Mate</Text>
        <Text style={styles.title}>포트폴리오 연동</Text>
        <Text style={styles.sub}>AI 에이전트와 대화할 종목을 선택하세요 (최대 {MAX_SELECT}개)</Text>

        <TextInput
          style={styles.input}
          placeholder="종목명 검색 (예: 카카오, LG에너지솔루션)"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={onSearch}
        />

        {selectedIds.size > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{selectedIds.size}개 선택됨</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={displayList}
            keyExtractor={(item) => item.characterId}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            contentContainerStyle={{ paddingBottom: 20 }}
            style={{ marginTop: 16, flex: 1 }}
            renderItem={({ item }) => {
              const isSelected = selectedIds.has(item.characterId);
              const isDisabled = !isSelected && selectedIds.size >= MAX_SELECT;
              const color = item.themeColor ?? Colors.primary;
              return (
                <TouchableOpacity
                  onPress={isDisabled ? undefined : () => toggle(item)}
                  style={[
                    styles.card,
                    isSelected && { backgroundColor: color + '14', borderColor: color + 'B3', borderWidth: 2 },
                  ]}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: isSelected ? color : '#CDD0E3', backgroundColor: isSelected ? color : 'transparent' },
                  ]}>
                    {isSelected && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                  </View>
                  <CharacterAvatar character={item} size={52} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[styles.cardName, isDisabled && { color: '#CDD0E3' }]}>
                      {item.companyName}
                    </Text>
                    <Text style={[styles.cardSub, isDisabled && { color: '#DDE0EF' }]} numberOfLines={1}>
                      {item.openingMessage}
                    </Text>
                  </View>
                  {isSelected && <Text style={{ color }}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        )}

        <TouchableOpacity
          style={[styles.btn, selectedIds.size === 0 && styles.btnDisabled]}
          onPress={confirm}
          disabled={selectedIds.size === 0}
        >
          <Text style={[styles.btnText, selectedIds.size === 0 && styles.btnTextDisabled]}>
            {selectedIds.size === 0 ? '종목을 선택하세요' : '메이트 불러오기'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 },
  appTitle: { color: Colors.primary, fontSize: 22, fontWeight: '800' },
  title: { color: Colors.text, fontSize: 26, fontWeight: 'bold', marginTop: 4 },
  sub: { color: Colors.textSub, fontSize: 14, marginTop: 6, marginBottom: 12 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '1A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  badgeText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  checkbox: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  cardName: { fontSize: 17, fontWeight: 'bold', color: Colors.text },
  cardSub: { fontSize: 12, color: Colors.textSub, marginTop: 4 },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
  },
  btnDisabled: { backgroundColor: '#E0E3F0', shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnTextDisabled: { color: Colors.textMuted },
});
