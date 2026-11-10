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
  KeyRound,
  Delete,
  Sparkles,
} from 'lucide-react';
import {
  isBiometricSupported,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  isSessionUnlocked,
  setSessionUnlocked,
  verifyDeviceBiometric,
  registerLocalBiometricCredential,
  hasAppPin,
  setAppPin,
  verifyAppPin,
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

  // Authentication Mode: 'biometric' | 'pin'
  const [authMode, setAuthMode] = useState<'biometric' | 'pin'>('biometric');
  const [pinInput, setPinInput] = useState<string>('');
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [isCreatingPin, setIsCreatingPin] = useState<boolean>(false);
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [pinStep, setPinStep] = useState<'enter' | 'create_first' | 'create_confirm'>('enter');
  const [pinError, setPinError] = useState<string | null>(null);

  // Setup Prompt State (for users who haven't enabled biometrics yet)
  const [showSetupPrompt, setShowSetupPrompt] = useState<boolean>(false);
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const [enrollSuccess, setEnrollSuccess] = useState<boolean>(false);

  // Cancel any audio speech synthesis if app is locked
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
      const existingPin = hasAppPin();

      if (!mounted) return;
      setSupported(hasSupport);
      setHasPin(existingPin);

      // If biometric is unsupported on this browser/environment, switch to PIN mode
      if (!hasSupport && existingPin) {
        setAuthMode('pin');
        setPinStep('enter');
      } else if (!hasSupport && !existingPin) {
        setAuthMode('pin');
        setPinStep('create_first');
      }

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

  // Re-lock when app is placed in background for > 60 seconds
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
          setSessionUnlocked(false);
          setIsLocked(true);
          setPinInput('');
          setPinError(null);
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

  // Trigger Biometric Verification (Native BiometricPrompt / Clerk Passkey / WebAuthn)
  const handleVerifyBiometric = useCallback(async () => {
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      let verified = false;

      // 1. If running in native Android APK wrapper with native bridge, invoke it directly
      if (typeof window !== 'undefined' && window.AndroidBiometricBridge) {
        const result = await verifyDeviceBiometric();
        if (result.success) {
          verified = true;
        } else if (result.error) {
          setErrorMessage(result.error);
        }
      } else {
        // 2. Web browser: Clerk passkey or WebAuthn assertion
        const signInAny = signIn as unknown as Record<string, unknown>;
        if (signInAny && typeof signInAny.passkey === 'function' && (user?.passkeys?.length ?? 0) > 0) {
          try {
            await (signInAny.passkey as (params: { flow: string }) => Promise<unknown>)({ flow: 'discoverable' });
            verified = true;
          } catch {
            // Fall through to native platform biometric assertion
          }
        }

        if (!verified) {
          const result = await verifyDeviceBiometric();
          if (result.success) {
            verified = true;
          } else if (result.error) {
            setErrorMessage(result.error);
          }
        }
      }

      if (verified) {
        setSessionUnlocked(true);
        setIsLocked(false);
        setErrorMessage(null);

        // Haptic feedback
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
    if (isLocked && supported && authMode === 'biometric' && !isVerifying) {
      const timer = setTimeout(() => {
        handleVerifyBiometric();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isLocked, supported, authMode, handleVerifyBiometric, isVerifying]);

  // PIN Keypad handler
  const handlePinDigit = async (digit: string) => {
    setPinError(null);

    if (pinStep === 'enter') {
      const nextPin = (pinInput + digit).slice(0, 4);
      setPinInput(nextPin);

      if (nextPin.length === 4) {
        setIsVerifying(true);
        const ok = await verifyAppPin(nextPin);
        setIsVerifying(false);

        if (ok) {
          setSessionUnlocked(true);
          setIsLocked(false);
          setPinInput('');
          setPinError(null);
        } else {
          setPinError('Incorrect PIN. Please try again.');
          setPinInput('');
        }
      }
    } else if (pinStep === 'create_first') {
      const nextPin = (pinInput + digit).slice(0, 4);
      setPinInput(nextPin);

      if (nextPin.length === 4) {
        setPinStep('create_confirm');
        setConfirmPinInput('');
      }
    } else if (pinStep === 'create_confirm') {
      const nextConfirm = (confirmPinInput + digit).slice(0, 4);
      setConfirmPinInput(nextConfirm);

      if (nextConfirm.length === 4) {
        if (nextConfirm === pinInput) {
          await setAppPin(nextConfirm);
          setHasPin(true);
          setSessionUnlocked(true);
          setIsLocked(false);
          setPinInput('');
          setConfirmPinInput('');
          setPinStep('enter');
        } else {
          setPinError('PINs do not match. Try setting again.');
          setPinInput('');
          setConfirmPinInput('');
          setPinStep('create_first');
        }
      }
    }
  };

  const handlePinDelete = () => {
    setPinError(null);
    if (pinStep === 'create_confirm') {
      setConfirmPinInput((prev) => prev.slice(0, -1));
    } else {
      setPinInput((prev) => prev.slice(0, -1));
    }
  };

  // Handle Enrollment: Create Clerk Passkey & enable Screen Lock
  const handleEnrollBiometrics = async () => {
    if (!user) return;
    setIsEnrolling(true);
    setErrorMessage(null);

    try {
      if (typeof user.createPasskey === 'function') {
        try {
          await user.createPasskey();
        } catch {}
      }

      await registerLocalBiometricCredential(
        user.id,
        user.fullName || user.primaryEmailAddress?.emailAddress || 'Athlete'
      );

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

  if (isBypassedRoute) {
    return <>{children}</>;
  }

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#060913] text-white">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  // =========================================================================
  // FULL-SCREEN APP LOCK OVERLAY
  // Children & audio assistant are never mounted or executed until unlocked.
  // =========================================================================
  if (isLocked && isSignedIn) {
    const currentEnteredLength =
      pinStep === 'create_confirm' ? confirmPinInput.length : pinInput.length;

    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between p-5 sm:p-8 bg-[#060913] text-white select-none overflow-y-auto">
        {/* Ambient Glow */}
        <div className="absolute top-1/4 -translate-y-1/2 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 translate-y-1/2 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="w-full max-w-md flex items-center justify-between pt-2 relative z-10">
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
            <span>App Protected</span>
          </div>
        </div>

        {/* Center Card */}
        <div className="w-full max-w-md flex flex-col items-center text-center space-y-5 relative z-10 my-auto py-4">
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

          {/* Mode Switcher Pills (Fingerprint vs PIN) */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('biometric');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                authMode === 'biometric'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Touch / Face</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('pin');
                setErrorMessage(null);
                if (!hasPin) {
                  setPinStep('create_first');
                } else {
                  setPinStep('enter');
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                authMode === 'pin'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>PIN Passcode</span>
            </button>
          </div>

          {/* MODE 1: BIOMETRIC TOUCH SENSOR */}
          {authMode === 'biometric' && (
            <div className="flex flex-col items-center space-y-5 animate-fadeIn w-full">
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

              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  App Locked
                </h2>
                <p className="text-xs text-slate-400 max-w-[280px]">
                  Touch fingerprint sensor or verify your screen lock to proceed.
                </p>
              </div>

              {/* Error Alert with Quick Switch to PIN */}
              {errorMessage && (
                <div className="w-full flex flex-col gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span className="flex-1">{errorMessage}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('pin');
                        setErrorMessage(null);
                        if (!hasPin) setPinStep('create_first');
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600/40 hover:bg-emerald-600/60 border border-emerald-500/50 text-emerald-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{hasPin ? 'Unlock with PIN Instead' : 'Set a Quick 4-Digit PIN'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyBiometric}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {/* Primary Unlock Trigger */}
              <button
                type="button"
                onClick={handleVerifyBiometric}
                disabled={isVerifying}
                className="w-full max-w-xs min-h-[46px] rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock BeyondLimits</span>
              </button>
            </div>
          )}

          {/* MODE 2: PIN PASSCODE UNLOCK */}
          {authMode === 'pin' && (
            <div className="flex flex-col items-center space-y-4 animate-fadeIn w-full max-w-xs">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-white tracking-tight">
                  {pinStep === 'enter' && 'Enter Security PIN'}
                  {pinStep === 'create_first' && 'Create 4-Digit PIN'}
                  {pinStep === 'create_confirm' && 'Confirm 4-Digit PIN'}
                </h2>
                <p className="text-xs text-slate-400">
                  {pinStep === 'enter' && 'Enter your 4-digit code to unlock the app'}
                  {pinStep === 'create_first' && 'Choose a 4-digit backup PIN for this device'}
                  {pinStep === 'create_confirm' && 'Re-enter your 4-digit PIN to confirm'}
                </p>
              </div>

              {/* 4 PIN Dots */}
              <div className="flex items-center justify-center gap-4 py-2">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = idx < currentEnteredLength;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full transition-all duration-200 ${
                        isFilled
                          ? 'bg-emerald-400 scale-110 shadow-lg shadow-emerald-400/50'
                          : 'bg-slate-800 border border-slate-700'
                      }`}
                    />
                  );
                })}
              </div>

              {/* PIN Error Message */}
              {pinError && (
                <div className="flex items-center gap-1.5 text-rose-400 text-xs animate-shake">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-3 w-full pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handlePinDigit(digit)}
                    disabled={isVerifying}
                    className="h-13 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800 active:scale-95 text-lg font-bold text-white transition-all shadow-md cursor-pointer flex items-center justify-center disabled:opacity-50"
                  >
                    {digit}
                  </button>
                ))}

                {/* Switch back to Biometric */}
                <button
                  type="button"
                  onClick={() => setAuthMode('biometric')}
                  className="h-13 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-emerald-400 transition-all flex items-center justify-center cursor-pointer"
                  aria-label="Switch to Fingerprint sensor"
                >
                  <Fingerprint className="w-5 h-5" />
                </button>

                {/* '0' */}
                <button
                  type="button"
                  onClick={() => handlePinDigit('0')}
                  disabled={isVerifying}
                  className="h-13 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800 active:scale-95 text-lg font-bold text-white transition-all shadow-md cursor-pointer flex items-center justify-center disabled:opacity-50"
                >
                  0
                </button>

                {/* Backspace Delete */}
                <button
                  type="button"
                  onClick={handlePinDelete}
                  className="h-13 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-rose-400 transition-all flex items-center justify-center cursor-pointer"
                  aria-label="Delete last digit"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
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
                    Native Biometric &amp; Screen Lock
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
                <span>Instant fingerprint verification on launch</span>
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
                      <span>Configuring...</span>
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
