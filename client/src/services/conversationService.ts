import api from './api';
import type { Conversation, Message } from '../types';

export interface ApiResponse<T> {
  status: string;
  message?: string;
  data: T;
}

export const conversationService = {
  startConversation: async (sessionId: string, title?: string): Promise<{ conversationId: string; sessionId: string; title: string }> => {
    const response = await api.post<ApiResponse<{ conversationId: string; sessionId: string; title: string }>>('/conversation/start', {
      sessionId,
      title
    });
    return response.data.data;
  },

  listConversations: async (sessionId: string): Promise<Conversation[]> => {
    const response = await api.get<ApiResponse<Conversation[]>>('/conversations', {
      params: { sessionId }
    });
    return response.data.data;
  },

  getConversation: async (conversationId: string, sessionId: string): Promise<Conversation & { messages: Message[] }> => {
    const response = await api.get<ApiResponse<Conversation & { messages: Message[] }>>(`/conversation/${conversationId}`, {
      params: { sessionId }
    });
    return response.data.data;
  },

  continueConversation: async (conversationId: string, sessionId: string): Promise<{ conversationId: string; sessionId: string; title: string }> => {
    const response = await api.post<ApiResponse<{ conversationId: string; sessionId: string; title: string }>>(`/conversation/${conversationId}/continue`, {
      sessionId
    });
    return response.data.data;
  },

  deleteConversation: async (conversationId: string, sessionId: string): Promise<void> => {
    await api.delete(`/conversation/${conversationId}`, {
      data: { sessionId }
    });
  },

  exportPDF: async (conversationId: string, sessionId: string): Promise<Blob> => {
    const response = await api.get(`/conversation/${conversationId}/export/pdf`, {
      params: { sessionId },
      responseType: 'blob'
    });
    return response.data;
  }
};
