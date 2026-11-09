'use client';

import React, { Suspense } from 'react';
import { SignIn } from '@clerk/nextjs';
import AuthGlassLayout, { authClerkAppearance } from '@/components/AuthGlassLayout';

export default function SignInPage() {
  return (
    <AuthGlassLayout subtitle="Sign in to your account">
      <Suspense
        fallback={
          <div className="h-72 w-full flex items-center justify-center text-slate-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
            Loading secure sign-in...
          </div>
        }
      >
        <SignIn
          appearance={authClerkAppearance}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
        />
      </Suspense>
    </AuthGlassLayout>
  );
}
