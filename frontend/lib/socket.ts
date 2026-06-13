import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let chatSocket: Socket | null = null;
let gameSocket: Socket | null = null;

function build(namespace: '/chat' | '/game'): Socket {
  return io(`${SOCKET_URL}${namespace}`, {
    transports: ['websocket'],
    withCredentials: true,
    autoConnect: false,
    auth: (cb) => cb({ token: getAccessToken() }),
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 800,
  });
}

export function getChatSocket(): Socket {
  if (!chatSocket) chatSocket = build('/chat');
  return chatSocket;
}

export function getGameSocket(): Socket {
  if (!gameSocket) gameSocket = build('/game');
  return gameSocket;
}

export function connectSockets(): void {
  const c = getChatSocket();
  const g = getGameSocket();
  if (!c.connected) c.connect();
  if (!g.connected) g.connect();
}

export function disconnectSockets(): void {
  chatSocket?.disconnect();
  gameSocket?.disconnect();
  chatSocket = null;
  gameSocket = null;
}
