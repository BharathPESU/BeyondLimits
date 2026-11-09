import React from 'react';
import Image from 'next/image';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 selection:bg-emerald-600 selection:text-white">
      <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-black p-1 shadow-md border border-slate-200 animate-pulse mb-4">
        <Image
          src="/logo.png"
          alt="Loading BeyondLimits"
          width={80}
          height={80}
          priority
          className="w-full h-full object-contain"
        />
      </div>
      <p className="text-xs font-bold text-slate-500 tracking-widest uppercase animate-pulse">
        Securing session...
      </p>
    </div>
  );
}

