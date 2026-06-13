'use client';

import { useEffect } from 'react';
import { getChatSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { playNotificationSound } from '@/lib/notification';
import type { Message } from '@/types/chat.types';
import type { PublicUser } from '@/types/user.types';

/**
 * Wires the /chat socket to the chat store. Should be mounted on every page
 * that needs realtime room events. Pass the active room id (or null) for unread
 * tracking.
 */
export function useChatSocket(activeRoomId: string | null) {
  const appendMessage = useChatStore((s) => s.appendMessage);
  const setTyping = useChatStore((s) => s.setTyping);
  const updateReactions = useChatStore((s) => s.updateReactions);
  const bumpUnread = useChatStore((s) => s.bumpUnread);
  const setOnlineUsers = useChatStore((s) => s.setOnlineUsers);
  const setOnlineCount = useChatStore((s) => s.setOnlineCount);
  const me = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!me) return;
    const socket = getChatSocket();
    if (!socket.connected) socket.connect();

    const onMessage = (msg: Message) => {
      appendMessage(msg.roomId, msg);
      if (msg.senderId !== me.id) {
        if (msg.roomId !== activeRoomId) bumpUnread(msg.roomId);
        playNotificationSound();
      }
    };

    const onTyping = (e: {
      roomId?: string;
      userId: string;
      displayName: string;
      isTyping: boolean;
    }) => {
      const targetRoom = e.roomId || activeRoomId;
      if (!targetRoom) return;
      if (e.userId === me.id) return;
      setTyping(targetRoom, { userId: e.userId, displayName: e.displayName }, e.isTyping);
    };

    const onReaction = (e: { messageId: string; reactions: Message['reactions'] }) => {
      if (!activeRoomId) return;
      updateReactions(activeRoomId, e.messageId, e.reactions);
    };

    // Presence: server emits this on join/leave/disconnect with full online list
    const onPresence = async (e: { roomId: string; onlineCount: number; onlineUserIds: string[] }) => {
      setOnlineCount(e.roomId, e.onlineCount);
      // Refetch full user objects on every presence change for the active room
      if (e.roomId === activeRoomId) {
        try {
          const r = await api.get(`/rooms/${e.roomId}/online`);
          setOnlineUsers(e.roomId, r.data.users as PublicUser[]);
        } catch {
          // ignore
        }
      }
    };

    const onUserJoined = (_: { userId: string }) => {
      // presence event will refresh; this is just for any animation hooks
    };
    const onUserLeft = (_: { userId: string }) => {
      // same
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    socket.on('chat:reaction', onReaction);
    socket.on('chat:presence', onPresence);
    socket.on('chat:user-joined', onUserJoined);
    socket.on('chat:user-left', onUserLeft);

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
      socket.off('chat:reaction', onReaction);
      socket.off('chat:presence', onPresence);
      socket.off('chat:user-joined', onUserJoined);
      socket.off('chat:user-left', onUserLeft);
    };
  }, [me, activeRoomId, appendMessage, setTyping, updateReactions, bumpUnread, setOnlineUsers, setOnlineCount]);
}