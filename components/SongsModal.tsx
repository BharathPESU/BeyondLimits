'use client';

import React, { useState, useEffect } from 'react';
import {
  Music,
  Play,
  SkipBack,
  SkipForward,
  RefreshCw,
  X,
} from 'lucide-react';
import { MOTIVATIONAL_SONGS, MotivationalSong } from '@/lib/motivation-media-data';

interface SongsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPauseBackgroundVoice: () => void;
}

export default function SongsModal({
  isOpen,
  onClose,
  onPauseBackgroundVoice,
}: SongsModalProps) {
  const [selectedSong, setSelectedSong] = useState<MotivationalSong>(
    MOTIVATIONAL_SONGS[0]
  );
  const [videoIds, setVideoIds] = useState<string[]>(
    MOTIVATIONAL_SONGS[0].defaultVideoIds
  );
  const [streamIndex, setStreamIndex] = useState<number>(0);
  const [resolving, setResolving] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    onPauseBackgroundVoice();
  }, [isOpen, onPauseBackgroundVoice]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadIdsForSong = async () => {
      setVideoIds(selectedSong.defaultVideoIds);
      setStreamIndex(0);
      setResolving(true);
      try {
        const res = await fetch(
          `/api/youtube?q=${encodeURIComponent(selectedSong.fallbackQuery)}`
        );
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { videoIds?: string[] };
          if (data.videoIds && data.videoIds.length > 0) {
            const combined = Array.from(
              new Set([...data.videoIds, ...selectedSong.defaultVideoIds])
            );
            setVideoIds(combined);
          }
        }
      } catch {
        // Keep default verified IDs
      } finally {
        if (!cancelled) setResolving(false);
      }
    };

    void loadIdsForSong();
    return () => {
      cancelled = true;
    };
  }, [selectedSong, isOpen]);

  if (!isOpen) {
    return null;
  }

  const activeVideoId =
    videoIds[streamIndex % videoIds.length] || selectedSong.defaultVideoIds[0];

  const currentIdx = MOTIVATIONAL_SONGS.findIndex(
    (s) => s.id === selectedSong.id
  );

  const handlePrevSong = () => {
    const prevIdx =
      (currentIdx - 1 + MOTIVATIONAL_SONGS.length) % MOTIVATIONAL_SONGS.length;
    setSelectedSong(MOTIVATIONAL_SONGS[prevIdx]);
  };

  const handleNextSong = () => {
    const nextIdx = (currentIdx + 1) % MOTIVATIONAL_SONGS.length;
    setSelectedSong(MOTIVATIONAL_SONGS[nextIdx]);
  };

  const handleSwitchStream = () => {
    setStreamIndex((prev) => (prev + 1) % Math.max(1, videoIds.length));
  };

  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Full-Screen Light Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Motivational Songs Player (15 Tracks)
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

      {/* Main Content: Embedded Video Player + Song List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 7 Cols: In-App Video Player */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-200">
                <iframe
                  key={`${selectedSong.id}-${activeVideoId}`}
                  src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                  title={`${selectedSong.title} - ${selectedSong.artist}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="min-w-0">
                  <div className="text-xs text-teal-700 font-mono tabular-nums font-bold">
                    Track #{selectedSong.id} of 15
                  </div>
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {selectedSong.title}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {selectedSong.artist}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSwitchStream}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl shrink-0 cursor-pointer"
                  title="Switch to alternate video stream if current stream is restricted"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-teal-700 ${
                      resolving ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    Switch Stream ({(streamIndex % videoIds.length) + 1}/
                    {videoIds.length})
                  </span>
                </button>
              </div>
            </div>

            {/* Player Transport Controls */}
            <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handlePrevSong}
                className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl transition-colors cursor-pointer"
              >
                <SkipBack className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={handleNextSong}
                className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition-colors cursor-pointer"
              >
                <span>Next Song</span>
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right 5 Cols: Scrollable List of 15 Songs */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col max-h-[65vh]">
            <div className="overflow-y-auto divide-y divide-slate-100">
              {MOTIVATIONAL_SONGS.map((song) => {
                const isCurrent = song.id === selectedSong.id;
                return (
                  <button
                    key={song.id}
                    type="button"
                    onClick={() => setSelectedSong(song)}
                    className={`w-full min-h-[56px] px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-teal-50/80 text-slate-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-6 text-xs font-mono tabular-nums font-bold shrink-0 ${
                          isCurrent ? 'text-teal-700' : 'text-slate-400'
                        }`}
                      >
                        {String(song.id).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div
                          className={`text-xs font-bold truncate ${
                            isCurrent ? 'text-teal-800' : 'text-slate-900'
                          }`}
                        >
                          {song.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {song.artist}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isCurrent
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
