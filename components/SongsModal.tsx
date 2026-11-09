'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Music,
  Play,
  SkipBack,
  SkipForward,
  RefreshCw,
  X,
  Volume2,
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
  const [songs, setSongs] = useState<MotivationalSong[]>(MOTIVATIONAL_SONGS);
  const [selectedSong, setSelectedSong] = useState<MotivationalSong>(
    MOTIVATIONAL_SONGS[0]
  );
  const [videoIds, setVideoIds] = useState<string[]>(
    MOTIVATIONAL_SONGS[0].defaultVideoIds
  );
  const [streamIndex, setStreamIndex] = useState<number>(0);
  const [resolving, setResolving] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const keepAliveAudioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch updated motivational songs from admin sync API on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/songs')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MotivationalSong[] | null) => {
        if (!cancelled && data && Array.isArray(data) && data.length > 0) {
          setSongs(data);
          setSelectedSong((prev) => {
            const match = data.find((s) => s.id === prev.id);
            return match || data[0];
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Pause dashboard assistant voice when music modal opens
  useEffect(() => {
    if (!isOpen) return;
    onPauseBackgroundVoice();
  }, [isOpen, onPauseBackgroundVoice]);

  // Load verified alternate video IDs for current song
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

  const currentIdx = songs.findIndex(
    (s) => s.id === selectedSong.id
  );

  const handlePrevSong = useCallback(() => {
    if (songs.length === 0) return;
    const safeIdx = currentIdx >= 0 ? currentIdx : 0;
    const prevIdx =
      (safeIdx - 1 + songs.length) % songs.length;
    setSelectedSong(songs[prevIdx]);
  }, [currentIdx, songs]);

  const handleNextSong = useCallback(() => {
    if (songs.length === 0) return;
    const safeIdx = currentIdx >= 0 ? currentIdx : 0;
    const nextIdx = (safeIdx + 1) % songs.length;
    setSelectedSong(songs[nextIdx]);
  }, [currentIdx, songs]);

  const handleSwitchStream = () => {
    setStreamIndex((prev) => (prev + 1) % Math.max(1, videoIds.length));
  };

  const activeVideoId =
    videoIds[streamIndex % videoIds.length] || selectedSong.defaultVideoIds[0];

  // Mobile background playback keepalive & MediaSession lockscreen integration
  useEffect(() => {
    if (!isOpen) {
      if (keepAliveAudioRef.current) {
        keepAliveAudioRef.current.pause();
      }
      return;
    }

    // Initialize silent keep-alive audio element so mobile browser allows background audio
    if (!keepAliveAudioRef.current) {
      // 1-second silent WAV base64
      const silentWav =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      const audio = new Audio(silentWav);
      audio.loop = true;
      audio.volume = 0.001;
      keepAliveAudioRef.current = audio;
    }

    keepAliveAudioRef.current.play().catch(() => {
      // Ignore autoplay policy restriction
    });

    // Update MediaSession with song details for mobile notification and lockscreen
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: selectedSong.title,
          artist: selectedSong.artist,
          album: 'BeyondLimits Motivation (15 Tracks)',
          artwork: [
            {
              src: `https://img.youtube.com/vi/${activeVideoId}/hqdefault.jpg`,
              sizes: '480x360',
              type: 'image/jpeg',
            },
          ],
        });
        navigator.mediaSession.playbackState = 'playing';

        navigator.mediaSession.setActionHandler('previoustrack', handlePrevSong);
        navigator.mediaSession.setActionHandler('nexttrack', handleNextSong);
      } catch {
        // MediaSession fallback
      }
    }
  }, [isOpen, selectedSong, activeVideoId, handlePrevSong, handleNextSong]);

  // Autoplay next track one after another when current video finishes (YouTube State: 0 = ENDED)
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowMessage = (event: MessageEvent) => {
      try {
        const raw = event.data;
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!data) return;

        // YouTube postMessage format: { event: "onStateChange", info: 0 }
        // info: 0 means ENDED
        if (
          (data.event === 'onStateChange' && data.info === 0) ||
          data.info?.playerState === 0
        ) {
          handleNextSong();
        }
      } catch {
        // Ignore non-json messages
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [isOpen, handleNextSong]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Full-Screen Light Header (Consistent with original theme) */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Motivational Songs Player (15 Tracks)
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  <Volume2 className="w-3 h-3 text-teal-600" />
                  Continuous Autoplay ON
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Plays automatically one after another • Background playback enabled
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
            aria-label="Close Motivational Songs Player"
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
                  ref={iframeRef}
                  key={`${selectedSong.id}-${activeVideoId}`}
                  src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1`}
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

          {/* Right 5 Cols: Scrollable List of Songs */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col max-h-[65vh]">
            <div className="overflow-y-auto divide-y divide-slate-100">
              {songs.map((song) => {
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
