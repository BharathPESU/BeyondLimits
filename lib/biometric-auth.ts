/**
 * Biometric & Screen Lock Authentication Service
 * 
 * Supports:
 * 1. Native Android BiometricPrompt via AndroidBiometricBridge (APK)
 * 2. WebAuthn / FIDO2 User Verification and Clerk Passkeys (Browsers)
 * 3. Secure App PIN / Passcode fallback (4-6 digits, SHA-256 hashed)
 */

interface AndroidBiometricBridgeInterface {
  isAvailable: () => boolean;
  authenticate: (title: string, subtitle: string) => void;
}

declare global {
  interface Window {
    AndroidBiometricBridge?: AndroidBiometricBridgeInterface;
    __onAndroidBiometricResult?: (result: { success: boolean; error?: string }) => void;
  }
}

// Convert a string to an ArrayBuffer for WebAuthn user ID
function strToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const uint8 = encoder.encode(str);
  const buffer = new ArrayBuffer(uint8.byteLength);
  new Uint8Array(buffer).set(uint8);
  return buffer;
}

// Convert ArrayBuffer to URL-safe Base64 string (Standard WebAuthn format)
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Convert URL-safe Base64 string back to ArrayBuffer
function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Checks if the current device/browser supports platform biometrics
 * (Native Android BiometricPrompt, Fingerprint, Face ID, Windows Hello, WebAuthn)
 */
export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Native Android APK Biometric Bridge
  if (window.AndroidBiometricBridge && typeof window.AndroidBiometricBridge.isAvailable === 'function') {
    try {
      return window.AndroidBiometricBridge.isAvailable();
    } catch {
      return true;
    }
  }

  // 2. Browser WebAuthn Platform Authenticator
  try {
    if (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Checks if running inside the native Android APK wrapper
 */
export function isNativeAndroidApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.AndroidBiometricBridge;
}

const STORAGE_KEY_ENABLED = 'beyondlimits_biometric_lock_enabled';
const STORAGE_KEY_UNLOCKED = 'beyondlimits_biometric_unlocked';
const STORAGE_KEY_LAST_ACTIVE = 'beyondlimits_biometric_last_active';
const STORAGE_KEY_LOCAL_CRED_ID = 'beyondlimits_local_biometric_cred_id';
const STORAGE_KEY_APP_PIN = 'beyondlimits_app_security_pin';

/**
 * Returns whether biometric lock is enabled on this device
 */
export function isBiometricLockEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(STORAGE_KEY_ENABLED);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Sets whether biometric lock is enabled on this device
 */
export function setBiometricLockEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ENABLED, enabled ? 'true' : 'false');
    if (!enabled) {
      sessionStorage.removeItem(STORAGE_KEY_UNLOCKED);
    }
  } catch {}
}

/**
 * Returns whether the current tab session has been unlocked with biometrics
 */
export function isSessionUnlocked(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return sessionStorage.getItem(STORAGE_KEY_UNLOCKED) === 'true';
  } catch {
    return true;
  }
}

/**
 * Marks the current session as unlocked or locked
 */
export function setSessionUnlocked(unlocked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (unlocked) {
      sessionStorage.setItem(STORAGE_KEY_UNLOCKED, 'true');
      sessionStorage.setItem(STORAGE_KEY_LAST_ACTIVE, Date.now().toString());
    } else {
      sessionStorage.removeItem(STORAGE_KEY_UNLOCKED);
    }
  } catch {}
}

/**
 * SHA-256 PIN Hashing
 */
async function hashPin(pin: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(`beyondlimits_salt_pin_${pin.trim()}`);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  return `fallback_${pin.trim()}`;
}

/**
 * Returns whether a security PIN is configured
 */
export function hasAppPin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !!localStorage.getItem(STORAGE_KEY_APP_PIN);
  } catch {
    return false;
  }
}

/**
 * Saves a new security PIN
 */
