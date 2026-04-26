## regular updates needed - If any change in Implemneted API, update this doc

# API_ENDPOINTS.md

## Base URL

`/api/v1`

## Auth

### POST /auth/request-otp

Request:

```json
{ "phone": "+911234567890" }
```

Response:

```json
{ "success": true, "message": "OTP sent" }
```

### POST /auth/verify-otp

Request:

```json
{ "phone": "+911234567890", "otp": "123456" }
```

Response:

```json
{ "verified": true, "tempToken": "jwt-temp" }
```

### POST /auth/register

Request:

```json
{
  "phone": "+911234567890",
  "name": "Aye",
  "password": "secret",
  "publicKey": "base64",
  "encryptedPrivateKey": "base64"
}
```

Response:

```json
{ "success": true, "token": "jwt" }
```

### POST /auth/login

Request:

```json
{ "phone": "+911234567890", "password": "secret" }
```

Response:

```json
{ "success": true, "token": "jwt", "user": {} }
```

### POST /auth/logout

Response:

```json
{ "success": true }
```

### DELETE /auth/account

Response:

```json
{ "success": true }
```

## Sessions

### GET /sessions

Response:

```json
[{ "id":"1", "deviceName":"Chrome", "active":true, "trusted":true }]
```

### POST /sessions/:id/logout

Response:

```json
{ "success": true }
```

### POST /sessions/logout-all

Response:

```json
{ "success": true }
```

## Users

### GET /users/search?phone=1234

Response:

```json
[{ "id":"u1", "name":"User" }]
```

## Chats

### POST /chats

Request:

```json
{ "memberId": "u2" }
```

Response:

```json
{ "chatId": "c1" }
```

### GET /chats

Response:

```json
[{ "id":"c1", "lastMessage":{}, "unreadCount":0 }]
```

### GET /chats/:id/messages?page=1

Response:

```json
[{ "id":"m1", "ciphertext":"..." }]
```

## Messages

### POST /messages

Request:

```json
{
  "chatId":"c1",
  "ciphertext":"base64",
  "selfDestructAt": null
}
```

Response:

```json
{ "id":"m1", "status":"sent" }
```

### PATCH /messages/:id

Request:

```json
{ "ciphertext":"new-base64" }
```

Response:

```json
{ "success": true }
```

### DELETE /messages/:id

Response:

```json
{ "success": true }
```

### POST /messages/:id/react

Request:

```json
{ "emoji":"🔥" }
```

Response:

```json
{ "success": true }
```

## Privacy

### POST /vault/unlock

Request:

```json
{ "pin":"1234" }
```

Response:

```json
{ "success": true }
```

### POST /vault/move-chat

Request:

```json
{ "chatId":"c1" }
```

Response:

```json
{ "success": true }
```

### POST /panic/trigger

Request:

```json
{ "secretCode":"#LOCK-4821" }
```

Response:

```json
{ "success": true }
```
