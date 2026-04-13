import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DimensionValue, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  ActivityIndicator,
  Animated,
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
import { extraAgentsForDefaultRank, orderPrincipleReplyAgentIds } from '../config/debateOrderPrincipleAgents';
import {
  buildOrderPrincipleRecapItemsForDebate,
  cleanShortPrincipleLabelForUi,
} from '../config/orderPrincipleViolationCopy';
import { ForumHeroStage } from '../components/ForumHeroStage';
import { useUserSession } from '../context/UserSessionContext';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import type {
  AgentReplyBody,
  AgentReplyDto,
  ForumPostOutDto,
  ForumTopicSummaryDto,
  UserDecision,
} from '../types/stockmateApiV1';

const IMG_OWL     = require('../../assets/debate/owl.png');
const IMG_OCTOPUS = require('../../assets/debate/octopus.png');
const IMG_TURTLE  = require('../../assets/debate/turtle.png');

type AgentId = 'owl' | 'turtle' | 'octopus';

type Agent = {
  id: AgentId;
  name: string;
  role: string;
  image: typeof IMG_OWL;
  labelAnchor: { left: DimensionValue; top: DimensionValue };
  heroPan: number;
};

const AGENT_IDS: AgentId[] = ['owl', 'turtle', 'octopus'];

// owl = 키엉이(기자), turtle = 키북이(회계사), octopus = 키문이(원칙 코치)
const AGENTS: Agent[] = [
  {
    id: 'owl',
    name: '키엉이',
    role: '기자',
    image: IMG_OWL,
    labelAnchor: { left: '41%', top: '20.5%' },
    heroPan: 0,
  },
  {
    id: 'octopus',
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
  owl:    '키엉이 기자',
  turtle: '키북이 회계사',
  octopus: '키문이 원칙 코치',
};

function isAgentUserId(userId: string): AgentId | null {
  if (userId === 'agent:owl')    return 'owl';
  if (userId === 'agent:turtle') return 'turtle';
  if (userId === 'agent:octopus') return 'octopus';
  return null;
}

function detectPreferredAgentId(userMessage: string): AgentId {
  const msg = userMessage.toLowerCase();
  // 기자(키문이): 뉴스/이슈/시장/실시간 맥락
  if (/(뉴스|속보|이슈|시장|수급|기사|공시|테마|업황|재료|호재|악재|실적|전망)/.test(msg)) {
    return 'owl';
  }
  // 문어(원칙 코치): 매수/매도 타이밍/원칙/심리/리스크
  if (/(원칙|규칙|매수|매도|손절|익절|분할|비중|타이밍|리스크|멘탈|심리|추매)/.test(msg)) {
    return 'octopus';
  }
  // 키북이(회계사): 숫자/밸류/재무제표/지표
  if (/(재무|회계|밸류|밸류에이션|per|pbr|eps|roe|현금흐름|부채|영업이익|순이익|매출|가이던스)/.test(msg)) {
    return 'turtle';
  }
  // 기본값: 기자(키문이)로 시작
  return 'owl';
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

/** 말풍선 안 점 3개 순차 강조(파도처럼 이어짐) — 캐릭터명 문구 없이만 표시 */
function TypingDotsWave() {
  const dots = useRef(
    [0.32, 0.32, 0.32].map((x) => new Animated.Value(x)),
  ).current;
  useEffect(() => {
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(v, { toValue: 1, duration: 340, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.28, duration: 340, useNativeDriver: true }),
          Animated.delay(520 - i * 70),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots]);
  return (
    <View
      style={styles.typingDotsRow}
      accessibilityLabel="답변을 이어서 쓰는 중"
      accessibilityRole="text"
    >
      {dots.map((v, i) => (
        <Animated.Text key={i} style={[styles.typingDot, { opacity: v }]}>
          ·
        </Animated.Text>
      ))}
    </View>
  );
}

/** 카카오톡式: 왼쪽 연속 말풍선은 발신자 이름을 첫 덩어리에만 */
function leftThreadSenderKey(row: ThreadRow): string | null {
  if (row.kind === 'order_principle_recap' || row.kind === 'order_cli') return 'kimooni:order_flow';
  if (row.kind === 'agent') return `agent:${row.agentId}`;
  if (row.kind === 'post' && !row.mine) return `peer:${row.userId}`;
  return null;
}

function showPartnerNameLabel(rows: ThreadRow[], index: number): boolean {
  const key = leftThreadSenderKey(rows[index]);
  if (key == null) return false;
  if (index === 0) return true;
  return leftThreadSenderKey(rows[index - 1]) !== key;
}

/**
 * 점검방: 일반 채팅처럼 시간 순서를 유지한다.
 * - `order_principle_recap` 은 맨 위(토픽 안내 직후) 한 번만 두고, 내용만 갱신한다.
 * - `order_cli` 만 항상 맨 아래로 옮겨, 그 위에 사용자·에이전트 말풍선이 쌓이게 한다.
 */
function normalizeOrderPrincipleTail(
  prev: ThreadRow[],
  recapItems: OrderRecapLine[],
  prompt: string,
  choices: string[],
): ThreadRow[] {
  const base = prev.filter((r) => r.kind !== 'order_cli');
  const out: ThreadRow[] = [...base];
  const recapIdx = out.findIndex(
    (r) => r.kind === 'order_principle_recap' && r.id === ORDER_PRINCIPLE_RECAP_ID,
  );

  if (recapItems.length > 0) {
    const recapRow: ThreadRow = {
      kind: 'order_principle_recap',
      id: ORDER_PRINCIPLE_RECAP_ID,
      items: recapItems,
    };
    if (recapIdx >= 0) {
      out[recapIdx] = recapRow;
    } else {
      // 토픽 안내가 있으면 그 직후, 없으면 기존 대화(게시글) 맨 뒤·CLI 직전에 한 번만 삽입
      const firstTopicIdx = out.findIndex((r) => r.kind === 'topic');
      if (firstTopicIdx >= 0) {
        let afterTopic = firstTopicIdx + 1;
        while (afterTopic < out.length && out[afterTopic].kind === 'topic') {
          afterTopic += 1;
        }
        out.splice(afterTopic, 0, recapRow);
      } else {
        out.push(recapRow);
      }
    }
  } else if (recapIdx >= 0) {
    out.splice(recapIdx, 1);
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
  forceCheckRoomRequired?: boolean;
  violationDetails?: OrderPrincipleViolationDetailIntro[];
};

const ORDER_FLOW_CHOICES_NORMAL = ['어긋난 원칙 더 듣기', '다시 설명해 주세요', '나가기'] as const;
/** 5회 이상 위반으로 강제 진입 시 사용하는 선택지 */
const ORDER_FLOW_CHOICES_FORCED = ['이해했어요', '다시 설명해 주세요'] as const;
const ORDER_FLOW_PROMPT = '다음 중 선택해 주세요.';

/** 점검방 CLI 패널 악센트(요청 색상) */
const ORDER_CLI_ACCENT = '#7D3BDD';

/** 위반 원칙 카드와 동일한 순서의 짧은 라벨 */
function orderedRecapLabelsForOrderPrincipleCli(oc: DebateOrderContext | undefined): string[] {
  return buildOrderPrincipleRecapItemsForDebate(oc)
    .map((i) => i.label.trim())
    .filter(Boolean);
}

function isCheckRoomForced(raw: DebateOrderContext | undefined): boolean {
  return raw?.forceCheckRoomRequired === true;
}

function lastCoachFromPosts(posts: ForumPostOutDto[]): string | null {
  for (let i = posts.length - 1; i >= 0; i--) {
    if (posts[i].user_id === 'agent:octopus') return posts[i].content;
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

  /** 상단바: 주문 점검 `종목명\n주문 전 원칙 점검`, 섹터 `섹터명\n공론장` */
  const debateScreenTitle = useMemo(() => {
    if (isOrderPrincipleNav) {
      const name = (paramStockName ?? '').trim();
      return name ? `${name}\n주문 전 원칙 점검` : '주문 전 원칙 점검';
    }
    if (isSectorOnlyNav) {
      const sk = (paramSectorKey ?? '').trim();
      return sk ? `${sk}\n공론장` : topicTitle;
    }
    return topicTitle;
  }, [isOrderPrincipleNav, isSectorOnlyNav, paramStockName, paramSectorKey, topicTitle]);

  const debateHeaderCompact = isOrderPrincipleNav || isSectorOnlyNav;

  /** 종목명·섹터명은 진하게, 부제(주문 전 원칙 점검 / 공론장)는 연하게 */
  const debateCompactTitleParts = useMemo(() => {
    if (isOrderPrincipleNav) {
      const name = (paramStockName ?? '').trim();
      if (name) return { primary: name, secondary: '주문 전 원칙 점검' as const };
      return null;
    }
    if (isSectorOnlyNav) {
      const sk = (paramSectorKey ?? '').trim();
      if (sk) return { primary: sk, secondary: '공론장' as const };
      return null;
    }
    return null;
  }, [isOrderPrincipleNav, isSectorOnlyNav, paramStockName, paramSectorKey]);

  const orderPrincipleRecapFull = useMemo(
    () => buildOrderPrincipleRecapItemsForDebate(orderContext),
    [
      orderContext?.orderType,
      JSON.stringify(orderContext?.violatedPrinciples ?? []),
      JSON.stringify(orderContext?.violationDetails ?? []),
    ],
  );

  const heroAgentsForStage = useMemo(() => {
    if (!owlOnlyMode) {
      return AGENTS.map((a) => ({ ...a, presence: 'active' as const }));
    }
    const ranks = (orderContext?.violationDetails ?? [])
      .map((d) => Number(d.default_rank))
      .filter((n) => n >= 1 && n <= 99);
    let needEagle = false;
    let needTurtle = false;
    for (const r of ranks) {
      const s = extraAgentsForDefaultRank(r);
      if (s.has('owl')) needEagle = true;
      if (s.has('turtle')) needTurtle = true;
    }
    return AGENTS.map((a) => ({
      ...a,
      presence:
        a.id === 'octopus'
          ? ('active' as const)
          : a.id === 'owl'
            ? needEagle
              ? ('active' as const)
              : ('resting' as const)
            : needTurtle
              ? ('active' as const)
              : ('resting' as const),
    }));
  }, [owlOnlyMode, orderContext?.violationDetails]);

  /** 공론장 에이전트 발언 순서(백엔드 forum_agent._REPLY_ORDER / order_principle 시퀀스와 동기) */
  const debateReplyOrder = useMemo((): AgentId[] => {
    if (!owlOnlyMode) return ['owl', 'turtle', 'octopus'];
    const ranks = (orderContext?.violationDetails ?? [])
      .map((d) => Number((d as { default_rank: number }).default_rank))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 99);
    return orderPrincipleReplyAgentIds(ranks);
  }, [owlOnlyMode, orderContext?.violationDetails]);

  const nextSpeakerIdForHero = useMemo((): AgentId | null => {
    const seq = debateReplyOrder;
    const isRestingChar = (id: AgentId) =>
      heroAgentsForStage.find((a) => a.id === id)?.presence === 'resting';

    if (speakerId == null) {
      if (!isUserTyping) return null;
      for (const id of seq) {
        if (!isRestingChar(id)) return id;
      }
      return null;
    }
    const idx = seq.indexOf(speakerId);
    if (idx < 0) return null;
    for (let i = idx + 1; i < seq.length; i++) {
      const id = seq[i];
      if (!isRestingChar(id)) return id;
    }
    return null;
  }, [speakerId, isUserTyping, debateReplyOrder, heroAgentsForStage]);

  const [cliPrompt, setCliPrompt] = useState('');
  const [cliChoices, setCliChoices] = useState<string[]>([]);
  /** 점검방: "어긋난 원칙 더 듣기" 를 한 번 이상 눌렀으면 true → recap "여기에 없음" 버튼 숨김 */
  const [shownAllViolations, setShownAllViolations] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTopics, setHistoryTopics] = useState<ForumTopicSummaryDto[]>([]);
  /** 점검방: 키문이 최신 본문(에러 시 CLI 복구·refresh 맥락용) */
  const orderPrincipleLastCoachRef = useRef<string | null>(null);

  const dismissOrderCli = useCallback(() => {
    setCliPrompt('');
    setCliChoices([]);
  }, []);

  const listRef  = useRef<FlatList>(null);
  /** 사용자가 위로 읽고 있으면 false — 자동 scrollToEnd 가 스크롤을 빼앗지 않음 */
  const listNearBottomRef = useRef(true);
  /** 글자 단위 타이핑 애니메이션 중 — 사용자가 위로 읽도록 스크롤했으면 자동 맨아래 스크롤 생략 */
  const agentTypingAnimActiveRef = useRef(false);
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

  const syncListNearBottomFromScrollEvent = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const vh = layoutMeasurement.height;
    if (vh <= 0) return;
    if (contentSize.height <= vh + 12) {
      listNearBottomRef.current = true;
      return;
    }
    const distFromBottom = contentSize.height - vh - contentOffset.y;
    listNearBottomRef.current = distFromBottom < 120;
  }, []);

  const onScrollChatList = syncListNearBottomFromScrollEvent;

  /** 타이핑 중에도 위로 읽을 수 있게 — 드래그 시작 시 자동 맨 아래 스크롤 끔 */
  const onScrollBeginDragChatList = useCallback(() => {
    listNearBottomRef.current = false;
  }, []);

  // ── 새 메시지·리스트 높이 변화 시 맨 아래로 (점검방도 일반 채팅처럼) ─────────────────
  const scrollChatToEnd = useCallback((animated: boolean, force = false) => {
    if (!force && !listNearBottomRef.current) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  /** 타이핑처럼 같은 행 id 안에서만 텍스트가 길어질 때도 맨 아래를 따라가게 */
  const scrollChatToEndAfterFlush = useCallback(() => {
    if (!listNearBottomRef.current) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!listNearBottomRef.current) return;
        listRef.current?.scrollToEnd({ animated: false });
      });
    });
  }, []);

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
          scrollChatToEnd(true, false);
        },
      }),
    [scrollChatToEnd],
  );

  // ── 키보드 — 채팅 패널 높이와 합산하기 위해 숫자 inset 사용 ─────────────────────
  useEffect(() => {
    const showEv = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEv = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEv, (e) => {
      const h = e.endCoordinates.height;
      setKeyboardExtraPad(Math.round(h * 0.15));
      setKbInset(h);
      listNearBottomRef.current = true;
      requestAnimationFrame(() => scrollChatToEnd(true, true));
    });
    const onHide = Keyboard.addListener(hideEv, () => {
      setKeyboardExtraPad(0);
      setKbInset(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [scrollChatToEnd]);

  // ── 에이전트 메시지 타이핑 효과 ───────────────────────────────────────────────
  const addAgentTyping = useCallback(
    async (agentId: AgentId, agentName: string, text: string, postId: string) => {
      const tempId = `typing-${postId}`;
      agentTypingAnimActiveRef.current = true;
      setSpeakerId(agentId);

      try {
        // 빈 말풍선 먼저 추가
        setRows((prev) => [
          ...prev,
          { kind: 'agent' as const, id: tempId, agentId, agentName, text: '' },
        ]);

        // 타이핑 속도: 천천히 읽히도록 글자당 시간·최소·최대 길게
        const totalMs    = Math.min(Math.max(text.length * 58, 3200), 14000);
        const tickMs     = 52;
        const ticks      = Math.ceil(totalMs / tickMs);
        const charsPerTick = Math.ceil(text.length / ticks);

        for (let i = charsPerTick; i <= text.length + charsPerTick; i += charsPerTick) {
          await new Promise<void>((r) => setTimeout(r, tickMs));
          const shown = Math.min(i, text.length);
          setRows((prev) =>
            prev.map((r) => (r.id === tempId ? { ...r, text: text.slice(0, shown) } : r)),
          );
          scrollChatToEndAfterFlush();
          if (shown >= text.length) break;
        }

        // 실제 ID로 교체
        setRows((prev) =>
          prev.map((r) => (r.id === tempId ? { ...r, id: postId, text } : r)),
        );
        setSpeakerId(null);
        scrollChatToEndAfterFlush();
      } finally {
        agentTypingAnimActiveRef.current = false;
      }
    },
    [scrollChatToEndAfterFlush],
  );

  const buildForumAgentReplyBody = useCallback(
    (userMessage: string, agentId?: AgentId): AgentReplyBody => {
      const body: AgentReplyBody = {
        user_message: userMessage,
        stock_name: paramStockName ?? null,
      };
      if (agentId) body.agent_id = agentId;
      if (owlOnlyMode) {
        const d = orderContextRef.current?.violationDetails ?? [];
        body.order_principle_violations = d
          .map((x) => ({
            default_rank: Number((x as { default_rank: number }).default_rank),
            short_label: (x as { short_label?: string | null }).short_label ?? undefined,
          }))
          .filter((x) => Number.isFinite(x.default_rank) && x.default_rank >= 1);
      }
      return body;
    },
    [owlOnlyMode, paramStockName],
  );

  const appendAgentReplyBundle = useCallback(
    async (reply: AgentReplyDto) => {
      await addAgentTyping(reply.agent_id as AgentId, reply.agent_name, reply.content, reply.post.id);
      if (reply.agent_id === 'octopus') orderPrincipleLastCoachRef.current = reply.content;
      for (const ex of reply.extra_replies ?? []) {
        await addAgentTyping(ex.agent_id as AgentId, ex.agent_name, ex.content, ex.post.id);
        if (ex.agent_id === 'octopus') orderPrincipleLastCoachRef.current = ex.content;
      }
    },
    [addAgentTyping],
  );

  const requestAgentReplyWithFallback = useCallback(
    async (tid: string, userMessage: string): Promise<AgentReplyDto> => {
      const order = owlOnlyMode ? (['octopus'] as const) : buildFallbackAgentOrder(userMessage);
      let lastError: unknown = null;
      for (const agentId of order) {
        try {
          return await StockmateApiV1.forum.agentReply(tid, buildForumAgentReplyBody(userMessage, agentId));
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError ?? new Error('에이전트 응답을 가져오지 못했습니다.');
    },
    [buildForumAgentReplyBody, owlOnlyMode],
  );

  const refreshOrderCli = useCallback(
    async (_lastOwlText: string | null, _lastUserText: string | null, _aiSuggestions?: string[] | null) => {
      if (!userId) return;
      const recapLabels = orderedRecapLabelsForOrderPrincipleCli(orderContextRef.current);
      const isForced = isCheckRoomForced(orderContextRef.current);
      const choices = isForced ? [...ORDER_FLOW_CHOICES_FORCED] : [...ORDER_FLOW_CHOICES_NORMAL];
      setCliPrompt(recapLabels.length > 0 ? ORDER_FLOW_PROMPT : '');
      setCliChoices(recapLabels.length > 0 ? choices : []);
    },
    [userId],
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
      /* 히어로 배지: 대화 중이 아닐 때는 쉬는중 — 마지막 화자로 고정하지 않음 */
      setSpeakerId(null);
      if (isOrderPrincipleTopic && userId) {
        orderPrincipleLastCoachRef.current = lastCoachFromPosts(posts);
        void refreshOrderCli(orderPrincipleLastCoachRef.current, lastUserPostContent(posts));
      } else {
        setCliPrompt('');
        setCliChoices([]);
      }
      listNearBottomRef.current = true;
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
    // 선택지가 있을 때만 CLI 행 부착(탭·전송 직후에는 비워 모달처럼 닫힘)
    const choicesForRow = cliChoices.length > 0 ? cliChoices : [];
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

            if (!cancelled && isOrderPrincipleNav) {
              // 주문 전 원칙 점검방: 키문이(octopus) 자동 개시 — 위반 원칙 상위 2개 먼저
              try {
                const violations = orderContextRef.current?.violationDetails ?? [];
                const isForced = isCheckRoomForced(orderContextRef.current);
                let initMsg: string;
                if (isForced) {
                  initMsg = '[원칙 점검 강제 시작] 반복적으로 위반된 원칙들을 명확하게 짚어 주세요. 사용자가 이해할 때까지 설명해 주세요.';
                } else if (violations.length > 2) {
                  initMsg = '[원칙 점검 시작] 위반 원칙 중 가장 중요한 2가지를 먼저 간략히 짚어 주세요. 나머지는 사용자가 요청할 때 설명해 주세요.';
                } else {
                  initMsg = '[원칙 점검 시작] 위반된 원칙을 간략히 점검해 주세요.';
                }
                const initBody = buildForumAgentReplyBody(initMsg, 'octopus');
                const initReply = await StockmateApiV1.forum.agentReply(topic.id, initBody);
                if (!cancelled) {
                  await addAgentTyping(
                    initReply.agent_id as AgentId,
                    initReply.agent_name,
                    initReply.content,
                    initReply.post.id,
                  );
                  for (const ex of initReply.extra_replies ?? []) {
                    if (cancelled) break;
                    await addAgentTyping(ex.agent_id as AgentId, ex.agent_name, ex.content, ex.post.id);
                  }
                }
              } catch { /* 초기 응답 실패는 조용히 */ }
            } else if (!cancelled && !isOrderPrincipleNav) {
              // 일반 공론장: 기존 자동 개시
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
      dismissOrderCli();
      const decisionByChoice: Record<string, { preferred: UserDecision; fallback: UserDecision }> = {
        '어긋난 원칙 더 듣기': { preferred: 'continue', fallback: 'continue' },
        '다시 설명해 주세요': { preferred: 'ask_more', fallback: 'ask_more' },
        '나가기': { preferred: 'reconsider', fallback: 'cancel' },
        '이해했어요': { preferred: 'reconsider', fallback: 'cancel' },
      };
      const chosen = decisionByChoice[shortLabel];
      const behaviorLogId = orderContextRef.current?.behaviorLogId;
      if (chosen && behaviorLogId) {
        try {
          await StockmateApiV1.behaviorLogs.patchDecision(behaviorLogId, { decision: chosen.preferred });
        } catch {
          await StockmateApiV1.behaviorLogs.patchDecision(behaviorLogId, { decision: chosen.fallback });
        }
      }

      // 나가기 / 이해했어요 → 즉시 퇴장
      if (shortLabel === '나가기' || shortLabel === '이해했어요') {
        const exitText = shortLabel === '이해했어요'
          ? '이해했어요. 다시 한 번 생각해볼게요.'
          : '이번 주문은 다시 한 번 생각해볼게요.';
        setRows((prev) => [
          ...prev,
          { kind: 'post', id: `order-exit-${Date.now()}`, userId: uid, text: exitText, mine: true },
        ]);
        requestAnimationFrame(() => { navigation.goBack(); });
        return;
      }

      // 어긋난 원칙 더 듣기: "여기에 없음" 버튼 숨김
      if (shortLabel === '어긋난 원칙 더 듣기') {
        setShownAllViolations(true);
      }

      setSpeakerId(null);
      setSending(true);
      setAgentReplying(false);
      const content =
        shortLabel === '어긋난 원칙 더 듣기'
          ? '[원칙 점검] 아직 이야기하지 않은 나머지 위반 원칙들을 짚어 주세요.'
          : '[원칙 점검] 방금 하신 설명을 더 쉽고 자세하게 다시 이야기해 주세요.';
      const optimisticId = `cli-local-${Date.now()}`;
      setIsUserTyping(true);
      try {
        await new Promise<void>((r) => setTimeout(r, 400));
        setRows((prev) => [
          ...prev,
          {
            kind: 'post' as const,
            id: optimisticId,
            userId: uid,
            text: `「${shortLabel}」을(를) 골랐어요`,
            mine: true,
          },
        ]);
        setIsUserTyping(false);
        await new Promise<void>((r) => setTimeout(r, 180));
        const post = await StockmateApiV1.forum.createPost(tid, { user_id: uid, content });
        setRows((prev) => {
          const base = prev.filter((r) => r.id !== optimisticId);
          return [
            ...base,
            { kind: 'post', id: post.id, userId: post.user_id, text: post.content, mine: true },
          ];
        });
        listNearBottomRef.current = true;
        setSending(false);
        setAgentReplying(true);
        const reply1 = await requestAgentReplyWithFallback(tid, content);
        await appendAgentReplyBundle(reply1);
        void refreshOrderCli(null, null);
        void refreshOrderPrincipleTopicTitle();
      } catch (e) {
        setRows((prev) => prev.filter((r) => r.id !== optimisticId));
        setPostError(e instanceof Error ? e.message : String(e));
        void refreshOrderCli(null, null);
      } finally {
        setSending(false);
        setAgentReplying(false);
        setIsUserTyping(false);
      }
    },
    [
      topicId,
      userId,
      dismissOrderCli,
      requestAgentReplyWithFallback,
      appendAgentReplyBundle,
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

  const exitCheckRoom = useCallback(async () => {
    const behaviorLogId = orderContextRef.current?.behaviorLogId;
    if (behaviorLogId && isCheckRoomForced(orderContextRef.current)) {
      try {
        await StockmateApiV1.behaviorLogs.patchDecision(behaviorLogId, { decision: 'reconsider' });
      } catch {
        await StockmateApiV1.behaviorLogs.patchDecision(behaviorLogId, { decision: 'cancel' });
      }
    }
    navigation.goBack();
  }, [navigation]);

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
    if (!raw || sending || agentReplying || !userId || !topicId || initLoading || initError) return;
    const broadcastAll = BROADCAST_CMD.test(raw);
    const content = broadcastAll ? raw.replace(BROADCAST_CMD, '').trim() : raw;
    if (!content) return;
    Keyboard.dismiss();
    setInput('');
    setSpeakerId(null);
    setSending(true);
    setPostError(null);
    if (owlOnlyMode) dismissOrderCli();
    const postBody = broadcastAll ? `[전체 에이전트에게] ${content}` : content;
    try {
      const post = await StockmateApiV1.forum.createPost(topicId, { user_id: userId, content: postBody });
      listNearBottomRef.current = true;
      setRows((prev) => [
        ...prev,
        { kind: 'post', id: post.id, userId: post.user_id, text: post.content, mine: true },
      ]);
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });

      setAgentReplying(true);
      try {
        if (broadcastAll) {
          const broadcastIds: AgentId[] = owlOnlyMode ? ['owl'] : [...AGENT_IDS];
          let lastOwl: string | null = null;
          let lastOwlCli: string[] | null = null;
          for (const agentId of broadcastIds) {
            try {
              const reply = await StockmateApiV1.forum.agentReply(
                topicId,
                buildForumAgentReplyBody(content, agentId),
              );
              if (reply.agent_id === 'octopus') {
                lastOwl = reply.content;
                lastOwlCli = reply.order_cli_suggestions ?? null;
              }
              await appendAgentReplyBundle(reply);
            } catch {
              /* 한 캐릭터 실패 시 다음으로 */
            }
          }
          if (owlOnlyMode && lastOwl) {
            void refreshOrderCli(lastOwl, content, lastOwlCli);
            void refreshOrderPrincipleTopicTitle();
          }
        } else {
          const reply1 = await requestAgentReplyWithFallback(topicId, content);
          await appendAgentReplyBundle(reply1);
          if (owlOnlyMode) {
            void refreshOrderCli(reply1.content, content, reply1.order_cli_suggestions ?? null);
            void refreshOrderPrincipleTopicTitle();
          }

          if (!owlOnlyMode) {
            try {
              const followupOrder = AGENT_IDS.filter((id) => id !== (reply1.agent_id as AgentId));
              let reply2: AgentReplyDto | null = null;
              for (const agentId of followupOrder) {
                try {
                  reply2 = await StockmateApiV1.forum.agentReply(
                    topicId,
                    buildForumAgentReplyBody(content, agentId),
                  );
                  break;
                } catch {
                  /* 다음 후보 */
                }
              }
              if (reply2) {
                await appendAgentReplyBundle(reply2);
              }
            } catch {
              /* 두 번째 응답 생략 */
            }
          }
        }
      } catch {
        if (owlOnlyMode) void refreshOrderCli(orderPrincipleLastCoachRef.current, null);
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
      }
    } catch (e) {
      setInput(raw);
      setPostError(e instanceof Error ? e.message : String(e));
      if (owlOnlyMode) void refreshOrderCli(orderPrincipleLastCoachRef.current, null);
    } finally {
      setSending(false);
    }
  };

  // ── 말풍선 렌더 (카카오톡式: 내 말 오른쪽·상대 왼쪽·연속 시 이름 생략) ───────────────
  const renderItem = ({ item, index }: { item: ThreadRow; index: number }) => {
    if (item.kind === 'order_principle_recap') {
      const showName = showPartnerNameLabel(rows, index);
      const hasMore = item.items.length > 2 && !shownAllViolations;
      return (
        <View style={[styles.msgRow, styles.msgLeft, styles.threadRowFull]}>
          {showName ? (
            <View style={styles.msgLeftHead}>
              <Text style={styles.msgName}>키문이</Text>
            </View>
          ) : (
            <View style={styles.msgNameSpacer} />
          )}
          <View style={[styles.bubble, styles.partnerMessageBubble]}>
            <Text style={styles.recapCardTitle}>위반 원칙</Text>
            {item.items.length > 0 ? (
              <Text style={styles.recapCardIntro}>
                {item.items.length > 1
                  ? '아래 위반 원칙들을 확인해 보세요.'
                  : '아래 위반 사항을 먼저 확인해 보세요.'}
              </Text>
            ) : null}
            <View style={styles.recapList}>
              {item.items.slice(0, 2).map((row, idx) => (
                <View
                  key={`${idx}-${row.label.slice(0, 20)}`}
                  style={[styles.recapLine, idx > 0 ? styles.recapLineSep : null]}
                >
                  <View style={styles.recapLineBody}>
                    <Text style={styles.recapOneLine} numberOfLines={2}>
                      {cleanShortPrincipleLabelForUi(row.label)}
                      {row.reasonOneLine?.trim() ? (
                        <>{' — '}{row.reasonOneLine}</>
                      ) : null}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            {hasMore ? (
              <Pressable
                style={styles.notHereBtn}
                onPress={() => void onOrderCliChoice('어긋난 원칙 더 듣기')}
                hitSlop={8}
              >
                <Text style={styles.notHereTxt}>여기에 없음 · {item.items.length - 2}개 더 →</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      );
    }
    if (item.kind === 'order_cli') {
      const busy = sending || agentReplying;
      const showName = showPartnerNameLabel(rows, index);
      return (
        <View style={[styles.msgRow, styles.msgLeft, styles.threadRowFull]}>
          {showName ? (
            <View style={styles.msgLeftHead}>
              <Text style={styles.msgName}>키문이</Text>
            </View>
          ) : (
            <View style={styles.msgNameSpacer} />
          )}
          <View style={[styles.bubble, styles.partnerMessageBubble, styles.partnerCliBubble]}>
            {item.prompt.trim() ? (
              <Text style={styles.cliPromptPlainInBubble}>{item.prompt}</Text>
            ) : null}
            <View style={styles.cliChoicesCol}>
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
        </View>
      );
    }
    if (item.kind === 'topic') {
      return (
        <View style={[styles.msgRow, styles.threadRowFull, styles.systemMsgRow]}>
          <View style={[styles.bubble, styles.systemNoticeBubble]}>
            <Text style={styles.systemNoticeText}>{item.text}</Text>
          </View>
        </View>
      );
    }
    if (item.kind === 'agent') {
      const showName = showPartnerNameLabel(rows, index);
      return (
        <View style={[styles.msgRow, styles.msgLeft, styles.threadRowFull]}>
          {showName ? (
            <View style={styles.msgLeftHead}>
              <Text style={styles.msgName}>{item.agentName}</Text>
            </View>
          ) : (
            <View style={styles.msgNameSpacer} />
          )}
          <View style={[styles.bubble, styles.partnerMessageBubble]}>
            <Text style={styles.bubbleText}>{item.text}</Text>
          </View>
        </View>
      );
    }
    const isUser = item.mine;
    const agentId = isAgentUserId(item.userId);
    const showPeerName = !isUser && showPartnerNameLabel(rows, index);
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRight : styles.msgLeft, styles.threadRowFull]}>
        {!isUser && showPeerName ? (
          <View style={styles.msgLeftHead}>
            <Text style={styles.msgName}>
              {agentId ? AGENT_LABELS[agentId] : '참여자 · ' + item.userId.slice(0, 8) + '…'}
            </Text>
          </View>
        ) : !isUser ? (
          <View style={styles.msgNameSpacer} />
        ) : null}
        <View
          style={[
            styles.bubble,
            isUser
              ? styles.userBubbleKakao
              : agentId
                ? styles.partnerMessageBubble
                : styles.agentBubble,
          ]}
        >
          <Text style={[styles.bubbleText, isUser && styles.userBubbleKakaoText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  const listFooter = (
    <View style={styles.listFooterCol}>
      {sending || agentReplying ? (
        <View style={[styles.msgRow, styles.msgLeft, styles.threadRowFull]}>
          <View style={styles.msgNameSpacer} />
          <View style={[styles.bubble, styles.partnerMessageBubble, styles.typingBubble]}>
            <TypingDotsWave />
          </View>
        </View>
      ) : null}
    </View>
  );

  // ── 렌더 ──────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* 영상 전체 배경 — pointerEvents none: 터치를 채팅 패널로 전달 */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <ForumHeroStage
          speakerId={speakerId}
          nextSpeakerId={nextSpeakerIdForHero}
          isUserTyping={isUserTyping}
          agents={heroAgentsForStage}
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
        </View>
        {initLoading ? (
          <View style={styles.centerPad}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : (
          <View style={styles.chatListWrap}>
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
              nestedScrollEnabled
              scrollEnabled
              bounces
              renderItem={renderItem}
              ListFooterComponent={listFooter}
              onScroll={onScrollChatList}
              onScrollBeginDrag={onScrollBeginDragChatList}
              scrollEventThrottle={16}
              onMomentumScrollEnd={syncListNearBottomFromScrollEvent}
            />
          </View>
        )}

        {owlOnlyMode && topicId && !initLoading ? (
          <Pressable
            style={styles.exitStrip}
            onPress={() => void exitCheckRoom()}
            accessibilityRole="button"
            accessibilityLabel="점검 마치고 나가기"
          >
            <Ionicons name="exit-outline" size={18} color={ORDER_CLI_ACCENT} />
            <Text style={styles.exitStripTxt}>점검 마치고 나가기</Text>
          </Pressable>
        ) : null}

        {!(owlOnlyMode && (sending || agentReplying)) ? (
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
              editable={!!topicId && !initLoading && !sending && !agentReplying}
            />
            <Pressable
              onPress={onSend}
              style={[
                styles.sendFab,
                (!input.trim() || !topicId || sending || agentReplying) && styles.sendFabOff,
              ]}
              disabled={!input.trim() || !topicId || sending || agentReplying}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* 상단 투명 바 — 점검방(주문 전)은 뒤로가기 대신 하단「점검 마치고 나가기」만 사용 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable
          onPress={() => void exitCheckRoom()}
          hitSlop={12}
          style={styles.backHit}
          accessibilityRole="button"
          accessibilityLabel={owlOnlyMode ? '점검 나가기' : '뒤로'}
        >
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>
        <View style={styles.topTitles}>
          {!debateHeaderCompact ? (
            <Text style={styles.serviceTitle}>인공지능 비즈니스 분석 서비스</Text>
          ) : null}
          <Text
            style={[styles.screenTitle, debateHeaderCompact && styles.screenTitleCompact]}
            numberOfLines={debateHeaderCompact ? 4 : 2}
          >
            {debateCompactTitleParts ? (
              <>
                <Text style={styles.screenTitlePrimary}>{debateCompactTitleParts.primary}</Text>
                {'\n'}
                <Text style={styles.screenTitleSecondary}>{debateCompactTitleParts.secondary}</Text>
              </>
            ) : (
              debateScreenTitle
            )}
          </Text>
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
  /** 서비스 한 줄을 숨길 때(주문 전 점검·섹터 공론장) — 두 줄 제목 가운데 정렬 */
  screenTitleCompact: { marginTop: 0, textAlign: 'center' },
  screenTitlePrimary: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  screenTitleSecondary: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  listFooterCol: { paddingBottom: 8, gap: 6, alignSelf: 'stretch' },
  chatListWrap: { flex: 1, minHeight: 0, alignSelf: 'stretch' },
  typingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    minWidth: 56,
  },
  typingDot: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: '#6B6E7D',
    marginTop: -4,
  },
  cliInlinePanel: { marginTop: 4, marginBottom: 2 },
  threadRowFull: { width: '100%', alignSelf: 'stretch' },
  msgNameSpacer: { height: 2 },
  /** 상대(키문이·에이전트) 말풍선 — 밝은 배경 */
  partnerMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E6EA',
    borderRadius: 18,
    maxWidth: '82%',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  partnerCliBubble: {
    paddingBottom: 10,
    maxWidth: '88%',
    backgroundColor: '#FFFFFF',
    borderColor: '#E6E6EA',
    alignItems: 'stretch',
    alignSelf: 'flex-start',
  },
  typingBubble: { paddingVertical: 10, paddingHorizontal: 16 },
  cliChoicesCol: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
    width: '100%',
  },
  systemMsgRow: { alignItems: 'center' },
  systemNoticeBubble: {
    alignSelf: 'center',
    maxWidth: '92%',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 14,
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  systemNoticeText: {
    color: '#5C5F6E',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  userBubbleKakao: {
    backgroundColor: ORDER_CLI_ACCENT,
    borderWidth: 0,
    borderRadius: 18,
    maxWidth: '78%',
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubbleKakaoText: { color: '#FFFFFF' },
  /** 점검방 CLI 안내 문구 — 회색 박스 없이 말풍선 안에만 표시 */
  cliPromptPlainInBubble: {
    marginBottom: 6,
    color: Colors.text,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  recapCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1D2D',
    marginBottom: 6,
  },
  recapCardIntro: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
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
  recapLineBody: { flex: 1, minWidth: 0 },
  recapOneLine: { fontSize: 13, lineHeight: 20, fontWeight: '600', color: '#1A1A1A' },
  notHereBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#F3F0FB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  notHereTxt: { fontSize: 13, fontWeight: '700', color: '#7D3BDD' },
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
  msgRow:      { marginBottom: 10, alignSelf: 'stretch' },
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
    gap: 10,
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: 320,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C9CFD8',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  cliBtnPressed: { backgroundColor: '#F0F2F5' },
  cliBtnIdx: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B5BB5',
    minWidth: 22,
    textAlign: 'center',
  },
  cliBtnTxt: { flex: 1, flexShrink: 1, minWidth: 0, color: '#1A1A1A', fontSize: 14, lineHeight: 20, fontWeight: '600' },
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
  exitStripTxt: { fontSize: 14, fontWeight: '800', color: ORDER_CLI_ACCENT },
  agentBubble:    { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E6EA' },
  agentAIBubble:  { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E6EA' },
  userBubble:     { backgroundColor: Colors.primary },
  bubbleText:     { color: '#2A2540', fontSize: 15, lineHeight: 22, fontWeight: '500' },
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