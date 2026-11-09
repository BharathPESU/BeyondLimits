'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';
import AuthGlassLayout, { authClerkAppearance } from '@/components/AuthGlassLayout';
import AdminLoginForm from '@/components/AdminLoginForm';
import { User, ShieldCheck } from 'lucide-react';

function SignInContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'athlete' | 'admin'>('athlete');

  useEffect(() => {
    if (searchParams.get('tab') === 'admin' || searchParams.get('admin') === 'true') {
      setActiveTab('admin');
    }
  }, [searchParams]);

  return (
    <div className="w-full space-y-4">
      {/* Switcher Tabs: Athlete Login vs Admin Portal */}
      <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('athlete')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'athlete'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Athlete Login</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'admin'
              ? 'bg-white text-teal-800 shadow-sm border border-teal-200/50'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
          <span>Admin Portal (MFA)</span>
        </button>
      </div>

      {/* Tab 1: Regular Athlete Login */}
      {activeTab === 'athlete' ? (
        <div className="w-full flex flex-col items-center space-y-3">
          <SignIn
            appearance={authClerkAppearance}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
          />

          {/* Simple Button with name "Admin Login" (Same colour as Continue button, directly below it) */}
          <div className="w-full pt-2 border-t border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 text-white font-bold rounded-2xl py-3.5 px-6 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all duration-200 cursor-pointer text-sm tracking-wider uppercase flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Login</span>
            </button>
          </div>
        </div>
      ) : (
        /* Tab 2: Admin Portal with Username, Password & Microsoft Authenticator MFA */
        <div className="w-full space-y-4">
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm text-left">
            <AdminLoginForm />
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('athlete')}
            className="w-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-2xl py-3.5 px-4 transition-all duration-200 cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-200"
          >
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>Back to Athlete Login</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <AuthGlassLayout subtitle="Sign in to your BeyondLimits account">
      <Suspense
        fallback={
          <div className="h-72 w-full flex items-center justify-center text-slate-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
            Loading secure sign-in...
          </div>
        }
      >
        <SignInContent />
      </Suspense>
    </AuthGlassLayout>
  );
}
