'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  User,
  ArrowRight,
  HelpCircle,
  Copy,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Smartphone,
  ExternalLink,
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
  const [showMfaGuide, setShowMfaGuide] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('BEYONDLIMITSMFAADMINKEY234567AB');
  const [formattedSecret, setFormattedSecret] = useState('BEYO NDLI MITS MFAA DMIN KEY2 3456 7AB');

  useEffect(() => {
    // Fetch live MFA setup secret from server
    fetch('/api/admin/mfa-setup')
      .then((res) => res.json())
      .then((data) => {
        if (data.secret) {
          setMfaSecret(data.secret);
          setFormattedSecret(data.formattedSecret || data.secret);
        }
      })
      .catch(() => {
        // Fall back to default
      });
  }, []);

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(mfaSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    if (!mfaCode.trim() || mfaCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit code from Microsoft Authenticator.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          mfaCode: mfaCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Authentication failed. Please verify credentials and MFA code.');
        setLoading(false);
        return;
      }

      // Successfully authenticated
      router.push('/admin');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Login error: ${msg}`);
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-300">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
          <span>Administrator Access Portal</span>
        </div>
        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Admin &amp; Control Center</h3>
        <p className="text-xs text-slate-500">
          Sign in with your admin credentials &amp; Microsoft Authenticator MFA
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in shake">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1">
            <span className="font-bold">Authentication failed: </span>
            {errorMessage}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Admin Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
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
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
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

        {/* 6-Digit Microsoft Authenticator MFA Code */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Microsoft Authenticator Code (6 Digits)
            </label>
            <button
              type="button"
              onClick={() => setShowMfaGuide(true)}
              className="text-[11px] font-bold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <Smartphone className="w-3 h-3" />
              <span>Setup MFA</span>
            </button>
          </div>
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
            Open Microsoft Authenticator &amp; enter the rolling 30s code for &ldquo;BeyondLimits Admin&rdquo;.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
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

      {/* MFA Setup Assistance Modal */}
      {showMfaGuide && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900">Microsoft Authenticator Setup</h4>
                  <p className="text-xs text-slate-500">Add BeyondLimits 2-Step Verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMfaGuide(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Your 32-Character Secret Key (Base32)
                </span>
                <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 font-mono text-sm font-bold text-teal-900 break-all select-all">
                  <span>{mfaSecret}</span>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors shrink-0 cursor-pointer"
                    title="Copy Secret"
                  >
                    {copiedSecret ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Formatted for easy typing: <span className="font-mono text-slate-600">{formattedSecret}</span>
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  3 Simple Steps in Microsoft Authenticator:
                </h5>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600 leading-relaxed">
                  <li>
                    Open <strong>Microsoft Authenticator</strong> on your phone.
                  </li>
                  <li>
                    Tap <strong>+</strong> &rarr; Select <strong>Other (Google, Facebook, etc.)</strong> &rarr; Tap{' '}
                    <strong>&ldquo;Or enter code manually&rdquo;</strong>.
                  </li>
                  <li>
                    Account name: <strong className="text-slate-900">BeyondLimits Admin</strong>
                    <br />
                    Secret key: Paste the secret key above and tap <strong>Finish</strong>.
                  </li>
                </ol>
              </div>

              <p className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200/60 text-teal-800 text-[11px] leading-relaxed">
                ✓ Once added, Microsoft Authenticator will generate a fresh 6-digit code every 30 seconds for your login!
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowMfaGuide(false)}
              className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Done / Return to Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
