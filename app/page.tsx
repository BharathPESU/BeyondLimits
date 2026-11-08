import React from 'react';
import { getDashboardPayload } from '@/lib/db';
import DisciplineDashboardClient from '@/components/DisciplineDashboardClient';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const initialData = getDashboardPayload();

  return <DisciplineDashboardClient initialData={initialData} />;
}
