import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export const ADMIN_COOKIE_NAME = 'beyondlimits_admin_session';
const SESSION_MAX_AGE_SEC = 24 * 60 * 60; // 24 hours

export interface AdminSessionData {
  username: string;
  role: 'admin';
  createdAt: number;
  expiresAt: number;
}

function getSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    'c8d9e2f4a1b3c5e7f9a0b2d4e6f8a1c3e5b7d9f1a3c5e7b9'
  );
}

function base64UrlEncode(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  return Buffer.from(str, 'utf8').toString('base64url');
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  if (typeof atob !== 'undefined') {
    return decodeURIComponent(escape(atob(padded)));
  }
  return Buffer.from(str, 'base64url').toString('utf8');
}

async function hmacSha256(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const sigBytes = new Uint8Array(sigBuf);
  let binary = '';
  for (let i = 0; i < sigBytes.length; i++) {
    binary += String.fromCharCode(sigBytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Sign an admin session payload and return a secure cookie string.
 */
export async function signAdminSession(username: string): Promise<string> {
  const payload: AdminSessionData = {
    username,
    role: 'admin',
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_MAX_AGE_SEC * 1000,
  };

  const jsonStr = JSON.stringify(payload);
  const dataB64 = base64UrlEncode(jsonStr);
  const hmac = await hmacSha256(dataB64, getSessionSecret());

  return `${dataB64}.${hmac}`;
}

/**
 * Verify an admin session cookie token. Returns the session payload if valid, or null.
 */
export async function verifyAdminSessionToken(
  token: string | undefined
): Promise<AdminSessionData | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [dataB64, signature] = parts;
  try {
    const expectedSig = await hmacSha256(dataB64, getSessionSecret());
    if (signature !== expectedSig) {
      return null;
    }

    const jsonStr = base64UrlDecode(dataB64);
    const session: AdminSessionData = JSON.parse(jsonStr);

    if (session.role !== 'admin' || Date.now() > session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Verify admin session from a NextRequest in middleware or route handlers.
 */
export async function isAdminAuthenticatedRequest(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSessionToken(cookie);
  return session !== null;
}

/**
 * Check admin authentication in Next.js Server Components.
 */
export async function getAdminServerSession(): Promise<AdminSessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
}
