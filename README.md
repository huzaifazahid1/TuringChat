# TuringChat

A real-time chat platform where humans chat alongside AI — and play games to figure out which is which.

> **The Turing Game**: 60 seconds with a stranger. Could be a person. Could be Llama-3.3 trying to fool you. Guess wrong, they get the points.

---

## Features

- **Public rooms** with categories, moods, typing indicators, reactions, unread badges, and a notification sound.
- **Direct messages** between any two users on a deterministic room key.
- **`/ai` command** — invoke a Groq-powered assistant inline in any room, with the last 8 messages as context.
- **Turing Game** — 60-second 1v1 chat against a real opponent or a deceptive AI. Vote, then the truth is revealed with score, streak, and rank.
- **Word Forge** — collaborative one-word-at-a-time storytelling, judged by AI for creativity & coherence.
- **Rapid Fire Debate** — assigned sides, 30-second arguments, AI verdict.
- **Imposter Prompt** — describe a shared secret word without saying it.
- **Leaderboard** with five scopes (overall + one per game), top 10 + your rank.
- **Profile** with editable display name, bio, and re-rollable DiceBear avatar.
- **Mobile-first responsive UI** — bottom nav on phones, three-pane WhatsApp layout on desktop, dark by default.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 · React 19 · Tailwind v4 · TypeScript · Zustand · Socket.io · GSAP |
| Backend | Node 22 · Express 5 · Socket.io 4 · Mongoose 8 · ioredis 5 |
| AI | Groq SDK (Llama 3.3 70B for Turing/judging, Llama 3.1 8B for in-room replies) |
| Datastores | MongoDB 8 (data) + Redis 7 (queues, leaderboards, socket pub/sub adapter) |
| Edge | Nginx (single port 80, WebSocket-aware) |
| Orchestration | Docker Compose |

---

## Quick start

You'll need: Docker + Docker Compose, and a Groq API key (free at <https://console.groq.com/keys>).

```bash
git clone <this-repo>
cd turingchat

# Configure
cp .env.example .env
# Edit .env — at minimum set GROQ_API_KEY, JWT_SECRET, JWT_REFRESH_SECRET,
# and the Mongo/Redis passwords.

# Boot the whole stack
docker compose up --build

# Or include mongo-express on :8081 for poking the DB
docker compose --profile dev up --build
```

Open <http://localhost> and register an account.

The first cold start is ~3 minutes — pnpm installs, Next builds, Mongo & Redis warm up. Subsequent starts are seconds.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        nginx :80                             │
│  /api  → backend  ·  /socket.io  → backend  ·  /  → frontend │
└────────────┬─────────────────────────────────────┬───────────┘
             │                                     │
       ┌─────▼──────┐                       ┌──────▼──────┐
       │  backend   │  ◀────  Socket.io ───▶│  frontend   │
       │ Express 5  │                       │ Next.js 16  │
       │ + Socket.io│                       │             │
       └──┬─────┬───┘                       └─────────────┘
          │     │
   ┌──────▼┐  ┌─▼──────┐   ┌──────────┐
   │ Mongo │  │ Redis  │──▶│  Groq    │
   │   8   │  │   7    │   │ Llama-3  │
   └───────┘  └────────┘   └──────────┘
```

Two Socket.io namespaces:
- `/chat` — rooms, DMs, typing, reactions, the `/ai` command.
- `/game` — matchmaking queues, per-match rooms, vote/judge events.

Redis carries three things:
1. Game matchmaking queues (sorted lists per game type).
2. Leaderboard sorted sets (one per scope).
3. Socket.io pub/sub adapter so multiple backend instances stay in sync.

The Turing matchmaker deliberately rolls a 50/50 AI-pairing on the second player — the AI joins as a random fake handle and replies with a humanizing 1.1–3.5s delay, capped at 120 tokens, with a strict no-AI-admission system prompt.

---

## Repo layout

```
turingchat/
├── docker-compose.yaml      # 6 services + dev profile for mongo-express
├── .env.example
├── README.md                # this file
├── backend/                 # Express + Socket.io API. See BACKEND.md
└── frontend/                # Next.js client. See FRONTEND.md
```

`backend/BACKEND.md` and `frontend/FRONTEND.md` go deep on each side.

---

## Development without Docker

Two terminals:

```bash
# Terminal 1 — backend
cd backend
pnpm install
cp ../.env.example .env
# Make sure local Mongo + Redis are running, or change the URLs in .env
pnpm dev    # nodemon @ :5000

# Terminal 2 — frontend
cd frontend
pnpm install
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local
echo "NEXT_PUBLIC_SOCKET_URL=http://localhost:5000" >> .env.local
pnpm dev    # next @ :3000
```

---

## Notification sound

Drop a short MP3 at `frontend/public/sounds/notification.mp3`. The chat pings when a non-self message lands outside the active room. If the file is missing, audio playback silently no-ops — chat still works.

---

## Production notes

- **HTTPS**: terminate at your platform's load balancer (Fly, Railway, Cloudflare, etc.) and forward to nginx on port 80. Point `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_SOCKET_URL` at your real domain — these are baked into the Next.js bundle at build time.
- **Scaling**: the backend is stateless thanks to the Redis Socket.io adapter — bump replicas freely.
- **Secrets**: do not commit `.env`. The example file is fine to commit. Rotate `JWT_SECRET` and `JWT_REFRESH_SECRET` to invalidate all sessions.
- **Mongo backup**: `mongodump` against the named volume `mongo_data`.

---

## License

MIT.
