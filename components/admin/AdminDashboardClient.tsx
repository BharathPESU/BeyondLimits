'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Users,
  Dumbbell,
  Music,
  Database,
  Smartphone,
  LogOut,
  ExternalLink,
  Plus,
  Trash2,
  Edit,
  Save,
  Check,
  Copy,
  AlertCircle,
  Play,
  Pause,
  Search,
  ChevronLeft,
  ChevronRight,
  Flame,
  Clock,
  Sparkles,
  RefreshCw,
  Eye,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { MotivationalSong } from '@/lib/motivation-media-data';
import { WorkoutExercise, WorkoutRoutine } from '@/lib/workout-data';
import { AdminTableName, ALLOWED_ADMIN_TABLES } from '@/lib/admin-constants';

interface AdminDashboardClientProps {
  initialStats: {
    totalUsers: number;
    totalWorkouts: number;
    totalAttendanceLogs: number;
    totalExercises: number;
    activeStreaksCount: number;
    recentUsers: Array<{
      id: string;
      fullName: string;
      email: string;
      createdAt: string;
      shortName: string;
    }>;
  };
  initialSongs: MotivationalSong[];
  initialRoutines: WorkoutRoutine[];
  adminUsername: string;
}

export default function AdminDashboardClient({
  initialStats,
  initialSongs,
  initialRoutines,
  adminUsername,
}: AdminDashboardClientProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'workouts' | 'songs' | 'database' | 'mfa'>('overview');
  const [stats, setStats] = useState(initialStats);
  const [songs, setSongs] = useState<MotivationalSong[]>(initialSongs);
  const [routines, setRoutines] = useState<WorkoutRoutine[]>(initialRoutines);
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState<number>(0);

  // Status notification banners
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit Song State
  const [editingSong, setEditingSong] = useState<MotivationalSong | null>(null);
  const [isAddingSong, setIsAddingSong] = useState(false);

  // Edit Exercise State
  const [editingExercise, setEditingExercise] = useState<{
    routineIndex: number;
    exercise: WorkoutExercise;
    isNew?: boolean;
  } | null>(null);

  // Supabase Table Explorer State
  const [selectedTable, setSelectedTable] = useState<AdminTableName>('users_profile');
  const [tableRows, setTableRows] = useState<Record<string, unknown>[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [tableTotalCount, setTableTotalCount] = useState<number>(0);
  const [tablePage, setTablePage] = useState<number>(1);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [isTableLoading, setIsTableLoading] = useState<boolean>(false);

  // MFA Settings State
  const [mfaSecret, setMfaSecret] = useState('BEYONDLIMITSMFAADMINKEY234567AB');
  const [formattedSecret, setFormattedSecret] = useState('BEYO NDLI MITS MFAA DMIN KEY2 3456 7AB');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [testTotpCode, setTestTotpCode] = useState('');
  const [totpTestResult, setTotpTestResult] = useState<{ valid: boolean; message: string; hint?: string } | null>(null);
  const [isTestingTotp, setIsTestingTotp] = useState(false);

  // Audio preview player
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [previewAudioPlaying, setPreviewAudioPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Auto-dismiss save messages
  useEffect(() => {
    if (saveSuccessMsg) {
      const timer = setTimeout(() => setSaveSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccessMsg]);

  // Load MFA Secret from server
  useEffect(() => {
    fetch('/api/admin/mfa-setup')
      .then((res) => res.json())
      .then((data) => {
        if (data.secret) {
          setMfaSecret(data.secret);
          setFormattedSecret(data.formattedSecret || data.secret);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Supabase Table Data when tab or table changes
  const fetchTableData = async (table: AdminTableName, page: number = 1, search: string = '') => {
    setIsTableLoading(true);
    try {
      const url = `/api/admin/tables?table=${encodeURIComponent(table)}&page=${page}&pageSize=25&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setTableRows(data.rows || []);
        setTableColumns(data.columns || []);
        setTableTotalCount(data.totalCount || 0);
      }
    } catch {
      // Ignore fetch error
    } finally {
      setIsTableLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'database') {
      fetchTableData(selectedTable, tablePage, tableSearch);
    }
  }, [activeTab, selectedTable, tablePage]);

  // Helper to extract clean 11-char YouTube ID from URL or raw ID
  const parseYouTubeId = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : trimmed;
  };

  // Save Motivational Songs to Supabase
  const handleSaveSongs = async () => {
    setIsSaving(true);
    setSaveErrorMsg(null);
    try {
      const res = await fetch('/api/admin/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(songs),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveErrorMsg(data.error || 'Failed to save songs');
      } else {
        setSaveSuccessMsg(`Successfully saved and synced ${songs.length} songs across all user accounts!`);
      }
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Save Workout Routines & Exercises to Supabase
  const handleSaveRoutines = async () => {
    setIsSaving(true);
    setSaveErrorMsg(null);
    try {
      const res = await fetch('/api/admin/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routines),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveErrorMsg(data.error || 'Failed to save workouts');
      } else {
        setSaveSuccessMsg(`Successfully saved and synced ${routines.length} workout routines across all user accounts!`);
      }
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Test 6-digit TOTP Code
  const handleTestTotp = async () => {
    if (!testTotpCode.trim() || testTotpCode.trim().length !== 6) return;
    setIsTestingTotp(true);
    setTotpTestResult(null);
    try {
      const res = await fetch('/api/admin/mfa-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: testTotpCode.trim() }),
      });
      const data = await res.json();
      setTotpTestResult(data);
    } catch {
      setTotpTestResult({ valid: false, message: 'Server verification failed' });
    } finally {
      setIsTestingTotp(false);
    }
  };

  // Audio preview play/pause
  const togglePreviewAudio = (url: string) => {
    if (audioElement && previewAudioUrl === url && previewAudioPlaying) {
      audioElement.pause();
      setPreviewAudioPlaying(false);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(url);
    audio.onended = () => setPreviewAudioPlaying(false);
    audio.onerror = () => setPreviewAudioPlaying(false);
    audio.play().then(() => {
      setAudioElement(audio);
      setPreviewAudioUrl(url);
      setPreviewAudioPlaying(true);
    }).catch(() => {
      setPreviewAudioPlaying(false);
    });
  };

  // Logout handler
  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/sign-in');
    router.refresh();
  };

  const currentRoutine = routines[selectedRoutineIndex] || routines[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 p-1 border border-slate-800 flex items-center justify-center shrink-0 shadow-sm">
              <Image src="/logo.png" alt="BeyondLimits Logo" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  BeyondLimits Admin
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  <ShieldCheck className="w-3 h-3 text-teal-700" />
                  MFA Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Master Control Center · Authenticated as <strong className="text-slate-800">{adminUsername}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors"
            >
              <span>View Live App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
              title="Sign Out as Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Overview &amp; Users</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workouts')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'workouts'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>Workouts &amp; Exercises ({routines.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('songs')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'songs'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Motivational Songs ({songs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'database'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Supabase Tables</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mfa')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'mfa'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>MFA &amp; Security</span>
          </button>
        </div>

        {/* Global Save Messages */}
        {saveSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
        {saveErrorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{saveErrorMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & USERS METRICS                                           */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-500">Registered Users</span>
                  <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{stats.totalUsers}</div>
                <p className="text-[11px] text-slate-400 mt-1">Athletes registered in BeyondLimits</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-500">Workouts Logged</span>
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{stats.totalWorkouts}</div>
                <p className="text-[11px] text-slate-400 mt-1">Completed workout sessions</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-500">Attendance Days</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                    <Flame className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{stats.totalAttendanceLogs}</div>
                <p className="text-[11px] text-slate-400 mt-1">Discipline check-in logs</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-500">Exercises in Catalog</span>
                  <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{stats.totalExercises}</div>
                <p className="text-[11px] text-slate-400 mt-1">Active movements cataloged</p>
              </div>
            </div>

            {/* Recent Registered Users Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Registered Athletes</h3>
                  <p className="text-xs text-slate-500">Athletes currently synced with Supabase</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTable('users_profile');
                    setActiveTab('database');
                  }}
                  className="text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer"
                >
                  View All in Table Explorer &rarr;
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Athlete Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">User ID</th>
                      <th className="py-2.5 px-3">Joined Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.recentUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {u.shortName || u.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{u.fullName}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">{u.id}</td>
                        <td className="py-3 px-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: WORKOUT ROUTINES & EXERCISES                                       */}
        {/* ========================================================================= */}
        {activeTab === 'workouts' && (
          <div className="space-y-6">
            {/* Routine Selector Bar & Primary Action */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900">Workout Routines Manager</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    {routines.length} Routines
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Switch between Full Body, Leg Workout, Chest Workout, and Core routines or add new exercises with custom voiceovers.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const newRoutine: WorkoutRoutine = {
                      id: `routine_${Date.now()}`,
                      name: `New Custom Workout Routine ${routines.length + 1}`,
                      category: 'custom',
                      description: 'Custom exercise routine configured by admin.',
                      badge: 'Custom',
                      exercises: [],
                    };
                    setRoutines([...routines, newRoutine]);
                    setSelectedRoutineIndex(routines.length);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ New Routine</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveRoutines}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save & Sync Workouts'}</span>
                </button>
              </div>
            </div>

            {/* Routine Selectors (Pills) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {routines.map((routine, idx) => (
                <button
                  key={routine.id}
                  type="button"
                  onClick={() => setSelectedRoutineIndex(idx)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                    selectedRoutineIndex === idx
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  <span>{routine.name}</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-white/20 font-mono">
                    {routine.exercises.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Selected Routine Detail & Exercises Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                      {currentRoutine.badge}
                    </span>
                    <h4 className="text-lg font-black text-slate-900">{currentRoutine.name}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{currentRoutine.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newEx: WorkoutExercise = {
                      id: `exercise_${Date.now()}`,
                      order: currentRoutine.exercises.length + 1,
                      name: 'New Exercise',
                      durationSeconds: 60,
                      image: '/assets/aistudio/exercises/exercise1_jumping_jacks.png',
                      focus: 'Full Body Conditioning',
                      description: 'Perform with solid form for the full duration.',
                      tips: ['Keep core engaged', 'Breathe rhythmically'],
                      voiceClipUrl: `/voice/exercise_complete_${Math.min(12, currentRoutine.exercises.length + 1)}.mp3`,
                    };
                    setEditingExercise({
                      routineIndex: selectedRoutineIndex,
                      exercise: newEx,
                      isNew: true,
                    });
                  }}
                  className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Exercise</span>
                </button>
              </div>

              {/* Exercises List */}
              <div className="space-y-3">
                {currentRoutine.exercises.map((exercise, exIdx) => (
                  <div
                    key={exercise.id}
                    className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 overflow-hidden relative shrink-0">
                        <Image src={exercise.image} alt={exercise.name} fill sizes="56px" className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-teal-700">#{exIdx + 1}</span>
                          <h5 className="text-sm font-extrabold text-slate-900 truncate">{exercise.name}</h5>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700">
                            {exercise.durationSeconds}s
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{exercise.focus}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]">
                            {exercise.voiceClipUrl}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePreviewAudio(exercise.voiceClipUrl)}
                            className="p-1 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors cursor-pointer"
                            title="Preview Voiceover Clip"
                          >
                            {previewAudioPlaying && previewAudioUrl === exercise.voiceClipUrl ? (
                              <Pause className="w-3 h-3 fill-current" />
                            ) : (
                              <Play className="w-3 h-3 fill-current" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingExercise({
                            routineIndex: selectedRoutineIndex,
                            exercise: { ...exercise },
                            isNew: false,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...routines];
                          updated[selectedRoutineIndex].exercises = updated[selectedRoutineIndex].exercises.filter(
                            (_, i) => i !== exIdx
                          );
                          setRoutines(updated);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Exercise"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MOTIVATIONAL SONGS & YOUTUBE LINKS                                 */}
        {/* ========================================================================= */}
        {activeTab === 'songs' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900">Motivational Songs &amp; YouTube Links</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    {songs.length} Tracks
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Update YouTube track links, titles, quotes, or add high-energy workout songs. Changes sync directly to athlete dashboards.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddingSong(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Track</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveSongs}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save & Sync Songs'}</span>
                </button>
              </div>
            </div>

            {/* Songs Grid / Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Track &amp; Artist</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">YouTube Video ID</th>
                      <th className="py-2.5 px-3">Energy</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {songs.map((song, idx) => (
                      <tr key={song.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-bold text-teal-700">#{song.id}</td>
                        <td className="py-3 px-3">
                          <p className="font-extrabold text-slate-900">{song.title}</p>
                          <p className="text-slate-500 text-[11px]">{song.artist}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {song.category || 'Soundtrack'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]">
                              {song.defaultVideoIds[0]}
                            </code>
                            <a
                              href={`https://www.youtube.com/watch?v=${song.defaultVideoIds[0]}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-teal-700 hover:text-teal-800 p-0.5"
                              title="Test YouTube Video in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-amber-600 uppercase text-[10px]">
                            {song.energyLevel || 'High Energy'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingSong({ ...song })}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setSongs(songs.filter((s) => s.id !== song.id))}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove Track"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SUPABASE TABLES EXPLORER                                           */}
        {/* ========================================================================= */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900">Supabase Database Tables</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    Live Supabase
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Inspect raw rows and records across all application tables. Total records in {selectedTable}:{' '}
                  <strong className="text-slate-800">{tableTotalCount}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <select
                  value={selectedTable}
                  onChange={(e) => {
                    setSelectedTable(e.target.value as AdminTableName);
                    setTablePage(1);
                  }}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-teal-600 transition-colors cursor-pointer"
                >
                  {ALLOWED_ADMIN_TABLES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => fetchTableData(selectedTable, tablePage, tableSearch)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  title="Refresh Table Data"
                >
                  <RefreshCw className={`w-4 h-4 ${isTableLoading ? 'animate-spin text-teal-700' : ''}`} />
                </button>
              </div>
            </div>

            {/* Table Rows Viewer */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              {/* Table search & page controls */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs text-slate-500">
                  Showing {tableRows.length} of {tableTotalCount} rows (Page {tablePage})
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={tablePage <= 1}
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-bold px-2">{tablePage}</span>
                  <button
                    type="button"
                    disabled={tableRows.length < 25}
                    onClick={() => setTablePage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Rows Grid */}
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                {isTableLoading ? (
                  <div className="py-16 text-center text-xs font-semibold text-slate-400 animate-pulse">
                    Loading records from Supabase...
                  </div>
                ) : tableRows.length === 0 ? (
                  <div className="py-16 text-center text-xs font-semibold text-slate-400">
                    No records found in table &ldquo;{selectedTable}&rdquo;.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        {tableColumns.map((col) => (
                          <th key={col} className="py-2.5 px-3 whitespace-nowrap bg-slate-50">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {tableRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                          {tableColumns.map((col) => {
                            const val = row[col];
                            const isNull = val === null || val === undefined;
                            const isBool = typeof val === 'boolean';
                            const isObj = typeof val === 'object' && !isNull;

                            return (
                              <td key={col} className="py-2.5 px-3 max-w-xs truncate text-slate-700">
                                {isNull ? (
                                  <span className="text-slate-300 italic">null</span>
                                ) : isBool ? (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      val ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {String(val)}
                                  </span>
                                ) : isObj ? (
                                  <span className="text-teal-700 font-mono text-[10px]">
                                    {JSON.stringify(val)}
                                  </span>
                                ) : (
                                  <span>{String(val)}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: MFA & MICROSOFT AUTHENTICATOR SETTINGS                             */}
        {/* ========================================================================= */}
        {activeTab === 'mfa' && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="p-2.5 rounded-2xl bg-teal-50 text-teal-700">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Microsoft Authenticator MFA Configuration</h3>
                  <p className="text-xs text-slate-500">
                    RFC 6238 Time-based One-Time Password (TOTP) · Generates 6-digit code every 30 seconds
                  </p>
                </div>
              </div>

              {/* Secret Key Display Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Base32 Secret Key for Microsoft Authenticator:
                </span>
                <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                  <code className="text-sm sm:text-base font-bold font-mono text-teal-900 select-all break-all">
                    {mfaSecret}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(mfaSecret);
                      setCopiedSecret(true);
                      setTimeout(() => setCopiedSecret(false), 2500);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedSecret ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSecret ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Formatted in 4-character blocks: <span className="font-mono text-slate-700">{formattedSecret}</span>
                </p>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Step-by-Step Configuration:
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-600 leading-relaxed">
                  <li>Open the <strong>Microsoft Authenticator</strong> app on your Android or iPhone device.</li>
                  <li>Tap the <strong>+</strong> button (Add account) &rarr; Choose <strong>Other (Google, Facebook, etc.)</strong>.</li>
                  <li>Tap <strong>&ldquo;Or enter code manually&rdquo;</strong> at the bottom of the scanner screen.</li>
                  <li>Enter <strong>Account name:</strong> <code className="text-slate-900 font-bold">BeyondLimits Admin</code></li>
                  <li>Enter <strong>Secret key:</strong> Paste or type <code className="text-teal-800 font-bold">{mfaSecret}</code></li>
                  <li>Tap <strong>Finish</strong> or <strong>Save</strong>.</li>
                </ol>
              </div>

              {/* Live TOTP Verification Tester */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Test Your Live Microsoft Authenticator Code:
                </h4>
                <p className="text-xs text-slate-500">
                  Enter the 6 digits currently appearing on your phone screen to verify that your app is synced with the server time.
                </p>

                <div className="flex items-center gap-3 max-w-sm">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={testTotpCode}
                    onChange={(e) => setTestTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000 000"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-mono font-bold tracking-widest text-slate-900 outline-none focus:border-teal-600"
                  />
                  <button
                    type="button"
                    onClick={handleTestTotp}
                    disabled={isTestingTotp || testTotpCode.length !== 6}
                    className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    {isTestingTotp ? 'Testing...' : 'Verify Code'}
                  </button>
                </div>

                {totpTestResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 max-w-md ${
                      totpTestResult.valid
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {totpTestResult.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{totpTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: EDIT / ADD MOTIVATIONAL SONG                                       */}
      {/* ========================================================================= */}
      {(editingSong || isAddingSong) && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-base text-slate-900">
                {isAddingSong ? 'Add New Motivational Track' : `Edit Track #${editingSong?.id}`}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setEditingSong(null);
                  setIsAddingSong(false);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Track Title</label>
                <input
                  type="text"
                  value={editingSong ? editingSong.title : ''}
                  onChange={(e) =>
                    setEditingSong((s) => (s ? { ...s, title: e.target.value } : null))
                  }
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-teal-600"
                  placeholder="Song Title"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Artist</label>
                <input
                  type="text"
                  value={editingSong ? editingSong.artist : ''}
                  onChange={(e) =>
                    setEditingSong((s) => (s ? { ...s, artist: e.target.value } : null))
                  }
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-teal-600"
                  placeholder="Artist Name"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  YouTube Video Link or ID
                </label>
                <input
                  type="text"
                  value={editingSong ? editingSong.defaultVideoIds[0] : ''}
                  onChange={(e) => {
                    const parsed = parseYouTubeId(e.target.value);
                    setEditingSong((s) =>
                      s ? { ...s, defaultVideoIds: [parsed] } : null
                    );
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-teal-600"
                  placeholder="e.g. 1a2b3c4d5e6 or https://www.youtube.com/watch?v=..."
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Paste the full YouTube URL or the 11-character video ID.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Category</label>
                <input
                  type="text"
                  value={editingSong?.category || ''}
                  onChange={(e) =>
                    setEditingSong((s) => (s ? { ...s, category: e.target.value } : null))
                  }
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-teal-600"
                  placeholder="e.g. War / Rap, Cinematic, Rock"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Motivational Quote</label>
                <input
                  type="text"
                  value={editingSong?.quote || ''}
                  onChange={(e) =>
                    setEditingSong((s) => (s ? { ...s, quote: e.target.value } : null))
                  }
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-teal-600"
                  placeholder="Short motivational quote"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setEditingSong(null);
                  setIsAddingSong(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingSong) {
                    if (isAddingSong) {
                      setSongs([...songs, { ...editingSong, id: songs.length + 1 }]);
                    } else {
                      setSongs(songs.map((s) => (s.id === editingSong.id ? editingSong : s)));
                    }
                  }
                  setEditingSong(null);
                  setIsAddingSong(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT / ADD EXERCISE                                                */}
      {/* ========================================================================= */}
      {editingExercise && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-base text-slate-900">
                {editingExercise.isNew ? 'Add New Exercise' : `Edit ${editingExercise.exercise.name}`}
              </h4>
              <button
                type="button"
                onClick={() => setEditingExercise(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Exercise Name</label>
                <input
                  type="text"
                  value={editingExercise.exercise.name}
                  onChange={(e) =>
                    setEditingExercise({
                      ...editingExercise,
                      exercise: { ...editingExercise.exercise, name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    value={editingExercise.exercise.durationSeconds}
                    onChange={(e) =>
                      setEditingExercise({
                        ...editingExercise,
                        exercise: {
                          ...editingExercise.exercise,
                          durationSeconds: parseInt(e.target.value, 10) || 60,
                        },
                      })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Focus Muscle Group</label>
                  <input
                    type="text"
                    value={editingExercise.exercise.focus}
                    onChange={(e) =>
                      setEditingExercise({
                        ...editingExercise,
                        exercise: { ...editingExercise.exercise, focus: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Illustration Image URL</label>
                <input
                  type="text"
                  value={editingExercise.exercise.image}
                  onChange={(e) =>
                    setEditingExercise({
                      ...editingExercise,
                      exercise: { ...editingExercise.exercise, image: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 outline-none focus:border-teal-600"
                  placeholder="/assets/aistudio/exercises/exercise2_squats.png"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Voiceover Audio Clip URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingExercise.exercise.voiceClipUrl}
                    onChange={(e) =>
                      setEditingExercise({
                        ...editingExercise,
                        exercise: { ...editingExercise.exercise, voiceClipUrl: e.target.value },
                      })
                    }
                    className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 outline-none focus:border-teal-600"
                    placeholder="/voice/exercise_complete_1.mp3"
                  />
                  <button
                    type="button"
                    onClick={() => togglePreviewAudio(editingExercise.exercise.voiceClipUrl)}
                    className="p-2.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors cursor-pointer"
                    title="Preview Audio"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingExercise.exercise.description}
                  onChange={(e) =>
                    setEditingExercise({
                      ...editingExercise,
                      exercise: { ...editingExercise.exercise, description: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingExercise(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = [...routines];
                  const rIdx = editingExercise.routineIndex;
                  if (editingExercise.isNew) {
                    updated[rIdx].exercises.push(editingExercise.exercise);
                  } else {
                    updated[rIdx].exercises = updated[rIdx].exercises.map((ex) =>
                      ex.id === editingExercise.exercise.id ? editingExercise.exercise : ex
                    );
                  }
                  setRoutines(updated);
                  setEditingExercise(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Save Exercise
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
