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
        <SignIn
          appearance={authClerkAppearance}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
        />
      ) : (
        /* Tab 2: Admin Portal with Username, Password & Microsoft Authenticator MFA */
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <AdminLoginForm />
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
