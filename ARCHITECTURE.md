# ARCHITECTURE.md

## High Level Architecture

```
Client (Next.js Web App)
  │  Encrypts/Decrypts messages locally (libsodium)
  │  Caches private key in memory only
  │
  ├── HTTPS ──────────────────► REST API  (Node.js + Express)
  │                               │  Helmet, CORS, Rate-limit
  │                               ├── MongoDB  (users, chats, messages, sessions)
  │                               └── Redis    (OTP cache, online presence, rate-limits)
  │
  └── WebSocket ──────────────► Socket.IO Server (same Express process)
                                  └── Rooms per chat, authenticated via JWT
```

---

## Components

### Frontend (Next.js + TypeScript)

| Layer | Responsibility |
|---|---|
| `src/app/` | Next.js App Router pages (auth, chat, settings, vault) |
| `src/components/` | Shared UI components (CryptoUnlockBanner, Sidebar, MessageBubble, etc.) |
| `src/context/` | React context — AuthContext (session + crypto state) |
| `src/hooks/` | Custom hooks — useCrypto, useSocket, usePresence |
| `src/lib/api.ts` | Typed fetch wrapper with Bearer token injection |
| `src/lib/crypto.ts` | **All E2EE logic** — key generation, Argon2id, encrypt/decrypt |
| `src/constants/` | Shared constants |

### Backend (Express + TypeScript)

| Layer | Responsibility |
|---|---|
| `src/controllers/` | Business logic — auth, messages, chats, vault, panic |
| `src/routes/` | Route declarations — auth, users, chats, messages, vault, panic |
| `src/models/` | Mongoose models — User, OtpRequest, Session, Chat, Message |
| `src/middleware/` | auth.ts (JWT), rateLimits |
| `src/socket/` | Socket.IO event handlers — presence, typing, delivery |
| `src/jobs/` | Cleanup jobs — expired message TTL, panic lock enforcement |
| `src/utils/` | authHelpers, db connection |

### Realtime Layer

Socket.IO running on the same Express HTTP server.

Events (server → client):
- `message:new` — new message delivered
- `message:updated` — edit/delete propagated
- `presence:online` / `presence:offline`
- `typing:start` / `typing:stop`
- `receipt:read` — read receipt update
- `panic:lock` — emergency lock broadcast

Events (client → server):
- `chat:join` — join a chat room
- `typing:start` / `typing:stop`
- `receipt:read` — mark messages read

### Database (MongoDB)

Collections: `users`, `chats`, `messages`, `sessions`, `otp_requests`

Key indexes: `users.phone (unique)`, `messages.chatId+createdAt`, `sessions.userId`, `chats.members`

### Cache / Fast State (Redis)

| Key pattern | Purpose |
|---|---|
| `otp:{phone}` | OTP hash + expiry |
| `online:{userId}` | Online presence flag |
| `ratelimit:{ip}` | OTP request rate limiting |

### Deployment

- **Frontend**: Vercel (Next.js)
- **Backend**: Azure App Service / Azure Container Apps
- **Database**: MongoDB Atlas
- **Cache**: Upstash Redis (free tier)

---

## Crypto Layer (Phase 3 — Implemented)

### Algorithm Choices

| Purpose | Algorithm | Library |
|---|---|---|
| Key pair generation | X25519 (curve25519) | libsodium `crypto_box_keypair` |
| Password key derivation | Argon2id | libsodium `crypto_pwhash` |
| Private key encryption | XSalsa20-Poly1305 | libsodium `crypto_secretbox_easy` |
| Message encryption | X25519 + XSalsa20-Poly1305 | libsodium `crypto_box_easy` |

### Key Lifecycle

