import api from './api';
import type { ChatResponse } from '../types';

export const chatService = {
  sendMessage: async (message: string, sessionId: string, conversationId: string, isVoiceInput?: boolean): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>('/chat', {
      message,
      sessionId,
      conversationId,
      isVoiceInput
    });
    return response.data;
  },

  generateTTS: async (text: string, originalPrompt: string, isVoiceInput: boolean): Promise<Blob> => {
    const response = await api.post('/voice/tts', {
      text,
      originalPrompt,
      isVoiceInput
    }, {
      responseType: 'blob'
    });
    return response.data;
  }
};
