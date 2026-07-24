export interface Message {
  messageId: string;
  role: string;
  message: string;
  timestamp: string;
  isVoice?: boolean;
  audio?: string;
}

export interface Conversation {
  conversationId: string;
  sessionId: string;
  title: string;
  createdTime: string;
}

export interface ChatRequest {
  message: string;
  sessionId: string;
  conversationId: string;
}

export interface ChatResponse {
  response: string;
  audio: string | null;
}
