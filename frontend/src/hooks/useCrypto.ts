/**
 * useCrypto — convenience hook exposing crypto utilities tied to the AuthContext.
 *
 * Usage:
 *   const { encrypt, decrypt, decryptPacked, ready } = useCrypto();
 */

import { useAuth } from '@/context/AuthContext';
import {
  encryptAndPackMessage,
  decryptPackedMessage,
  encryptMessage,
  decryptMessage,
  type EncryptedMessage,
} from '@/lib/crypto';

export function useCrypto() {
  const { cryptoReady, user } = useAuth();

  /**
   * Encrypts plaintext for a recipient's public key.
   * Returns a packed base64 ciphertext ready for the server.
   */
  async function encrypt(plaintext: string, recipientPublicKeyB64: string): Promise<string> {
    if (!cryptoReady) throw new Error('Crypto not ready — please unlock');
    return encryptAndPackMessage(plaintext, recipientPublicKeyB64);
  }

  /**
   * Decrypts a packed base64 ciphertext from the server.
   */
  async function decrypt(packedCiphertext: string): Promise<string> {
    if (!cryptoReady) throw new Error('Crypto not ready — please unlock');
    return decryptPackedMessage(packedCiphertext);
  }

  /**
   * Encrypts plaintext for the current user's own public key.
   * Useful for self-sent messages (sender's copy).
   */
  async function encryptForSelf(plaintext: string): Promise<string> {
    if (!cryptoReady) throw new Error('Crypto not ready — please unlock');
    if (!user?.publicKey) throw new Error('No public key available');
    return encryptAndPackMessage(plaintext, user.publicKey);
  }

  /**
   * Low-level: encrypt and return structured EncryptedMessage.
   */
  async function encryptRaw(plaintext: string, recipientPublicKeyB64: string): Promise<EncryptedMessage> {
    if (!cryptoReady) throw new Error('Crypto not ready — please unlock');
    return encryptMessage(plaintext, recipientPublicKeyB64);
  }

  /**
   * Low-level: decrypt a structured EncryptedMessage.
   */
  async function decryptRaw(msg: EncryptedMessage): Promise<string> {
    if (!cryptoReady) throw new Error('Crypto not ready — please unlock');
    return decryptMessage(msg);
  }

  return {
    ready: cryptoReady,
    encrypt,
    decrypt,
    encryptForSelf,
    encryptRaw,
    decryptRaw,
  };
}
