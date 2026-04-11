/**
 * 공론장 히어로 스테이지 — 전체화면 MP4 배경 + 크로스페이드
 *
 * 5개 영상을 모두 미리 로드해서 동시에 재생하고,
 * opacity 애니메이션으로 전환 → 검은 화면 깜빡임 없음
 */
import React, { useEffect, useRef } from 'react';
import type { DimensionValue } from 'react-native';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

// ── 영상 소스 ────────────────────────────────────────────────────────────────
const VIDEOS = {
  idle:   require('../../assets/services/사용자들이 아무 채팅 안칠때 기다리는 영상.mp4'),
  typing: require('../../assets/services/사용자들이 채팅칠때 기다리는 영상1.mp4'),
  /** 에셋 파일명은 레거시(부엉이·문어·거북이)이며, 앱 내 역할은 키엉이·키문이·키북이에 대응한다. */
  eagle:  require('../../assets/services/부엉이 말하는 영상.mp4'),
  owl:    require('../../assets/services/문어 말하는 영상.mp4'),
  turtle: require('../../assets/services/거북이 말하는 영상.mp4'),
};

type VideoKey = keyof typeof VIDEOS;

// ── 타입 ─────────────────────────────────────────────────────────────────────
export type ForumHeroAgent = {
  id: 'eagle' | 'owl' | 'turtle';
  name: string;
  role: string;
  labelAnchor: { left: DimensionValue; top: DimensionValue };
  heroPan: number;
};

type Props = {
  speakerId: ForumHeroAgent['id'] | null;
  isUserTyping?: boolean;
  agents: ForumHeroAgent[];
};

// ── 현재 재생할 영상 키 결정 ──────────────────────────────────────────────────
function resolveKey(
  speakerId: ForumHeroAgent['id'] | null,
  isUserTyping: boolean,
): VideoKey {
  if (speakerId === 'eagle' || speakerId === 'owl' || speakerId === 'turtle') return speakerId;
  if (isUserTyping) return 'typing';
  return 'idle';
}

// ── 에이전트 배지 (3개 상시 표시) ────────────────────────────────────────────
function AgentBadges({
  speakerId,
  agents,
}: {
  speakerId: ForumHeroAgent['id'] | null;
  agents: ForumHeroAgent[];
}) {
  return (
    <>
      {agents.map((agent) => {
        const isSpeaking = speakerId === agent.id;
        return (
          <View
            key={agent.id}
            style={[styles.badge, { left: agent.labelAnchor.left, top: agent.labelAnchor.top }]}
            pointerEvents="none"
          >
            <Text style={styles.badgeName}>{agent.name}</Text>
            <Text style={styles.badgeRole}>{agent.role}</Text>
            <View style={[styles.badgePill, isSpeaking ? styles.badgePillOn : styles.badgePillOff]}>
              <View style={[styles.badgeDot, isSpeaking && styles.badgeDotOn]} />
              <Text style={[styles.badgePillTxt, isSpeaking ? styles.badgePillTxtOn : styles.badgePillTxtOff]}>
                {isSpeaking ? '대화중' : '대기중'}
              </Text>
            </View>
          </View>
        );
      })}
    </>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export const ForumHeroStage = React.memo(function ForumHeroStage({ speakerId, isUserTyping = false, agents }: Props) {
  // 5개 플레이어 모두 미리 로드 & 루프 재생
  const pIdle   = useVideoPlayer(VIDEOS.idle,   (p) => { p.loop = true; p.muted = true; p.play(); });
  const pTyping = useVideoPlayer(VIDEOS.typing,  (p) => { p.loop = true; p.muted = true; p.play(); });
  const pEagle  = useVideoPlayer(VIDEOS.eagle,   (p) => { p.loop = true; p.muted = true; p.play(); });
  const pOwl    = useVideoPlayer(VIDEOS.owl,     (p) => { p.loop = true; p.muted = true; p.play(); });
  const pTurtle = useVideoPlayer(VIDEOS.turtle,  (p) => { p.loop = true; p.muted = true; p.play(); });

  // 비활성 영상을 0.001로 유지 → native renderer가 texture를 살려둠 (0이면 suspend됨)
  const HIDDEN = 0.001;
  const opIdle   = useRef(new Animated.Value(1)).current;
  const opTyping = useRef(new Animated.Value(HIDDEN)).current;
  const opEagle  = useRef(new Animated.Value(HIDDEN)).current;
  const opOwl    = useRef(new Animated.Value(HIDDEN)).current;
  const opTurtle = useRef(new Animated.Value(HIDDEN)).current;

  // 현재 영상이 렌더 스택 최상위가 되도록 zIndex 추적
  const [topKey, setTopKey] = React.useState<VideoKey>('idle');
  const prevKeyRef = useRef<VideoKey>('idle');

  const currentKey = resolveKey(speakerId, isUserTyping);

  useEffect(() => {
    const prev = prevKeyRef.current;
    if (prev === currentKey) return;
    prevKeyRef.current = currentKey;

    const allOps: Record<VideoKey, Animated.Value> = {
      idle: opIdle, typing: opTyping, eagle: opEagle, owl: opOwl, turtle: opTurtle,
    };

    // 새 영상을 최상위로 올린 뒤 fade in만 실행
    // — 이전 영상은 opacity 1 그대로 유지 → 새 영상 아래에서 배경 역할
    // — 새 영상 fade in 완료 후 이전 영상을 HIDDEN으로 즉시 리셋 (새 영상이 덮고 있으므로 안 보임)
    setTopKey(currentKey);
    Animated.timing(allOps[currentKey], {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      allOps[prev].setValue(HIDDEN);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  const layers: { key: VideoKey; player: ReturnType<typeof useVideoPlayer>; op: Animated.Value }[] = [
    { key: 'idle',   player: pIdle,   op: opIdle },
    { key: 'typing', player: pTyping, op: opTyping },
    { key: 'eagle',  player: pEagle,  op: opEagle },
    { key: 'owl',    player: pOwl,    op: opOwl },
    { key: 'turtle', player: pTurtle, op: opTurtle },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]} pointerEvents="none">
      {layers.map(({ key, player, op }) => (
        <Animated.View
          key={key}
          style={[StyleSheet.absoluteFill, { opacity: op, zIndex: key === topKey ? 2 : 1 }]}
        >
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        </Animated.View>
      ))}
      <AgentBadges speakerId={speakerId} agents={agents} />
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    alignItems: 'center',
    minWidth: 90,
  },
  badgeName: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  badgeRole: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 3,
  },
  badgePill: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  badgePillOn: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  badgePillOff: {
    backgroundColor: 'rgba(0,0,0,0.40)',
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  badgeDotOn: {
    backgroundColor: '#34C759',
  },
  badgePillTxt: {
    fontSize: 11,
    fontWeight: '800',
  },
  badgePillTxtOn: {
    color: '#1E2748',
  },
  badgePillTxtOff: {
    color: 'rgba(255,255,255,0.85)',
  },
});