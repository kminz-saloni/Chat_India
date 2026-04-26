# ARCHITECTURE.md

## High Level Architecture

Client (Next.js Web App)
-> HTTPS / WebSocket
-> API Server (Node.js + Express)
-> MongoDB
-> Redis (presence, OTP, rate-limit)

## Components

### Frontend (Next.js)

* Authentication screens
* Chat UI
* Local key generation
* Encryption/decryption
* Local secure cache
* Session state

### Backend (Express)

* Auth APIs
* OTP verification
* User management
* Chat APIs
* Socket connections
* Panic lock command routing
* Cleanup jobs

### Realtime Layer

Recommendation: Socket.IO (best balance of ease + docs + free deployment support).
Alternative: native WebSocket.

### Database

MongoDB stores users, chats, messages, sessions.

### Cache / Fast State

Redis stores OTPs, online presence, rate limits, temporary events.

### Deployment

* Frontend: Vercel
* Backend: Azure App Service / Azure Container Apps / VM
* MongoDB Atlas (free tier if needed)
* Redis free provider if available

## Security Flow

1. Generate keys in browser.
2. Upload public key.
3. Encrypt private key with password-derived key.
4. Encrypt messages using recipient public key.
5. Decrypt locally only.

## Suggested Folder Structure

```text
chat-india/
  frontend/
    src/app/
    src/components/
    src/lib/
    src/hooks/
  backend/
    src/controllers/
    src/routes/
    src/services/
    src/middleware/
    src/models/
    src/socket/
    src/jobs/
    src/utils/
```