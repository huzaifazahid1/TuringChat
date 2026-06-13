'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useDMThread } from '@/hooks/useDM';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import type { DMSummary } from '@/types/chat.types';

export default function DMThreadPage() {
  const params = useParams<{ threadId: string }>();
  const threadId = params.threadId;
  const me = useAuthStore((s) => s.user);
  const [other, setOther] = useState<DMSummary['otherUser'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { messages, send } = useDMThread(threadId);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Fetch thread metadata (other user)
  useEffect(() => {
    if (!threadId) return;
    api
      .get('/dms')
      .then((r) => {
        const t = (r.data.threads as DMSummary[]).find((x) => x.id === threadId);
        if (t) setOther(t.otherUser);
        else setError('Conversation not found');
      })
      .catch(() => setError('Could not load conversation'));
  }, [threadId]);

  // Autoscroll
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRef.current?.value.trim()) return;
    send(inputRef.current.value);
    inputRef.current.value = '';
  };

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
        <Link
          href="/dms"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-bg-elevated)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-bg-hover)]"
        >
          <ArrowLeft size={14} /> Back
        </Link>
      </div>
    );
  }

  if (!me || !other) {
    return (
      <div className="flex h-screen items-center justify-center text-[var(--color-text-secondary)]">
        Loading conversation…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-3 py-3 sm:px-6">
        <Link
          href="/dms"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
        >
          <ArrowLeft size={18} />
        </Link>
        <Avatar seed={other.avatarSeed} size={40} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{other.displayName}</h2>
          <p className="text-xs text-[var(--color-text-muted)]">@{other.username}</p>
        </div>
      </header>

      <main ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-2">
          {messages.length === 0 && (
            <p className="py-12 text-center text-xs text-[var(--color-text-muted)]">
              Say hi to start the conversation.
            </p>
          )}
          {messages.map((m) => {
            const mine = m.senderId === me.id;
            return (
              <div
                key={m.id}
                className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}
              >
                {!mine && <Avatar seed={m.senderAvatarSeed} size={28} />}
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
                    mine
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-bg-elevated)]'
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className="mt-0.5 text-[10px] opacity-60">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <form
        onSubmit={onSubmit}
        className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-3"
      >
        <div className="mx-auto flex max-w-3xl gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Message…"
            maxLength={4000}
            className="flex-1 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-2.5 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
          />
          <button
            type="submit"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
