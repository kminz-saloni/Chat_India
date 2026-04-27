# Message Encryption Lifecycle Fix - Complete Implementation

## Problem Statement
Sent messages displayed `[Encrypted]` placeholder after page refresh because the application only encrypted messages with the recipient's public key, making it impossible for senders to decrypt their own messages after losing the plaintext cache during page refresh.

### Root Cause Analysis
1. **Single Encryption Model**: Messages encrypted only with recipient's public key
2. **Sender Cannot Decrypt**: Sender's private key cannot decrypt recipient-encrypted messages
3. **Cache Dependency**: Plaintext only stored in browser memory cache (lost on refresh)
4. **No Distinction Logic**: Frontend didn't differentiate between own vs received messages for decryption
5. **Missing Status Tracking**: No "delivered" status checkpoint between "sent" and "read"

---

## Solution Architecture: Dual-Encryption Model

### Encryption Strategy
Each message is encrypted **twice**:

1. **ciphertext** (Recipient's Copy)
   - Plaintext encrypted with **recipient's public key**
   - Only recipient can decrypt (with their private key)
   - Used for: secure message transmission to recipient

2. **senderCiphertext** (Sender's Copy)
   - Plaintext encrypted with **sender's own public key**
   - Only sender can decrypt (with their own private key)
   - Used for: sender to read their own messages after refresh

### Status Lifecycle
```
sent → [recipient joins chat] → delivered → [recipient reads message] → read
```

- **sent**: Message stored in backend, not yet delivered
- **delivered**: Recipient has joined chat/app and received message
- **read**: Recipient has explicitly read the message

---

## Implementation Details

### Backend Changes

#### 1. Message Model (backend/src/models/Message.ts)
```typescript
interface IMessage {
  chatId: ObjectId;
  senderId: ObjectId;
  ciphertext: string;           // Recipient's encrypted copy
  senderCiphertext?: string;    // Sender's encrypted copy (NEW)
  status: 'sent' | 'delivered' | 'read';
  createdAt: Date;
  // ... other fields
}

// Schema
const MessageSchema = new Schema({
  ciphertext: { type: String, required: true },
  senderCiphertext: { type: String },  // NEW - Sender's own encrypted copy
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read'], 
    default: 'sent' 
  },
  // ... other fields
});
```

#### 2. Chat Controller (backend/src/controllers/chatController.ts)
```typescript
export async function sendMessage(req: AuthRequest, res: Response) {
  const { chatId, ciphertext, senderCiphertext, selfDestructAt } = req.body;
  
  const message = await Message.create({
    chatId,
    senderId: req.user!.id,
    ciphertext,           // Recipient's copy
    senderCiphertext: senderCiphertext ?? undefined,  // Sender's copy (NEW)
    status: 'sent',
    selfDestructAt,
  });
  
  // Emit to all chat members
  emitNewMessage(getIO(), chatId, message);
  res.json({ message });
}
```

#### 3. Socket Handlers (backend/src/socket/handlers.ts)
```typescript
// NEW: Delivery Receipt Handler
socket.on('receipt:delivered', async (data: { chatId: string; messageIds: string[] }) => {
  const { chatId, messageIds } = data;
  
  // Update message status: sent → delivered
  await Message.updateMany(
    { _id: { $in: messageIds }, chatId, senderId: { $ne: userId }, status: 'sent' },
    { status: 'delivered' }
  );
  
  // Notify senders about delivery
  socket.to(`chat:${chatId}`).emit('receipt:delivered', { 
    chatId, 
    messageIds, 
    deliveredTo: userId 
  });
});
```

### Frontend Changes

#### 1. Message Interface (frontend/src/app/chat/page.tsx)
```typescript
export interface Message {
  _id: string;
  chatId: string;
  senderId: string;
  ciphertext: string;
  senderCiphertext?: string;  // NEW
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  deleted: boolean;
  edited: boolean;
  selfDestructAt?: string;
}
```

#### 2. Dual Encryption on Send (frontend/src/app/chat/page.tsx)
```typescript
async function handleSendMessage(plaintext: string, expirySeconds?: number) {
  const { encryptAndPackMessage } = await import('@/lib/crypto');
  
  // Encrypt for recipient (only they can decrypt)
  const ciphertext = await encryptAndPackMessage(plaintext, activeContact.publicKey);
  
  // NEW: Encrypt for sender (they can decrypt after refresh)
  const senderCiphertext = await encryptAndPackMessage(plaintext, user.publicKey);
  
  // Send both to backend
  const data = await apiRequest('/messages', {
    method: 'POST',
    body: { 
      chatId: activeChatId, 
      ciphertext,           // Recipient's copy
      senderCiphertext,     // Sender's copy (NEW)
      selfDestructAt 
    },
  });
}
```

#### 3. Conditional Decryption on Receive (frontend/src/app/chat/page.tsx)
```typescript
// NEW: Socket listener for incoming messages
onEvent<Message>('message:new', (msg) => {
  if (msg.chatId === activeChatId) {
    // Add message to UI
    setMessages((prev) => [...prev, msg]);
    
    // NEW: Send delivery receipt if not own message
    if (msg.senderId !== user?.id) {
      sendDeliveryReceipt(msg.chatId, [msg._id]);
    }
    
    // Decrypt with proper key
    if (cryptoReady) {
      // NEW: Use senderCiphertext for own messages, regular ciphertext for others
      const ciphertextToDecode = msg.senderId === user?.id 
        ? msg.senderCiphertext 
        : msg.ciphertext;
      
      decrypt(ciphertextToDecode || msg.ciphertext)
        .then((pt) => setDecryptedCache((c) => ({ ...c, [msg._id]: pt })))
        .catch(() => setDecryptedCache((c) => ({ ...c, [msg._id]: '[Encrypted]' })));
    }
  }
});
```

#### 4. Conditional Decryption on Load (frontend/src/app/chat/page.tsx)
```typescript
async function openChat(chat: ChatItem) {
  const data = await apiRequest<{ messages: Message[] }>(`/chats/${chat._id}/messages?page=1`);
  
  // NEW: Decrypt with conditional logic
  const pairs = await Promise.all(
    data.messages.map(async (m) => {
      try {
        // NEW: Use senderCiphertext for sent messages, ciphertext for received
        const ciphertextToDecode = m.senderId === user?.id 
          ? m.senderCiphertext 
          : m.ciphertext;
        
        const pt = await decrypt(ciphertextToDecode || m.ciphertext);
        return [m._id, pt] as const;
      } catch {
        return [m._id, '[Encrypted]'] as const;
      }
    })
  );
  setDecryptedCache(Object.fromEntries(pairs));
}
```

#### 5. Delivery Receipt Tracking (frontend/src/hooks/useSocket.ts)
```typescript
// NEW: Emit delivery receipt when message arrives
const sendDeliveryReceipt = useCallback((chatId: string, messageIds: string[]) => {
  socketRef.current?.emit('receipt:delivered', { chatId, messageIds });
}, []);

return {
  // ... other functions
  sendDeliveryReceipt,  // NEW
  sendReadReceipt,      // Existing
};
```

#### 6. Receipt Event Handlers (frontend/src/app/chat/page.tsx)
```typescript
// NEW: Handle delivery receipts
const offDelivered = onEvent<{ chatId: string; messageIds: string[] }>('receipt:delivered', ({ chatId, messageIds }) => {
  if (chatId === activeChatId) {
    setMessages((prev) =>
      prev.map((m) => {
        if (!messageIds.includes(m._id)) return m;
        // Only transition from 'sent' to 'delivered', don't downgrade from 'read'
        return m.status === 'sent' ? { ...m, status: 'delivered' } : m;
      })
    );
  }
});

// Existing: Handle read receipts (updated for status)
const offReceipt = onEvent<{ chatId: string; messageIds: string[] }>('receipt:read', ({ chatId, messageIds }) => {
  if (chatId === activeChatId) {
    setMessages((prev) =>
      prev.map((m) => (messageIds.includes(m._id) ? { ...m, status: 'read' } : m))
    );
  }
});
```

---

## Complete Message Lifecycle Flow

### 1. Sender Creates Message
```
User Input: "Hello"
           ↓
      Encrypt with recipient key → ciphertext (only recipient can read)
      Encrypt with sender key → senderCiphertext (sender can read)
           ↓
      Send POST /messages { ciphertext, senderCiphertext }
           ↓
      Optimistic UI update + store plaintext in cache
```

### 2. Backend Receives & Stores
```
POST /messages received
           ↓
      Validate auth + chat membership
           ↓
      Create Message({ ciphertext, senderCiphertext, status: 'sent' })
           ↓
      Emit message:new socket event to all chat members
```

### 3. Recipient Receives Message
```
Socket event: message:new
           ↓
      Check if message is own (senderId !== currentUserId)
           ↓
      YES: Use ciphertext to decrypt (recipient can read it)
      NO: Use senderCiphertext to decrypt (sender reads own message)
           ↓
      Emit receipt:delivered to sender
           ↓
      Update UI with plaintext
```

### 4. Sender Sees Delivery Confirmation
```
Socket event: receipt:delivered
           ↓
      Update message status: sent → delivered
           ↓
      UI shows double gray checkmark
```

### 5. On Page Refresh - Sender Still Sees Message
```
Browser refresh
           ↓
      Fetch messages from backend
           ↓
      For each message where senderId === currentUserId:
        Decrypt using senderCiphertext (with cached private key)
           ↓
      Message appears (no [Encrypted] placeholder!)
```

### 6. Recipient Reads Message
```
Recipient clicks message / stays in chat
           ↓
      Auto-emit receipt:read to sender
           ↓
      Backend updates status: delivered → read
           ↓
      Socket event updates sender's UI
```

---

## Security Properties

### Encryption Guarantees
- **Confidentiality**: Only sender and recipient can read messages
  - Recipient cannot decrypt senderCiphertext (would need sender's private key)
  - Sender cannot decrypt ciphertext (would need recipient's private key)
  - Third parties cannot decrypt anything (don't have the keys)

- **Authentication**: Every message tied to sender via JWT + Session
  - Socket auth validates session before message receive
  - Backend validates sender identity on message create

- **Status Integrity**: Only recipient can acknowledge delivery/read
  - Backend validates `senderId !== userId` before processing receipts
  - Sender cannot mark own messages as delivered/read

### Privacy Properties
- No plaintext ever sent to backend
- Backend never sees plaintext (only ciphertexts)
- Ciphertexts appear random/safe (XSalsa20-Poly1305 AEAD)
- After refresh, plaintext recovered from senderCiphertext locally

---

## Status Build Information

```
✓ Frontend builds successfully (Next.js 16.2.4)
✓ Backend builds successfully (TypeScript)
✓ All type definitions aligned
✓ Socket event handlers implemented
✓ Message model migration complete
```

### Files Modified Summary
**Backend (2 files)**
- `src/models/Message.ts` - Added senderCiphertext field
- `src/controllers/chatController.ts` - Accept & store senderCiphertext
- `src/socket/handlers.ts` - receipt:delivered event handler

**Frontend (2 files)**
- `src/app/chat/page.tsx` - Dual encryption, conditional decryption, receipt handling
- `src/hooks/useSocket.ts` - sendDeliveryReceipt function

---

## Testing Verification Checklist

- [ ] Send message as User A to User B
- [ ] Message appears on User B's device with plaintext
- [ ] User A can refresh page and still see plaintext
- [ ] User B reacts/joins chat → delivery status changes to "delivered"
- [ ] User B opens message → status changes to "read"
- [ ] User A sees checkmark progression: ✓ → ✓✓ (gray) → ✓✓ (blue)
- [ ] Test across multiple tabs/devices for same user
- [ ] Test panic lock - all sessions disconnect properly
- [ ] Verify no `[Encrypted]` placeholders appear

---

## Future Enhancements

1. **Message Editing**: Encrypt edited text same way (new ciphertext + senderCiphertext)
2. **Message Deletion**: Securely wipe both ciphertexts
3. **Reactions/Replies**: Link to encrypted message ID
4. **Read Receipts**: Show which contacts have read (with privacy respect)
5. **Self-Destruct**: Auto-purge messages after timeout (both copies)

