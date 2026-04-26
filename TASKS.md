# TASKS.md

## Execution Rules

* Build phase by phase. Do not jump randomly.
* Complete backend contract before frontend integration where possible.
* Test each module immediately after implementation.
* Keep commits small and feature-based.
* Refer to PRD.md for product scope, SRS.md for requirements, ARCHITECTURE.md for flow, DB_SCHEMA.md for data models.

---

## Phase 1: Project Setup

**Goal:** Establish a clean, scalable foundation.
**Refer:** ARCHITECTURE.md, SRS.md

### Tasks

* Create `frontend/` and `backend/` folders.
* Initialize Next.js app in frontend.
* Initialize Node.js + Express app in backend.
* Setup TypeScript (recommended) or consistent JavaScript config.
* Configure ESLint + Prettier.
* Add `.env.example` files.
* Setup path aliases.
* Setup shared constants.
* Setup Git branches (`main`, `dev`).
* Configure Vercel deployment.
* Configure Azure backend deployment.

### Deliverable

Project runs locally with frontend and backend connected.

### Commit Suggestion

`chore: initialize frontend backend workspace`

---

## Phase 2: Authentication Module

**Goal:** Secure user access using phone + OTP.
**Refer:** PRD.md, SRS.md, DB_SCHEMA.md, API.md, Security_Checklist.md

### Tasks

* Create auth pages: login, verify OTP, create password.
* Build phone number input with country code support.
* Integrate SMS OTP provider.
* Create API: request OTP.
* Create API: verify OTP.
* Create API: register user.
* Create API: login session.
* Store auth token securely.
* Add protected route middleware.
* Build logout flow.
* Build account deletion flow.
* Build active sessions page.
* Add logout other devices action.

### Deliverable

User can sign in with phone, verify OTP, access app, manage sessions.

### Commit Suggestion

`feat: complete phone otp authentication`

---

## Phase 3: Crypto Module

**Goal:** Ensure client-side privacy.
**Refer:** ARCHITECTURE.md, SRS.md, API.md, Security_Checklist.md

### Tasks

* Install libsodium.
* Generate keypair in browser after registration.
* Derive key from password.
* Encrypt private key before upload/storage.
* Upload public key to backend.
* Save encrypted private key backup.
* Build encrypt message utility.
* Build decrypt message utility.
* Handle wrong password recovery states.
* Cache decrypted private key only in memory/session.
* Clear sensitive state on logout.

### Deliverable

Messages can be encrypted before send and decrypted locally.

### Commit Suggestion

`feat: add client side encryption workflow`

---

## Phase 4: Chat Core Module

**Goal:** Functional realtime private chat.
**Refer:** PRD.md, DB_SCHEMA.md, ARCHITECTURE.md, API.md, Security_Checklist.md, UI.md

### Tasks

* Build chat layout (sidebar + messages + input).
* Search users by phone.
* Create direct chat room.
* Build send message API.
* Build fetch messages API with pagination.
* Integrate Socket.IO server.
* Connect socket client.
* Deliver incoming messages in realtime.
* Add optimistic UI sending state.
* Add typing indicator events.
* Add read receipt update events.
* Add online/offline presence tracking.
* Add last seen timestamps.
* Auto-scroll latest messages.

### Deliverable

Two users can chat in realtime with status indicators.

### Commit Suggestion

`feat: implement realtime direct messaging`

---

## Phase 5: Message Controls

**Goal:** Improve usability and control.
**Refer:** SRS.md, DB_SCHEMA.md, API.md, UI.md

### Tasks

* [x] Add sender edit message action.
* [x] Update ciphertext on edit flow.
* [x] Add delete for everyone action.
* [ ] Add delete for self action (optional).
* [x] Add emoji reaction picker.
* [x] Store reactions in message document.
* [x] Realtime reaction updates.
* [x] Add chat search UI.
* [x] Add message keyword search API (implemented local E2EE search).

### Deliverable

