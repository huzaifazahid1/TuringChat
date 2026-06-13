'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { fadeInUp } from '@/lib/gsap';
import type { Message } from '@/types/chat.types';

interface Props {
  roomId: string;
  onReact: (messageId: string, emoji: string) => void;
}

const EMPTY_MESSAGES: Message[] = [];
const EMPTY_TYPING: { userId: string; displayName: string }[] = [];

export function MessageList({ roomId, onReact }: Props) {

  const messages = useChatStore((s) => s.messagesByRoom[roomId] ?? EMPTY_MESSAGES);
  const typing = useChatStore((s) => s.typingByRoom[roomId] ?? EMPTY_TYPING);
  const me = useAuthStore((s) => s.user);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const last = messages[messages.length - 1];
    if (!last) return;
    if (last.id !== lastMessageIdRef.current) {
      lastMessageIdRef.current = last.id;
      c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });

      // GSAP nudge for the last bubble
      const lastEl = c.querySelector<HTMLElement>('[data-msg-last="true"]');
      fadeInUp(lastEl);
    }
  }, [messages]);

  if (!me) return null;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6"
    >
      {messages.map((msg: Message, idx) => {
        const prev = messages[idx - 1];
        const samePrev =
          prev &&
          prev.senderId === msg.senderId &&
          prev.senderType === msg.senderType &&
          new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 60_000;
        const isLast = idx === messages.length - 1;
        return (
          <div key={msg.id} data-msg-last={isLast ? 'true' : 'false'}>
            <MessageBubble
              message={msg}
              isMine={msg.senderId === me.id}
              showAuthor={!samePrev}
              onReact={(emoji) => onReact(msg.id, emoji)}
            />
          </div>
        );
      })}

      {typing.length > 0 && <TypingIndicator users={typing.map((t) => t.displayName)} />}
    </div>
  );
}
