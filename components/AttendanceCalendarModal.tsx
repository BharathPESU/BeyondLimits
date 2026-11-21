'use client';

import React, { useState, useMemo } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  X,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Edit3,
  TrendingUp,
  Award,
  Sparkles,
  Lightbulb,
  Zap,
  BarChart3,
} from 'lucide-react';
import { AttendanceRecord, FriendId } from '@/lib/types';

interface AttendanceCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AttendanceRecord[];
  onEditDay: (friendId: FriendId, date: string) => void;
  userName?: string;
}

export default function AttendanceCalendarModal({
  isOpen,
  onClose,
  records,
  onEditDay,
  userName,
}: AttendanceCalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() =>
    format(new Date(), 'yyyy-MM-dd')
  );

  // Determine display name
  const cachedProfileName =
    typeof window !== 'undefined'
      ? (() => {
          try {
            const raw = localStorage.getItem('beyondlimits_user_profile');
            return raw ? JSON.parse(raw).name : '';
          } catch {
            return '';
          }
        })()
      : '';
  const displayName = userName || cachedProfileName || 'You';

  // Map user records by date for O(1) lookup
  // Priority: record with friendId 'user', then 'bharath_cd', then any record for that day
  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const rec of records) {
      const existing = map.get(rec.date);
      if (!existing) {
        map.set(rec.date, rec);
      } else if (rec.friendId === 'user') {
        map.set(rec.date, rec);
      } else if (existing.friendId !== 'user' && rec.friendId === 'bharath_cd') {
        map.set(rec.date, rec);
      }
    }
    return map;
  }, [records]);

  if (!isOpen) {
    return null;
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const selectedDayRecord = recordsByDate.get(selectedDayStr);

  // Monthly stats for the current visible month
  const monthPrefix = format(currentMonth, 'yyyy-MM');
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  let cleanMonthCount = 0;
  let relapseMonthCount = 0;
  let totalMarkedMonth = 0;

  for (const d of monthDays) {
    const dStr = format(d, 'yyyy-MM-dd');
    const rec = recordsByDate.get(dStr);
    if (rec) {
      totalMarkedMonth++;
      if (rec.relapsed) {
        relapseMonthCount++;
      } else {
        cleanMonthCount++;
      }
    }
  }

  const monthControlRate =
    totalMarkedMonth > 0
      ? Math.round((cleanMonthCount / totalMarkedMonth) * 100)
      : 100;
  const monthRelapseRate =
    totalMarkedMonth > 0
      ? Math.round((relapseMonthCount / totalMarkedMonth) * 100)
      : 0;

  // Streak calculation up to selected month / overall
  const allUserRecordsAsc = Array.from(recordsByDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  let currentStreak = 0;
  for (let i = allUserRecordsAsc.length - 1; i >= 0; i--) {
    if (!allUserRecordsAsc[i].relapsed) {
      currentStreak++;
    } else {
      break;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Full-Screen Sticky Header with Safe Area & Left Back Arrow */}
      <div className="bg-slate-950/95 border-b border-slate-800/80 px-4 sm:px-6 pt-[max(env(safe-area-inset-top),16px)] pb-3.5 shrink-0">
        <div className="max-w-4xl w-full mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] min-w-[42px] -ml-2 flex items-center justify-center rounded-2xl bg-slate-900 border border-teal-500/40 text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
              Self-Control Attendance Calendar
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Track your monthly habit consistency &amp; impulse control for {displayName}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-white">
        <div className="max-w-4xl w-full mx-auto cyber-card p-4 sm:p-6 space-y-5">
          {/* Month Navigation & Quick Actions (Ref Image 3) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                aria-label="Previous Month"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 text-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-black text-white min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                aria-label="Next Month"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 text-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(now);
                  setSelectedDayStr(format(now, 'yyyy-MM-dd'));
                }}
                className="cyber-btn-primary min-h-[40px] px-4 text-xs font-black rounded-xl cursor-pointer"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/60 text-rose-300 border border-rose-600/40">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Clean (Controlled)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-950/60 text-lime-300 border border-lime-400/40">
                <span className="w-2 h-2 rounded-full bg-lime-400" />
                Relapsed
              </span>
            </div>
          </div>

          {/* Monthly Self-Control Analytics 2x2 Grid (Ref Image 3) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-teal-500/30 relative overflow-hidden">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-400 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Monthly Control Rate</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-teal-400 mt-1">
                {monthControlRate}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {totalMarkedMonth > 0
                  ? `${cleanMonthCount} clean of ${totalMarkedMonth} logged`
                  : 'No logs this month'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 relative overflow-hidden">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                <CalendarIcon className="w-4 h-4 text-amber-400" />
                <span>Clean Days</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-amber-400 mt-1">
                {cleanMonthCount} <span className="text-xs font-bold">Days ✓</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Urges overridden
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/30 relative overflow-hidden">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                <BarChart3 className="w-4 h-4 text-rose-400" />
                <span>Monthly Relapses</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-rose-400 mt-1">
                {relapseMonthCount} <span className="text-xs font-bold">Times ↗</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Relapse rate: {monthRelapseRate}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 relative overflow-hidden">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Active Streak</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-emerald-400 mt-1">
                {currentStreak} <span className="text-xs font-bold">Days</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Consecutive clean
              </div>
            </div>
          </div>

          {/* Self-Control Progress Evaluation Banner (Ref Image 3) */}
          <div className="p-4 rounded-2xl border border-teal-500/40 bg-teal-950/20 text-xs leading-relaxed flex items-start gap-3 shadow-sm">
            <Lightbulb className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-teal-300 font-bold">Strong Habit Control:</strong>{' '}
              <span className="text-slate-200">
                You maintained self-discipline on {cleanMonthCount} out of {totalMarkedMonth} days ({monthControlRate}% clean rate). Keep eliminating late-night triggers.
              </span>
            </div>
          </div>

          {/* Calendar Grid (Ref Image 3) */}
          <div className="border border-slate-800/90 rounded-2xl overflow-hidden bg-slate-900/50 shadow-md">
            <div className="grid grid-cols-7 bg-slate-900/90 border-b border-slate-800 text-center text-[11px] font-bold text-slate-400 py-2.5">
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
              <div>Sun</div>
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-slate-800/80">
              {calendarDays.map((dayObj) => {
                const dateStr = format(dayObj, 'yyyy-MM-dd');
                const inMonth = isSameMonth(dayObj, currentMonth);
                const isSelected = dateStr === selectedDayStr;
                const rec = recordsByDate.get(dateStr);

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDayStr(dateStr)}
                    className={`min-h-[72px] sm:min-h-[82px] p-2 flex flex-col justify-between text-left transition-colors cursor-pointer ${
                      !inMonth ? 'bg-slate-950/40 text-slate-600' : 'bg-slate-950/90'
                    } ${
                      isSelected
                        ? 'ring-2 ring-inset ring-teal-500 bg-teal-500/15'
                        : 'hover:bg-slate-900/80'
                    }`}
                  >
                    <span
                      className={`text-xs font-mono tabular-nums font-bold ${
                        isSelected
                          ? 'text-teal-400'
                          : inMonth
                          ? 'text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      {format(dayObj, 'd')}
                    </span>

                    {/* Single User Daily Status Badge */}
                    <div className="w-full">
                      {!rec ? (
                        <div className="text-[10px] text-slate-600 font-mono text-center py-1">
                          —
                        </div>
                      ) : rec.relapsed ? (
                        <div className="text-[10px] font-bold text-rose-400 bg-rose-500/20 border border-rose-500/50 rounded-full px-2 py-0.5 text-center truncate flex items-center justify-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span>Relapse</span>
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-lime-400 bg-lime-400/20 border border-lime-400/50 rounded-full px-2 py-0.5 text-center truncate flex items-center justify-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-400 shrink-0" />
                          <span>Clean</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Detail & Quick Edit */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                Selected Date: {selectedDayStr}
              </span>
              <span className="text-[11px] text-slate-500">
                Log for {displayName}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {selectedDayRecord ? (
                    selectedDayRecord.relapsed ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Relapsed (Masturbated)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Clean &amp; Controlled</span>
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Clock className="w-4 h-4" />
                      <span>No Attendance Marked</span>
                    </span>
                  )}
                </div>

                {selectedDayRecord?.relapsed && selectedDayRecord.reason && (
                  <p className="text-xs text-rose-900 mt-2 font-medium bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
                    <strong className="text-rose-700">Reason:</strong> {selectedDayRecord.reason}
                  </p>
                )}

                {!selectedDayRecord?.relapsed && selectedDayRecord?.controlNote && (
                  <p className="text-xs text-slate-600 mt-1.5">
                    <strong>Note:</strong> {selectedDayRecord.controlNote}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onEditDay('user', selectedDayStr)}
                className="min-h-[40px] px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>
                  {selectedDayRecord ? 'Update Status' : 'Mark Attendance'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
