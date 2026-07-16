import api from './api';
import type { ChatResponse } from '../types';

export const chatService = {
  sendMessage: async (message: string, sessionId: string, conversationId: string): Promise<string> => {
    const response = await api.post<ChatResponse>('/chat', {
      message,
      sessionId,
      conversationId
    });
    return response.data.response;
  }
};
