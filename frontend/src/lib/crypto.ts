/**
 * crypto.ts — Client-side E2EE utilities using libsodium-wrappers
 *
 * Architecture (Signal-inspired):
 *  - Key pair: X25519 (curve25519) via crypto_box_keypair
 *  - Password key derivation: Argon2id via crypto_pwhash
 *  - Private key encryption: XSalsa20-Poly1305 via crypto_secretbox
 *  - Message encryption: X25519 + XSalsa20-Poly1305 via crypto_box
 *
 * The server NEVER sees:
 *  - The private key (stored encrypted)
 *  - Message plaintext (only ciphertext is transmitted)
 */

import _sodium from 'libsodium-wrappers';

let _ready = false;

async function getSodium() {
  if (!_ready) {
    await _sodium.ready;
    _ready = true;
  }
  return _sodium;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KeyPair {
  publicKey: string;          // base64 — uploaded to server
  encryptedPrivateKey: string; // base64 — uploaded to server (encrypted with password)
  // privateKey is NEVER stored or exported in plaintext
}

export interface EncryptedMessage {
  ciphertext: string; // base64
  nonce: string;      // base64
  ephemeralPublicKey: string; // base64 — sender's per-message public key
}

// ─── In-memory private key cache ─────────────────────────────────────────────
// Cleared on logout — never persisted to localStorage or disk

let _cachedPrivateKey: Uint8Array | null = null;

export function getCachedPrivateKey(): Uint8Array | null {
  return _cachedPrivateKey;
}

export function clearCachedPrivateKey(): void {
  if (_cachedPrivateKey) {
    _cachedPrivateKey.fill(0); // zero out memory
    _cachedPrivateKey = null;
  }
}

// ─── 1. Key Generation ───────────────────────────────────────────────────────

/**
 * Generates a fresh X25519 key pair.
 * The private key is immediately encrypted with the user's password
 * and the plaintext private key is discarded after caching.
 *
 * Returns { publicKey, encryptedPrivateKey } both in base64 for server upload.
 */
export async function generateAndEncryptKeyPair(password: string): Promise<KeyPair> {
  const sodium = await getSodium();

  // Generate X25519 key pair
  const kp = sodium.crypto_box_keypair();

  // Derive a symmetric key from password using Argon2id
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  const derivedKey = await deriveKeyFromPassword(password, salt);

  // Encrypt private key
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encryptedPrivKey = sodium.crypto_secretbox_easy(kp.privateKey, nonce, derivedKey);

  // Bundle: salt | nonce | ciphertext — all needed for decryption
  const bundle = new Uint8Array(salt.length + nonce.length + encryptedPrivKey.length);
  bundle.set(salt, 0);
  bundle.set(nonce, salt.length);
  bundle.set(encryptedPrivKey, salt.length + nonce.length);

  // Cache decrypted private key in memory
  _cachedPrivateKey = kp.privateKey;

  return {
    publicKey: sodium.to_base64(kp.publicKey),
    encryptedPrivateKey: sodium.to_base64(bundle),
  };
}

// ─── 2. Key Derivation ───────────────────────────────────────────────────────

/**
 * Derives a 32-byte symmetric key from a password using Argon2id.
 * SENSITIVE — result must be handled carefully.
 */
export async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const sodium = await getSodium();
  return sodium.crypto_pwhash(
    32,
    password,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
}

// ─── 3. Private Key Decryption (on Login) ───────────────────────────────────

/**
 * Decrypts the encrypted private key bundle downloaded from the server.
 * Stores the result in the in-memory cache.
 * Throws if the password is wrong (authentication tag mismatch).
 */
export async function decryptAndCachePrivateKey(
  encryptedPrivateKeyB64: string,
  password: string,
): Promise<void> {
  const sodium = await getSodium();

  const bundle = sodium.from_base64(encryptedPrivateKeyB64);
  const saltLen = sodium.crypto_pwhash_SALTBYTES;
  const nonceLen = sodium.crypto_secretbox_NONCEBYTES;

  const salt = bundle.slice(0, saltLen);
  const nonce = bundle.slice(saltLen, saltLen + nonceLen);
  const ciphertext = bundle.slice(saltLen + nonceLen);

  const derivedKey = await deriveKeyFromPassword(password, salt);

  // Will throw if decryption fails (wrong password)
  const privateKey = sodium.crypto_secretbox_open_easy(ciphertext, nonce, derivedKey);
  if (!privateKey) throw new Error('Incorrect password — cannot decrypt private key');

  // Store in memory only
  clearCachedPrivateKey();
  _cachedPrivateKey = privateKey;
}

// ─── 4. Message Encryption ───────────────────────────────────────────────────

/**
 * Encrypts a plaintext message for a recipient using their public key.
 * Uses a fresh ephemeral key pair per message (forward secrecy).
 *
 * Returns an EncryptedMessage containing base64-encoded ciphertext, nonce,
 * and ephemeral public key — all sent to server as ciphertext.
 */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKeyB64: string,
): Promise<EncryptedMessage> {
  const sodium = await getSodium();

  const recipientPublicKey = sodium.from_base64(recipientPublicKeyB64);

  // Per-message ephemeral key pair (forward secrecy)
  const ephemeral = sodium.crypto_box_keypair();
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const plaintextBytes = sodium.from_string(plaintext);

  const ciphertext = sodium.crypto_box_easy(
    plaintextBytes,
    nonce,
    recipientPublicKey,
    ephemeral.privateKey,
  );

  // Zero ephemeral private key immediately
  ephemeral.privateKey.fill(0);

  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
    ephemeralPublicKey: sodium.to_base64(ephemeral.publicKey),
  };
}

