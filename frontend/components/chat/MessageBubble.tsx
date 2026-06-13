'use client';

import { useState } from 'react';
import { Smile, Check, CheckCheck } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { timeShort, cn } from '@/lib/utils';
import type { Message } from '@/types/chat.types';

interface Props {
  message: Message;
  isMine: boolean;
  showAuthor?: boolean;
  onReact?: (emoji: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '😮'];

export function MessageBubble({ message, isMine, showAuthor = true, onReact }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const isAi = message.senderType === 'ai' || message.senderType === 'bot';

  if (message.type === 'system') {
    return (
      <div className="my-2 text-center text-xs text-[var(--color-text-muted)]">
        {message.content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex w-full gap-3 px-1 py-1.5',
        isMine && 'flex-row-reverse'
      )}
    >
      <div className="pt-1">
        <Avatar
          seed={message.senderAvatarSeed}
          size={36}
          isBot={isAi}
          ring={isAi}
        />
      </div>

      <div className={cn('flex max-w-[78%] min-w-0 flex-col', isMine && 'items-end')}>
        {showAuthor && !isMine && (
          <div className="mb-1 flex items-center gap-2 px-1">
            <span
              className={cn(
                'text-xs font-semibold',
                isAi ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
              )}
            >
              {message.senderName}
            </span>
            {isAi && <Badge tone="ai">AI</Badge>}
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {timeShort(message.createdAt)}
            </span>
          </div>
        )}

        <div className="relative">
          <div
            className={cn(
              'inline-block max-w-full break-words px-4 py-2.5 text-sm leading-relaxed',
              isMine ? 'bubble-me' : 'bubble-them',
              isAi && !isMine && 'border border-[var(--color-accent)]/30'
            )}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            {isMine && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] opacity-80">
                {timeShort(message.createdAt)}
                <CheckCheck size={12} />
              </span>
            )}
          </div>

          <button
            onClick={() => setShowPicker((v) => !v)}
            className={cn(
              'absolute -bottom-3 opacity-0 group-hover:opacity-100 transition-opacity',
              'flex h-6 w-6 items-center justify-center rounded-full',
              'bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]',
              'text-[var(--color-text-muted)] hover:text-[var(--color-accent)]',
              isMine ? '-left-3' : '-right-3'
            )}
            aria-label="Add reaction"
          >
            <Smile size={12} />
          </button>

          {showPicker && (
            <div
              className={cn(
                'absolute z-20 flex gap-1 rounded-full bg-[var(--color-bg-elevated)] p-1.5 shadow-lg border border-[var(--color-border-subtle)]',
                isMine ? '-left-2 -translate-x-full top-1/2 -translate-y-1/2' : '-right-2 translate-x-full top-1/2 -translate-y-1/2'
              )}
            >
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact?.(emoji);
                    setShowPicker(false);
                  }}
                  className="text-base hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className={cn('mt-1 flex flex-wrap gap-1', isMine && 'justify-end')}>
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact?.(r.emoji)}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg-elevated)] px-2 py-0.5 text-xs border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)]/40"
              >
                <span>{r.emoji}</span>
                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">
                  {r.users.length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
