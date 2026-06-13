import { create } from 'zustand';
import type { Message, TypingUser, Room } from '@/types/chat.types';
import type { PublicUser } from '@/types/user.types';

interface ChatState {
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;

  /** keyed by roomId */
  messagesByRoom: Record<string, Message[]>;
  appendMessage: (roomId: string, msg: Message) => void;
  setMessages: (roomId: string, msgs: Message[]) => void;
  prependMessages: (roomId: string, msgs: Message[]) => void;
  updateReactions: (
    roomId: string,
    messageId: string,
    reactions: Message['reactions']
  ) => void;

  /** online users keyed by roomId */
  onlineByRoom: Record<string, PublicUser[]>;
  setOnlineUsers: (roomId: string, users: PublicUser[]) => void;
  /** online count keyed by roomId — driven by chat:presence events */
  onlineCountByRoom: Record<string, number>;
  setOnlineCount: (roomId: string, count: number) => void;

  /** typing users keyed by roomId */
  typingByRoom: Record<string, TypingUser[]>;
  setTyping: (roomId: string, user: TypingUser, isTyping: boolean) => void;
  clearTyping: (roomId: string) => void;

  unreadByRoom: Record<string, number>;
  bumpUnread: (roomId: string) => void;
  clearUnread: (roomId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  setRooms: (rooms) => set({ rooms }),

  messagesByRoom: {},
  appendMessage: (roomId, msg) =>
    set((s) => {
      const existing = s.messagesByRoom[roomId] || [];
      // dedupe by id
      if (existing.some((m) => m.id === msg.id)) return s;
      return {
        messagesByRoom: { ...s.messagesByRoom, [roomId]: [...existing, msg] },
      };
    }),
  setMessages: (roomId, msgs) =>
    set((s) => ({ messagesByRoom: { ...s.messagesByRoom, [roomId]: msgs } })),
  prependMessages: (roomId, msgs) =>
    set((s) => {
      const existing = s.messagesByRoom[roomId] || [];
      const ids = new Set(existing.map((m) => m.id));
      const fresh = msgs.filter((m) => !ids.has(m.id));
      return {
        messagesByRoom: {
          ...s.messagesByRoom,
          [roomId]: [...fresh, ...existing],
        },
      };
    }),
  updateReactions: (roomId, messageId, reactions) =>
    set((s) => {
      const list = s.messagesByRoom[roomId];
      if (!list) return s;
      return {
        messagesByRoom: {
          ...s.messagesByRoom,
          [roomId]: list.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
        },
      };
    }),

  typingByRoom: {},
  setTyping: (roomId, user, isTyping) =>
    set((s) => {
      const current = s.typingByRoom[roomId] || [];
      const without = current.filter((u) => u.userId !== user.userId);
      const next = isTyping ? [...without, user] : without;
      return { typingByRoom: { ...s.typingByRoom, [roomId]: next } };
    }),
  clearTyping: (roomId) =>
    set((s) => ({ typingByRoom: { ...s.typingByRoom, [roomId]: [] } })),

  onlineByRoom: {},
  setOnlineUsers: (roomId, users) =>
    set((s) => ({ onlineByRoom: { ...s.onlineByRoom, [roomId]: users } })),

  onlineCountByRoom: {},
  setOnlineCount: (roomId, count) =>
    set((s) => ({ onlineCountByRoom: { ...s.onlineCountByRoom, [roomId]: count } })),

  unreadByRoom: {},
  bumpUnread: (roomId) =>
    set((s) => ({
      unreadByRoom: { ...s.unreadByRoom, [roomId]: (s.unreadByRoom[roomId] || 0) + 1 },
    })),
  clearUnread: (roomId) =>
    set((s) => ({ unreadByRoom: { ...s.unreadByRoom, [roomId]: 0 } })),
}));