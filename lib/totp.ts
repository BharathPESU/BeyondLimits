import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decode an RFC 4648 Base32 string into a Buffer.
 */
export function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${clean[i]}`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Generate a 6-digit TOTP code (RFC 6238) for a given Base32 secret.
 * @param secretBase32 The Base32-encoded secret key
 * @param timeOffsetSteps Offset in 30-second steps (e.g. -1 for previous 30s, +1 for next 30s)
 */
export function generateTOTP(
  secretBase32: string,
  timeOffsetSteps: number = 0,
  digits: number = 6,
  periodSec: number = 30
): string {
  const secretKey = base32Decode(secretBase32);
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / periodSec) + timeOffsetSteps;

  const timeBuf = Buffer.alloc(8);
  timeBuf.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', secretKey).update(timeBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

/**
 * Verify a 6-digit TOTP code against the secret.
 * Allows a +/- 1 step window (i.e. +/- 30 seconds) to account for slight clock drift.
 */
export function verifyTOTP(
  token: string,
  secretBase32: string,
  windowSteps: number = 1
): boolean {
  if (!token || !secretBase32) return false;
  const cleanToken = token.trim().replace(/\s+/g, '');
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
    return false;
  }

  try {
    for (let offset = -windowSteps; offset <= windowSteps; offset++) {
      if (generateTOTP(secretBase32, offset) === cleanToken) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Format a 32-character secret into 4-character blocks for easy reading in Microsoft Authenticator.
 * e.g. "BEYO NDLI MITS MFAA DMIN KEY2 3456 7AB"
 */
export function formatSecretForDisplay(secret: string): string {
  const clean = secret.replace(/\s+/g, '').toUpperCase();
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    chunks.push(clean.slice(i, i + 4));
  }
  return chunks.join(' ');
}

/**
 * Generate an otpauth:// URI that Microsoft Authenticator and Google Authenticator can import.
 */
export function generateOtpAuthUri(options: {
  issuer: string;
  account: string;
  secret: string;
}): string {
  const issuer = encodeURIComponent(options.issuer);
  const account = encodeURIComponent(options.account);
  const secret = options.secret.replace(/\s+/g, '').toUpperCase();
  return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}
