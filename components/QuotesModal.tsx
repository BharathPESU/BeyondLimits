'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Quote,
  Volume2,
  Square,
  Play,
  SkipForward,
  X,
} from 'lucide-react';
import { MOTIVATIONAL_QUOTES } from '@/lib/motivation-media-data';

interface QuotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeakQuoteText: (text: string) => Promise<void>;
  onStopVoice: () => void;
  isSpeaking: boolean;
}

export default function QuotesModal({
  isOpen,
  onClose,
  onSpeakQuoteText,
  onStopVoice,
  isSpeaking,
}: QuotesModalProps) {
  const [activeQuoteId, setActiveQuoteId] = useState<number | null>(null);
  const [continuousMode, setContinuousMode] = useState<boolean>(false);
  const continuousRef = useRef<boolean>(false);

  const stopAllQuotes = useCallback(() => {
    continuousRef.current = false;
    setContinuousMode(false);
    setActiveQuoteId(null);
    onStopVoice();
  }, [onStopVoice]);

  useEffect(() => {
    if (!isOpen) {
      continuousRef.current = false;
    }
  }, [isOpen]);

  const handleSpeakSingleQuote = async (id: number, text: string) => {
    continuousRef.current = false;
    setContinuousMode(false);
    setActiveQuoteId(id);
    await onSpeakQuoteText(`Quote number ${id}. ${text}`);
  };

  const handlePlayAllQuotesSequentially = async (startIdx = 0) => {
    continuousRef.current = true;
    setContinuousMode(true);

    for (let i = startIdx; i < MOTIVATIONAL_QUOTES.length; i++) {
      if (!continuousRef.current) break;
      const item = MOTIVATIONAL_QUOTES[i];
      setActiveQuoteId(item.id);
      await onSpeakQuoteText(`Quote ${item.id}. ${item.text}`);
      await new Promise((r) => setTimeout(r, 450));
    }

    continuousRef.current = false;
    setContinuousMode(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Full-Screen Light Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Quote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                20 Discipline Quotes (Voice Mode)
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

      {/* Voice Mode Master Controls (Light Theme) */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0">
        <div className="max-w-4xl w-full mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-semibold text-teal-700">
              Strong Male Voice Reader
            </span>
            <span className="text-slate-500 ml-2">
              {continuousMode
                ? `Playing All Quotes (#${activeQuoteId || 1}/20)...`
                : activeQuoteId
                ? `Selected Quote #${activeQuoteId}`
                : 'Tap any quote to listen'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!continuousMode ? (
              <button
                type="button"
                onClick={() => void handlePlayAllQuotesSequentially(0)}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-teal-700 text-white hover:bg-teal-800 rounded-xl transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Read All 20 Quotes</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const nextIdx = activeQuoteId
                    ? activeQuoteId % MOTIVATIONAL_QUOTES.length
                    : 0;
                  void handlePlayAllQuotesSequentially(nextIdx);
                }}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Next</span>
              </button>
            )}

            {(isSpeaking || continuousMode) && (
              <button
                type="button"
                onClick={stopAllQuotes}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable List of All 20 Quotes */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl w-full mx-auto space-y-2.5">
          {MOTIVATIONAL_QUOTES.map((q) => {
            const isCurrent = activeQuoteId === q.id;
            return (
              <div
                key={q.id}
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  isCurrent
                    ? 'bg-teal-50/70 border-teal-600 ring-1 ring-teal-600'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`text-xs font-mono tabular-nums font-bold mt-0.5 shrink-0 ${
                      isCurrent ? 'text-teal-700' : 'text-slate-400'
                    }`}
                  >
                    {String(q.id).padStart(2, '0')}.
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                    &ldquo;{q.text}&rdquo;
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSpeakSingleQuote(q.id, q.text)}
                  className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl shrink-0 transition-colors cursor-pointer ${
                    isCurrent && isSpeaking
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5 text-teal-700" />
                  <span>Speak</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
