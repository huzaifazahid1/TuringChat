'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getChatSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import type { DMSummary, DMMessage } from '@/types/chat.types';

/** Fetch and subscribe to the user's DM threads. */
export function useDMThreads() {
  const [threads, setThreads] = useState<DMSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    api
      .get('/dms')
      .then((r) => setThreads(r.data.threads as DMSummary[]))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Refresh on incoming DM (any thread)
  useEffect(() => {
    const socket = getChatSocket();
    if (!socket.connected) socket.connect();
    const onMsg = () => refetch();
    socket.on('dm:message', onMsg);
    return () => {
      socket.off('dm:message', onMsg);
    };
  }, [refetch]);

  return { threads, loading, refetch };
}

/** Subscribe to a single DM thread, return live message list and a sender. */
export function useDMThread(threadId: string | null) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const joinedRef = useRef<string | null>(null);

  // Initial fetch
  useEffect(() => {
    if (!threadId) return;
    setLoading(true);
    api
      .get(`/dms/${threadId}/messages`)
      .then((r) => setMessages(r.data.messages as DMMessage[]))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [threadId]);

  // Join socket room
  useEffect(() => {
    if (!threadId) return;
    const socket = getChatSocket();
    if (!socket.connected) socket.connect();
    socket.emit('dm:join', { threadId });
    joinedRef.current = threadId;

    const onMsg = (msg: DMMessage) => {
      if (msg.threadId !== threadId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on('dm:message', onMsg);
    return () => {
      socket.off('dm:message', onMsg);
      socket.emit('dm:leave', { threadId });
      joinedRef.current = null;
    };
  }, [threadId]);

  const send = useCallback(
    (content: string) => {
      const text = content.trim();
      if (!threadId || !text) return;
      getChatSocket().emit('dm:message', { threadId, content: text });
    },
    [threadId]
  );

  return { messages, loading, send };
}