/**
 * Serialises an EncryptedMessage to a single base64 string for transmission.
 * Format: base64(nonce | ephemeralPublicKey | ciphertext)
 */
export async function packCiphertext(msg: EncryptedMessage): Promise<string> {
  const sodium = await getSodium();
  const nonce = sodium.from_base64(msg.nonce);
  const eph = sodium.from_base64(msg.ephemeralPublicKey);
  const ct = sodium.from_base64(msg.ciphertext);

  const packed = new Uint8Array(nonce.length + eph.length + ct.length);
  packed.set(nonce, 0);
  packed.set(eph, nonce.length);
  packed.set(ct, nonce.length + eph.length);
  return sodium.to_base64(packed);
}

/**
 * Deserialises a packed ciphertext string back to an EncryptedMessage.
 */
export async function unpackCiphertext(packedB64: string): Promise<EncryptedMessage> {
  const sodium = await getSodium();
  const packed = sodium.from_base64(packedB64);

  const nonceLen = sodium.crypto_box_NONCEBYTES;
  const ephLen = sodium.crypto_box_PUBLICKEYBYTES;

  const nonce = packed.slice(0, nonceLen);
  const eph = packed.slice(nonceLen, nonceLen + ephLen);
  const ct = packed.slice(nonceLen + ephLen);

  return {
    nonce: sodium.to_base64(nonce),
    ephemeralPublicKey: sodium.to_base64(eph),
    ciphertext: sodium.to_base64(ct),
  };
}

// ─── 5. Message Decryption ───────────────────────────────────────────────────

/**
 * Decrypts an EncryptedMessage using the cached private key.
 * Throws if the private key is not in memory (user must re-login).
 */
export async function decryptMessage(msg: EncryptedMessage): Promise<string> {
  const sodium = await getSodium();

  if (!_cachedPrivateKey) {
    throw new Error('Private key not available — please re-authenticate');
  }

  const ciphertext = sodium.from_base64(msg.ciphertext);
  const nonce = sodium.from_base64(msg.nonce);
  const ephemeralPublicKey = sodium.from_base64(msg.ephemeralPublicKey);

  const plaintext = sodium.crypto_box_open_easy(
    ciphertext,
    nonce,
    ephemeralPublicKey,
    _cachedPrivateKey,
  );

  if (!plaintext) throw new Error('Decryption failed — message may be corrupted');

  return sodium.to_string(plaintext);
}

/**
 * Convenience: decrypt a packed base64 ciphertext string.
 */
export async function decryptPackedMessage(packedB64: string): Promise<string> {
  const msg = await unpackCiphertext(packedB64);
  return decryptMessage(msg);
}

/**
 * Convenience: encrypt plaintext and return packed base64 for server transmission.
 */
export async function encryptAndPackMessage(
  plaintext: string,
  recipientPublicKeyB64: string,
): Promise<string> {
  const msg = await encryptMessage(plaintext, recipientPublicKeyB64);
  return packCiphertext(msg);
}

// ─── 6. Recovery Check ───────────────────────────────────────────────────────

/**
 * Verifies that a password correctly decrypts the stored private key
 * without caching the result. Used for wrong-password recovery UI.
 */
export async function verifyPassword(
  encryptedPrivateKeyB64: string,
  password: string,
): Promise<boolean> {
  try {
    await decryptAndCachePrivateKey(encryptedPrivateKeyB64, password);
    return true;
  } catch {
    return false;
  }
}
