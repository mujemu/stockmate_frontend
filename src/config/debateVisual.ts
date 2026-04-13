/**
 * 공론장 상단 히어로
 * - false(기본): `forum_bg.png` — 캐릭터가 따로 움직이진 않고, 전체 이미지 패닝/줌만 적용됩니다.
 * - true: `forum_scene.json` Lottie — 아래 프레임 구간을 채우면 말하는 사람에 맞춰 구간이 재생됩니다.
 */

export const DEBATE_USE_LOTTIE = false;

export const FORUM_LOTTIE_SOURCE = require('../../assets/debate/forum_scene.json');

export type ForumLottieAgentId = 'owl' | 'turtle' | 'octopus';

/**
 * 에이전트가 말할 때 재생할 Lottie 프레임 구간 [시작, 끝] (포함).
 * After Effects에서 Bodymovin으로보낸 뒤, 타임라인 프레임 번호를 맞춰 넣습니다.
 * 비어 있으면: 전체 애니를 loop + speed(말할 때 빠르게)만 조절합니다.
 */
export const FORUM_LOTTIE_TALK_FRAMES: Partial<
  Record<ForumLottieAgentId, readonly [number, number]>
> = {
  // 예시 (실제 JSON에 맞게 수정):
  // owl: [0, 45],
  // octopus: [46, 90],
  // turtle: [91, 135],
};

/**
 * 아무도 말하지 않을 때(전원 청취) 반복할 구간. null이면 전체 타임라인을 loop 합니다.
 */
export const FORUM_LOTTIE_IDLE_FRAMES: readonly [number, number] | null = null;

export function forumLottieUsesFrameSegments(): boolean {
  if (FORUM_LOTTIE_IDLE_FRAMES !== null) return true;
  return (Object.keys(FORUM_LOTTIE_TALK_FRAMES) as ForumLottieAgentId[]).some(
    (k) => FORUM_LOTTIE_TALK_FRAMES[k] != null
  );
}
