'use client';

import { useState, useRef } from 'react';
import { Paperclip, Send, Smile, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onSend: (text: string) => void;
  onTyping?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({ onSend, onTyping, placeholder = 'Type a message…', disabled }: Props) {
  const [value, setValue] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (taRef.current) taRef.current.style.height = 'auto';
  };

  const onChange = (v: string) => {
    setValue(v);
    onTyping?.();
    const el = taRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    }
  };

  const askAI = () => {
    const text = value.trim();
    setValue(text ? `/ai ${text}` : '/ai ');
    setTimeout(() => taRef.current?.focus(), 0);
  };

  return (
    <div className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-3 py-3 sm:px-6">
      <div className="flex items-end gap-2">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
          aria-label="Attach"
        >
          <Paperclip size={18} />
        </button>

        <div className="flex-1 flex items-end gap-2 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] px-3 py-2 focus-within:border-[var(--color-accent)]/50 transition-colors">
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none disabled:opacity-50"
            style={{ maxHeight: 140 }}
          />
          <button
            type="button"
            onClick={askAI}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
            title="Ask the AI assistant"
          >
            <Sparkles size={16} />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
            aria-label="Emoji"
          >
            <Smile size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || disabled}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
            value.trim() && !disabled
              ? 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]'
              : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'
          )}
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </div>
      <p className="mt-1.5 px-2 text-[10px] text-[var(--color-text-muted)]">
        Type <span className="font-mono text-[var(--color-accent)]">/ai</span> to chat with the assistant
      </p>
    </div>
  );
}
