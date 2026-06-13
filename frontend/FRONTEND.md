# TuringChat — Frontend

Next.js 16 App Router · React 19 · Tailwind v4 · TypeScript · Zustand · Socket.io · GSAP

The chat client. Single-page web app that connects to the backend over REST + Socket.io and renders the room/game UI seen in the mockups.

---

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16.2 (App Router, RSC-light) | Standalone output for slim Docker images |
| Styling | Tailwind v4.2 (CSS-first `@theme`) | Tokens live in `globals.css`, not a JS config |
| State | Zustand 5 | Three slices — auth, chat, game — no Redux ceremony |
| Forms | react-hook-form + zod | Schema-validated, no re-render storm |
| Realtime | socket.io-client 4.8 | Two namespaces: `/chat` and `/game` |
| Animation | gsap 3 | Used in 4 narrow places only (see below) |
| Icons | lucide-react | Tree-shakeable, no SVG copy-paste |
| Avatars | DiceBear v9 (URL-only) | Zero install — just an HTTPS image |
| Theme | next-themes | `data-theme="dark"` by default |

---

## Folder map

```
frontend/
├── app/
│   ├── layout.tsx              # Root: ThemeProvider → AuthProvider → SocketProvider
│   ├── globals.css             # Tailwind v4 @theme tokens + bubble styles
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx   # Live DiceBear preview as you type
│   └── (dashboard)/
│       ├── layout.tsx          # Auth guard + DesktopSidebar + MobileNavBar
│       ├── page.tsx            # Dashboard home (stats, Turing CTA, trending rooms)
│       ├── chat/
│       │   ├── page.tsx        # Room list (+ desktop empty state)
│       │   └── [roomId]/page.tsx
│       ├── dm/[userId]/page.tsx
│       ├── games/
│       │   ├── page.tsx        # Lobby
│       │   ├── turing/page.tsx       # FULL game flow
│       │   ├── word-forge/page.tsx
│       │   ├── debate/page.tsx
│       │   └── imposter/page.tsx
│       ├── leaderboard/page.tsx
│       └── profile/page.tsx
├── components/
│   ├── ui/                     # Avatar, Button, Input, Badge, Card, Skeleton, Modal, Tooltip
│   ├── layout/                 # DesktopSidebar, MobileNavBar, RoomPanel
│   ├── chat/                   # MessageBubble, MessageList, MessageInput, RoomHeader, OnlineUsers, TypingIndicator
│   ├── games/                  # GameCard, GameTimer, VoteScreen, RevealScreen
│   ├── dashboard/StatsCard.tsx
│   └── providers/              # ThemeProvider, AuthProvider, SocketProvider
├── hooks/
│   ├── useAuth.ts              # Hydrates user from /auth/me on first render
│   ├── useSocket.ts            # useChatSocket — wires /chat events to chatStore
│   ├── useGame.ts              # useGameSocket — wires /game events to gameStore
│   └── useChat.ts              # useRoomMessages, useChatActions (send/typing/react)
├── lib/
│   ├── api.ts                  # Axios + token refresh interceptor (single-flight)
│   ├── socket.ts               # Singleton chat + game socket factories
│   ├── dicebear.ts             # URL builder for avatars (humans + bots)
│   ├── gsap.ts                 # 4 named animations: fadeInUp, staggerIn, countUp, dramaReveal
│   ├── notification.ts         # Plays /sounds/notification.mp3 (gracefully no-ops)
│   └── utils.ts                # cn(), timeAgo(), timeShort()
├── store/
│   ├── authStore.ts            # Persisted (localStorage) — { user }
│   ├── chatStore.ts            # rooms, messagesByRoom, typingByRoom, unreadByRoom
│   └── gameStore.ts            # phase machine: idle | searching | playing | voting | finished
├── types/
│   ├── user.types.ts
│   ├── chat.types.ts
│   └── game.types.ts
├── public/
│   └── sounds/README.txt       # Drop notification.mp3 here
├── Dockerfile
├── nginx.conf                  # Used by the nginx service in docker-compose
├── next.config.mjs             # output: 'standalone' + DiceBear remote pattern
└── package.json
```

