import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Conversation, Message } from '../types';
import { conversationService } from '../services/conversationService';
import { chatService } from '../services/chatService';
import { useAuth } from './AuthContext';

export interface ChatContextType {
  sessionId: string;
  setSessionId: (id: string) => void;
  conversations: Conversation[];
  currentConversation: (Conversation & { messages: Message[] }) | null;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  createNewConversation: (title?: string) => Promise<string>;
  sendChatMessage: (text: string, isVoiceInput?: boolean) => Promise<void>;
  deleteSelectedConversation: (id: string) => Promise<void>;
  exportCurrentPDF: () => Promise<void>;
  resetCurrentConversation: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [sessionId, setSessionState] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<(Conversation & { messages: Message[] }) | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const setSessionId = (id: string) => {
    const cleanId = id.trim();
    if (cleanId) {
      setSessionState(cleanId);
      if (user) {
        localStorage.setItem(`sessionId_${user.user_id}`, cleanId);
      }
    }
  };

  // Sync session ID with logged in user
  useEffect(() => {
    if (user) {
      const persisted = localStorage.getItem(`sessionId_${user.user_id}`);
      setSessionState(persisted || user.user_id);
    } else {
      setSessionState('');
    }
  }, [user]);

  // Reload conversations when session ID changes
  useEffect(() => {
    if (user && sessionId) {
      loadConversations();
    } else {
      setConversations([]);
    }
    setCurrentConversation(null);
  }, [sessionId, user]);

  const loadConversations = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await conversationService.listConversations(sessionId);
      setConversations(data);
    } catch (err: any) {
      console.error('Error loading conversations:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load conversations.');
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (id: string) => {
    setCurrentConversation(null);
    setLoading(true);
    setError(null);
    try {
      // 1. Get conversation details and messages
      const convoData = await conversationService.getConversation(id, sessionId);
      
      // 2. Restore context in session store on backend
      await conversationService.continueConversation(id, sessionId);
      
      setCurrentConversation(convoData);
    } catch (err: any) {
      console.error('Error selecting conversation:', err);
      setError(err.response?.data?.error || err.message || 'Failed to select conversation.');
    } finally {
      setLoading(false);
    }
  };

  const createNewConversation = async (title?: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const newConvo = await conversationService.startConversation(sessionId, title);
      await loadConversations();
      return newConvo.conversationId;
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      const errMsg = err.response?.data?.error || err.message || 'Failed to start a new investigation.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = async (text: string, isVoiceInput: boolean = false) => {
    if (!currentConversation) return;

    setLoading(true);
    setError(null);

    // Optimistically append user message
    const tempUserMsg: Message = {
      messageId: `user-${Date.now()}`,
      role: 'User',
      message: text,
      timestamp: new Date().toISOString(),
      isVoice: isVoiceInput
    };

    setCurrentConversation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, tempUserMsg]
      };
    });

    try {
      // Send to backend
      const chatData = await chatService.sendMessage(text, sessionId, currentConversation.conversationId, isVoiceInput);

      // Append assistant reply
      const assistantMsg: Message = {
        messageId: `assistant-${Date.now()}`,
        role: 'Assistant',
        message: chatData.response,
        timestamp: new Date().toISOString(),
        isVoice: isVoiceInput,
        audio: chatData.audio || undefined
      };

      setCurrentConversation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, assistantMsg]
        };
      });

      // Reload conversations list in case the title was dynamically auto-generated by the first message
      await loadConversations();
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.error || err.message || 'Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  const deleteSelectedConversation = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await conversationService.deleteConversation(id, sessionId);
      await loadConversations();
      if (currentConversation && currentConversation.conversationId === id) {
        setCurrentConversation(null);
      }
    } catch (err: any) {
      console.error('Error deleting conversation:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete conversation.');
    } finally {
      setLoading(false);
    }
  };

  const exportCurrentPDF = async () => {
    if (!currentConversation) return;
    setLoading(true);
    setError(null);
    try {
      const blob = await conversationService.exportPDF(currentConversation.conversationId, sessionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Conversation_${currentConversation.conversationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      setError(err.response?.data?.error || err.message || 'Failed to export PDF.');
    } finally {
      setLoading(false);
    }
  };

  const resetCurrentConversation = async () => {
    setCurrentConversation(null);
    setError(null);
  };

  return (
    <ChatContext.Provider
      value={{
        sessionId,
        setSessionId,
        conversations,
        currentConversation,
        loading,
        error,
        setError,
        loadConversations,
        selectConversation,
        createNewConversation,
        sendChatMessage,
        deleteSelectedConversation,
        exportCurrentPDF,
        resetCurrentConversation
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
