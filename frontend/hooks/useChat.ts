'use client';

import { useCallback, useEffect, useRef } from 'react';
import { getChatSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import type { Message } from '@/types/chat.types';

export function useRoomMessages(roomId: string | null) {
  const setMessages = useChatStore((s) => s.setMessages);

  useEffect(() => {
    if (!roomId) return;
    api
      .get(`/rooms/${roomId}/messages`)
      .then((r) => {
        setMessages(roomId, r.data.messages as Message[]);
      })
      .catch(() => {});
  }, [roomId]); // ← Remove setMessages from deps, roomId only
}







export function useChatActions(roomId: string | null) {
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    const socket = getChatSocket();
    if (!socket.connected) socket.connect();
    socket.emit('chat:join', { roomId });
    return () => {
      socket.emit('chat:leave', { roomId });
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!roomId) return;
      const text = content.trim();
      if (!text) return;
      getChatSocket().emit('chat:message', { roomId, content: text });
      // immediately stop typing
      if (isTypingRef.current) {
        getChatSocket().emit('chat:typing', { roomId, isTyping: false });
        isTypingRef.current = false;
      }
    },
    [roomId]
  );

  const setTyping = useCallback(() => {
    if (!roomId) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      getChatSocket().emit('chat:typing', { roomId, isTyping: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      getChatSocket().emit('chat:typing', { roomId, isTyping: false });
    }, 1800);
  }, [roomId]);

  const reactTo = useCallback((messageId: string, emoji: string) => {
    getChatSocket().emit('chat:reaction', { messageId, emoji });
  }, []);

  return { sendMessage, setTyping, reactTo };
}
