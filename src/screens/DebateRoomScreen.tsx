import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DimensionValue } from 'react-native';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
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
  type OrderPrincipleViolationDetailIntro,
  buildDebateForumSeedTopic,
  inferDebateForumEntrySource,
} from '../config/debateForumEntry';
import { buildOrderPrincipleRecapItemsForDebate } from '../config/orderPrincipleViolationCopy';
import { ForumHeroStage } from '../components/ForumHeroStage';
import { useUserSession } from '../context/UserSessionContext';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import type {
  AgentReplyDto,
  ForumPostOutDto,
  ForumTopicSummaryDto,
  PrinciplesStatusDto,
} from '../types/stockmateApiV1';

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
  | { kind: 'agent'; id: string; agentId: AgentId; agentName: string; text: string }
  | {
      kind: 'order_principle_recap';
      id: string;
      items: { label: string; reasonOneLine: string }[];
    }
  | { kind: 'order_cli'; id: string; prompt: string; choices: string[] };

const ORDER_CLI_ROW_ID = 'order-cli-tail';
const ORDER_PRINCIPLE_RECAP_ID = 'order-principle-recap';

type OrderRecapLine = { label: string; reasonOneLine: string };

/** 점검방: 위반 원칙 요약(recap) 바로 위에, 그 다음 order_cli — 맨 끝에만 붙이도록 정규화 */
function normalizeOrderPrincipleTail(
  prev: ThreadRow[],
  recapItems: OrderRecapLine[],
  prompt: string,
  choices: string[],
): ThreadRow[] {
  const base = prev.filter((r) => r.kind !== 'order_cli' && r.kind !== 'order_principle_recap');
  const out: ThreadRow[] = [...base];
  if (recapItems.length > 0) {
    out.push({
      kind: 'order_principle_recap',
      id: ORDER_PRINCIPLE_RECAP_ID,
      items: recapItems,
    });
  }
  if (choices.length > 0) {
    out.push({ kind: 'order_cli', id: ORDER_CLI_ROW_ID, prompt, choices });
  }
  return out;
}

function orderThreadFingerprint(r: ThreadRow[]): string {
  return r
    .map((x) => {
      if (x.kind === 'order_cli') return `O:${x.prompt}\n${x.choices.join('\u0001')}`;
      if (x.kind === 'order_principle_recap') {
        return `R:${x.items.map((i) => `${i.label}\u0002${i.reasonOneLine}`).join('\u0003')}`;
      }
      return `${x.kind}:${x.id}`;
    })
    .join('\n');
}

/** 주문 확인 흐름에서 공론장으로 넘어올 때 첨부되는 맥락 */
export type DebateOrderContext = {
  fromOrderFlow?: boolean;
  orderType?: 'buy' | 'sell';
  violatedPrinciples?: string[];
  interventionMessage?: string;
  topViolation?: string;
  behaviorLogId?: string;
  violationDetails?: OrderPrincipleViolationDetailIntro[];
};

const ORDER_CLI_FALLBACKS = ['분할·비중 점검', '손절·익절 기준 점검', '추격 매수·속도 점검'];

/** 맞물릴 수 있는 원칙 카드와 동일한 순서의 짧은 라벨 */
function orderedRecapLabelsForOrderPrincipleCli(oc: DebateOrderContext | undefined): string[] {
  return buildOrderPrincipleRecapItemsForDebate(oc)
    .map((i) => i.label.trim())
    .filter(Boolean);
}

/** 「다음 행동」3번 — 위 두 칸과 겹치지 않게 나머지를 불러올 때 사용 */
const ORDER_CLI_NOT_IN_LIST_CHOICE = '여기에 없어요';

