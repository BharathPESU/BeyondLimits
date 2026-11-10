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
      {/* Full-Screen Light Header with Safe Area & Left Back Arrow */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 pt-[max(env(safe-area-inset-top),16px)] pb-3.5 shrink-0">
        <div className="max-w-4xl w-full mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to dashboard"
            className="min-h-[40px] min-w-[40px] -ml-2 inline-flex items-center justify-center rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2
              id="motivation-hub-title"
              className="text-base sm:text-lg font-bold text-slate-900"
            >
              Motivation Hub
            </h2>
          </div>
        </div>
      </div>

      {/* Full-Screen Light Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl w-full mx-auto space-y-6">
          {/* Organized 3-Card Media Sections: Songs, Shorts, Quotes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. SONGS CARD */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col justify-between gap-4 hover:border-teal-600 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
                    <Music className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-md bg-slate-100 text-teal-800">
                    {MOTIVATIONAL_SONGS.length} Tracks
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Motivational Songs
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    In-app video player with Eminem, Imagine Dragons, Survivor, Sia &amp; more.
                  </p>
                </div>
                <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                  <div className="truncate">1. Lose Yourself – Eminem</div>
                  <div className="truncate">2. Hall of Fame – The Script</div>
                  <div className="truncate">3. Unstoppable – Sia</div>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenSongs}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Open Songs (15)</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            </div>

            {/* 2. SHORTS CARD */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col justify-between gap-4 hover:border-teal-600 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
                    <Flame className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-md bg-slate-100 text-amber-800">
                    {MOTIVATIONAL_SHORTS.length} Shorts
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Motivational Shorts
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Instagram-Reels style vertical swipe feed for instant discipline boosts.
                  </p>
                </div>
                <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                  <div className="truncate">#1 Nobody Is Coming to Save You</div>
                  <div className="truncate">#2 Believe in Yourself</div>
                  <div className="truncate">#5 Discipline Beats Motivation</div>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenShorts}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Open Shorts (20)</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            </div>

            {/* 3. QUOTES CARD */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col justify-between gap-4 hover:border-teal-600 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
                    <Quote className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-md bg-slate-100 text-teal-800">
                    {MOTIVATIONAL_QUOTES.length} Quotes
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Voice Quotes
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    20 discipline quotes with strong male voice mode &amp; continuous reader.
                  </p>
                </div>
                <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                  <div className="truncate">&ldquo;Discipline is choosing...&rdquo;</div>
                  <div className="truncate">&ldquo;No excuses. Just results.&rdquo;</div>
                  <div className="truncate">&ldquo;Pain is temporary...&rdquo;</div>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenQuotes}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 text-xs font-bold transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-teal-700" />
                <span>Open Quotes (20)</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            </div>
          </div>

          {/* Today's Featured Daily Briefing Summary */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-teal-700">
                Today&apos;s Daily Briefing ({dailyMotivation.date})
              </span>
              <button
                type="button"
                onClick={onSpeakDailyMotivation}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isSpeaking ? 'Speaking...' : 'Read Briefing Aloud'}</span>
              </button>
            </div>
            <p className="text-base font-bold text-slate-900">
              {dailyMotivation.headline}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 italic">
              &ldquo;{dailyMotivation.quote}&rdquo; — {dailyMotivation.author}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
