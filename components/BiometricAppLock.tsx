'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useUser, useClerk, useSignIn } from '@clerk/nextjs';
import {
  Fingerprint,
  ShieldCheck,
  Lock,
  Unlock,
  LogOut,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  isBiometricSupported,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  isSessionUnlocked,
  setSessionUnlocked,
  verifyDeviceBiometric,
  registerLocalBiometricCredential,
} from '@/lib/biometric-auth';

interface BiometricAppLockProps {
  children: React.ReactNode;
}

export default function BiometricAppLock({ children }: BiometricAppLockProps) {
  const pathname = usePathname();
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { signIn } = useSignIn();

  // Route bypass: sign-in, sign-up, and admin portal have independent auth
  const isBypassedRoute =
    pathname?.startsWith('/sign-in') ||
    pathname?.startsWith('/sign-up') ||
    pathname?.startsWith('/admin');

  // Synchronously initialize isLocked on client if enabled and not unlocked
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const enabled = localStorage.getItem('beyondlimits_biometric_lock_enabled') === 'true';
      const unlocked = sessionStorage.getItem('beyondlimits_biometric_unlocked') === 'true';
      return enabled && !unlocked;
    } catch {
      return false;
    }
  });

  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean>(false);

  // Setup Prompt State (for users who haven't enabled biometrics yet)
  const [showSetupPrompt, setShowSetupPrompt] = useState<boolean>(false);
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const [enrollSuccess, setEnrollSuccess] = useState<boolean>(false);

  // Immediately cancel any audio or speech synthesis if locked
  useEffect(() => {
    if (isLocked && typeof window !== 'undefined') {
      try {
        window.speechSynthesis?.cancel();
      } catch {}
    }
  }, [isLocked]);

  // Check device biometric support and determine lock state
  useEffect(() => {
    if (isBypassedRoute) return;

    let mounted = true;

    async function initBiometrics() {
      const hasSupport = await isBiometricSupported();
      if (!mounted) return;
      setSupported(hasSupport);

      if (!isSignedIn) {
        setIsLocked(false);
        return;
      }

      const enabled = isBiometricLockEnabled();
      const hasPasskeys = (user?.passkeys?.length ?? 0) > 0;
      const unlocked = isSessionUnlocked();

      // If biometric lock is enabled on this device or passkeys exist, require unlock
      if ((enabled || hasPasskeys) && !unlocked) {
        setIsLocked(true);
        if (typeof window !== 'undefined') {
          try {
            window.speechSynthesis?.cancel();
          } catch {}
        }
      } else {
        setIsLocked(false);

        // If biometrics not yet enabled and not prompted, prompt once
        const alreadyPrompted = localStorage.getItem('beyondlimits_biometric_prompted');
        if (!enabled && !hasPasskeys && !alreadyPrompted && hasSupport) {
          const timer = setTimeout(() => {
            if (mounted) setShowSetupPrompt(true);
          }, 1500);
          return () => clearTimeout(timer);
        }
      }
    }

    if (isLoaded) {
      initBiometrics();
    }

    return () => {
      mounted = false;
    };
  }, [isLoaded, isSignedIn, user?.passkeys?.length, isBypassedRoute]);

  // Re-lock when app is hidden / placed in background for > 60 seconds
  useEffect(() => {
    if (isBypassedRoute || !isSignedIn) return;

    let hiddenTimestamp: number | null = null;

    const handleVisibilityChange = () => {
      const enabled = isBiometricLockEnabled() || (user?.passkeys?.length ?? 0) > 0;
      if (!enabled) return;

      if (document.visibilityState === 'hidden') {
        hiddenTimestamp = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (hiddenTimestamp && Date.now() - hiddenTimestamp > 60 * 1000) {
          // Relock after 60 seconds in background
          setSessionUnlocked(false);
          setIsLocked(true);
          if (typeof window !== 'undefined') {
            try {
              window.speechSynthesis?.cancel();
            } catch {}
          }
        }
        hiddenTimestamp = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSignedIn, user?.passkeys?.length, isBypassedRoute]);

  // Trigger Biometric Verification (Screen Lock / Fingerprint / Passkey)
  const handleVerifyBiometric = useCallback(async () => {
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      let verified = false;

      // 1. If Clerk passkeys exist and signIn is available, try Clerk Passkey authentication
      const signInAny = signIn as unknown as Record<string, unknown>;
      if (signInAny && typeof signInAny.passkey === 'function' && (user?.passkeys?.length ?? 0) > 0) {
        try {
          await (signInAny.passkey as (params: { flow: string }) => Promise<unknown>)({ flow: 'discoverable' });
          verified = true;
        } catch {
          // Fall through to native platform biometric assertion
        }
      } else if (signInAny && typeof signInAny.authenticateWithPasskey === 'function' && (user?.passkeys?.length ?? 0) > 0) {
        try {
          await (signInAny.authenticateWithPasskey as (params: { flow: string }) => Promise<unknown>)({ flow: 'discoverable' });
          verified = true;
        } catch {
          // Fall through to native platform biometric assertion
        }
      }

      // 2. If not verified via Clerk passkey directly, invoke native device WebAuthn userVerification
      if (!verified) {
        const result = await verifyDeviceBiometric();
        if (result.success) {
          verified = true;
        } else if (result.error) {
          setErrorMessage(result.error);
        }
      }

      if (verified) {
        setSessionUnlocked(true);
        setIsLocked(false);
        setErrorMessage(null);

        // Haptic feedback if available on mobile
        if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
          try {
            navigator.vibrate([40, 30, 60]);
          } catch {}
        }
      }
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMessage(
        e.message || 'Screen lock or fingerprint verification failed. Please try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  }, [signIn, user?.passkeys?.length]);

  // Auto-prompt biometric on initial lock appearance
  useEffect(() => {
    if (isLocked && supported && !isVerifying) {
      const timer = setTimeout(() => {
        handleVerifyBiometric();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isLocked, supported, handleVerifyBiometric, isVerifying]);

  // Handle Enrollment: Create Clerk Passkey & enable Screen Lock
  const handleEnrollBiometrics = async () => {
    if (!user) return;
    setIsEnrolling(true);
    setErrorMessage(null);

    try {
      // 1. Create Clerk passkey if supported
      if (typeof user.createPasskey === 'function') {
        try {
          await user.createPasskey();
        } catch {
          // Passkey might already exist or browser used device lock
        }
      }

      // 2. Register local platform biometric credential
      await registerLocalBiometricCredential(
        user.id,
        user.fullName || user.primaryEmailAddress?.emailAddress || 'Athlete'
      );

      // 3. Enable biometric lock flag
      setBiometricLockEnabled(true);
      setSessionUnlocked(true);
      localStorage.setItem('beyondlimits_biometric_prompted', 'true');

      setEnrollSuccess(true);
      setTimeout(() => {
        setShowSetupPrompt(false);
        setEnrollSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      const e = err as Error;
      if (e.name === 'NotAllowedError') {
        setErrorMessage('Biometric enrollment cancelled on device.');
      } else {
        setErrorMessage(e.message || 'Failed to enroll screen lock. Please try again.');
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleDismissSetup = () => {
    setShowSetupPrompt(false);
    localStorage.setItem('beyondlimits_biometric_prompted', 'true');
  };

  const handleSignOut = async () => {
    setSessionUnlocked(false);
    await signOut();
  };

  // If on sign-in, sign-up, or admin routes, bypass biometric lock
  if (isBypassedRoute) {
    return <>{children}</>;
  }

  // Loading state while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#060913] text-white">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  // =========================================================================
  // FULL-SCREEN BIOMETRIC APP LOCK OVERLAY
  // When locked, ONLY this screen is rendered. Children (and Jarvis audio/mic)
  // are never mounted or executed until unlock verification succeeds.
  // =========================================================================
  if (isLocked && isSignedIn) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between p-6 sm:p-8 bg-[#060913] text-white select-none">
        {/* Subtle Ambient Background Glow */}
        <div className="absolute top-1/4 -translate-y-1/2 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 translate-y-1/2 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        {/* Top Bar: Brand & Security Badge */}
        <div className="w-full max-w-md flex items-center justify-between pt-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-[#060913] rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <span className="text-sm font-black tracking-wider uppercase">
              BEYOND<span className="text-emerald-400">LIMITS</span>
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Lock className="w-3 h-3" />
            <span>Biometric Protected</span>
          </div>
        </div>

        {/* Center: User Card & Big Tactile Fingerprint Unlock */}
        <div className="w-full max-w-md flex flex-col items-center text-center space-y-6 relative z-10 my-auto">
          {/* User Profile Pill */}
          {user && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || 'Athlete'}
                  className="w-9 h-9 rounded-full object-cover border border-emerald-500/40"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  {(user.fullName || user.primaryEmailAddress?.emailAddress || 'A').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">
                  {user.fullName || user.firstName || 'Athlete'}
                </p>
                <p className="text-[11px] text-slate-400 truncate max-w-[190px]">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
          )}

          {/* Glowing Biometric Trigger Button */}
          <div className="relative group">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 blur-xl opacity-75 group-hover:opacity-100 transition duration-500 animate-pulse" />

            <button
              type="button"
              onClick={handleVerifyBiometric}
              disabled={isVerifying}
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-2 border-emerald-500/50 hover:border-emerald-400 active:scale-95 transition-all duration-200 flex flex-col items-center justify-center gap-2 shadow-2xl shadow-emerald-500/30 cursor-pointer disabled:opacity-60"
              aria-label="Unlock BeyondLimits with fingerprint or screen lock"
            >
              {isVerifying ? (
                <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
              ) : (
                <Fingerprint className="w-12 h-12 text-emerald-400 group-hover:scale-105 transition-transform" />
              )}
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-300">
                {isVerifying ? 'Verifying...' : 'Touch Sensor'}
              </span>
            </button>
          </div>

          {/* Instruction Headings */}
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              App Locked
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-[280px]">
              Verify with your device&apos;s fingerprint, Face ID, or screen lock to continue.
            </p>
          </div>

          {/* Error Message if Verification Fails */}
          {errorMessage && (
            <div className="w-full flex flex-col gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="flex-1">{errorMessage}</span>
              </div>
              {/* One-Tap Biometric Re-Enrollment Option if no passkey exists */}
              <button
                type="button"
                onClick={handleEnrollBiometrics}
                disabled={isEnrolling}
                className="mt-1 w-full py-1.5 px-3 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Fingerprint className="w-3.5 h-3.5" />
                <span>{isEnrolling ? 'Scanning Fingerprint...' : 'Register Fingerprint on This Phone'}</span>
              </button>
            </div>
          )}

          {/* Manual Unlock Button */}
          <button
            type="button"
            onClick={handleVerifyBiometric}
            disabled={isVerifying}
            className="w-full max-w-xs min-h-[48px] rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            <Unlock className="w-4 h-4" />
            <span>Unlock BeyondLimits</span>
          </button>
        </div>

        {/* Bottom Bar: Switch Account / Sign Out */}
        <div className="w-full max-w-md flex items-center justify-center pb-2 relative z-10">
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer py-2 px-3 rounded-lg hover:bg-slate-900/60"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out / Switch Account</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // UNLOCKED APPLICATION CONTENT
  // Rendered ONLY after screen lock / fingerprint verification succeeds
  // =========================================================================
  return (
    <>
      {/* FIRST-TIME BIOMETRIC ENROLLMENT PROMPT (optional opt-in for new users) */}
      {showSetupPrompt && isSignedIn && !isLocked && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div
            className="w-full max-w-md rounded-3xl bg-slate-900 text-white p-6 sm:p-7 border border-emerald-500/30 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-md shadow-emerald-500/30">
                  <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                    <Fingerprint className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Enable Screen Lock Security
                  </h3>
                  <p className="text-xs text-emerald-400/90 font-medium">
                    Protected by Clerk &amp; WebAuthn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissSetup}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Require your phone&apos;s <strong>fingerprint</strong>, <strong>Face ID</strong>, or <strong>screen lock</strong> whenever you open BeyondLimits, keeping your habits and attendance private.
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant biometric verification on app launch</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Device-hardware secured (Passkey &amp; Screen Lock)</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Easy toggle anytime in Settings</span>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {enrollSuccess ? (
              <div className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Screen Lock Security Activated!</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleEnrollBiometrics}
                  disabled={isEnrolling}
                  className="w-full sm:flex-1 min-h-[46px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isEnrolling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scan Fingerprint / Lock...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      <span>Enable Screen Lock</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDismissSetup}
                  disabled={isEnrolling}
                  className="w-full sm:w-auto px-4 min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Render children only when unlocked */}
      {children}
    </>
  );
}
