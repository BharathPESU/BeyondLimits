'use client';

import React, { useState } from 'react';
import {
  X,
  Newspaper,
  Volume2,
  Square,
  RefreshCw,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { DailyTechNewsRecord, TechNewsItem } from '@/lib/types';

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  newsRecord: DailyTechNewsRecord | null;
  loadingNews: boolean;
  onRefreshNews: () => Promise<void>;
  onSpeakText: (text: string) => Promise<void>;
  onStopVoice: () => void;
  isSpeaking: boolean;
}

export default function NewsModal({
  isOpen,
  onClose,
  newsRecord,
  loadingNews,
  onRefreshNews,
  onSpeakText,
  onStopVoice,
  isSpeaking,
}: NewsModalProps) {
  const [activeReadingId, setActiveReadingId] = useState<number | 'all' | null>(
    null
  );

  if (!isOpen) return null;

  const items: TechNewsItem[] = newsRecord?.items || [];

  const handleReadSingleNews = async (item: TechNewsItem) => {
    setActiveReadingId(item.id);
    const script = `AI and Tech News number ${item.id}. Category: ${item.category}. ${item.title}. ${item.summary}`;
    await onSpeakText(script);
    setActiveReadingId(null);
  };

  const handleReadAllNews = async () => {
    if (items.length === 0) return;
    setActiveReadingId('all');
    const combinedScript =
      `Here are your Top 5 Daily AI and Technology News headlines. ` +
      items
        .map(
          (item, idx) =>
            `Number ${idx + 1}, in ${item.category}: ${item.title}. ${item.summary}`
        )
        .join(' ... ');
    await onSpeakText(combinedScript);
    setActiveReadingId(null);
  };

  const handleStop = () => {
    setActiveReadingId(null);
    onStopVoice();
  };

  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="news-modal-title"
    >
      {/* Full-Screen Light Header (Matches Calendar & Attendance) */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Newspaper className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                id="news-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900"
              >
                Top 5 AI &amp; Tech News
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-xs font-mono font-semibold text-teal-800">
                <Clock className="w-3 h-3" />
                <span>Daily 7:00 AM</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              handleStop();
              onClose();
            }}
            aria-label="Close AI & Tech News"
            className="min-h-[42px] min-w-[42px] inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Top Action Bar: Read All in Loud Voice + Live Refresh */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0">
        <div className="max-w-4xl w-full mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {isSpeaking ? (
              <button
                type="button"
                onClick={handleStop}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop Reading</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleReadAllNews()}
                disabled={items.length === 0 || loadingNews}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Read All 5 News Aloud</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => void onRefreshNews()}
            disabled={loadingNews}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-teal-700 ${
                loadingNews ? 'animate-spin' : ''
              }`}
            />
            <span>
              {loadingNews ? 'Fetching Live News...' : 'Refresh Live News'}
            </span>
          </button>
        </div>
      </div>

      {/* Full-Screen Scrollable News List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl w-full mx-auto space-y-3.5">
          {loadingNews && items.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-28 rounded-2xl bg-white animate-pulse border border-slate-200"
                />
              ))}
            </div>
          ) : (
            items.map((item, idx) => {
              const isThisSpeaking =
                isSpeaking &&
                (activeReadingId === item.id || activeReadingId === 'all');

              return (
                <article
                  key={`${item.id}-${idx}`}
                  className={`rounded-2xl p-4 sm:p-5 border transition-colors ${
                    isThisSpeaking
                      ? 'bg-teal-50/70 border-teal-600 ring-1 ring-teal-600'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-teal-50 text-teal-700 font-mono text-xs font-bold">
                        #{idx + 1}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold">
                        {item.category}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {item.source} · {item.publishedAt}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        isThisSpeaking
                          ? handleStop()
                          : void handleReadSingleNews(item)
                      }
                      className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                        isThisSpeaking
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'
                      }`}
                    >
                      {isThisSpeaking ? (
                        <>
                          <Square className="w-3 h-3" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-teal-700" />
                          <span>Read</span>
                        </>
                      )}
                    </button>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-2.5 leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                    {item.summary}
                  </p>

                  {item.url && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                      >
                        <span>Source Article</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
