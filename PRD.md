# PRD.md

## Product Requirements Document

### Product Name

Chat-India

### Vision

A privacy-first web chat application focused on secure messaging, hidden privacy controls, and emergency account protection.

### Goals (v1)

* Deliver secure 1:1 realtime messaging
* Provide browser-based client-side encryption
* Enable hidden vault chats
* Enable remote panic lock
* Support session management
* Deliver clean responsive web UX

### Target Users

* Students
* Privacy-conscious users
* Professionals needing private communication

### Core Features (v1)

1. Phone signup/login with SMS OTP
2. 1:1 chat
3. Realtime delivery
4. Typing indicators
5. Read receipts
6. Online/offline + last seen
7. Message edit/delete
8. Emoji reactions (best-effort)
9. Hidden Vault (PIN/password)
10. Panic Lock via configurable secret phrase
11. Self-destruct messages
12. Multi-session visibility + logout
13. Account deletion

### Non-Goals (v1)

* Native mobile apps
* Group chat
* Media sharing
* Admin panel
* Chat export

### Success Metrics

* Successful signup/login rate > 90%
* Message delivery latency < 1s on normal network
* Realtime message and presence state must remain correct without manual refresh
* Zero plaintext stored on server
* Stable use with <100 active users
