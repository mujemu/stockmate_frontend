/**
 * 백엔드 DTO와 필드명을 맞추세요. (snake_case ↔ camel 변환은 어댑터에서)
 * 애니메이션 트리거는 UI에서 `agent_id` → speakerId 매핑으로 연결합니다.
 */

export type DebateAgentId = 'owl' | 'turtle' | 'octopus';

/** 한 에이전트의 한 발화 (순차 재생·채팅 버블·Lottie 구간 트리거의 단위) */
export type DebateAgentTurn = {
  agent_id: DebateAgentId;
  text: string;
  /** 스트리밍 토큰이면 백엔드 규약에 맞게 확장 */
  is_final?: boolean;
};

export type DebateSessionCreateRequest = {
  user_id?: string;
  /** 종목·스레드 메타 등 백엔드가 요구하는 필드 추가 */
  [key: string]: unknown;
};

export type DebateSessionCreateResponse = {
  session_id: string;
  [key: string]: unknown;
};

export type DebateUserTurnRequest = {
  text: string;
  [key: string]: unknown;
};

/**
 * 동기 응답: 한 요청에 turns 배열로 순서대로 내려주는 형태
 * 스트리밍(SSE/WebSocket)이면 이 타입 대신 이벤트 단위로 파싱해 같은 Turn으로 환산
 */
export type DebateUserTurnResponse = {
  turns: DebateAgentTurn[];
  [key: string]: unknown;
};