Users can manage and react to messages.

### Commit Suggestion

`feat: add message actions and reactions`

---

## Phase 6: Privacy Module

**Goal:** Ship the main USP features.
**Refer:** PRD.md, SRS.md, ARCHITECTURE.md, Security_Checklist.md, UI.md, API.md

### Tasks

* [x] Add move chat to Vault action.
* [x] Hide vaulted chats from main list.
* [x] Build Vault screen.
* [x] Build unlock with PIN.
* [x] Build unlock with password fallback.
* [x] Hash and verify vault credentials.
* [x] Mark trusted device/session.
* [x] Detect secret panic command.
* [x] Validate sender is trusted.
* [x] Trigger server panic event.
* [x] Lock all active clients instantly.
* [x] Hide notifications UI state.
* [x] Wipe local cached chats.
* [x] Force logout all sessions.
* [x] Build recovery unlock flow.

### Deliverable

Vault and Panic Lock fully demo-ready.

### Commit Suggestion

`feat: add vault and panic lock system`

---

## Phase 7: Self-Destruct Module

**Goal:** Timed disappearing messages.
**Refer:** SRS.md, DB_SCHEMA.md, API.md, UI.md, ARCHITECTURE.md, Security_Checklist.md

### Tasks

* [x] Add timer selector in composer.
* [x] Support presets (10s, 1m, 1h).
* [x] Attach expiry timestamp to message.
* [x] Create cleanup scheduler/job.
* [x] Delete expired messages from database.
* [x] Emit realtime remove event.
* [x] Remove from sender and receiver UI.
* [x] Handle offline user sync after deletion.

### Deliverable

Timed messages disappear automatically.

### Commit Suggestion

`feat: add self destruct messaging`

---

## Phase 8: UI/UX Polish

**Goal:** Make product feel premium.
**Refer:** PRD.md, UI.md, ARCHITECTURE.md

### Tasks

* [x] Add dark mode.
* [x] Improve spacing and typography.
* [x] Add responsive mobile web layout.
* [x] Add skeleton loaders.
* [x] Add empty states.
* [x] Add retry states for failures.
* [x] Improve toast notifications.
* [x] Add smooth animations.
* [x] Improve accessibility labels.
* [x] Optimize perceived performance.

### Deliverable

Clean polished user experience.

### Commit Suggestion

`style: polish ui and responsiveness`

---

## Phase 9: Testing

**Goal:** Remove critical bugs before demo.
**Refer:** All docs

### Tasks

* [x] Test signup/login flow.
* [x] Test invalid OTP cases.
* [x] Test reconnect after refresh.
* [x] Test send/receive chat flow.
* [x] Test presence and typing.
* [x] Test edit/delete flows.
* [x] Test vault lock/unlock.
* [x] Test panic lock from trusted device.
* [x] Test self-destruct expiry.
* [x] Test session logout all devices.
* [x] Test account deletion.
* [x] Cross-browser sanity check.
* [x] Final regression pass.

### Deliverable

Stable demo build.

### Commit Suggestion

`test: validate critical user flows`

---

## Phase 10: Demo Readiness (2-Day Priority)

**Goal:** Ship smartest MVP under deadline.

## Day 1 Priority

1. Project setup
2. Auth flow
3. Chat UI
4. Realtime messaging
5. Presence + receipts
6. Basic deploy

## Day 2 Priority

1. Vault
2. Panic lock
3. Self-destruct
4. Sessions page
5. UI polish
6. Demo script
7. Final bug fixes

---

## Suggested Build Order If Time Runs Out

1. Auth
2. Chat
3. Socket realtime
4. Panic Lock
5. Vault
6. Session management
7. Self-destruct
8. Reactions/Search

---

## Daily Discipline Notes

* Finish one vertical slice at a time.
* Do not overdesign.
* Reuse components.
* Keep security-sensitive code isolated.
* Demoable features > hidden complexity.
* Ship working MVP first, improve later.

---