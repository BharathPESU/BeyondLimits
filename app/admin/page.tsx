import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminServerSession } from '@/lib/admin-auth';
import {
  getAdminAppTelemetry,
  getActiveMotivationalSongs,
  getActiveWorkoutRoutines,
} from '@/lib/admin-data-service';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getAdminServerSession();

  if (!session) {
    redirect('/sign-in?tab=admin');
  }

  const [stats, songs, routines] = await Promise.all([
    getAdminAppTelemetry(),
    getActiveMotivationalSongs(),
    getActiveWorkoutRoutines(),
  ]);

  return (
    <AdminDashboardClient
      initialStats={stats}
      initialSongs={songs}
      initialRoutines={routines}
      adminUsername={session.username}
    />
  );
}

