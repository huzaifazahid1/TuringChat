'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { RoomPanel } from '@/components/layout/RoomPanel';
import { RoomHeader } from '@/components/chat/RoomHeader';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { OnlineUsers } from '@/components/chat/OnlineUsers';
import { useChatActions, useRoomMessages } from '@/hooks/useChat';
import { useChatSocket } from '@/hooks/useSocket';
import { useChatStore } from '@/store/chatStore';
import type { Room } from '@/types/chat.types';
import type { PublicUser } from '@/types/user.types';
export default function ChatRoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const clearUnread = useChatStore((s) => s.clearUnread);
 
  const onlineUsers = useChatStore((s) => s.onlineByRoom[roomId]) ?? [];

  console.log("online users: ",onlineUsers)

  useEffect(() => {
    if (!roomId) return;
    setError(null);
    setRoom(null);
    api
      .get(`/rooms/${roomId}`)
      .then((r) => {
        if (r.data?.room) setRoom(r.data.room);
        else setError('Room data was empty.');
      })
      .catch((e) => {
        const status = e?.response?.status;
        const msg = e?.response?.data?.error;
        if (status === 404) setError("This room doesn't exist (or was deleted).");
        else if (status === 400) setError('Invalid room id.');
        else setError(msg || 'Could not load this room. The server may be down.');
      });
    clearUnread(roomId);
  }, [roomId]);

  useRoomMessages(roomId);
  const { sendMessage, setTyping, reactTo } = useChatActions(roomId);
  useChatSocket(roomId);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-danger)]/15 text-3xl">
          ⚠️
        </div>
        <h2 className="text-lg font-bold">Couldn&apos;t open this room</h2>
        <p className="mt-1 max-w-sm text-sm text-[var(--color-text-secondary)]">{error}</p>
        <div className="mt-5 flex gap-2">
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-bg-elevated)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-bg-hover)]"
          >
            <ArrowLeft size={14} /> Back to rooms
          </Link>
          <button
            onClick={() => location.reload()}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex h-screen items-center justify-center text-[var(--color-text-secondary)]">
        Loading room…
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div className="hidden lg:block">
        <RoomPanel />
      </div>

      <div className="flex flex-1 min-w-0 flex-col">
        <RoomHeader
          room={room}
          onlineCount={room.activeUsers}
          showBack
          onToggleInfo={() => setShowInfo((v) => !v)}
        />
        <MessageList roomId={roomId} onReact={reactTo} />
        <MessageInput onSend={sendMessage} onTyping={setTyping} />
      </div>

      <div className="hidden xl:block">
        <OnlineUsers room={room} onlineUsers={onlineUsers} totalOnline={onlineUsers.length}  />
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowInfo(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm">
            <OnlineUsers
              room={room}
              onlineUsers={onlineUsers}
              totalOnline={room.activeUsers}
              onClose={() => setShowInfo(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}