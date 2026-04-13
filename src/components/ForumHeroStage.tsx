/**
 * 공론장 히어로 스테이지 — 전체화면 MP4 배경 + 크로스페이드
 *
 * 5개 영상을 모두 미리 로드해서 동시에 재생하고,
 * opacity 애니메이션으로 전환 → 검은 화면 깜빡임 없음
 */
import React, { useEffect, useRef } from 'react';
import type { DimensionValue } from 'react-native';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

// ── 영상 소스 ────────────────────────────────────────────────────────────────
const VIDEOS = {
  idle:   require('../../assets/services/사용자들이 아무 채팅 안칠때 기다리는 영상.mp4'),
  typing: require('../../assets/services/사용자들이 채팅칠때 기다리는 영상1.mp4'),
  /** owl=기자(부엉이), octopus=원칙 코치(문어), turtle=회계사(거북이) */
  owl:     require('../../assets/services/부엉이 말하는 영상.mp4'),
  octopus: require('../../assets/services/문어 말하는 영상.mp4'),
  turtle: require('../../assets/services/거북이 말하는 영상.mp4'),
};

type VideoKey = keyof typeof VIDEOS;

// ── 타입 ─────────────────────────────────────────────────────────────────────
export type ForumHeroAgent = {
  id: 'owl' | 'turtle' | 'octopus';
  name: string;
  role: string;
  labelAnchor: { left: DimensionValue; top: DimensionValue };
  heroPan: number;
  /** 점검방: 이번 점검에 조력하지 않으면 'resting' → 쉬는중(회색) */
  presence?: 'active' | 'resting';
};

type Props = {
  speakerId: ForumHeroAgent['id'] | null;
  /** 말하는 사람 바로 다음 차례(한 명만 주황 대기중). 없으면 전원 쉬는중·대화중만 구분 */
  nextSpeakerId?: ForumHeroAgent['id'] | null;
  isUserTyping?: boolean;
  agents: ForumHeroAgent[];
};

// ── 현재 재생할 영상 키 결정 ──────────────────────────────────────────────────
function resolveKey(
  speakerId: ForumHeroAgent['id'] | null,
  isUserTyping: boolean,
): VideoKey {
  if (speakerId === 'owl' || speakerId === 'octopus' || speakerId === 'turtle') return speakerId;
  if (isUserTyping) return 'typing';
  return 'idle';
}

