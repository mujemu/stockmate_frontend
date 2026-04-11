import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from './ChatMessage';

export interface PastSession {
  sessionId: string;
  summary: string;
  decisionNote?: string;
  createdAt: Date;
  memo: string;
}

export interface AgentState {
  messages: ChatMessage[];
  sessionId: string | null;
  sessionFinalized: boolean;
  decisionReady: boolean;
  pastSessions: PastSession[];
  actionChips: string[];
  initialized: boolean;
  thinking: boolean;
}

export function createAgentState(): AgentState {
  return {
    messages: [],
    sessionId: null,
    sessionFinalized: false,
    decisionReady: false,
    pastSessions: [],
    actionChips: ['지금 주가 흐름은?', '실적은 어때요?', '리스크가 뭐예요?'],
    initialized: false,
    thinking: false,
  };
}

export async function loadMemo(sessionId: string): Promise<string> {
  return (await AsyncStorage.getItem(`memo_${sessionId}`)) ?? '';
}

export async function saveMemo(sessionId: string, memo: string): Promise<void> {
  await AsyncStorage.setItem(`memo_${sessionId}`, memo);
}
