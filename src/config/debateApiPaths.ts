/**
 * 레거시 플레이스홀더. 실제 백엔드 공론장은 `StockmateApiV1.forum` (`/api/v1/forum/...`) 사용.
 */
export const DEBATE_API_PATHS = {
  /** POST — 세션 생성 (바디: 사용자·컨텍스트 등) */
  createSession: '/debate/sessions',
  /** POST — 사용자 한 턴 전송 → 에이전트들 응답 (또는 스트림 시작 토큰) */
  postUserTurn: (sessionId: string) => `/debate/sessions/${sessionId}/messages`,
  /** GET — 히스토리 복구 (선택) */
  getSession: (sessionId: string) => `/debate/sessions/${sessionId}`,
} as const;
