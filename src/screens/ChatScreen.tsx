import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform,
  Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Character } from '../models/Character';
import { AgentState, createAgentState } from '../models/AgentState';
import { createMessage, NewsItem } from '../models/ChatMessage';
import { ApiService } from '../services/ApiService';
import { ChatBubble, ThinkingBubble } from '../components/ChatBubble';
import { MediaButtons, MediaType } from '../components/MediaButtons';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { Colors } from '../config/colors';

interface Props {
  navigation: any;
  route: {
    params: {
      character: Character;
      agentState?: AgentState;
    };
  };
}

export function ChatScreen({ navigation, route }: Props) {
  const { character } = route.params;
  const [agent, setAgent] = useState<AgentState>(
    route.params.agentState ?? createAgentState()
  );
  const [input, setInput] = useState('');
  const [showOrder, setShowOrder] = useState(false);
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [marketOrder, setMarketOrder] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!agent.initialized) startSession();
  }, []);

  const update = (patch: Partial<AgentState>) =>
    setAgent((prev) => ({ ...prev, ...patch }));

  const startSession = async () => {
    update({ thinking: true });
    try {
      const res = await ApiService.startSession(character.characterId, character.companyName);
      const opening = createMessage('assistant', res.opening_message ?? '안녕하세요!');
      update({
        sessionId: res.session_id,
        initialized: true,
        thinking: false,
        messages: [opening],
      });
      autoLoadNews(res.session_id);
    } catch (e) {
      update({ thinking: false });
    }
  };

  const autoLoadNews = async (sessionId: string) => {
    try {
      const items = await ApiService.getNews(character.characterId, 3, character.companyName);
      if (!items.length) return;
      const newsItems: NewsItem[] = items.map((n: any) => ({
        title: n.title ?? '',
        date: n.pubDate ?? '',
        description: n.description ?? '',
        url: n.originallink ?? n.link ?? '',
      }));
      const msg = createMessage('assistant', '', 'newsCards', { newsItems });
      setAgent((prev) => ({ ...prev, messages: [...prev.messages, msg] }));
    } catch (_) {}
  };

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || !agent.sessionId || agent.thinking) return;
    setInput('');
    const userMsg = createMessage('user', content);
    setAgent((prev) => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      thinking: true,
    }));
    scrollToBottom();
    try {
      const res = await ApiService.chat(agent.sessionId, content);
      const botMsg = createMessage('assistant', res.response ?? '');
      const chips: string[] = res.suggestions ?? agent.actionChips;
      setAgent((prev) => ({
        ...prev,
        messages: [...prev.messages, botMsg],
        thinking: false,
        actionChips: chips,
        decisionReady: res.decision_ready ?? prev.decisionReady,
      }));
      scrollToBottom();
    } catch (_) {
      update({ thinking: false });
    }
  };

  const handleMedia = async (type: MediaType, label: string) => {
    const userMsg = createMessage('user', label);
    setAgent((prev) => ({ ...prev, messages: [...prev.messages, userMsg], thinking: true }));
    scrollToBottom();
    try {
      if (type === 'news') {
        const shownTitles = agent.messages
          .flatMap((m) => m.newsItems.map((n) => n.title));
        const res = await ApiService.getNewsAnalyzed(
          character.characterId, shownTitles, character.companyName
        );
        const newsItems: NewsItem[] = (res.items ?? []).map((n: any) => ({
          title: n.title ?? '', date: n.pubDate ?? '',
          description: n.description ?? '', url: n.originallink ?? n.link ?? '',
        }));
        const newsMsg = createMessage('assistant', '', 'newsCards', { newsItems });
        const analysisMsg = createMessage('assistant', res.analysis ?? '');
        setAgent((prev) => ({
          ...prev,
          messages: [...prev.messages, newsMsg, analysisMsg],
          thinking: false,
        }));
      } else if (type === 'disclosure') {
        const res = await ApiService.getDisclosuresStructured(
          character.characterId, character.companyName
        );
        const text = res.headline
          ? `${res.headline}\n\n${res.summary ?? ''}\n\n${res.implication ?? ''}`
          : (res.explanation ?? '공시 정보를 찾을 수 없습니다.');
        const msg = createMessage('assistant', text);
        setAgent((prev) => ({ ...prev, messages: [...prev.messages, msg], thinking: false }));
      } else if (type === 'analyst') {
        const res = await ApiService.getAnalystReports(character.characterId, character.companyName);
        const text = res.analysis ?? '애널리스트 리포트를 찾을 수 없습니다.';
        const msg = createMessage('assistant', text);
        setAgent((prev) => ({ ...prev, messages: [...prev.messages, msg], thinking: false }));
      }
      scrollToBottom();
    } catch (_) {
      update({ thinking: false });
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleOrder = async () => {
    try {
      await ApiService.placeOrder({
        characterId: character.characterId,
        orderType,
        quantity: parseInt(quantity) || 0,
        price: marketOrder ? 0 : parseInt(price) || 0,
        marketOrder,
      });
      setShowOrder(false);
      Alert.alert('주문 완료', `${orderType === 'buy' ? '매수' : '매도'} 주문이 접수되었습니다.`);
    } catch (e) {
      Alert.alert('오류', '주문 처리 중 오류가 발생했습니다.');
    }
  };

  const lastIdx = agent.messages.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <CharacterAvatar character={character} size={36} />
        <Text style={styles.headerTitle}>{character.companyName}</Text>
        <TouchableOpacity
          style={styles.orderBtn}
          onPress={() => setShowOrder(true)}
        >
          <Text style={styles.orderBtnText}>주문</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {/* 채팅 목록 */}
        <FlatList
          ref={listRef}
          data={agent.messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <ChatBubble
              message={item}
              onAction={sendMessage}
              actionChips={agent.actionChips}
              isLast={index === lastIdx}
            />
          )}
          ListFooterComponent={agent.thinking ? <ThinkingBubble /> : null}
          onContentSizeChange={scrollToBottom}
        />

        {/* 미디어 버튼 */}
        <MediaButtons onSelect={handleMedia} />

        {/* 입력창 */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline={true}
            onSubmitEditing={() => sendMessage(input)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim()}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 주문 모달 */}
      <Modal visible={showOrder} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>주문</Text>
            <View style={styles.typeRow}>
              {(['buy', 'sell'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, orderType === t && styles.typeBtnActive]}
                  onPress={() => setOrderType(t)}
                >
                  <Text style={[styles.typeBtnText, orderType === t && { color: '#fff' }]}>
                    {t === 'buy' ? '매수' : '매도'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="수량"
              keyboardType="number-pad"
              value={quantity}
              onChangeText={setQuantity}
            />
            <TouchableOpacity
              style={styles.marketToggle}
              onPress={() => setMarketOrder((v) => !v)}
            >
              <Text style={styles.marketToggleText}>
                {marketOrder ? '✓ 시장가' : '○ 시장가'}
              </Text>
            </TouchableOpacity>
            {!marketOrder && (
              <TextInput
                style={styles.modalInput}
                placeholder="가격"
                keyboardType="number-pad"
                value={price}
                onChangeText={setPrice}
              />
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowOrder(false)}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleOrder}>
                <Text style={styles.confirmText}>주문</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 20, color: Colors.text },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
  orderBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  orderBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  listContent: { paddingVertical: 12, paddingBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1, backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  modalInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.text, marginBottom: 12,
  },
  marketToggle: { marginBottom: 12 },
  marketToggleText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  cancelText: { color: Colors.text, fontWeight: '600' },
  confirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '700' },
});