// ── 에이전트 배지 (3개 상시 표시) ────────────────────────────────────────────
function AgentBadges({
  speakerId,
  nextSpeakerId,
  isUserTyping,
  agents,
}: {
  speakerId: ForumHeroAgent['id'] | null;
  nextSpeakerId: ForumHeroAgent['id'] | null;
  isUserTyping: boolean;
  agents: ForumHeroAgent[];
}) {
  return (
    <>
      {agents.map((agent) => {
        const isSessionRest = agent.presence === 'resting';
        const isSpeaking = speakerId === agent.id;
        const isNext = !isSpeaking && nextSpeakerId === agent.id;
        const idleNoAgentSpeech = speakerId == null && !isUserTyping;
        let mode: 'speaking' | 'waiting' | 'resting';
        if (isSessionRest) {
          mode = 'resting';
        } else if (isSpeaking) {
          mode = 'speaking';
        } else if (idleNoAgentSpeech) {
          mode = 'resting';
        } else if (isNext) {
          mode = 'waiting';
        } else {
          mode = 'resting';
        }
        const label = mode === 'speaking' ? '대화중' : mode === 'resting' ? '쉬는중' : '대기중';
        return (
          <View
            key={agent.id}
            style={[styles.badge, { left: agent.labelAnchor.left, top: agent.labelAnchor.top }]}
            pointerEvents="none"
          >
            <Text style={styles.badgeName}>{agent.name}</Text>
            <Text style={styles.badgeRole}>{agent.role}</Text>
            <View
              style={[
                styles.badgePill,
                mode === 'speaking' && styles.badgePillSpeaking,
                mode === 'waiting' && styles.badgePillWaiting,
                mode === 'resting' && styles.badgePillResting,
              ]}
            >
              <View
                style={[
                  styles.badgeDot,
                  mode === 'speaking' && styles.badgeDotSpeaking,
                  mode === 'waiting' && styles.badgeDotWaiting,
                  mode === 'resting' && styles.badgeDotResting,
                ]}
              />
              <Text
                style={[
                  styles.badgePillTxt,
                  mode === 'speaking' && styles.badgePillTxtSpeaking,
                  mode === 'waiting' && styles.badgePillTxtWaiting,
                  mode === 'resting' && styles.badgePillTxtResting,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          </View>
        );
      })}
    </>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export const ForumHeroStage = React.memo(function ForumHeroStage({
  speakerId,
  nextSpeakerId = null,
  isUserTyping = false,
  agents,
}: Props) {
  // 5개 플레이어 모두 미리 로드 & 루프 재생
  const pIdle   = useVideoPlayer(VIDEOS.idle,   (p) => { p.loop = true; p.muted = true; p.play(); });
  const pTyping = useVideoPlayer(VIDEOS.typing,  (p) => { p.loop = true; p.muted = true; p.play(); });
  const pOwl    = useVideoPlayer(VIDEOS.owl,     (p) => { p.loop = true; p.muted = true; p.play(); });
  const pOctopus= useVideoPlayer(VIDEOS.octopus, (p) => { p.loop = true; p.muted = true; p.play(); });
  const pTurtle = useVideoPlayer(VIDEOS.turtle,  (p) => { p.loop = true; p.muted = true; p.play(); });

  // 비활성 영상을 0.001로 유지 → native renderer가 texture를 살려둠 (0이면 suspend됨)
  const HIDDEN = 0.001;
  const opIdle   = useRef(new Animated.Value(1)).current;
  const opTyping = useRef(new Animated.Value(HIDDEN)).current;
  const opOwl    = useRef(new Animated.Value(HIDDEN)).current;
  const opOctopus= useRef(new Animated.Value(HIDDEN)).current;
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
      idle: opIdle, typing: opTyping, owl: opOwl, octopus: opOctopus, turtle: opTurtle,
    };
    const players = { idle: pIdle, typing: pTyping, owl: pOwl, octopus: pOctopus, turtle: pTurtle };

    // 새 영상을 최상위로 올린 뒤 fade in만 실행
    // — 캐릭터가 말할 때는 배경(idle)을 완전히 끄지 않고 어둡게 남겨 영상이 "멈춘 것처럼" 보이지 않게 함
    setTopKey(currentKey);
    try {
      players[currentKey].play();
    } catch {
      /* 일부 기기에서 play 생략 */
    }
    Animated.timing(allOps[currentKey], {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      const speaking =
        currentKey === 'owl' || currentKey === 'octopus' || currentKey === 'turtle';
      if (speaking) {
        opIdle.setValue(0.34);
        (Object.keys(allOps) as VideoKey[]).forEach((k) => {
          if (k === currentKey || k === 'idle') return;
          allOps[k].setValue(HIDDEN);
        });
        if (prev !== 'idle' && prev !== currentKey) {
          allOps[prev].setValue(HIDDEN);
        }
      } else {
        allOps[prev].setValue(HIDDEN);
      }
      try {
        players[currentKey].play();
      } catch {
        /* */
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  const layers: { key: VideoKey; player: ReturnType<typeof useVideoPlayer>; op: Animated.Value }[] = [
    { key: 'idle',   player: pIdle,   op: opIdle },
    { key: 'typing', player: pTyping, op: opTyping },
    { key: 'owl',     player: pOwl,     op: opOwl },
    { key: 'octopus', player: pOctopus, op: opOctopus },
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
      {/* VideoView 네이티브 레이어가 형제 뷰를 덮는 경우가 있어 배지는 항상 최상위 */}
      <View
        style={[StyleSheet.absoluteFill, styles.agentBadgeLayer]}
        pointerEvents="none"
      >
        <AgentBadges
          speakerId={speakerId}
          nextSpeakerId={nextSpeakerId}
          isUserTyping={isUserTyping}
          agents={agents}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  agentBadgeLayer: {
    zIndex: 40,
    ...(Platform.OS === 'android' ? { elevation: 40 } : {}),
  },
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
  /** 대화중 — 밝은 pill */
  badgePillSpeaking: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  /** 대기중 — 어두운 pill (주황 점) */
  badgePillWaiting: {
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  /** 쉬는중 — 회색 pill */
  badgePillResting: {
    backgroundColor: 'rgba(55,55,60,0.72)',
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  badgeDotSpeaking: {
    backgroundColor: '#22C55E',
  },
  badgeDotWaiting: {
    backgroundColor: '#F97316',
  },
  badgeDotResting: {
    backgroundColor: '#9CA3AF',
  },
  badgePillTxt: {
    fontSize: 11,
    fontWeight: '800',
  },
  badgePillTxtSpeaking: {
    color: '#1E2748',
  },
  badgePillTxtWaiting: {
    color: 'rgba(255,255,255,0.92)',
  },
  badgePillTxtResting: {
    color: 'rgba(209,213,219,0.95)',
  },
});