/** 주문 전 점검방 CLI — 위반(리캡 순서) 3개 이상이면 1·2번은 앞 두 위반, 3번은「여기에 없어요」 */
async function buildOrderPrincipleCliChoices(
  uid: string,
  oc: DebateOrderContext | undefined,
): Promise<string[]> {
  const recapOrder = orderedRecapLabelsForOrderPrincipleCli(oc);
  if (recapOrder.length >= 3) {
    return [recapOrder[0], recapOrder[1], ORDER_CLI_NOT_IN_LIST_CHOICE];
  }

  const violated = [...new Set((oc?.violatedPrinciples ?? []).map((s) => String(s).trim()).filter(Boolean))];
  let status: PrinciplesStatusDto | null = null;
  try {
    status = await StockmateApiV1.principles.getStatus(uid);
  } catch {
    /* 오프라인 */
  }
  const rankingLabels = (status?.rankings ?? [])
    .map((r) => r.short_label?.trim())
    .filter(Boolean) as string[];
  const out: string[] = [];
  for (const v of recapOrder) {
    if (v && !out.includes(v)) out.push(v);
    if (out.length >= 3) return out.slice(0, 3);
  }
  for (const v of violated) {
    if (v && !out.includes(v)) out.push(v);
    if (out.length >= 3) return out.slice(0, 3);
  }
  for (const r of rankingLabels) {
    if (r && !out.includes(r)) out.push(r);
    if (out.length >= 3) return out.slice(0, 3);
  }
  for (const f of ORDER_CLI_FALLBACKS) {
    if (!out.includes(f)) out.push(f);
    if (out.length >= 3) break;
  }
  return out.slice(0, 3);
}

function lastOwlFromPosts(posts: ForumPostOutDto[]): string | null {
  for (let i = posts.length - 1; i >= 0; i--) {
    if (posts[i].user_id === 'agent:owl') return posts[i].content;
  }
  return null;
}

function lastUserPostContent(posts: ForumPostOutDto[]): string | null {
  for (let i = posts.length - 1; i >= 0; i--) {
    const uid = posts[i].user_id;
    if (!uid.startsWith('agent:')) return posts[i].content;
  }
  return null;
}

/** 키문이 최신 답변·사용자 질문 키워드로 이어질 행동 3개(원칙·시드와 조합) */
function suggestCliFromContext(
  lastOwl: string,
  lastUser: string | null,
  rankingLabels: string[],
  violatedSeed: string[],
): { prompt: string; choices: string[] } {
  const owl = lastOwl;
  const user = lastUser ?? '';
  const pick: string[] = [];
  const add = (s: string) => {
    const t = s.trim();
    if (t && !pick.includes(t)) pick.push(t);
  };
  if (/손절|익절|목표가|가격/.test(owl) || /손절|익절/.test(user)) {
    add('손절·익절 라인만 다시 적기');
    add('목표 도달 시 행동 한 줄로 정리');
  }
  if (/분할|비중|몇\s*%|퍼센트/.test(owl) || /분할|비중/.test(user)) {
    add('분할 횟수·비중만 다시 잡기');
  }
  if (/추격|급등|속도|즉시|FOMO|fomo/i.test(owl) || /추격|급등/.test(user)) {
    add('쿨다운 후 재검토하기');
  }
  if (/감정|멘탈|공포|욕심|마음/.test(owl)) {
    add('감정 체크 질문 3개 적기');
  }
  if (/기록|메모|일지/.test(owl) || /메모|기록/.test(user)) {
    add('이번 결정 한 줄 메모 남기기');
  }
  for (const v of violatedSeed) add(v);
  for (const r of rankingLabels) add(r);
  for (const f of ORDER_CLI_FALLBACKS) add(f);
  add('다음 주문 전에 다시 읽을 한 줄 규칙');
  add('지금은 정리만 하고 나가기');
  add('키문이에게 한 가지만 더 물어보기');
  const choices = pick.slice(0, 3);
  const prompt = owl.trim()
    ? '키문이 답변을 바탕으로 이어질 행동 후보예요. 하나만 골라 보내세요.'
    : '지금 손볼 원칙을 골라 주세요.';
  return { prompt, choices };
}

