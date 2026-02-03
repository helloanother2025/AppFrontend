import React, { createContext, useCallback, useContext, useReducer } from 'react';
import { chatAPI } from '../src/api/chat';

const ChatContext = createContext();

const initialState = {
  chats: [],
  currentChat: null,
  messages: [],
  loading: false,
  error: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SET_CHATS':
      return { ...state, chats: action.payload, loading: false };
    case 'SET_CURRENT_CHAT':
      return { ...state, currentChat: action.payload, loading: false };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload, loading: false };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.message_id === action.payload.message_id ? action.payload : m
        ),
      };
    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter((m) => m.message_id !== action.payload),
      };
    case 'ADD_CHAT':
      return { ...state, chats: [action.payload, ...state.chats] };
    default:
      return state;
  }
};

export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchChats = useCallback(async () => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const data = await chatAPI.getChats();
      dispatch({ type: 'SET_CHATS', payload: data.chats });
      return data.chats;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  const fetchChatDetails = useCallback(async (chatId) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const data = await chatAPI.getChat(chatId);
      dispatch({ type: 'SET_CURRENT_CHAT', payload: data.chat });
      return data.chat;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  const fetchMessages = useCallback(async (chatId, page = 1) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const data = await chatAPI.getMessages(chatId, page);
      dispatch({ type: 'SET_MESSAGES', payload: data.messages });
      return data.messages;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  const getPrivateChat = useCallback(async (otherUserId) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const data = await chatAPI.getPrivateChat(otherUserId);
      dispatch({ type: 'SET_CURRENT_CHAT', payload: data.chat });
      return data.chat;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  const sendMessage = useCallback(async (chatId, content, mediaUrl) => {
    try {
      const data = await chatAPI.sendMessage(chatId, content, mediaUrl);
      dispatch({ type: 'ADD_MESSAGE', payload: data.message });
      return data.message;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  const markMessageAsRead = useCallback(async (chatId, messageId) => {
    try {
      const data = await chatAPI.markMessageAsRead(chatId, messageId);
      dispatch({ type: 'UPDATE_MESSAGE', payload: data.message });
      return data.message;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  const deleteMessage = useCallback(async (chatId, messageId) => {
    try {
      await chatAPI.deleteMessage(chatId, messageId);
      dispatch({ type: 'DELETE_MESSAGE', payload: messageId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  const value = {
    ...state,
    fetchChats,
    fetchChatDetails,
    fetchMessages,
    getPrivateChat,
    sendMessage,
    markMessageAsRead,
    deleteMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};
