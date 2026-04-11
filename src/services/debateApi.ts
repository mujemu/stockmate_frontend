import { DEBATE_API_PATHS } from '../config/debateApiPaths';
import type {
  DebateSessionCreateRequest,
  DebateSessionCreateResponse,
  DebateUserTurnRequest,
  DebateUserTurnResponse,
} from '../types/debate';
import { http } from './httpClient';

/**
 * 공론장 ↔ 백엔드 연결 지점.
 * 실제 엔드포인트/바디는 백엔드 스펙에 맞게 `debateApiPaths.ts` 와 타입만 수정하면 됩니다.
 */
export const DebateApi = {
  async createSession(body: DebateSessionCreateRequest): Promise<DebateSessionCreateResponse> {
    const { data } = await http.post<DebateSessionCreateResponse>(DEBATE_API_PATHS.createSession, body);
    return data;
  },

  async postUserTurn(sessionId: string, body: DebateUserTurnRequest): Promise<DebateUserTurnResponse> {
    const { data } = await http.post<DebateUserTurnResponse>(
      DEBATE_API_PATHS.postUserTurn(sessionId),
      body
    );
    return data;
  },
};
