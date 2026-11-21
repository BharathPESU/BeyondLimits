'use client';

import React from 'react';
import {
  X,
  ArrowLeft,
  Music,
  Flame,
  Quote,
  Play,
  Volume2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { DailyMotivationRecord } from '@/lib/types';
import {
  MOTIVATIONAL_SONGS,
  MOTIVATIONAL_SHORTS,
  MOTIVATIONAL_QUOTES,
} from '@/lib/motivation-media-data';

interface MotivationHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyMotivation: DailyMotivationRecord;
  isSpeaking: boolean;
  onSpeakDailyMotivation: () => void;
  onOpenSongs: () => void;
  onOpenShorts: () => void;
  onOpenQuotes: () => void;
}

export default function MotivationHubModal({
  isOpen,
  onClose,
  dailyMotivation,
  isSpeaking,
  onSpeakDailyMotivation,
  onOpenSongs,
  onOpenShorts,
  onOpenQuotes,
}: MotivationHubModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="motivation-hub-title"
    >
      {/* Full-Screen Sticky Header with Safe Area & Left Back Arrow */}
      <div className="bg-slate-950/95 border-b border-slate-800/80 px-4 sm:px-6 pt-[max(env(safe-area-inset-top),16px)] pb-3.5 shrink-0">
        <div className="max-w-4xl w-full mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to dashboard"
            className="min-h-[42px] min-w-[42px] -ml-2 inline-flex items-center justify-center rounded-2xl bg-slate-900 border border-teal-500/40 text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-400 shadow-sm shadow-rose-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2
              id="motivation-hub-title"
              className="text-lg sm:text-xl font-black text-white tracking-tight"
            >
              Motivation <span className="text-teal-400">Hub</span>
            </h2>
          </div>
        </div>
      </div>

      {/* Full-Screen Cyber Body (Ref Image 1) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-white">
        <div className="max-w-4xl w-full mx-auto space-y-5">
          {/* 1. SHORTS CARD (Ref Image 1) */}
          <div className="cyber-card p-5 sm:p-6 space-y-4">
            <div className="space-y-1.5 font-bold text-sm sm:text-base text-teal-400">
              <div>#1 Nobody Is Coming to Save You</div>
              <div>#2 Believe in Yourself</div>
              <div>#3 Discipline Beats Motivation</div>
            </div>

            <button
              type="button"
              onClick={onOpenShorts}
              className="w-full min-h-[48px] px-5 py-3 rounded-full border border-teal-500/50 bg-black/60 hover:bg-black/80 text-white font-extrabold text-sm flex items-center justify-between transition-all cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Open Shorts (20)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* 2. VOICE QUOTES CARD (Ref Image 1) */}
          <div className="cyber-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-400 shadow-sm shadow-rose-500/20">
                <Quote className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 text-xs font-mono font-bold rounded-full border border-teal-500/40 bg-teal-500/10 text-teal-400">
                20 Quotes
              </span>
            </div>

            <div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Voice Quotes
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                20 discipline quotes with strong male voice mode &amp; continuous reader.
              </p>
            </div>

            <div className="text-xs text-slate-400 italic space-y-1 pt-2 border-t border-slate-800/80">
              <div>&ldquo;Discipline is choosing...&rdquo;</div>
              <div>&ldquo;No excuses. Just results.&rdquo;</div>
              <div>&ldquo;Pain is temporary...&rdquo;</div>
            </div>

            <button
              type="button"
              onClick={onOpenQuotes}
              className="w-full min-h-[48px] px-5 py-3 rounded-full border border-teal-500/50 bg-black/60 hover:bg-black/80 text-white font-extrabold text-sm flex items-center justify-between transition-all cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-teal-400" />
                <span>Open Quotes (20)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* 3. TODAY'S DAILY BRIEFING (Ref Image 1) */}
          <div className="cyber-card p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-rose-400">
                Today&apos;s Daily Briefing ({dailyMotivation.date})
              </span>
              <button
                type="button"
                onClick={onSpeakDailyMotivation}
                className="min-h-[40px] px-4 py-2 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>{isSpeaking ? 'Speaking...' : 'Read Briefing Aloud'}</span>
              </button>
            </div>

            <h4 className="text-base sm:text-lg font-black text-white leading-snug">
              {dailyMotivation.headline}
            </h4>

            <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
              &ldquo;{dailyMotivation.quote}&rdquo; — {dailyMotivation.author}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
