# TuringChat — Backend

Express 5 + Socket.io 4 + MongoDB + Redis + Groq.
TypeScript strict mode, pnpm, Dockerized.

---

## 1. Folder structure

```
backend/
├── src/
│   ├── config/         # mongo, redis, groq init
│   ├── models/         # mongoose schemas (User, Room, Message, GameSession)
│   ├── routes/         # REST endpoints
│   ├── socket/         # /chat and /game socket namespaces + handlers
│   ├── services/       # groq, matchmaking, scoring, leaderboard
│   ├── middleware/     # auth, validate, rate-limit
│   ├── utils/          # logger
│   ├── types/          # shared type aliases
│   └── server.ts       # entry
├── Dockerfile
└── package.json
```

The split is deliberate: **routes** are thin controllers, **services** hold business
logic, **socket/** holds realtime handlers. Anything reused by both REST and sockets
(scoring, leaderboard, matchmaking, Groq) lives in services.

---

## 2. Local dev

Install pnpm if you don't have it:

```bash
npm i -g pnpm
```

Then:

```bash
cd backend
pnpm install
cp ../.env.example ../.env   # fill in values
pnpm dev                     # tsx watch on src/server.ts
```

Build + run prod locally:

```bash
pnpm build
pnpm start
```

---

## 3. Environment variables

| Var                       | Purpose                                  |
|---------------------------|------------------------------------------|
| `PORT`                    | HTTP port (default 5000)                 |
| `MONGO_URI`               | full Mongo connection string             |
| `REDIS_URL`               | redis://host:port                        |
| `GROQ_API_KEY`            | from console.groq.com (free tier OK)     |
| `JWT_SECRET`              | sign access tokens                       |
| `JWT_REFRESH_SECRET`      | sign refresh tokens                      |
| `JWT_EXPIRES_IN`          | e.g. `15m`                               |
| `JWT_REFRESH_EXPIRES_IN`  | e.g. `7d`                                |
| `CORS_ORIGIN`             | comma-separated allowed origins          |
| `LOG_LEVEL`               | `debug` / `info` / `warn` / `error`      |

When running via Docker Compose these are wired automatically from the root `.env`.

---

## 4. REST API

All authed routes require `Authorization: Bearer <accessToken>`.

### Auth — `/api/auth`

| Method | Path        | Body                                | Description                |
|--------|-------------|-------------------------------------|----------------------------|
| POST   | `/register` | `{ username, email, password }`     | creates user + tokens      |
| POST   | `/login`    | `{ identifier, password }`          | identifier = username/email|
| POST   | `/refresh`  | `{ refreshToken }`                  | new access token           |
| GET    | `/me`       | —                                   | current user               |

### Users — `/api/users`

| Method | Path         | Description                              |
|--------|--------------|------------------------------------------|
| PATCH  | `/me`        | update displayName / bio / avatarSeed    |
| GET    | `/search?q=` | prefix-search usernames                  |
| GET    | `/:id`       | public profile by id                     |

### Rooms — `/api/rooms`

| Method | Path                | Description                              |
|--------|---------------------|------------------------------------------|
| GET    | `/?category=&q=`    | list public rooms                        |
| POST   | `/`                 | create new room                          |
| GET    | `/:id`              | room metadata                            |
| GET    | `/:id/messages`     | paginated message history (`?before=`)   |

### Leaderboard — `/api/leaderboard`

| Method | Path                              | Description                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/?scope=overall|turing|...`      | top 10 + your rank                   |

---

## 5. Socket.io

Two namespaces, both auth-gated by JWT in `handshake.auth.token`.

### `/chat` namespace

Client → server:

| Event           | Payload                                  |
|-----------------|------------------------------------------|
| `chat:join`     | `{ roomId }`                             |
| `chat:leave`    | `{ roomId }`                             |
| `chat:message`  | `{ roomId, content }`                    |
| `chat:typing`   | `{ roomId, isTyping }`                   |
| `chat:reaction` | `{ messageId, emoji }`                   |

Server → client:

| Event             | Payload                                   |
|-------------------|-------------------------------------------|
| `chat:joined`     | `{ roomId }`                              |
| `chat:message`    | full message object                       |
| `chat:user-joined`| `{ userId, username, displayName, ... }`  |
| `chat:user-left`  | `{ userId }`                              |
| `chat:typing`     | `{ userId, displayName, isTyping }`       |
| `chat:reaction`   | `{ messageId, reactions }`                |
| `user:status`     | `{ userId, status }`                      |

The room bot is triggered server-side: any message starting with `/ai ` causes
the backend to call Groq and broadcast the AI response as a separate
`senderType: 'bot'` message.

### `/game` namespace

Client → server:

| Event              | Payload                                   |
|--------------------|-------------------------------------------|
| `game:find-match`  | `{ gameType }`                            |
| `game:cancel-match`| `{ gameType }`                            |
| `game:message`     | `{ roomKey, content }`                    |
| `game:vote`        | `{ roomKey, vote: 'human' \| 'ai' }`      |
| `game:word-submit` | `{ roomKey, word }` (Word Forge)          |

Server → client:

| Event              | Payload                                                    |
|--------------------|------------------------------------------------------------|
| `game:queued`      | `{ gameType }` waiting for opponent                        |
| `game:match-found` | `{ roomKey, gameType, timeLimit, opponent, youAre }`       |
| `game:metadata`    | game-specific kickoff data (debate topic, secret word, ...)|
| `game:message`     | `{ senderId, content, timestamp, ... }`                    |
| `game:timer`       | `{ secondsLeft }`                                          |
| `game:vote-phase`  | `{}`                                                       |
| `game:result`      | `{ opponentType, yourVote, correct, points, newScore, streak, rank }` |
| `game:opponent-left` | `{}`                                                     |
| `game:judged`      | Word-Forge / Debate judge JSON                             |
| `game:cancelled`   | `{ gameType }`                                             |

---

## 6. Groq integration

`src/services/groqService.ts` exposes 3 modes:

1. **`askRoomBot(question, context)`** — fast helpful assistant. Uses
   `llama-3.1-8b-instant`, temperature 0.6. Triggered by `/ai` in chat.

2. **`deceptiveHumanReply(history)`** — the Turing imposter. Uses
   `llama-3.3-70b-versatile`, temperature 0.95, max 120 tokens, with a
   dedicated system prompt that forbids admitting AI nature and mandates
   short, casual, lowercase, mildly-typo'd messages.

3. **`judgeJSON<T>(task, data, schemaHint)`** — structured judge for
   cognitive games. Uses `response_format: 'json_object'`, temperature 0.3.

Models verified against the **GroqCloud Models** doc as of May 2026 — the
older `llama3-8b-8192` is **not** used; it's been superseded.

---

## 7. Redis usage

| Key pattern                   | Purpose                                       | TTL |
|-------------------------------|-----------------------------------------------|-----|
| `mm:queue:<gameType>`         | matchmaking queue (Redis list)                | 5m  |
| `mm:socket:<userId>`          | userId → current socketId mapping             | 5m  |
| `room:online:<roomId>`        | set of online user IDs in a room              | —   |
| `typing:<roomId>:<userId>`    | typing flag, auto-expires                     | 3s  |
| `lb:<scope>`                  | leaderboard sorted set (`overall`, `turing`…) | —   |

`@socket.io/redis-adapter` is wired into `pubClient`/`subClient` so multiple
backend replicas can broadcast across instances.

---

## 8. Matchmaking flow

For the Turing game we **deliberately** roll a 50/50 between AI and human
matches even when humans are queued — otherwise the game becomes trivial.

1. Player calls `game:find-match`.
2. With 50% probability we hand them an AI opponent immediately.
3. Otherwise we try to `LPOP` the human queue. If we hit a waiter, both
   sockets join the same `roomKey` and the 60-second timer starts.
4. If no waiter, we fall back to AI (Turing only) so the player never waits
   forever. For other games we keep them queued and notify on match.

---

## 9. Scoring

| Event                        | Points         |
|------------------------------|----------------|
| Correct vote                 | +10            |
| Fooled opponent              | +5             |
| Streak bonus                 | +2 × streak    |
| Word Forge winner            | +15            |
| Word Forge participant       | +5             |

Every score change is mirrored to:
- the user's `stats.currentScore` (Mongo)
- `lb:overall` (Redis sorted set)
- `lb:<gameType>` (Redis sorted set)

---

## 10. Scaling notes

- **Stateless backend**, all state in Mongo + Redis → run multiple replicas
  behind a load balancer. The Redis adapter handles cross-instance broadcast.
- Matchmaking is atomic via Redis `LPOP` — no two backends will hand the
  same waiter to two different opponents.
- Groq calls go through `services/groqService` which is the only place you
  need to add caching/batching/rate-limiting if you scale.
