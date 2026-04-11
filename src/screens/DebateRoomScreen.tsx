import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DimensionValue } from 'react-native';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../config/colors';
import {
  type DebateForumEntrySource,
  buildDebateForumSeedTopic,
  inferDebateForumEntrySource,
} from '../config/debateForumEntry';
import { ForumHeroStage } from '../components/ForumHeroStage';
import { useUserSession } from '../context/UserSessionContext';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import type { AgentReplyDto, ForumPostOutDto } from '../types/stockmateApiV1';

const IMG_EAGLE   = require('../../assets/debate/eagle.png');
const IMG_OCTOPUS = require('../../assets/debate/octopus.png');
const IMG_TURTLE  = require('../../assets/debate/turtle.png');

type AgentId = 'eagle' | 'owl' | 'turtle';

type Agent = {
  id: AgentId;
  name: string;
  role: string;
  image: typeof IMG_EAGLE;
  labelAnchor: { left: DimensionValue; top: DimensionValue };
  heroPan: number;
};

const AGENT_IDS: AgentId[] = ['eagle', 'owl', 'turtle'];

// eagle = 키엉이(기자), owl = 키문이(원칙코치), turtle = 키북이(회계사)
const AGENTS: Agent[] = [
  {
    id: 'eagle',
    name: '키엉이',
    role: '기자',
    image: IMG_EAGLE,
    labelAnchor: { left: '41%', top: '20.5%' },
    heroPan: 0,
  },
  {
    id: 'owl',
    name: '키문이',
    role: '원칙 코치',
    image: IMG_OCTOPUS,
    labelAnchor: { left: '4%', top: '19%' },
    heroPan: -1,
  },
  {
    id: 'turtle',
    name: '키북이',
    role: '회계사',
    image: IMG_TURTLE,
    labelAnchor: { left: '78%', top: '24%' },
    heroPan: 1,
  },
];

const AGENT_LABELS: Record<AgentId, string> = {
  eagle:  '키엉이 기자',
  owl:    '키문이 원칙 코치',
  turtle: '키북이 회계사',
};

function isAgentUserId(userId: string): AgentId | null {
  if (userId === 'agent:eagle')  return 'eagle';
  if (userId === 'agent:owl')    return 'owl';
  if (userId === 'agent:turtle') return 'turtle';
  return null;
}

function detectPreferredAgentId(userMessage: string): AgentId {
  const msg = userMessage.toLowerCase();
  // 기자(키엉이): 뉴스/이슈/시장/실시간 맥락
  if (/(뉴스|속보|이슈|시장|수급|기사|공시|테마|업황|재료|호재|악재|실적|전망)/.test(msg)) {
    return 'eagle';
  }
  // 키문이(원칙 코치): 매수/매도 타이밍/원칙/심리/리스크
  if (/(원칙|규칙|매수|매도|손절|익절|분할|비중|타이밍|리스크|멘탈|심리|추매)/.test(msg)) {
    return 'owl';
  }
  // 키북이(회계사): 숫자/밸류/재무제표/지표
  if (/(재무|회계|밸류|밸류에이션|per|pbr|eps|roe|현금흐름|부채|영업이익|순이익|매출|가이던스)/.test(msg)) {
    return 'turtle';
  }
  // 기본값: 기자(키엉이)로 시작
  return 'eagle';
}

function buildFallbackAgentOrder(userMessage: string): AgentId[] {
  const preferred = detectPreferredAgentId(userMessage);
  return [preferred, ...AGENT_IDS.filter((id) => id !== preferred)];
}

type ThreadRow =
  | { kind: 'topic'; id: string; text: string }
  | { kind: 'post';  id: string; userId: string; text: string; mine: boolean }
  | { kind: 'agent'; id: string; agentId: AgentId; agentName: string; text: string };

