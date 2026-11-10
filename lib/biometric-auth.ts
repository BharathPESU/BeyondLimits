/**
 * Biometric & Screen Lock Authentication Service
 * 
 * Uses WebAuthn / FIDO2 User Verification and Clerk Passkeys
 * to lock the application with the device's native Screen Lock,
 * Fingerprint sensor, or Face ID.
 */

// Convert a string to an ArrayBuffer for WebAuthn BufferSource
function strToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const uint8 = encoder.encode(str);
  const buffer = new ArrayBuffer(uint8.byteLength);
  new Uint8Array(buffer).set(uint8);
  return buffer;
}

/**
 * Checks if the current device/browser supports platform biometrics
 * (Fingerprint, Face ID, Windows Hello, Android Screen Lock)
 */
export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
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

const STORAGE_KEY_ENABLED = 'beyondlimits_biometric_lock_enabled';
const STORAGE_KEY_UNLOCKED = 'beyondlimits_biometric_unlocked';
const STORAGE_KEY_LAST_ACTIVE = 'beyondlimits_biometric_last_active';
const STORAGE_KEY_LOCAL_CRED_ID = 'beyondlimits_local_biometric_cred_id';

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
 * Register a local WebAuthn platform credential (fingerprint / screen lock)
 * on this device as a quick-assertion key if needed alongside Clerk passkeys.
 */
export async function registerLocalBiometricCredential(
  userId: string,
  userEmail: string
): Promise<string | null> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return null;

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

    if (credential && credential.id) {
      localStorage.setItem(STORAGE_KEY_LOCAL_CRED_ID, credential.id);
      return credential.id;
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
}> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Not running in a browser environment' };
  }

  if (!window.PublicKeyCredential) {
    return {
      success: false,
      error: 'WebAuthn and biometric security are not supported on this browser',
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const savedCredId = localStorage.getItem(STORAGE_KEY_LOCAL_CRED_ID);
    const allowCredentials = savedCredId
      ? [
          {
            id: strToArrayBuffer(savedCredId),
            type: 'public-key' as const,
            transports: ['internal' as const],
          },
        ]
      : undefined;

    // Request native OS screen lock / fingerprint verification
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        userVerification: 'required', // Forces fingerprint / screen lock
        allowCredentials,
        timeout: 60000,
      },
    });

    if (assertion) {
      setSessionUnlocked(true);
      return { success: true };
    }
    return { success: false, error: 'Verification was not completed' };
  } catch (err: unknown) {
    const errorObj = err as Error;
    if (errorObj.name === 'NotAllowedError') {
      return {
        success: false,
        error: 'Screen lock or fingerprint verification was canceled or timed out.',
      };
    }
    return {
      success: false,
      error: errorObj.message || 'Biometric verification failed. Please try again.',
    };
  }
}
