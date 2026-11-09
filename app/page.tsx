import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { getDashboardPayload } from '@/lib/db';
import DisciplineDashboardClient from '@/components/DisciplineDashboardClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Enforce server-side authentication protection
  await auth.protect();
  const initialData = getDashboardPayload();

  return <DisciplineDashboardClient initialData={initialData} />;
}

