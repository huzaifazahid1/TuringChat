'use client';

import { RoomPanel } from '@/components/layout/RoomPanel';

export default function ChatListPage() {
  return (
    <div className="flex h-screen">
      <RoomPanel />
      {/* Desktop empty state */}
      <div className="hidden flex-1 lg:flex flex-col items-center justify-center bg-game-grid">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--color-accent)]/15 mb-4">
            <span className="text-4xl">💬</span>
          </div>
          <h2 className="text-xl font-bold">Pick a room</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Choose a public room or DM from the left to start chatting.
          </p>
        </div>
      </div>
    </div>
  );
}
