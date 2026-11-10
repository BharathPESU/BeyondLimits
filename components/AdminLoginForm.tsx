'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    if (!mfaCode.trim() || mfaCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit code from your Authenticator app.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          mfaCode: mfaCode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Admin authentication failed. Please verify credentials.');
        return;
      }

      // Redirect to admin dashboard or requested return URL
      const redirectUrl = searchParams.get('redirect') || '/admin';
      router.push(redirectUrl);
      router.refresh();
    } catch {
      setErrorMessage('An unexpected error occurred during admin login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header Badge */}
      <div className="flex items-center gap-3 mb-6 p-3.5 bg-slate-900/50 border border-teal-500/30 rounded-2xl">
        <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Admin Command Portal</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
              MFA Enforced
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Authorized administrator credentials &amp; 2-Step TOTP required
          </p>
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Username */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Admin Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4 text-teal-700" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              autoComplete="username"
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4 text-teal-700" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 6-Digit Authenticator MFA Code */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Authenticator Code (6 Digits)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <KeyRound className="w-4 h-4 text-teal-700" />
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000 000"
              required
              className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-lg font-mono font-bold tracking-widest text-slate-900 placeholder-slate-300 outline-none transition-all"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Open your Authenticator app &amp; enter the rolling 30s code for &ldquo;BeyondLimits Admin&rdquo;.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold rounded-2xl py-3.5 px-6 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all duration-200 cursor-pointer text-sm tracking-wider uppercase flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Verifying MFA &amp; Signing In...</span>
            </div>
          ) : (
            <>
              <span>Sign In to Admin Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
