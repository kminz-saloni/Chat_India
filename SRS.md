# SRS.md

## Software Requirements Specification

## Functional Requirements

### Authentication

* FR-1: User registers using phone number.
* FR-2: System sends SMS OTP.
* FR-3: User logs in after OTP verification.
* FR-4: User can delete account.
* FR-5: User can view active sessions.
* FR-6: User can logout other sessions.
* FR-7: User session persists across page refreshes — password not required to stay logged in until session expires, user logs out, or panic lock is triggered.
* FR-8: Derived decryption key stored in sessionStorage for seamless session recovery (cleared when browser tab closes or user logs out).

### Security / Encryption

* FR-9: Client generates keypair locally.
* FR-10: Public key stored on server.
* FR-11: Private key encrypted with user password before backup.
* FR-12: Messages encrypted before transmission.
* FR-13: Server stores ciphertext only.

### Messaging

* FR-14: User can send/receive 1:1 messages.
* FR-15: System shows typing state.
* FR-16: System shows read receipts.
* FR-17: System shows presence/last seen.
* FR-18: Sender can edit own message.
* FR-19: Sender can delete own message.
* FR-20: User can react to messages.

### Privacy Features

* FR-21: User can move chat to Vault.
* FR-22: Vault requires PIN or password.
* FR-23: Trusted device/account can trigger Panic Lock using secret code.
* FR-24: Panic Lock locks app, hides notifications, wipes local cache, logs out all devices.
* FR-28: User can configure a panic secret phrase from settings.
* FR-29: Any authenticated chat participant who sends the exact panic phrase can trigger panic lock for the recipient.
* FR-30: Presence state in chat list must be server-authoritative and consistent after reconnects.

### Self-Destruct

* FR-25: User can send timed message.
* FR-26: Timer starts on send.
* FR-27: On expiry, message removed from clients and server.

## Non-Functional Requirements

* NFR-1: Responsive web UI.
* NFR-2: Secure HTTPS only.
* NFR-3: Average API response <500ms excluding network.
* NFR-4: Basic horizontal scale readiness.
* NFR-5: Maintainable modular codebase.
* NFR-6: Dark mode support.

---