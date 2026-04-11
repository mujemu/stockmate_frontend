export type MessageRole = 'user' | 'assistant';
export type MessageType = 'text' | 'newsCards' | 'disclosureCard' | 'analystCard';
export type CharacterState = 'idle' | 'thinking' | 'talking';

export interface NewsItem {
  title: string;
  date: string;
  description: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  type: MessageType;
  newsItems: NewsItem[];
  disclosureCard?: any;
  analystCard?: any;
}

export function createMessage(
  role: MessageRole,
  content: string,
  type: MessageType = 'text',
  extras: Partial<ChatMessage> = {}
): ChatMessage {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    role,
    content,
    timestamp: new Date(),
    type,
    newsItems: [],
    ...extras,
  };
}
