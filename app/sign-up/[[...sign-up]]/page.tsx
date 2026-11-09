'use client';

import React, { Suspense } from 'react';
import { SignUp } from '@clerk/nextjs';
import AuthGlassLayout, { authClerkAppearance } from '@/components/AuthGlassLayout';

export default function SignUpPage() {
  return (
    <AuthGlassLayout subtitle="Create your new account">
      <Suspense
        fallback={
          <div className="h-72 w-full flex items-center justify-center text-slate-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
            Loading secure sign-up...
          </div>
        }
      >
        <SignUp
          appearance={authClerkAppearance}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
        />
      </Suspense>
    </AuthGlassLayout>
  );
}