interface Props {
  navigation: { goBack: () => void; replace?: (name: string, params?: object) => void };
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
  const minChatH = Math.round(winH * 0.26);
  const maxChatH = Math.round(winH * 0.84);
  const defaultChatH = Math.round(winH * 0.42);
  const [chatHeight, setChatHeight] = useState(defaultChatH);
  const [kbInset, setKbInset] = useState(0);
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
  const orderContextRef = useRef(orderContext);
  orderContextRef.current = orderContext;

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

  const orderPrincipleRecapFull = useMemo(
    () => buildOrderPrincipleRecapItemsForDebate(orderContext),
    [
      orderContext?.orderType,
      JSON.stringify(orderContext?.violatedPrinciples ?? []),
      JSON.stringify(orderContext?.violationDetails ?? []),
    ],
  );

  const [cliPrompt, setCliPrompt] = useState('');
  const [cliChoices, setCliChoices] = useState<string[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTopics, setHistoryTopics] = useState<ForumTopicSummaryDto[]>([]);
  const rankingLabelsRef = useRef<string[]>([]);

  const listRef  = useRef<FlatList>(null);
  const chatHRef = useRef(defaultChatH);
  const dragStartH = useRef(defaultChatH);
  const limitsRef = useRef({ min: minChatH, max: maxChatH });

  useEffect(() => {
    chatHRef.current = chatHeight;
  }, [chatHeight]);

  useEffect(() => {
    limitsRef.current = { min: minChatH, max: maxChatH };
    setChatHeight((h) => Math.min(maxChatH, Math.max(minChatH, h)));
  }, [minChatH, maxChatH]);

