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
} from 'lucide-react';
import { AttendanceRecord, FriendId } from '@/lib/types';

interface AttendanceCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AttendanceRecord[];
  onEditDay: (friendId: FriendId, date: string) => void;
}

export default function AttendanceCalendarModal({
  isOpen,
  onClose,
  records,
  onEditDay,
}: AttendanceCalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() =>
    format(new Date(), 'yyyy-MM-dd')
  );
  const [friendFilter, setFriendFilter] = useState<'both' | FriendId>('both');

  // Map records by date for O(1) lookup
  const recordsByDate = useMemo(() => {
    const map = new Map<
      string,
      { bharath_cd?: AttendanceRecord; bharath_r?: AttendanceRecord }
    >();
    for (const rec of records) {
      const entry = map.get(rec.date) || {};
      entry[rec.friendId] = rec;
      map.set(rec.date, entry);
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

  const selectedDayRecords = recordsByDate.get(selectedDayStr) || {};
  const cdSelected = selectedDayRecords.bharath_cd;
  const brSelected = selectedDayRecords.bharath_r;

  // Monthly totals for current visible month
  const monthPrefix = format(currentMonth, 'yyyy-MM');
  const monthRecords = records.filter((r) => r.date.startsWith(monthPrefix));
  const cdCleanMonth = monthRecords.filter(
    (r) => r.friendId === 'bharath_cd' && !r.relapsed
  ).length;
  const cdRelapseMonth = monthRecords.filter(
    (r) => r.friendId === 'bharath_cd' && r.relapsed
  ).length;
  const brCleanMonth = monthRecords.filter(
    (r) => r.friendId === 'bharath_r' && !r.relapsed
  ).length;
  const brRelapseMonth = monthRecords.filter(
    (r) => r.friendId === 'bharath_r' && r.relapsed
  ).length;

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
                Daily Attendance Calendar
              </h2>
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

        {/* Month Navigation & Friend Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              aria-label="Previous Month"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-slate-900 min-w-[130px] text-center">
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
              className="min-h-[40px] px-3 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>

          {/* Friend Filter */}
          <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setFriendFilter('both')}
              className={`min-h-[34px] px-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                friendFilter === 'both'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              Both
            </button>
            <button
              type="button"
              onClick={() => setFriendFilter('bharath_cd')}
              className={`min-h-[34px] px-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                friendFilter === 'bharath_cd'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              Bharath CD
            </button>
            <button
              type="button"
              onClick={() => setFriendFilter('bharath_r')}
              className={`min-h-[34px] px-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                friendFilter === 'bharath_r'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              Bharath R
            </button>
          </div>
        </div>

        {/* Monthly Summary Strip */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Bharath CD:</span>
            <span className="font-mono tabular-nums">
              <strong className="text-emerald-700">{cdCleanMonth}✓</strong> ·{' '}
              <strong className="text-rose-700">{cdRelapseMonth}✗</strong>
            </span>
          </div>
          <div className="flex items-center justify-between border-l border-slate-200 pl-3">
            <span className="font-semibold text-slate-700">Bharath R:</span>
            <span className="font-mono tabular-nums">
              <strong className="text-emerald-700">{brCleanMonth}✓</strong> ·{' '}
              <strong className="text-rose-700">{brRelapseMonth}✗</strong>
            </span>
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
              const dayData = recordsByDate.get(dateStr);
              const cd = dayData?.bharath_cd;
              const br = dayData?.bharath_r;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDayStr(dateStr)}
                  className={`min-h-[66px] sm:min-h-[74px] p-1.5 flex flex-col justify-between text-left transition-colors cursor-pointer ${
                    !inMonth ? 'bg-slate-50/60 text-slate-400' : 'bg-white'
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

                  {/* Friend Status Indicators */}
                  <div className="space-y-1 w-full">
                    {(friendFilter === 'both' ||
                      friendFilter === 'bharath_cd') && (
                      <div
                        className={`text-[10px] font-mono tabular-nums font-semibold px-1 py-0.5 rounded truncate ${
                          !cd
                            ? 'text-slate-400 bg-slate-100/70'
                            : cd.relapsed
                            ? 'text-rose-800 bg-rose-100'
                            : 'text-emerald-800 bg-emerald-100'
                        }`}
                      >
                        CD:{!cd ? '-' : cd.relapsed ? '✗' : '✓'}
                      </div>
                    )}

                    {(friendFilter === 'both' ||
                      friendFilter === 'bharath_r') && (
                      <div
                        className={`text-[10px] font-mono tabular-nums font-semibold px-1 py-0.5 rounded truncate ${
                          !br
                            ? 'text-slate-400 bg-slate-100/70'
                            : br.relapsed
                            ? 'text-rose-800 bg-rose-100'
                            : 'text-emerald-800 bg-emerald-100'
                        }`}
                      >
                        BR:{!br ? '-' : br.relapsed ? '✗' : '✓'}
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
              ✓ = Controlled · ✗ = Masturbated
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Bharath CD Card for Selected Day */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Bharath CD
                  </span>
                  {cdSelected ? (
                    cdSelected.relapsed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Masturbated</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Clean</span>
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Unmarked</span>
                    </span>
                  )}
                </div>
                {cdSelected?.reason && (
                  <p className="text-xs text-slate-600 mt-1.5">
                    Reason: {cdSelected.reason}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onEditDay('bharath_cd', selectedDayStr)}
                className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{cdSelected ? 'Update CD' : 'Mark CD'}</span>
              </button>
            </div>

            {/* Bharath R Card for Selected Day */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Bharath R
                  </span>
                  {brSelected ? (
                    brSelected.relapsed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Masturbated</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Clean</span>
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Unmarked</span>
                    </span>
                  )}
                </div>
                {brSelected?.reason && (
                  <p className="text-xs text-slate-600 mt-1.5">
                    Reason: {brSelected.reason}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onEditDay('bharath_r', selectedDayStr)}
                className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{brSelected ? 'Update BR' : 'Mark BR'}</span>
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
