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

### Security / Encryption

* FR-7: Client generates keypair locally.
* FR-8: Public key stored on server.
* FR-9: Private key encrypted with user password before backup.
* FR-10: Messages encrypted before transmission.
* FR-11: Server stores ciphertext only.

### Messaging

* FR-12: User can send/receive 1:1 messages.
* FR-13: System shows typing state.
* FR-14: System shows read receipts.
* FR-15: System shows presence/last seen.
* FR-16: Sender can edit own message.
* FR-17: Sender can delete own message.
* FR-18: User can react to messages.

### Privacy Features

* FR-19: User can move chat to Vault.
* FR-20: Vault requires PIN or password.
* FR-21: Trusted device/account can trigger Panic Lock using secret code.
* FR-22: Panic Lock locks app, hides notifications, wipes local cache, logs out all devices.

### Self-Destruct

* FR-23: User can send timed message.
* FR-24: Timer starts on send.
* FR-25: On expiry, message removed from clients and server.

## Non-Functional Requirements

* NFR-1: Responsive web UI.
* NFR-2: Secure HTTPS only.
* NFR-3: Average API response <500ms excluding network.
* NFR-4: Basic horizontal scale readiness.
* NFR-5: Maintainable modular codebase.
* NFR-6: Dark mode support.

---