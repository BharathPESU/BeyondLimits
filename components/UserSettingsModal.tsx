'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  X,
  Key,
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Sparkles,
  ShieldCheck,
  User,
  Zap,
} from 'lucide-react';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile?: () => void;
}

export default function UserSettingsModal({
  isOpen,
  onClose,
  onOpenProfile,
}: UserSettingsModalProps) {
  const { user, isLoaded } = useUser();

  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Hydrate stored API key from localStorage and Clerk metadata
  useEffect(() => {
    if (!isOpen) return;

    // Load from localStorage
    try {
      const stored = localStorage.getItem('beyondlimits_gemini_api_key');
      if (stored) {
        setApiKey(stored);
      }
    } catch {}

    // Hydrate from Clerk metadata if available
    if (isLoaded && user) {
      const meta = (user.unsafeMetadata || {}) as Record<string, string>;
      if (meta.geminiApiKey) {
        setApiKey(meta.geminiApiKey);
      }
    }
  }, [isOpen, isLoaded, user]);

  if (!isOpen) return null;

  // Test the key against /api/settings/verify-gemini
  const handleVerifyKey = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setVerificationResult({
        valid: false,
        message: 'Please paste your Gemini API key first.',
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const res = await fetch('/api/settings/verify-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: trimmed }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setVerificationResult({
          valid: true,
          message: data.message || 'Key verified successfully with Gemini 2.5 Flash!',
        });
      } else {
        setVerificationResult({
          valid: false,
          message: data.error || 'Failed to verify API key with Google.',
        });
      }
    } catch (err) {
      setVerificationResult({
        valid: false,
        message: err instanceof Error ? err.message : 'Network error verifying key.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Save the key into localStorage and Clerk metadata
  const handleSaveKey = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setVerificationResult({
        valid: false,
        message: 'Please enter a valid Gemini API key.',
      });
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    try {
      // 1. Save to localStorage
      localStorage.setItem('beyondlimits_gemini_api_key', trimmed);

      // 2. Save to Clerk user unsafeMetadata
      if (user) {
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            geminiApiKey: trimmed,
          },
        });
      }

      setSaveStatus('Your Gemini API key has been saved successfully!');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      setSaveStatus(
        err instanceof Error ? err.message : 'Failed to save settings'
      );
      setTimeout(() => setSaveStatus(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Remove key and clear storage
  const handleClearKey = async () => {
    setApiKey('');
    setVerificationResult(null);
    try {
      localStorage.removeItem('beyondlimits_gemini_api_key');
      if (user) {
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            geminiApiKey: '',
          },
        });
      }
      setSaveStatus('Custom API key removed. Using Vercel server key fallback.');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 my-8 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/60 shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  AI &amp; Gemini Settings
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60">
                  Custom Key
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Configure your own Google Gemini API key
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step-by-Step Google AI Studio Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Get Free API Key from Google
              </h4>
            </div>
            <span className="text-[10px] text-teal-700 font-bold bg-teal-100/70 px-2 py-0.5 rounded-md border border-teal-200">
              100% Free
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Get a personal free Gemini API key to power your daily AI motivational coach and voice briefings directly from Google:
          </p>

          <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside pl-1">
            <li>Click the button below to open <strong>Google AI Studio</strong>.</li>
            <li>Sign in with your Google / Gmail account.</li>
            <li>Click <strong>&quot;Create API key&quot;</strong> and copy your key.</li>
            <li>Paste your key below and click <strong>Save Key</strong>.</li>
          </ol>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[44px] rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Key className="w-4 h-4" />
            <span>Open Google AI Studio (Get Free Key)</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </a>
        </div>

        {/* Status Toast */}
        {saveStatus && (
          <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 flex items-center gap-2 text-xs font-semibold text-teal-800">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{saveStatus}</span>
          </div>
        )}

        {/* API Key Input Section */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
              <span>Your Gemini API Key</span>
            </span>
            {apiKey && (
              <span className="text-[10px] text-teal-700 font-mono font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                Key Configured
              </span>
            )}
          </label>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setVerificationResult(null);
              }}
              placeholder="Paste your AIzaSy... key here"
              className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-sm font-mono text-slate-900 placeholder-slate-400 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Verification Result Notice */}
          {verificationResult && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium ${
                verificationResult.valid
                  ? 'bg-teal-50 border border-teal-200 text-teal-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {verificationResult.valid ? (
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{verificationResult.message}</span>
            </div>
          )}

          {/* Buttons: Test, Save, Clear */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              type="button"
              disabled={isVerifying || !apiKey.trim()}
              onClick={handleVerifyKey}
              className="min-h-[42px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-teal-700 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isVerifying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-teal-600" />
              )}
              <span>Test Key</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveKey}
              className="min-h-[42px] px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Save Key</span>
            </button>

            <button
              type="button"
              onClick={handleClearKey}
              className="min-h-[42px] px-3 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Fallback Architecture Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>Automatic Redundancy &amp; Fallback</span>
          </div>
          <div className="space-y-1.5 text-slate-600">
            <p className="flex items-start gap-2">
              <span className="text-teal-700 font-bold">1.</span>
              <span><strong>Your Key First:</strong> When set, your phone will prioritize your personal Gemini API key for coach replies.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-teal-700 font-bold">2.</span>
              <span><strong>Server Fallback:</strong> If your key runs out of quota, has rate limits, or is empty, BeyondLimits automatically falls back to our Vercel server key so you never experience interruptions!</span>
            </p>
          </div>
        </div>

        {/* Navigation to Profile */}
        {onOpenProfile && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Need to update your age, height, or blood group?
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenProfile();
              }}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Open Profile</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
