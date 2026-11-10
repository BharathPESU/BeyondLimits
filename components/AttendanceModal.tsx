'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Save,
  X,
  CheckCircle2,
  User,
} from 'lucide-react';
import { AttendanceRecord, FriendId } from '@/lib/types';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFriend?: FriendId;
  onSelectFriend?: (friend: FriendId) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  existingRecord?: AttendanceRecord;
  onSaved: () => Promise<void>;
  userName?: string;
}

export default function AttendanceModal({
  isOpen,
  onClose,
  selectedFriend = 'user',
  selectedDate,
  onSelectDate,
  existingRecord,
  onSaved,
  userName,
}: AttendanceModalProps) {
  const [relapsed, setRelapsed] = useState<boolean>(
    existingRecord ? existingRecord.relapsed : false
  );
  const [reason, setReason] = useState<string>(existingRecord?.reason || '');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  // Determine display name from prop, localStorage profile, or fallback
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (relapsed && reason.trim().length < 3) {
      setErrorMsg(
        'Please enter the honest reason why you relapsed (at least 3 characters).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendId: 'user',
          friendName: displayName,
          date: selectedDate,
          relapsed,
          reason: reason.trim(),
          triggerCategory: relapsed ? 'Logged Reason' : 'None',
          emotionState: relapsed ? 'Impulsive' : 'Focused',
          controlNote: '',
          urgeIntensity: relapsed ? 7 : 2,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not save attendance.');
      }

      setSuccessMsg(`Attendance saved for ${selectedDate}.`);
      await onSaved();
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Full-Screen Sticky Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-2xl w-full mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Daily Self-Control Attendance
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record daily impulse control and track personal consistency
            </p>
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
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl w-full mx-auto bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5"
        >
          {/* User Profile Badge & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-teal-50/80 border border-teal-200 text-teal-900 text-xs">
              <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-teal-700 tracking-wider">
                  Discipline Log For
                </div>
                <div className="font-bold text-slate-900 truncate">
                  {displayName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 min-h-[44px]">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onSelectDate(e.target.value)}
                className="w-full text-xs font-mono tabular-nums font-semibold text-slate-900 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Masturbated or Not Check Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Did you masturbate or experience a relapse on {selectedDate}?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setRelapsed(false);
                  setErrorMsg(null);
                }}
                className={`min-h-[56px] p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  !relapsed
                    ? 'bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck
                  className={`w-5 h-5 shrink-0 ${
                    !relapsed ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    No (Clean)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Controlled all urges
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRelapsed(true);
                  setErrorMsg(null);
                }}
                className={`min-h-[56px] p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  relapsed
                    ? 'bg-rose-50 border-rose-600 ring-1 ring-rose-600'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle
                  className={`w-5 h-5 shrink-0 ${
                    relapsed ? 'text-rose-600' : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Yes (Relapsed)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Reason required
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Reason Input (Mandatory when Relapsed, Editable anytime) */}
          <div>
            <label
              htmlFor="modal-reason-input"
              className="block text-xs font-semibold text-slate-800 mb-1.5"
            >
              {relapsed ? (
                <span className="text-rose-700">
                  Reason why you relapsed (Required) *
                </span>
              ) : (
                <span>Optional Note / What helped you stay clean today</span>
              )}
            </label>
            <textarea
              id="modal-reason-input"
              rows={3}
              required={relapsed}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                relapsed
                  ? 'Be brutally honest (e.g. Late-night phone scrolling in bed alone, felt bored/stressed)...'
                  : 'Optional reflection (e.g. Completed workout, kept phone outside bedroom)...'
              }
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none ${
                relapsed
                  ? 'border-rose-300 bg-rose-50/30 focus:border-rose-600'
                  : 'border-slate-200 bg-slate-50 focus:border-teal-600'
              }`}
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>
              {submitting
                ? 'Saving...'
                : existingRecord
                ? 'Update Daily Attendance'
                : 'Save Daily Attendance'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
