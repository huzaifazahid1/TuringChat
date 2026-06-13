'use client';

export function TypingIndicator({ users }: { users: string[] }) {
  if (users.length === 0) return null;
  const text =
    users.length === 1
      ? `${users[0]} is typing…`
      : users.length === 2
        ? `${users[0]} and ${users[1]} are typing…`
        : `${users.length} people are typing…`;
  return (
    <div className="px-3 pb-2 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
      <span className="flex items-center gap-0.5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </span>
      <span>{text}</span>
    </div>
  );
}
