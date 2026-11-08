'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  ChevronUp,
  ChevronDown,
  List,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  MOTIVATIONAL_SHORTS,
  MotivationalShort,
} from '@/lib/motivation-media-data';

interface ShortsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPauseBackgroundVoice: () => void;
}

export default function ShortsModal({
  isOpen,
  onClose,
  onPauseBackgroundVoice,
}: ShortsModalProps) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [showListDrawer, setShowListDrawer] = useState<boolean>(false);
  const [resolvedMap, setResolvedMap] = useState<Record<number, string[]>>({});
  const [streamIndices, setStreamIndices] = useState<Record<number, number>>(
    {}
  );

  const feedContainerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (!isOpen) return;
    onPauseBackgroundVoice();
  }, [isOpen, onPauseBackgroundVoice]);

  // Dynamically resolve matching YouTube Shorts video IDs for the active short and next short
  useEffect(() => {
    if (!isOpen) return;

    const resolveShortIds = async (shortItem: MotivationalShort) => {
      if (resolvedMap[shortItem.id]) return;
      try {
        const res = await fetch(
          `/api/youtube?q=${encodeURIComponent(shortItem.searchQuery)}`
        );
        if (res.ok) {
          const data = (await res.json()) as { videoIds?: string[] };
          if (data.videoIds && data.videoIds.length > 0) {
            setResolvedMap((prev) => ({
              ...prev,
              [shortItem.id]: Array.from(
                new Set([...data.videoIds!, ...shortItem.defaultVideoIds])
              ),
            }));
          }
        }
      } catch {
        // Fallback to defaultVideoIds
      }
    };

    const currentShort = MOTIVATIONAL_SHORTS[activeIndex];
    const nextShort =
      MOTIVATIONAL_SHORTS[(activeIndex + 1) % MOTIVATIONAL_SHORTS.length];
    if (currentShort) void resolveShortIds(currentShort);
    if (nextShort) void resolveShortIds(nextShort);
  }, [activeIndex, isOpen, resolvedMap]);

  // Track vertical scroll position to update activeIndex like Instagram Reels
  const handleScroll = () => {
    const container = feedContainerRef.current;
    if (!container) return;
    const slideHeight = container.clientHeight;
    if (slideHeight <= 0) return;
    const newIndex = Math.round(container.scrollTop / slideHeight);
    if (
      newIndex >= 0 &&
      newIndex < MOTIVATIONAL_SHORTS.length &&
      newIndex !== activeIndex
    ) {
      setActiveIndex(newIndex);
    }
  };

  const scrollToShort = (index: number) => {
    const target = Math.max(
      0,
      Math.min(MOTIVATIONAL_SHORTS.length - 1, index)
    );
    setActiveIndex(target);
    setShowListDrawer(false);
    const el = slideRefs.current[target];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const cycleStreamForShort = (shortId: number, totalStreams: number) => {
    setStreamIndices((prev) => ({
      ...prev,
      [shortId]: ((prev[shortId] || 0) + 1) % Math.max(1, totalStreams),
    }));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Mobile-First 9:16 Vertical Reels Container */}
      <div
        className="relative w-full h-full sm:w-[410px] sm:h-[88vh] sm:rounded-3xl bg-slate-950 text-white border border-slate-800 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Reels Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold tracking-tight">
              Discipline Shorts ({activeIndex + 1}/20)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowListDrawer((prev) => !prev)}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-xl cursor-pointer"
            >
              <List className="w-3.5 h-3.5 text-teal-400" />
              <span>All 20</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Instagram Reels Vertical Snap Feed */}
        <div
          ref={feedContainerRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
        >
          {MOTIVATIONAL_SHORTS.map((shortItem, idx) => {
            const isNearActive = Math.abs(idx - activeIndex) <= 1;
            const isCurrent = idx === activeIndex;
            const ids =
              resolvedMap[shortItem.id] || shortItem.defaultVideoIds;
            const sIdx = (streamIndices[shortItem.id] || 0) % ids.length;
            const videoId = ids[sIdx];

            return (
              <div
                key={shortItem.id}
                ref={(el) => {
                  slideRefs.current[idx] = el;
                }}
                className="relative w-full h-full snap-start snap-always shrink-0 flex flex-col justify-between bg-black"
              >
                {/* Embedded Vertical Video Player */}
                <div className="w-full h-full flex items-center justify-center">
                  {isNearActive ? (
                    <iframe
                      key={`${shortItem.id}-${videoId}-${isCurrent}`}
                      src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${
                        isCurrent ? 1 : 0
                      }&loop=1&playlist=${videoId}&rel=0&modestbranding=1&playsinline=1`}
                      title={shortItem.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  ) : (
                    <div className="text-xs text-slate-500 font-mono">
                      Short #{shortItem.id}
                    </div>
                  )}
                </div>

                {/* Right-Side Instagram Reels Up/Down & Stream Switch Controls */}
                <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => scrollToShort(idx - 1)}
                    disabled={idx === 0}
                    aria-label="Previous Short"
                    className="min-h-[42px] min-w-[42px] rounded-full bg-slate-900/85 border border-slate-700 flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToShort(idx + 1)}
                    disabled={idx === MOTIVATIONAL_SHORTS.length - 1}
                    aria-label="Next Short"
                    className="min-h-[42px] min-w-[42px] rounded-full bg-slate-900/85 border border-slate-700 flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => cycleStreamForShort(shortItem.id, ids.length)}
                    title="Switch Video Stream"
                    className="min-h-[42px] min-w-[42px] rounded-full bg-slate-900/85 border border-slate-700 flex items-center justify-center text-teal-300 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom Caption Scrim */}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                  <div className="text-[11px] font-mono text-teal-300">
                    Short #{shortItem.id} · {shortItem.tag} · Swipe Up/Down
                  </div>
                  <h3 className="text-sm font-bold text-white mt-0.5 pr-14">
                    {shortItem.title}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>

        {/* Slide-Over Drawer of All 20 Shorts */}
        {showListDrawer && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
              <span className="text-sm font-bold text-white">
                Select Any of the 20 Motivational Shorts
              </span>
              <button
                type="button"
                onClick={() => setShowListDrawer(false)}
                className="min-h-[38px] px-3 text-xs font-semibold text-slate-300 bg-slate-800 rounded-lg cursor-pointer"
              >
                Close List
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
              {MOTIVATIONAL_SHORTS.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToShort(idx)}
                  className={`w-full min-h-[52px] px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    idx === activeIndex
                      ? 'bg-teal-950/70 text-teal-300'
                      : 'hover:bg-slate-900 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono tabular-nums font-bold text-slate-500">
                      {String(item.id).padStart(2, '0')}
                    </span>
                    <span className="text-xs font-semibold truncate">
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {item.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
