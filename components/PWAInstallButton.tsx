'use client';

import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '@/hooks/use-pwa-install';

export default function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-cyan-400 bg-slate-900 hover:bg-slate-800 border border-cyan-800/40 rounded-xl transition-all shadow-sm hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] whitespace-nowrap shrink-0 cursor-pointer"
        title="Install full-screen mobile app"
      >
        <Download className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>Install App</span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-slate-900 text-white p-6 border border-cyan-900/40 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Install Full-Screen App
                  </h3>
                  <p className="text-xs text-cyan-400/80">
                    Runs like a native app without browser URL bars
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-sm text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <p className="font-semibold text-cyan-300">
                  On iPhone / iPad (Safari):
                </p>
                <div className="space-y-2 text-xs text-slate-300">
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-cyan-400">1.</span>
                    <span>Tap the <strong>Share</strong> icon (square with arrow) at the bottom.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-cyan-400">2.</span>
                    <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-cyan-400">3.</span>
                    <span>Tap <strong>Add</strong> in the top-right corner.</span>
                  </p>
                  <p className="flex items-start gap-2 pt-1 text-teal-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Launch the app icon from your home screen for edge-to-edge full screen!</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <p className="font-semibold text-cyan-300">
                  On Android (Chrome / Brave):
                </p>
                <div className="space-y-2 text-xs text-slate-300">
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-cyan-400">1.</span>
                    <span>Tap the browser menu (<strong>⋮</strong> three dots in top-right).</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-cyan-400">2.</span>
                    <span>Select <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-cyan-400">3.</span>
                    <span>Tap <strong>Install</strong> on the confirmation popup.</span>
                  </p>
                  <p className="flex items-start gap-2 pt-1 text-teal-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Chrome will install it as a real standalone app with no browser address bar!</span>
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full min-h-[44px] rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition-colors cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.25)]"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
