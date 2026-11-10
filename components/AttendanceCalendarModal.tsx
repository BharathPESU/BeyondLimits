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
  X,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Edit3,
  TrendingUp,
  Award,
  Sparkles,
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
      {/* Full-Screen Sticky Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Self-Control Attendance Calendar
              </h2>
              <p className="text-xs text-slate-500">
                Tracking monthly habit consistency &amp; impulse control for {displayName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl w-full mx-auto bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5">
          {/* Month Navigation & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                aria-label="Previous Month"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-slate-900 min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                aria-label="Next Month"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
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
                className="min-h-[40px] px-3.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors cursor-pointer"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Clean (Controlled)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                Relapsed
              </span>
            </div>
          </div>

          {/* Monthly Self-Control Analytics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Monthly Control Rate
              </div>
              <div
                className={`text-xl font-black font-mono tabular-nums mt-1 ${
                  monthControlRate >= 80
                    ? 'text-teal-700'
                    : monthControlRate >= 60
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                {monthControlRate}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {totalMarkedMonth > 0
                  ? `${cleanMonthCount} clean of ${totalMarkedMonth} logged`
                  : 'No logs this month'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Clean Days
              </div>
              <div className="text-xl font-black font-mono tabular-nums text-emerald-700 mt-1">
                {cleanMonthCount} <span className="text-xs font-normal">Days ✓</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Urges overridden
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Monthly Relapses
              </div>
              <div
                className={`text-xl font-black font-mono tabular-nums mt-1 ${
                  relapseMonthCount === 0 ? 'text-slate-600' : 'text-rose-700'
                }`}
              >
                {relapseMonthCount} <span className="text-xs font-normal">Times ✗</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Relapse rate: {monthRelapseRate}%
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Active Streak
              </div>
              <div className="text-xl font-black font-mono tabular-nums text-teal-800 mt-1">
                {currentStreak} <span className="text-xs font-normal">Days</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Consecutive clean
              </div>
            </div>
          </div>

          {/* Self-Control Progress Evaluation Banner */}
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
              totalMarkedMonth === 0
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : relapseMonthCount === 0 && cleanMonthCount > 0
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-medium'
                : monthControlRate >= 85
                ? 'bg-teal-50/90 border-teal-300 text-teal-950 font-medium'
                : monthControlRate >= 60
                ? 'bg-amber-50/90 border-amber-300 text-amber-950 font-medium'
                : 'bg-rose-50/90 border-rose-300 text-rose-950 font-medium'
            }`}
          >
            {totalMarkedMonth === 0 ? (
              <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            ) : relapseMonthCount === 0 && cleanMonthCount > 0 ? (
              <Award className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : monthControlRate >= 85 ? (
              <Sparkles className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            )}

            <div>
              {totalMarkedMonth === 0 ? (
                <span>
                  Log your daily attendance to track your monthly self-control rate and watch your willpower grow.
                </span>
              ) : relapseMonthCount === 0 && cleanMonthCount > 0 ? (
                <span>
                  <strong>Flawless Self-Control!</strong> You have 0 relapses this month ({cleanMonthCount} days clean). You are exercising complete command over your impulses.
                </span>
              ) : monthControlRate >= 85 ? (
                <span>
                  <strong>Strong Habit Control:</strong> You maintained self-discipline on {cleanMonthCount} out of {totalMarkedMonth} days ({monthControlRate}% clean rate). Keep eliminating late-night triggers.
                </span>
              ) : monthControlRate >= 60 ? (
                <span>
                  <strong>Urge Warning:</strong> You slipped {relapseMonthCount} times this month ({monthRelapseRate}% relapse rate). Review your logged reasons below and alter your evening routine to stop repeated slips.
                </span>
              ) : (
                <span>
                  <strong>Action Required:</strong> Your masturbation rate is {monthRelapseRate}% ({relapseMonthCount} relapses in {totalMarkedMonth} days). See this reality clearly and change your patterns immediately — keep your phone outside your bed area and reset now.
                </span>
              )}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-[11px] font-semibold text-slate-600 py-2">
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
              <div>Sun</div>
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
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
                    className={`min-h-[70px] sm:min-h-[80px] p-2 flex flex-col justify-between text-left transition-colors cursor-pointer ${
                      !inMonth ? 'bg-slate-50/50 text-slate-400' : 'bg-white'
                    } ${
                      isSelected
                        ? 'ring-2 ring-inset ring-teal-600 bg-teal-50/30'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`text-xs font-mono tabular-nums font-semibold ${
                        isSelected
                          ? 'text-teal-800'
                          : inMonth
                          ? 'text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {format(dayObj, 'd')}
                    </span>

                    {/* Single User Daily Status Badge */}
                    <div className="w-full">
                      {!rec ? (
                        <div className="text-[10px] text-slate-400 font-mono text-center py-1">
                          —
                        </div>
                      ) : rec.relapsed ? (
                        <div className="text-[10px] font-bold text-rose-800 bg-rose-100/90 border border-rose-200 rounded px-1.5 py-0.5 text-center truncate flex items-center justify-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                          <span>Relapse</span>
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200 rounded px-1.5 py-0.5 text-center truncate flex items-center justify-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                          <span>Clean ✓</span>
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
