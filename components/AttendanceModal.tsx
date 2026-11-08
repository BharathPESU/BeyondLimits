'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Save,
  X,
  CheckCircle2,
} from 'lucide-react';
import { AttendanceRecord, FriendId } from '@/lib/types';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFriend: FriendId;
  onSelectFriend: (friend: FriendId) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  existingRecord?: AttendanceRecord;
  onSaved: () => Promise<void>;
}

export default function AttendanceModal({
  isOpen,
  onClose,
  selectedFriend,
  onSelectFriend,
  selectedDate,
  onSelectDate,
  existingRecord,
  onSaved,
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

  const friendDisplayName =
    selectedFriend === 'bharath_cd' ? 'Bharath CD' : 'Bharath R';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (relapsed && reason.trim().length < 3) {
      setErrorMsg(
        'Please enter the reason why you masturbated (at least 3 characters).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendId: selectedFriend,
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

      setSuccessMsg(`Saved ${friendDisplayName}'s attendance for ${selectedDate}.`);
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
              Mark Daily Attendance
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select friend, date, and self-control status
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
          {/* Friend & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => onSelectFriend('bharath_cd')}
                className={`min-h-[42px] text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedFriend === 'bharath_cd'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700'
                }`}
              >
                Bharath CD
              </button>
              <button
                type="button"
                onClick={() => onSelectFriend('bharath_r')}
                className={`min-h-[42px] text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedFriend === 'bharath_r'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700'
                }`}
              >
                Bharath R
              </button>
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
              Did {friendDisplayName} masturbate on {selectedDate}?
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
                    : 'bg-white border-slate-200'
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
                    Controlled urges
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
                    : 'bg-white border-slate-200'
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
                  Reason why {friendDisplayName} masturbated (Required) *
                </span>
              ) : (
                <span>Optional Note / Update Reason</span>
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
                  ? 'Write the honest reason why it happened...'
                  : 'Optional self-control note...'
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
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>
              {submitting
                ? 'Saving...'
                : existingRecord
                ? `Update ${friendDisplayName}'s Attendance`
                : `Save ${friendDisplayName}'s Attendance`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
