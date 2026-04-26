# Chat-India Demo Script

This script provides a step-by-step walkthrough to showcase the core features and premium user experience of the Chat-India platform. Follow this guide during your live presentation.

## Setup Requirements
1. Open two browser windows (e.g., Chrome and Edge, or an incognito window).
2. Have the backend server running locally or deployed.
3. Have the frontend running locally or deployed.
4. Have the development terminal open in the background to show the `[DEV] OTP` logs.

---

## Act 1: Onboarding & Authentication
**Goal: Showcase the secure, passwordless-like signup flow and key generation.**

1. **Sign Up (Browser 1):**
   - Navigate to `/auth/register`.
   - Enter a phone number (e.g., `9999999999`), Name ("Alice"), and a strong password.
   - Click **Register**.
   - *Talking Point:* "All user accounts are tied to a verified phone number for identity, with an additional password layer for access control."
   
2. **Key Generation & E2EE Initialization:**
   - Notice the brief processing state. 
   - *Talking Point:* "Behind the scenes, we are generating an Ed25519 keypair for End-to-End Encryption right in the browser. The private key is encrypted with the user's password before being stored, meaning we never have access to their raw private key."

3. **Sign Up (Browser 2):**
   - Repeat the process for a second user ("Bob") with a different phone number (e.g., `8888888888`).

---

## Act 2: Real-time Encrypted Messaging
**Goal: Demonstrate socket-based messaging, presence, and E2EE in action.**

1. **Start a Chat:**
   - In Alice's window, click **New Chat** (or select Bob if listed).
   - Enter Bob's phone number to initiate the conversation.
   
2. **Messaging & Presence:**
   - **Type a message:** Start typing in Alice's window. Watch Bob's window to see the real-time "typing..." indicator.
   - **Send:** Send the message. Notice it instantly appears in Bob's window.
   - *Talking Point:* "All messages are encrypted on the client side using the recipient's public key. The server only sees ciphertext. We also feature real-time presence and typing indicators."

3. **Message Interaction:**
   - Hover over a sent message. Click the **Edit** button, modify the text, and hit Enter. Watch it update live for both users with an "(edited)" tag.
   - Click the **Reaction** button to add an emoji.
   - Click the **Delete** button to remove the message for everyone.

---

## Act 3: Privacy & Security Features
**Goal: Highlight the unique privacy mechanisms that set Chat-India apart.**

1. **The Vault:**
   - In Alice's window, click the **🔐 Vault** button on the sidebar.
   - You will be prompted to set up a PIN. Enter `1234`.
   - Hover over the chat with Bob in the sidebar and click **Move to Vault**.
   - The chat disappears from the main list.
   - *Talking Point:* "The Vault allows users to hide sensitive conversations behind an additional PIN code. These chats are excluded from the main view and require active authentication to access."

2. **Self-Destruct Messages:**
   - Inside the Vault (or a regular chat), type a message. Before sending, click the ⏱️ (timer) icon to set a self-destruct timer (e.g., 1 minute).
   - Send the message.
   - *Talking Point:* "Users can send ephemeral messages that automatically delete themselves from both devices and the server after the specified duration."

---

## Act 4: The Panic Lock & Session Management
**Goal: Demonstrate extreme security measures for compromised situations.**

1. **Session Management:**
   - Navigate Alice to `/settings/sessions`.
   - *Talking Point:* "Users have full visibility into every active session, including device and browser details. They can remotely revoke access to any unrecognized device instantly."

2. **Panic Lock:**
   - Go back to the Chat view.
   - Click the **⚠️ Panic Lock** button on the sidebar.
   - *What happens:* You will be immediately logged out.
   - Try to log back in with Alice's credentials. You will be blocked.
   - *Talking Point:* "In an emergency, the Panic Lock instantly terminates all active sessions across all devices and locks the account to prevent unauthorized access. The account can only be unlocked via a secure recovery process through support."

---

## Conclusion
* "Chat-India is a premium, privacy-first messaging platform. It combines the sleek, responsive UI expected of modern apps with military-grade end-to-end encryption and advanced security features like The Vault and Panic Lock."
