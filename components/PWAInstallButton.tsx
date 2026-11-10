'use client';

import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, ShieldCheck, Sparkles, Globe } from 'lucide-react';
import { usePWAInstall } from '@/hooks/use-pwa-install';

export default function PWAInstallButton() {
  const { isInstallable, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [pwaInstalledSuccess, setPwaInstalledSuccess] = useState(false);

  const handlePWAInstall = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setPwaInstalledSuccess(true);
        setTimeout(() => setShowModal(false), 2000);
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="min-h-[34px] sm:min-h-[38px] inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-cyan-400 bg-slate-900 hover:bg-slate-800 border border-cyan-800/40 rounded-xl transition-all shadow-sm hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] whitespace-nowrap shrink-0 cursor-pointer"
        title="Install App / Download Android APK"
      >
        <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>Install <span className="hidden xs:inline">App</span></span>
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-slate-900 text-white p-5 sm:p-6 border border-cyan-900/50 space-y-5 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    Install BeyondLimits
                  </h3>
                  <p className="text-xs text-cyan-400/80">
                    Native Android APK or Progressive Web App
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Option 1: Native Android APK (Highlighted Primary Option) */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30 border border-cyan-600/40 space-y-3 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-md flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    Native Android APK
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">59 MB</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-teal-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Capacitor Build
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white">
                  Download Native Android App
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Direct installable APK with full edge-to-edge screen, biometric authentication, and high-performance native WebView wrapper.
                </p>
              </div>

              <a
                href="/beyondlimits.apk"
                download="BeyondLimits.apk"
                className="w-full min-h-[46px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-950 shrink-0" />
                <span>Download Android APK</span>
              </a>

              <div className="pt-1 space-y-1 text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                <p className="text-slate-300 font-medium">Quick Install Guide:</p>
                <p>1. Tap <strong>Download Android APK</strong> above.</p>
                <p>2. Open the downloaded <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">BeyondLimits.apk</code> from your notifications or files.</p>
                <p>3. If prompted by Android, tap <strong>Settings → Allow from this source</strong>, then tap <strong>Install</strong>.</p>
              </div>
            </div>

            {/* Option 2: Web PWA (Add to Home Screen) */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <h4 className="text-xs font-semibold text-slate-200">
                    Instant Browser App (PWA)
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Zero Download
                </span>
              </div>

              {pwaInstalledSuccess ? (
                <div className="flex items-center gap-2 p-3 bg-teal-950/60 border border-teal-800/50 rounded-xl text-xs text-teal-300">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>App shortcut installed successfully! Check your home screen.</span>
                </div>
              ) : isInstallable ? (
                <button
                  type="button"
                  onClick={handlePWAInstall}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/40 text-xs font-bold transition-all cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Add to Home Screen Now</span>
                </button>
              ) : isIOS ? (
                <div className="space-y-1.5 text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <p className="font-semibold text-cyan-300">Safari on iPhone/iPad:</p>
                  <p>1. Tap the <strong>Share</strong> button (box with upward arrow).</p>
                  <p>2. Scroll and tap <strong>Add to Home Screen</strong>.</p>
                  <p>3. Tap <strong>Add</strong> at the top right.</p>
                </div>
              ) : (
                <div className="space-y-1.5 text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <p className="font-semibold text-cyan-300">Chrome / Mobile Browser:</p>
                  <p>1. Tap the browser menu (<strong className="text-white">⋮</strong> three dots at top-right).</p>
                  <p>2. Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-[44px] px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
