# DB_SCHEMA.md

## users

```json
{
  _id,
  phone,
  name,
  passwordHash,
  publicKey,
  encryptedPrivateKey,
  vaultPinHash,
  createdAt,
  deletedAt
}
```

## chats

```json
{
  _id,
  type: "direct",
  members: [userId1, userId2],
  vaultEnabledFor: [userIds],
  createdAt,
  updatedAt
}
```

## messages

```json
{
  _id,
  chatId,
  senderId,
  ciphertext,
  edited: false,
  deleted: false,
  reactions: [{userId, emoji}],
  selfDestructAt,
  status: "sent|delivered|read",
  createdAt,
  updatedAt
}
```

## sessions

```json
{
  _id,
  userId,
  deviceName,
  browser,
  ipHash,
  lastActive,
  active,
  trusted
}
```

## otp_requests

```json
{
  phone,
  codeHash,
  expiresAt,
  attempts
}
```

## Indexes

* users.phone unique
* messages.chatId + createdAt
* sessions.userId
* chats.members
* messages.selfDestructAt TTL worker-assisted