/** 주문 확인 흐름에서 공론장으로 넘어올 때 첨부되는 맥락 */
export type DebateOrderContext = {
  fromOrderFlow?: boolean;
  orderType?: 'buy' | 'sell';
  violationScore?: number;
  violatedPrinciples?: string[];
  interventionMessage?: string;
  topViolation?: string;
  behaviorLogId?: string;
};

interface Props {
  navigation: { goBack: () => void };
  route: {
    params?: {
      topicId?: string;
      sectorKey?: string;
      stockCode?: string;
      stockName?: string;
      /** 탐색 종목 / 자산 섹터 / 뉴스 브리핑 / 주문 원칙 점검 등 진입 구분 */
      forumEntrySource?: DebateForumEntrySource;
      /** forumEntrySource === 'news' 일 때 불릿 원문 */
      newsBulletText?: string;
      orderContext?: DebateOrderContext;
    };
  };
}

function postsToRows(posts: ForumPostOutDto[], selfId: string | null): ThreadRow[] {
  return posts.map((p) => ({
    kind: 'post' as const,
    id:     p.id,
    userId: p.user_id,
    text:   p.content,
    mine:   selfId != null && p.user_id === selfId,
  }));
}

export function DebateRoomScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const CHAT_H = Math.round(winH * 0.42);
  const { userId, ready, error: sessionError } = useUserSession();

  /**
   * 동일 화면 재진입 시 React Navigation 이 route.params 를 병합하면,
   * 섹터 공론장인데도 이전 종목·주문 맥락(stockCode, orderContext 등)이 남을 수 있다.
   * forumEntrySource === 'sector' 이면 업종 방만 쓰도록 종목·뉴스·주문 파라미터는 무시한다.
   */
  const raw = route.params ?? {};
  const paramForumEntry = raw.forumEntrySource;
  const isOrderPrincipleNav = paramForumEntry === 'order_principle_check';
  const isSectorOnlyNav = paramForumEntry === 'sector';
  const paramTopicId = raw.topicId;
  const paramSectorKey = raw.sectorKey;
  const paramStockCode = isSectorOnlyNav ? undefined : raw.stockCode;
  const paramStockName = isSectorOnlyNav ? undefined : raw.stockName;
  const paramNewsBullet = isSectorOnlyNav ? undefined : raw.newsBulletText;
  const orderContext = isSectorOnlyNav ? undefined : raw.orderContext;

  const [keyboardExtraPad, setKeyboardExtraPad] = useState(0);

  const [initLoading,   setInitLoading]   = useState(true);
  const [initError,     setInitError]     = useState<string | null>(null);
  const [topicId,       setTopicId]       = useState<string | null>(null);
  const [topicTitle,    setTopicTitle]    = useState('공론장');
  const [viewCount,     setViewCount]     = useState<number | null>(null);
  const [rows,          setRows]          = useState<ThreadRow[]>([]);
  const [input,         setInput]         = useState('');
  const [sending,       setSending]       = useState(false);
  const [agentReplying, setAgentReplying] = useState(false);
  const [postError,     setPostError]     = useState<string | null>(null);
  const [speakerId,     setSpeakerId]     = useState<AgentId | null>(null);
  const [isUserTyping,  setIsUserTyping]  = useState(false);
  /** 토픽 로드 후 서버 room_kind 로도 판별 (딥링크 등) */
  const [topicOwlOnly, setTopicOwlOnly] = useState(false);
  const owlOnlyMode = isOrderPrincipleNav || topicOwlOnly;

  const listRef  = useRef<FlatList>(null);

  // ── 키보드 애니메이션 ─────────────────────────────────────────────────────────
  const kbOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEv = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEv = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEv, (e) => {
      const h = e.endCoordinates.height;
      setKeyboardExtraPad(Math.round(h * 0.15));
      Animated.timing(kbOffset, {
        toValue:         h,
        duration:        Platform.OS === 'ios' ? (e.duration ?? 250) : 150,
        useNativeDriver: false,
      }).start(() => listRef.current?.scrollToEnd({ animated: true }));
    });
    const onHide = Keyboard.addListener(hideEv, (e) => {
      setKeyboardExtraPad(0);
      Animated.timing(kbOffset, {
        toValue:         0,
        duration:        Platform.OS === 'ios' ? (e.duration ?? 250) : 150,
        useNativeDriver: false,
      }).start();
    });
    return () => { onShow.remove(); onHide.remove(); };
  }, [kbOffset]);

  // ── 새 메시지 추가 시 스크롤 ──────────────────────────────────────────────────
  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [rows, sending]);

  // ── 에이전트 메시지 타이핑 효과 ───────────────────────────────────────────────
  const addAgentTyping = useCallback(
    async (agentId: AgentId, agentName: string, text: string, postId: string) => {
      const tempId = `typing-${postId}`;
      setSpeakerId(agentId);

      // 빈 말풍선 먼저 추가
      setRows((prev) => [
        ...prev,
        { kind: 'agent' as const, id: tempId, agentId, agentName, text: '' },
      ]);

      // 타이핑 속도: 전체 시간 1.5~4초, 40ms 단위
      const totalMs    = Math.min(Math.max(text.length * 25, 1500), 4000);
      const tickMs     = 40;
      const ticks      = Math.ceil(totalMs / tickMs);
      const charsPerTick = Math.ceil(text.length / ticks);

      for (let i = charsPerTick; i <= text.length + charsPerTick; i += charsPerTick) {
        await new Promise<void>((r) => setTimeout(r, tickMs));
        const shown = Math.min(i, text.length);
        setRows((prev) =>
          prev.map((r) => (r.id === tempId ? { ...r, text: text.slice(0, shown) } : r)),
        );
        if (shown >= text.length) break;
      }

      // 실제 ID로 교체
      setRows((prev) =>
        prev.map((r) => (r.id === tempId ? { ...r, id: postId, text } : r)),
      );

      // 타이핑 완료 후 잠깐 대화중 유지
      await new Promise<void>((r) => setTimeout(r, 700));
      setSpeakerId(null);
    },
    [],
  );

  const requestAgentReplyWithFallback = useCallback(
    async (tid: string, userMessage: string): Promise<AgentReplyDto> => {
      const order = owlOnlyMode ? (['owl'] as const) : buildFallbackAgentOrder(userMessage);
      let lastError: unknown = null;
      for (const agentId of order) {
        try {
          return await StockmateApiV1.forum.agentReply(tid, {
            user_message: userMessage,
            stock_name: paramStockName ?? null,
            agent_id: agentId,
          });
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError ?? new Error('에이전트 응답을 가져오지 못했습니다.');
    },
    [paramStockName, owlOnlyMode],
  );

  // ── 스레드 로드 ───────────────────────────────────────────────────────────────
  const loadThread = useCallback(
    async (tid: string, selfUserId: string | null) => {
      const topic = await StockmateApiV1.forum.getTopic(tid);
      const posts = await StockmateApiV1.forum.listPosts(tid);
      setTopicTitle(topic.title);
      setViewCount(topic.view_count);
      setTopicId(topic.id);
      setTopicOwlOnly(topic.room_kind === 'order_principle');
      const intro: ThreadRow = {
        kind: 'topic',
        id:   `intro-${topic.id}`,
        text: `[토론 안내]\n${topic.title}\n\n${topic.content}`,
      };
      setRows([intro, ...postsToRows(posts, selfUserId)]);
    },
    [],
  );

  // ── 초기화 ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      setInitLoading(false);
      setInitError(sessionError?.message ?? '사용자 세션을 만들 수 없습니다.');
      return;
    }

    let cancelled = false;
    (async () => {
      setInitLoading(true);
      setInitError(null);
      try {
        if (paramTopicId) {
          await loadThread(paramTopicId, userId);
        } else {
          // user_id 필터로 개인 토론방만 조회 (다른 사용자 방과 공유 안 됨)
          const sectorRoomOnly = !paramStockCode && !paramStockName && !!paramSectorKey;
          const listExtra =
            paramStockCode && isOrderPrincipleNav
              ? { room_kind: 'order_principle' as const }
              : paramStockCode && !isOrderPrincipleNav
                ? { default_stock_room_only: true as const }
                : {};
          const existing = await StockmateApiV1.forum.listTopics({
            stock_code: paramStockCode ?? undefined,
            sector_key: !paramStockCode ? (paramSectorKey ?? undefined) : undefined,
            sector_room_only: sectorRoomOnly,
            user_id: userId,
            page_size: 1,
            ...listExtra,
          });
          const existingTopic = existing.items?.[0] ?? null;

          if (existingTopic) {
            if (cancelled) return;
            await loadThread(existingTopic.id, userId);
          } else {
            const entry = inferDebateForumEntrySource({
              forumEntrySource: paramForumEntry ?? null,
              orderContext: orderContext ?? null,
              stockCode: paramStockCode ?? null,
              stockName: paramStockName ?? null,
              sectorKey: paramSectorKey ?? null,
              newsBulletText: paramNewsBullet ?? null,
            });
            const { title, content } = buildDebateForumSeedTopic({
              entry,
              stockName: paramStockName ?? null,
              stockCode: paramStockCode ?? null,
              sectorKey: paramSectorKey ?? null,
              orderContext: orderContext ?? null,
              newsBulletText: paramNewsBullet ?? null,
            });

            const topic = await StockmateApiV1.forum.createTopic({
              user_id:    userId,
              title,
              content,
              sector_key: paramSectorKey ?? null,
              stock_code: paramStockCode ?? null,
              ...(isOrderPrincipleNav ? { room_kind: 'order_principle' as const } : {}),
            });
            if (cancelled) return;
            await loadThread(topic.id, userId);

            // 토론 개시 — 에이전트들이 먼저 발언 (타이핑 효과 포함)
            if (!cancelled) {
              try {
                const opening = await StockmateApiV1.forum.openDebate(topic.id, {
                  stock_name: paramStockName ?? null,
                });
                for (const r of opening.replies) {
                  if (cancelled) break;
                  await addAgentTyping(r.agent_id as AgentId, r.agent_name, r.content, r.post.id);
                }
              } catch { /* 개시 실패는 조용히 */ }
            }
          }
        }
        if (!cancelled) setInitError(null);
      } catch (e) {
        if (!cancelled) {
          setInitError(e instanceof Error ? e.message : String(e));
          setRows([]);
          setTopicId(null);
        }
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [
    ready,
    userId,
    sessionError,
    paramTopicId,
    paramSectorKey,
    paramStockCode,
    paramStockName,
    paramNewsBullet,
    paramForumEntry,
    isOrderPrincipleNav,
    orderContext,
    loadThread,
    addAgentTyping,
  ]);

  const BROADCAST_CMD = /^\/(all|전체)\s*/i;

  // ── 메시지 전송 ───────────────────────────────────────────────────────────────
  const onSend = async () => {
    const raw = input.trim();
    if (!raw || sending || !userId || !topicId || initLoading || initError) return;
    const broadcastAll = BROADCAST_CMD.test(raw);
    const content = broadcastAll ? raw.replace(BROADCAST_CMD, '').trim() : raw;
    if (!content) return;
    Keyboard.dismiss();
    setInput('');
    setSending(true);
    setPostError(null);
    const postBody = broadcastAll ? `[전체 에이전트에게] ${content}` : content;
    try {
      const post = await StockmateApiV1.forum.createPost(topicId, { user_id: userId, content: postBody });
      setRows((prev) => [
        ...prev,
        { kind: 'post', id: post.id, userId: post.user_id, text: post.content, mine: true },
      ]);

      setAgentReplying(true);
      try {
        if (broadcastAll) {
          const broadcastIds: AgentId[] = owlOnlyMode ? ['owl'] : [...AGENT_IDS];
          for (const agentId of broadcastIds) {
            try {
              const reply = await StockmateApiV1.forum.agentReply(topicId, {
                user_message: content,
                stock_name: paramStockName ?? null,
                agent_id: agentId,
              });
              await addAgentTyping(
                reply.agent_id as AgentId,
                reply.agent_name,
                reply.content,
                reply.post.id,
              );
            } catch {
              /* 한 캐릭터 실패 시 다음으로 */
            }
          }
        } else {
          const reply1 = await requestAgentReplyWithFallback(topicId, content);
          await addAgentTyping(
            reply1.agent_id as AgentId,
            reply1.agent_name,
            reply1.content,
            reply1.post.id,
          );

          if (!owlOnlyMode) {
            try {
              const followupOrder = AGENT_IDS.filter((id) => id !== (reply1.agent_id as AgentId));
              let reply2: AgentReplyDto | null = null;
              for (const agentId of followupOrder) {
                try {
                  reply2 = await StockmateApiV1.forum.agentReply(topicId, {
                    user_message: content,
                    stock_name: paramStockName ?? null,
                    agent_id: agentId,
                  });
                  break;
                } catch {
                  /* 다음 후보 */
                }
              }
              if (reply2) {
                await addAgentTyping(
                  reply2.agent_id as AgentId,
                  reply2.agent_name,
                  reply2.content,
                  reply2.post.id,
                );
              }
            } catch {
              /* 두 번째 응답 생략 */
            }
          }
        }
      } catch {
        setRows((prev) => [
          ...prev,
          {
            kind: 'agent',
            id: `fallback-${Date.now()}`,
            agentId: detectPreferredAgentId(content),
            agentName: '시스템',
            text: '지금 답변 연결이 잠시 불안정해요. 질문을 조금 짧게 다시 보내주시면 바로 이어서 답변할게요.',
          },
        ]);
      } finally {
        setAgentReplying(false);
        setSpeakerId(null);
      }
    } catch (e) {
      setInput(raw);
      setPostError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  // ── 말풍선 렌더 ───────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: ThreadRow }) => {
    if (item.kind === 'topic') {
      return (
        <View style={styles.msgRow}>
          <View style={[styles.bubble, styles.topicBubble]}>
            <Text style={styles.topicBubbleText}>{item.text}</Text>
          </View>
        </View>
      );
    }
    if (item.kind === 'agent') {
      return (
        <View style={[styles.msgRow, styles.msgLeft]}>
          <View style={styles.msgLeftHead}>
            <Text style={styles.msgName}>{item.agentName}</Text>
          </View>
          <View style={[styles.bubble, styles.agentAIBubble]}>
            <Text style={styles.bubbleText}>{item.text}</Text>
          </View>
        </View>
      );
    }
    const isUser  = item.mine;
    const agentId = isAgentUserId(item.userId);
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRight : styles.msgLeft]}>
        {!isUser && (
          <View style={styles.msgLeftHead}>
            <Text style={styles.msgName}>
              {agentId ? AGENT_LABELS[agentId] : '참여자 · ' + item.userId.slice(0, 8) + '…'}
            </Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : (agentId ? styles.agentAIBubble : styles.agentBubble)]}>
          <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  // ── 렌더 ──────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* 영상 전체 배경 — pointerEvents none: 터치를 채팅 패널로 전달 */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <ForumHeroStage
          speakerId={speakerId}
          isUserTyping={isUserTyping}
          agents={owlOnlyMode ? [AGENTS[1]] : AGENTS}
        />
      </View>

      {/* 배경 터치 → 키보드 닫기 */}
      <Pressable
        style={[StyleSheet.absoluteFill, { bottom: CHAT_H }]}
        onPress={() => Keyboard.dismiss()}
      />

      {/* 하단 채팅 패널 — 키보드 올라오면 bottom 상승 + height 동시 축소 → 상단 고정 */}
      <Animated.View style={[styles.chatSheet, {
        height: Animated.subtract(CHAT_H, kbOffset),
        bottom: kbOffset,
      }]}>
        {initLoading ? (
          <View style={styles.centerPad}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(item) => item.id}
            style={styles.chatList}
            contentContainerStyle={[
              styles.chatListContent,
              { paddingBottom: 28 + keyboardExtraPad },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            renderItem={renderItem}
            ListFooterComponent={
              sending       ? <Text style={styles.thinking}>메시지 전송 중…</Text>
              : agentReplying ? <Text style={styles.thinking}>AI 에이전트가 답변 중이에요…</Text>
              : null
            }
          />
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Ionicons name="chatbubbles-outline" size={24} color="#B0A8D0" style={styles.inputIcon} />
          <TextInput
            value={input}
            onChangeText={(v) => { setInput(v); setIsUserTyping(v.length > 0); }}
            onBlur={() => setIsUserTyping(false)}
            placeholder={
              topicId
                ? owlOnlyMode
                  ? '키문이(원칙 코치)에게 메시지…'
                  : '댓글 입력…  (/all 또는 /전체 로 세 에이전트 순서 응답)'
                : '연결 후 입력 가능'
            }
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.input}
            onSubmitEditing={onSend}
            returnKeyType="send"
            multiline={false}
            editable={!!topicId && !initLoading && !sending}
          />
          <Pressable
            onPress={onSend}
            style={[styles.sendFab, (!input.trim() || !topicId || sending) && styles.sendFabOff]}
            disabled={!input.trim() || !topicId || sending}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </Animated.View>

      {/* 상단 투명 바 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backHit}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>
        <View style={styles.topTitles}>
          <Text style={styles.serviceTitle}>인공지능 비즈니스 분석 서비스</Text>
          <Text style={styles.screenTitle} numberOfLines={1}>{topicTitle}</Text>
        </View>
        <View style={styles.backHit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
    zIndex: 10,
  },
  chatSheet: {
    position: 'absolute',
    left: 0, right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(246,244,251,0.96)',
    // VideoView(네이티브 레이어)가 JS 뷰를 덮는 현상 방지
    zIndex: 5,
    elevation: 5,  // Android SurfaceView 위로
  },
  backHit:      { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitles:    { flex: 1, alignItems: 'center' },
  serviceTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' },
  screenTitle:  { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 2 },
  centerPad:    { flex: 1, justifyContent: 'center', paddingVertical: 24 },
  chatList:     { flex: 1, marginTop: 6, minHeight: 60 },
  chatListContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    flexGrow: 1,
  },
  msgRow:      { marginBottom: 12 },
  msgLeft:     { alignItems: 'flex-start' },
  msgRight:    { alignItems: 'flex-end' },
  msgLeftHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  msgName:     { fontSize: 11, color: '#8B82B0', fontWeight: '800' },
  bubble:         { maxWidth: '88%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  topicBubble:    { backgroundColor: '#EEE9FB', borderWidth: 1, borderColor: '#DDD5F5', alignSelf: 'stretch', maxWidth: '100%' },
  topicBubbleText:{ color: '#3A3060', fontSize: 13, lineHeight: 20, fontWeight: '600' },
  agentBubble:    { backgroundColor: '#F0EEF9', borderWidth: 1, borderColor: '#DDD8F0' },
  agentAIBubble:  { backgroundColor: '#EAE4FB', borderWidth: 1, borderColor: '#C8B8F5' },
  userBubble:     { backgroundColor: Colors.primary },
  bubbleText:     { color: '#2A2540', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  userBubbleText: { color: '#fff' },
  thinking: { fontSize: 12, color: '#9E96C0', fontWeight: '600', marginTop: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0DCF0',
    gap: 8,
  },
  inputIcon: { marginLeft: 4 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: '#1A1D2D',
    fontWeight: '600',
  },
  sendFab: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendFabOff: { opacity: 0.45 },
});