export async function setAppPin(pin: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!pin || pin.trim().length < 4) return false;
  try {
    const hashed = await hashPin(pin.trim());
    localStorage.setItem(STORAGE_KEY_APP_PIN, hashed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifies an entered PIN against the stored hash
 */
export async function verifyAppPin(pin: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_APP_PIN);
    if (!stored) return false;
    const inputHashed = await hashPin(pin.trim());
    if (inputHashed === stored) {
      setSessionUnlocked(true);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Removes the configured security PIN
 */
export function removeAppPin(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_APP_PIN);
  } catch {}
}

/**
 * Register a local WebAuthn platform credential (fingerprint / screen lock)
 * on this device as a quick-assertion key if needed alongside Clerk passkeys.
 */
export async function registerLocalBiometricCredential(
  userId: string,
  userEmail: string
): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // If in Android APK, native BiometricPrompt is always available
  if (window.AndroidBiometricBridge) {
    return 'native-android-biometric';
  }

  if (!window.PublicKeyCredential) return null;

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userIdBytes = strToArrayBuffer(userId || 'beyondlimits-athlete');

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'BeyondLimits Discipline Tracker',
          id: window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: userEmail || 'athlete@beyondlimits.app',
          displayName: userEmail ? userEmail.split('@')[0] : 'Athlete',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Built-in fingerprint / screen lock
          userVerification: 'required', // Enforce biometric/screen lock
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (credential) {
      const b64Id = bufferToBase64Url(credential.rawId);
      localStorage.setItem(STORAGE_KEY_LOCAL_CRED_ID, b64Id);
      return b64Id;
    }
    return null;
  } catch (err: unknown) {
    console.warn('Local biometric registration failed or was dismissed:', err);
    return null;
  }
}

/**
 * Verify identity using the device's native Screen Lock, Fingerprint, or Face ID.
 * Returns true if the user confirmed their identity via platform biometrics.
 */
export async function verifyDeviceBiometric(): Promise<{
  success: boolean;
  error?: string;
  needsEnrollment?: boolean;
}> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Not running in a browser environment' };
  }

  // 1. Native Android APK Biometric Bridge (BiometricPrompt)
  const bridge = window.AndroidBiometricBridge;
  if (bridge && typeof bridge.authenticate === 'function') {
    return new Promise((resolve) => {
      window.__onAndroidBiometricResult = (result: { success: boolean; error?: string }) => {
        if (result.success) {
          setSessionUnlocked(true);
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: result.error || 'Biometric authentication was cancelled',
          });
        }
      };

      try {
        bridge.authenticate(
          'BeyondLimits Security',
          'Touch fingerprint sensor or use screen lock'
        );
      } catch (err: unknown) {
        const errorObj = err as Error;
        resolve({
          success: false,
          error: errorObj.message || 'Failed to trigger native biometric prompt',
        });
      }
    });
  }

  // 2. WebAuthn Platform Authenticator for Browsers
  if (!window.PublicKeyCredential) {
    return {
      success: false,
      error: 'Biometric security requires a native app or WebAuthn browser. Please use your PIN to unlock below.',
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const savedCredId = localStorage.getItem(STORAGE_KEY_LOCAL_CRED_ID);
    let assertion: Credential | null = null;

    // First attempt: if we have a saved credential ID, try it with proper Base64URL bytes
    if (savedCredId && savedCredId !== 'native-android-biometric') {
      try {
        const credBuffer = base64UrlToBuffer(savedCredId);
        assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId: window.location.hostname,
            userVerification: 'required',
            allowCredentials: [
              {
                id: credBuffer,
                type: 'public-key' as const,
                transports: ['internal' as const],
              },
            ],
            timeout: 60000,
          },
        });
      } catch (firstErr) {
        console.warn('Targeted credential assertion fallback:', firstErr);
      }
    }

    // Second attempt: Discoverable assertion (any platform authenticator / screen lock on this device)
    if (!assertion) {
      assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000,
        },
      });
    }

    if (assertion) {
      setSessionUnlocked(true);
      return { success: true };
    }
    return { success: false, error: 'Verification was not completed' };
  } catch (err: unknown) {
    const errorObj = err as Error;
    const msg = errorObj.message || '';
    if (errorObj.name === 'NotAllowedError') {
      if (msg.toLowerCase().includes('no passkey') || msg.toLowerCase().includes('no credentials')) {
        return {
          success: false,
          needsEnrollment: true,
          error: 'No passkey found on this device. Please register your fingerprint or screen lock.',
        };
      }
      return {
        success: false,
        error: 'Screen lock or fingerprint verification was canceled or timed out.',
      };
    }
    return {
      success: false,
      error: msg || 'Biometric verification failed. Please try again.',
    };
  }
}
