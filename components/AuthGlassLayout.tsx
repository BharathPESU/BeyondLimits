'use client';

import React from 'react';
import Image from 'next/image';

export const authClerkAppearance = {
  options: {
    unsafe_disableDevelopmentModeWarnings: true,
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'w-full shadow-none bg-transparent flex justify-center',
    card: 'w-full bg-transparent shadow-none p-0 text-slate-900 flex flex-col items-center',
    header: 'hidden',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    formHeader: 'hidden',
    formHeaderTitle: 'hidden',
    formHeaderSubtitle: 'hidden',
    form: 'w-full flex flex-col items-center',
    formContainer: 'w-full',
    
    // Google OAuth Button
    socialButtonsRoot: 'w-full flex justify-center',
    socialButtons: 'w-full',
    socialButtonsBlockButton:
      'w-full bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-2xl py-3 px-4 transition-all duration-200 active:scale-[0.98] shadow-sm flex items-center justify-center gap-3 cursor-pointer text-sm',
    socialButtonsBlockButtonText: 'text-slate-700 font-semibold text-sm',
    socialButtonsBlockButtonIcon: 'w-5 h-5 shrink-0',
    
    // Divider
    dividerRow: 'w-full my-4 flex items-center justify-center',
    dividerLine: 'bg-slate-200 h-px flex-1',
    dividerText: 'text-slate-400 text-xs uppercase tracking-wider font-semibold px-3 shrink-0',
    
    // Form Inputs & Labels
    formFieldRow: 'w-full mb-3.5',
    formField: 'w-full',
    formFieldLabelRow: 'w-full flex items-center justify-between mb-1.5',
    formFieldLabel: 'text-slate-700 text-xs font-bold uppercase tracking-wider pl-1 block',
    formFieldInput:
      'w-full bg-white hover:bg-slate-50/50 focus:bg-white border border-slate-300 focus:border-emerald-600 text-slate-900 placeholder:text-slate-400 rounded-2xl py-3 px-4 outline-none transition-all duration-200 shadow-sm text-sm font-medium focus:ring-4 focus:ring-emerald-500/10',
    formFieldAction:
      'text-emerald-600 hover:text-emerald-700 text-xs font-semibold transition-colors cursor-pointer ml-auto',
    
    // Primary Submit Button (Emerald Green)
    formButtonPrimary:
      'w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 text-white font-bold rounded-2xl py-3.5 px-6 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all duration-200 cursor-pointer text-sm tracking-wider uppercase mt-3',
    
    // Footer & Links
    footer: 'w-full mt-5 pt-4 border-t border-slate-100 bg-transparent flex flex-col items-center text-center',
    footerAction: 'w-full flex items-center justify-center text-center',
    footerActionText: 'text-slate-600 text-xs font-medium',
    footerActionLink: 'text-emerald-600 hover:text-emerald-700 font-bold ml-1.5 text-xs transition-colors hover:underline',
    footerPages: 'hidden',
    footerPagesLink: 'hidden',
    
    // Identity Preview & Alert Boxes
    identityPreview: 'w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between mb-3',
    identityPreviewText: 'text-slate-900 font-semibold text-sm',
    identityPreviewEditButton: 'text-emerald-600 hover:text-emerald-700 font-bold text-xs',
    alert: 'w-full bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 text-xs mb-4 text-center',
    alertText: 'text-red-700 text-xs font-medium',
    formResendCodeLink: 'text-emerald-600 hover:text-emerald-700 font-bold text-xs',
    otpCodeFieldInput:
      'bg-white border border-slate-300 text-slate-900 rounded-xl text-lg font-mono focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20',
  },
  variables: {
    colorBackground: '#ffffff',
    colorText: '#0f172a',
    colorPrimary: '#059669',
    colorInputBackground: '#ffffff',
    colorInputText: '#0f172a',
    colorTextSecondary: '#64748b',
    borderRadius: '1rem',
  },
};

interface AuthGlassLayoutProps {
  children: React.ReactNode;
  subtitle?: string;
}

export default function AuthGlassLayout({
  children,
  subtitle = 'Discipline, Fitness & Attendance',
}: AuthGlassLayoutProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-slate-50 selection:bg-emerald-600 selection:text-white">
      {/* Main Centered Clean White Card */}
      <div className="w-full max-w-[420px] sm:max-w-[450px] mx-auto rounded-3xl bg-white border border-slate-200/90 shadow-xl shadow-slate-200/60 p-6 sm:p-8 flex flex-col items-center justify-center text-center">
        {/* BeyondLimits Brand Header */}
        <div className="flex flex-col items-center mb-5 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-black p-1 shadow-md border border-slate-200 mb-3 transition-transform hover:scale-105 duration-300">
            <Image
              src="/logo.png"
              alt="BeyondLimits Logo"
              width={80}
              height={80}
              priority
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            BEYOND<span className="text-emerald-600">LIMITS</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium max-w-[280px]">
            {subtitle}
          </p>
        </div>

        {/* Auth Component Container */}
        <div className="w-full flex flex-col items-center">{children}</div>
      </div>
    </div>
  );
}