---

## Auth & token refresh

`localStorage` holds two keys: `tc_access_token`, `tc_refresh_token`. The axios instance attaches the access token to every request. On a `401` it suspends the failing request, hits `/auth/refresh` exactly once (single-flight promise) and retries every queued request with the new access token. If the refresh itself fails, both tokens are cleared and the user is bounced to `/login` by the dashboard layout's auth guard.

The user object lives in `authStore` and is persisted, so refresh-on-tab survives without a network round-trip — `AuthProvider` then quietly re-confirms the user via `/auth/me`.

---

## Sockets

Two namespaces, two singleton clients:

- `getChatSocket()` → `/chat`
- `getGameSocket()` → `/game`

Both attach the access token via `auth: { token }` on connect. `useChatSocket(activeRoomId)` mounts inside the chat-room page and subscribes to `chat:message` / `chat:typing` / `chat:reaction`. The active-room id matters because:

1. We only bump the unread badge for messages **not in** the active room.
2. We always play the notification sound for non-self messages (whether in the room or not).

`useGameSocket()` returns `{ findMatch, cancelMatch, sendGameMessage, submitVote, submitWord }` and writes incoming events into `gameStore` so any game page can stay declarative.

---

## State (Zustand)

Three thin slices, no thunks:

```
authStore   { user, hydrated }                 — persisted
chatStore   { rooms, messagesByRoom,
              typingByRoom, unreadByRoom }     — ephemeral
gameStore   { phase, match, messages,
              secondsLeft, result, metadata }  — phase state machine
```

The game phase is the single source of truth for what the Turing page renders — `idle` / `searching` show the lobby; `playing` shows the chat; `voting` overlays `<VoteScreen/>`; `finished` overlays `<RevealScreen/>`. No flag soup.

---

## GSAP usage

Only **4** named helpers in `lib/gsap.ts`. Animation should be a finishing touch, not a system.

| Helper | Used by |
|---|---|
| `fadeInUp` | New chat messages (last bubble) |
| `staggerIn` | Reserved for stat tile entrance — not yet attached |
| `countUp` | Reveal screen score number |
| `dramaReveal` | Reveal screen Human/AI icon |

The reveal screen also fires 40 confetti dots inline via `gsap.to` when the player guessed correctly — no library, just DOM nodes.

---

## Responsive breakpoints

```
< 1024px            mobile / tablet — bottom nav, single panel
≥ 1024px (lg)       desktop — sidebar appears, chat list always visible
≥ 1280px (xl)       full 3-pane WhatsApp layout — info panel pinned on right
```

The mobile layout adds `pb-[68px]` to the main column so the bottom nav doesn't cover content, plus the global `safe-bottom` class for iPhones.

---

## DiceBear

Avatars are pure HTTP: `https://api.dicebear.com/9.x/{style}/svg?seed={seed}`. Humans default to the `avataaars` style; bots use `bottts`. Nothing is installed — `next.config.mjs` whitelists the host for `next/image`, and `<Avatar/>` passes `unoptimized` so the SVG isn't re-encoded.

The user's `avatarSeed` is just `username` at registration; users can shuffle to a new random seed from the Profile page.

---

## Environment variables

```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

Both must be set at **build** time for the standalone bundle. The Docker service in `docker-compose.yaml` injects them via the build args / env block.

---

## Local development

```bash
pnpm install
cp ../.env.example .env.local   # only NEXT_PUBLIC_* keys are read
pnpm dev
```

Runs at `http://localhost:3000`. The backend should be running at `http://localhost:5000` — see `BACKEND.md`.

---

## Production build

```bash
pnpm build && pnpm start
```

Or just `docker compose up` from the repo root, which builds via `frontend/Dockerfile` and serves through `nginx` on port 80.

---