  const chatPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
          dragStartH.current = chatHRef.current;
        },
        onPanResponderMove: (_, g) => {
          const { min, max } = limitsRef.current;
          const next = Math.min(max, Math.max(min, dragStartH.current - g.dy));
          chatHRef.current = next;
          setChatHeight(next);
        },
        onPanResponderRelease: () => {
          listRef.current?.scrollToEnd({ animated: true });
        },
      }),
    [],
  );

  // ── 키보드 — 채팅 패널 높이와 합산하기 위해 숫자 inset 사용 ─────────────────────
  useEffect(() => {
    const showEv = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEv = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEv, (e) => {
      const h = e.endCoordinates.height;
      setKeyboardExtraPad(Math.round(h * 0.15));
      setKbInset(h);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    });
    const onHide = Keyboard.addListener(hideEv, () => {
      setKeyboardExtraPad(0);
      setKbInset(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  // ── 새 메시지 추가 시 스크롤 ──────────────────────────────────────────────────
  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [rows, sending, cliChoices, cliPrompt, orderPrincipleRecapFull]);

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

  const refreshOrderCli = useCallback(
    async (lastOwlText: string | null, lastUserText: string | null) => {
      if (!userId) return;
      let rankings = rankingLabelsRef.current;
      if (rankings.length === 0) {
        try {
          const s = await StockmateApiV1.principles.getStatus(userId);
          rankings = (s?.rankings ?? [])
            .map((r) => r.short_label?.trim())
            .filter(Boolean) as string[];
          rankingLabelsRef.current = rankings;
        } catch {
          rankings = [];
        }
      }
      const seed = [
        ...new Set(
          (orderContextRef.current?.violatedPrinciples ?? [])
            .map((x) => String(x).trim())
            .filter(Boolean),
        ),
      ];
      if (!lastOwlText?.trim() && !lastUserText?.trim()) {
        const choices = await buildOrderPrincipleCliChoices(userId, orderContextRef.current);
        setCliPrompt(
          '지금 손볼 원칙을 골라 주세요. 선택하면 키문이에게 전달되고, 아래에서 언제든 나갈 수 있어요.',
        );
        setCliChoices(choices);
        return;
      }
      const { prompt, choices } = suggestCliFromContext(
        lastOwlText ?? '',
        lastUserText,
        rankings,
        seed,
      );
      const vio = orderedRecapLabelsForOrderPrincipleCli(orderContextRef.current);
      const merged =
        owlOnlyMode && vio.length >= 3 ? [vio[0], vio[1], ORDER_CLI_NOT_IN_LIST_CHOICE] : choices;
      setCliPrompt(prompt);
      setCliChoices(merged);
    },
    [userId, owlOnlyMode],
  );

  const refreshOrderPrincipleTopicTitle = useCallback(async () => {
    const tid = topicId;
    const uid = userId;
    if (!owlOnlyMode || !tid || !uid) return;
    try {
      await StockmateApiV1.forum.refreshOrderPrincipleSummary(tid, uid, paramStockName ?? null);
    } catch {
      /* 목록 제목 갱신 실패는 조용히 */
    }
  }, [owlOnlyMode, topicId, userId, paramStockName]);

  // ── 스레드 로드 ───────────────────────────────────────────────────────────────
  const loadThread = useCallback(
    async (tid: string, selfUserId: string | null) => {
      const topic = await StockmateApiV1.forum.getTopic(tid);
      const posts = await StockmateApiV1.forum.listPosts(tid);
      setTopicTitle(topic.title);
      setViewCount(topic.view_count);
      setTopicId(topic.id);
      setTopicOwlOnly(topic.room_kind === 'order_principle');
      const isOrderPrincipleTopic = topic.room_kind === 'order_principle';
      /** 업종만 있는 공론장 — 긴 시드 안내는 숨기고 대화(개시 발언)로 바로 진입 */
      const isSectorForumTopic =
        !isOrderPrincipleTopic &&
        Boolean(topic.sector_key?.trim()) &&
        !String(topic.stock_code ?? '').trim();
      const postRows = postsToRows(posts, selfUserId);
      const prefix: ThreadRow[] = [];
      if (!isOrderPrincipleTopic && !isSectorForumTopic) {
        prefix.push({
          kind: 'topic',
          id: `intro-${topic.id}`,
          text: `[토론 안내]\n${topic.title}\n\n${topic.content}`,
        });
      }
      setRows([...prefix, ...postRows]);
      if (isOrderPrincipleTopic && userId) {
        void refreshOrderCli(lastOwlFromPosts(posts), lastUserPostContent(posts));
      } else {
        setCliPrompt('');
        setCliChoices([]);
      }
    },
    [userId, refreshOrderCli],
  );

  /** 점검방: CLI를 FlatList 데이터 맨 끝에만 두어, 선택·응답 후에도 대화가 아래로 이어지게 함 */
  useLayoutEffect(() => {
    if (!owlOnlyMode || initLoading || !topicId) {
      setRows((prev) => {
        const next = prev.filter((r) => r.kind !== 'order_cli' && r.kind !== 'order_principle_recap');
        if (orderThreadFingerprint(prev) === orderThreadFingerprint(next)) return prev;
        return next;
      });
      return;
    }
    const choicesForRow =
      cliChoices.length > 0 && !sending && !agentReplying ? cliChoices : [];
    setRows((prev) => {
      const next = normalizeOrderPrincipleTail(
        prev,
        orderPrincipleRecapFull,
        cliPrompt,
        choicesForRow,
      );
      if (orderThreadFingerprint(prev) === orderThreadFingerprint(next)) return prev;
      return next;
    });
  }, [
    rows,
    owlOnlyMode,
    initLoading,
    topicId,
    cliPrompt,
    cliChoices,
    sending,
    agentReplying,
    orderPrincipleRecapFull,
  ]);

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
          /** 주문 전 원칙 점검: 매번 새 토픽(이전 대화는 목록에서 열기) */
          const existingTopic =
            isOrderPrincipleNav
              ? null
              : (
                  await StockmateApiV1.forum.listTopics({
                    stock_code: paramStockCode ?? undefined,
                    sector_key: !paramStockCode ? (paramSectorKey ?? undefined) : undefined,
                    sector_room_only: sectorRoomOnly,
                    user_id: userId,
                    page_size: 1,
                    ...listExtra,
                  })
                ).items?.[0] ?? null;

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

            // 토론 개시 — 주문 전 원칙 점검방은 CLI 선택 우선(자동 개시 생략)
            if (!cancelled && !isOrderPrincipleNav) {
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

    return () => {
      cancelled = true;
    };
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

  /** 주문 전 점검방 — CLI 버튼으로 원칙 선택 후 키문이 1회 응답 */
  const onOrderCliChoice = useCallback(
    async (shortLabel: string) => {
      const tid = topicId;
      const uid = userId;
      if (!tid || !uid) return;
      setPostError(null);

      if (shortLabel === ORDER_CLI_NOT_IN_LIST_CHOICE) {
        setSending(true);
        try {
          const full = buildOrderPrincipleRecapItemsForDebate(orderContextRef.current);
          const excluded = full.slice(0, 2).map((x) => x.label.trim()).filter(Boolean);
          const bid = orderContextRef.current?.behaviorLogId;
          let remainder: string[] = [];
          if (bid) {
            const { violations } = await StockmateApiV1.behaviorLogs.violationsRemaining(bid, {
              user_id: uid,
              excluded_short_labels: excluded,
            });
            remainder = violations.map((v) => String(v.short_label || '').trim()).filter(Boolean);
          } else {
            remainder = full.slice(2).map((x) => x.label.trim()).filter(Boolean);
          }
          setCliPrompt(
            '앞의 두 가지를 제외한 나머지 어긋난 원칙이에요. 설명받을 항목을 골라 주세요.',
          );
          if (remainder.length === 0) {
            const back = await buildOrderPrincipleCliChoices(uid, orderContextRef.current);
            setCliChoices(back);
            setCliPrompt(
              '같은 주문 기준으로 추가로 짚을 어긋남이 없어요. 위 두 가지 중 하나를 고르거나 메시지를 보내 주세요.',
            );
          } else {
            setCliChoices(remainder);
          }
        } catch (e) {
          const full = buildOrderPrincipleRecapItemsForDebate(orderContextRef.current);
          const fallback = full.slice(2).map((x) => x.label.trim()).filter(Boolean);
          setPostError(e instanceof Error ? e.message : String(e));
          if (fallback.length > 0) {
            setCliPrompt(
              '앞의 두 가지를 제외한 나머지 어긋난 원칙이에요. 설명받을 항목을 골라 주세요.',
            );
            setCliChoices(fallback);
          } else {
            try {
              const back = await buildOrderPrincipleCliChoices(uid, orderContextRef.current);
              setCliChoices(back);
            } catch {
              setCliChoices([]);
            }
            setCliPrompt('나머지 목록을 불러오지 못했어요. 잠시 후 다시 눌러 주세요.');
          }
        } finally {
          setSending(false);
        }
        return;
      }

      setSending(true);
      setAgentReplying(true);
      const content = `[원칙 점검] 「${shortLabel}」부터 기준을 다시 맞출게요.`;
      try {
        const post = await StockmateApiV1.forum.createPost(tid, { user_id: uid, content });
        setRows((prev) => [
          ...prev,
          { kind: 'post', id: post.id, userId: post.user_id, text: post.content, mine: true },
        ]);
        const reply1 = await requestAgentReplyWithFallback(tid, content);
        await addAgentTyping(
          reply1.agent_id as AgentId,
          reply1.agent_name,
          reply1.content,
          reply1.post.id,
        );
        void refreshOrderCli(reply1.content, content);
        void refreshOrderPrincipleTopicTitle();
      } catch (e) {
        setPostError(e instanceof Error ? e.message : String(e));
      } finally {
        setSending(false);
        setAgentReplying(false);
      }
    },
    [
      topicId,
      userId,
      requestAgentReplyWithFallback,
      addAgentTyping,
      refreshOrderCli,
      refreshOrderPrincipleTopicTitle,
    ],
  );

  const openOrderHistory = useCallback(async () => {
    if (!userId || !paramStockCode) return;
    setHistoryVisible(true);
    setHistoryLoading(true);
    try {
      const res = await StockmateApiV1.forum.listTopics({
        user_id: userId,
        stock_code: paramStockCode,
        room_kind: 'order_principle',
        page_size: 40,
        page: 1,
      });
      setHistoryTopics(res.items ?? []);
    } catch {
      setHistoryTopics([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId, paramStockCode]);

  const onPickHistoryTopic = useCallback(
    (item: ForumTopicSummaryDto) => {
      setHistoryVisible(false);
      if (navigation.replace) {
        navigation.replace('DebateRoom', {
          forumEntrySource: 'order_principle_check',
          topicId: item.id,
          stockCode: paramStockCode,
          stockName: paramStockName,
          sectorKey: paramSectorKey,
        });
      }
    },
    [navigation, paramStockCode, paramStockName, paramSectorKey],
  );

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
          let lastOwl: string | null = null;
          for (const agentId of broadcastIds) {
            try {
              const reply = await StockmateApiV1.forum.agentReply(topicId, {
                user_message: content,
                stock_name: paramStockName ?? null,
                agent_id: agentId,
              });
              if (reply.agent_id === 'owl') lastOwl = reply.content;
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
          if (owlOnlyMode && lastOwl) {
            void refreshOrderCli(lastOwl, content);
            void refreshOrderPrincipleTopicTitle();
          }
        } else {
          const reply1 = await requestAgentReplyWithFallback(topicId, content);
          await addAgentTyping(
            reply1.agent_id as AgentId,
            reply1.agent_name,
            reply1.content,
            reply1.post.id,
          );
          if (owlOnlyMode) {
            void refreshOrderCli(reply1.content, content);
            void refreshOrderPrincipleTopicTitle();
          }

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
    if (item.kind === 'order_principle_recap') {
      const full = orderPrincipleRecapFull;
      const recapSub =
        full.length >= 3
          ? '어긋난 원칙을 모두 보여 드려요. 1·2번과 다른 부분을 짚고 싶으면「다음 행동」3번「여기에 없어요」를 눌러 주세요.'
          : '아래「다음 행동」에서 이어질 행동을 골라 주세요.';
      return (
        <View style={styles.msgRow}>
          <View style={styles.recapCard}>
            <Text style={styles.recapCardTitle}>맞물릴 수 있는 원칙</Text>
            <Text style={styles.recapCardSub}>{recapSub}</Text>
            <View style={styles.recapList}>
              {item.items.map((row, idx) => (
                <View
                  key={`${idx}-${row.label.slice(0, 20)}`}
                  style={[styles.recapLine, idx > 0 ? styles.recapLineSep : null]}
                >
                  <Text style={styles.recapLineIdx}>{idx + 1}</Text>
                  <View style={styles.recapLineBody}>
                    <Text style={styles.recapOneLine} numberOfLines={2}>
                      <Text style={styles.recapBold}>「{row.label}」</Text>
                      {' — '}
                      {row.reasonOneLine}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    }
    if (item.kind === 'order_cli') {
      const busy = sending || agentReplying;
      return (
        <View style={styles.msgRow}>
          <View style={[styles.cliPanel, styles.cliInlinePanel]}>
            <Text style={styles.cliHeaderLabel}>다음 행동</Text>
            <View style={styles.cliPromptWrap}>
              <Text style={styles.cliPrompt}>{item.prompt}</Text>
            </View>
            {item.choices.map((c, idx) => (
              <Pressable
                key={`${idx}-${c.slice(0, 24)}`}
                style={({ pressed }) => [styles.cliBtn, (pressed || busy) && styles.cliBtnPressed]}
                onPress={() => void onOrderCliChoice(c)}
                disabled={busy}
              >
                <Text style={styles.cliBtnIdx}>{idx + 1}</Text>
                <Text style={styles.cliBtnTxt}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      );
    }
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

  const listFooter = (
    <View style={styles.listFooterCol}>
      {sending ? <Text style={styles.thinking}>메시지 전송 중…</Text> : null}
      {agentReplying ? <Text style={styles.thinking}>AI 에이전트가 답변 중이에요…</Text> : null}
    </View>
  );

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
        style={[StyleSheet.absoluteFill, { bottom: chatHeight }]}
        onPress={() => Keyboard.dismiss()}
      />

      {/* 하단 채팅 패널 — 상단 핸들 드래그로 높이 조절, 키보드 시 inset 반영 */}
      <View
        style={[
          styles.chatSheet,
          {
            height: Math.max(minChatH, chatHeight - kbInset),
            bottom: kbInset,
          },
        ]}
      >
        <View style={styles.dragZone} {...chatPanResponder.panHandlers}>
          <View style={styles.dragGrip} />
          <Text style={styles.dragHint}>드래그하여 이전 대화 영역 확대·축소</Text>
        </View>
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
              owlOnlyMode && topicId ? styles.chatListContentNoGrow : styles.chatListContentGrow,
              { paddingBottom: 28 + keyboardExtraPad },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            renderItem={renderItem}
            ListFooterComponent={listFooter}
          />
        )}

        {owlOnlyMode && topicId && !initLoading ? (
          <Pressable
            style={styles.exitStrip}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="점검 마치고 나가기"
          >
            <Ionicons name="exit-outline" size={18} color={Colors.primary} />
            <Text style={styles.exitStripTxt}>점검 마치고 나가기</Text>
          </Pressable>
        ) : null}

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
      </View>

      {/* 상단 투명 바 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backHit}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>
        <View style={styles.topTitles}>
          <Text style={styles.serviceTitle}>인공지능 비즈니스 분석 서비스</Text>
          <Text style={styles.screenTitle} numberOfLines={1}>{topicTitle}</Text>
        </View>
        {owlOnlyMode && paramStockCode ? (
          <Pressable
            onPress={() => void openOrderHistory()}
            hitSlop={12}
            style={styles.backHit}
            accessibilityRole="button"
            accessibilityLabel="이전 점검 대화 목록"
          >
            <Ionicons name="list-outline" size={26} color="#fff" />
          </Pressable>
        ) : (
          <View style={styles.backHit} />
        )}
      </View>

      <Modal
        visible={historyVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryVisible(false)}
      >
        <View style={styles.historyOverlay}>
          <Pressable style={styles.historyBackdropPress} onPress={() => setHistoryVisible(false)} />
          <View style={styles.historyCardWrap} pointerEvents="box-none">
            <View style={styles.historyCard}>
            <View style={styles.historyCardHeader}>
              <Text style={styles.historyCardTitle}>이전 점검 대화</Text>
              <Pressable hitSlop={10} onPress={() => setHistoryVisible(false)}>
                <Ionicons name="close" size={26} color="#3A3060" />
              </Pressable>
            </View>
            {historyLoading ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : historyTopics.length === 0 ? (
              <Text style={styles.historyEmpty}>저장된 점검 대화가 없어요.</Text>
            ) : (
              <ScrollView style={styles.historyScroll} keyboardShouldPersistTaps="handled">
                {historyTopics.map((item) => {
                  const active = item.id === topicId;
                  const when = new Date(item.created_at).toLocaleString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [
                        styles.historyRow,
                        active && styles.historyRowActive,
                        pressed && styles.historyRowPressed,
                      ]}
                      onPress={() => onPickHistoryTopic(item)}
                    >
                      <Text style={styles.historyRowTitle} numberOfLines={2}>
                        {item.title || '점검 대화'}
                      </Text>
                      <Text style={styles.historyRowMeta}>
                        {when}
                        {active ? ' · 현재' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            </View>
          </View>
        </View>
      </Modal>
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
  dragZone: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0DCF0',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dragGrip: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#C4B8E0',
  },
  dragHint: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    color: '#9E96C0',
  },
  backHit:      { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitles:    { flex: 1, alignItems: 'center' },
  serviceTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' },
  screenTitle:  { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 2 },
  listFooterCol: { paddingBottom: 8, gap: 6, alignSelf: 'stretch' },
  chatListContentGrow: { flexGrow: 1 },
  chatListContentNoGrow: { flexGrow: 0 },
  cliInlinePanel: { marginTop: 4, marginBottom: 2 },
  recapCard: {
    alignSelf: 'stretch',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5DADF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 2,
  },
  recapCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D5DBA',
    marginBottom: 4,
  },
  recapCardSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 16,
  },
  recapList: { gap: 0 },
  recapLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 8,
  },
  recapLineSep: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  recapLineIdx: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B5BB5',
    minWidth: 18,
    paddingTop: 2,
  },
  recapLineBody: { flex: 1, minWidth: 0 },
  recapOneLine: { fontSize: 13, lineHeight: 20, fontWeight: '600', color: '#1A1A1A' },
  recapBold: { fontWeight: '800', color: '#111827' },
  historyOverlay: { flex: 1 },
  historyBackdropPress: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  historyCardWrap: { flex: 1, justifyContent: 'flex-end' },
  historyCard: {
    backgroundColor: '#FFFCFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    maxHeight: '72%',
    borderTopWidth: 1,
    borderColor: '#E8E2F5',
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyCardTitle: { fontSize: 17, fontWeight: '900', color: '#2A2540' },
  historyLoading: { paddingVertical: 32, alignItems: 'center' },
  historyEmpty: { fontSize: 14, color: '#8B82B0', fontWeight: '600', paddingVertical: 20 },
  historyScroll: { maxHeight: 420 },
  historyRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F5F1FC',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E2F5',
  },
  historyRowActive: { borderColor: Colors.primary, backgroundColor: '#EDE6FB' },
  historyRowPressed: { opacity: 0.88 },
  historyRowTitle: { fontSize: 15, fontWeight: '800', color: '#2A2540' },
  historyRowMeta: { fontSize: 12, color: '#8B82B0', fontWeight: '600', marginTop: 6 },
  centerPad:    { flex: 1, justifyContent: 'center', paddingVertical: 24 },
  chatList:     { flex: 1, marginTop: 6, minHeight: 60 },
  chatListContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  msgRow:      { marginBottom: 12 },
  msgLeft:     { alignItems: 'flex-start' },
  msgRight:    { alignItems: 'flex-end' },
  msgLeftHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  msgName:     { fontSize: 11, color: '#8B82B0', fontWeight: '800' },
  bubble:         { maxWidth: '88%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  topicBubble:    { backgroundColor: '#EEE9FB', borderWidth: 1, borderColor: '#DDD5F5', alignSelf: 'stretch', maxWidth: '100%' },
  topicBubbleText:{ color: '#3A3060', fontSize: 13, lineHeight: 20, fontWeight: '600' },
  /** 키움 간편모드 느낌: 흰 바탕·회색 구분선·블루 포인트 */
  cliPanel: {
    alignSelf: 'stretch',
    maxWidth: '100%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5DADF',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  cliHeaderLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D5DBA',
    letterSpacing: -0.2,
  },
  cliPromptWrap: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  cliPrompt: { color: Colors.text, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  cliBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C9CFD8',
    backgroundColor: Colors.card,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  cliBtnPressed: { backgroundColor: '#F0F2F5' },
  cliBtnIdx: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B5BB5',
    minWidth: 22,
    textAlign: 'center',
  },
  cliBtnTxt: { flex: 1, color: '#1A1A1A', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  exitStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0DCF0',
  },
  exitStripTxt: { fontSize: 14, fontWeight: '800', color: Colors.primary },
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