```
Registration:
  Browser generates X25519 keypair
      │
      ├── publicKey ─────────────────────────► stored on server (plaintext, public)
      └── privateKey
              │
              ▼ Argon2id(password, random_salt) → 32-byte derived key
              │
              ▼ XSalsa20-Poly1305 encrypt
              │
              └── encryptedPrivateKey bundle ─► stored on server (encrypted)
                  (salt | nonce | ciphertext)

Login:
  Download encryptedPrivateKey
      │
      ▼ Argon2id(password, salt) → derived key
      │
      ├── Store in sessionStorage for session survival across page refreshes
      │
      ▼ Decrypt → raw privateKey
      │
      └── Cached in-memory ONLY (cleared on logout/tab close)

Page Refresh (Session Recovery):
  Check sessionStorage for stored derived key
      │
      ├─ If found: Use derived key to auto-decrypt private key (no password required)
      │              User stays logged in, messages stay decrypted during session
      │
      └─ If not found: Private key must be re-decrypted via password (e.g., after clearing sessionStorage)

Session Logout/Panic/Timeout:
  - Private key zeroed from memory
  - sessionStorage derived key cleared
  - Token removed from localStorage
  - Full re-authentication required on next login
```

---

### Message Encryption Flow

```
Sender:
  Generate ephemeral X25519 keypair (per-message — forward secrecy)
      │
      ▼ crypto_box_easy(plaintext, nonce, recipientPublicKey, ephemeralPrivKey)
      │
      └── packed ciphertext = base64(nonce | ephemeralPublicKey | ciphertext)
              │
              ▼ transmitted to server (server sees only ciphertext)

Receiver:
  Unpack ciphertext → nonce, ephemeralPublicKey, ciphertext
      │
      ▼ crypto_box_open_easy(ciphertext, nonce, ephemeralPublicKey, cachedPrivateKey)
      │
      └── plaintext displayed locally
```

### Security Properties

- **Zero-knowledge server**: server stores only ciphertext and public keys
- **Forward secrecy**: per-message ephemeral keys mean past messages cannot be decrypted even if long-term keys are compromised
- **Memory safety**: private key zeroed on logout via `Uint8Array.fill(0)`
- **Wrong-password recovery**: `CryptoUnlockBanner` prompts re-entry without logout

---

## Security Layer (Implemented)

| Concern | Mitigation |
|---|---|
| Security headers | `helmet` middleware on all responses |
| Rate limiting | `express-rate-limit` — 200 req/15min global, stricter on OTP |
| OTP brute force | Max 5 attempts, then record deleted |
| OTP expiry | 5-minute TTL, auto-deleted from DB |
| Password storage | bcrypt (cost 12) |
| JWT | 30-day expiry, per-session revocation in DB |
| CORS | Restricted to `FRONTEND_URL` env variable |
| Input validation | All endpoints validate required fields |
| Soft deletes | Users and sessions soft-deleted, not hard-dropped |

---

## Folder Structure (Actual)

```
chat-india/
  frontend/
    src/
      app/
        auth/login/
        auth/register/
        chat/              ← Phase 4
        settings/sessions/
        vault/             ← Phase 6
      components/
        CryptoUnlockBanner.tsx
      context/
        AuthContext.tsx
      hooks/
        useCrypto.ts
        useSocket.ts       ← Phase 4
      lib/
        api.ts
        crypto.ts
      constants/
  backend/
    src/
      controllers/
        authController.ts
        chatController.ts  ← Phase 4
        messageController.ts ← Phase 4
        userController.ts  ← Phase 4
      routes/
        authRoutes.ts
        chatRoutes.ts      ← Phase 4
        messageRoutes.ts   ← Phase 4
        userRoutes.ts      ← Phase 4
      models/
        User.ts
        OtpRequest.ts
        Session.ts
        Chat.ts            ← Phase 4
        Message.ts         ← Phase 4
      middleware/
        auth.ts
      socket/
        handlers.ts        ← Phase 4
      jobs/
        cleanupExpired.ts  ← Phase 7
      utils/
        authHelpers.ts
        db.ts
      constants/
```