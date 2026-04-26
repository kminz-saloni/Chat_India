import crypto from 'crypto';

/**
 * Generates a 6-digit OTP code.
 */
export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Hashes an OTP code using SHA-256.
 */
export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Hashes an IP address using SHA-256.
 */
export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Parses the User-Agent string for basic browser/device info.
 */
export function parseUserAgent(ua: string = ''): { browser: string; deviceName: string } {
  const lower = ua.toLowerCase();
  let browser = 'Unknown Browser';
  if (lower.includes('chrome')) browser = 'Chrome';
  else if (lower.includes('firefox')) browser = 'Firefox';
  else if (lower.includes('safari')) browser = 'Safari';
  else if (lower.includes('edge')) browser = 'Edge';

  let deviceName = 'Desktop';
  if (lower.includes('mobile')) deviceName = 'Mobile';
  else if (lower.includes('tablet')) deviceName = 'Tablet';

  return { browser, deviceName };
}
