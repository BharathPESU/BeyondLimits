'use client';

import React, { useState, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Radio,
  Tv,
  RefreshCw,
  X,
  Sparkles,
} from 'lucide-react';
import { MOTIVATIONAL_SONGS, MotivationalSong } from '@/lib/motivation-media-data';
import { workoutMusicManager, MusicTrack } from '@/lib/workout-music-manager';

interface SongsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPauseBackgroundVoice: () => void;
}

// Convert MOTIVATIONAL_SONGS to MusicTrack format for the global background player
const MOTIVATION_TRACKS: MusicTrack[] = MOTIVATIONAL_SONGS.map((song) => ({
  id: song.id,
  title: song.title,
  artist: song.artist,
  genre: song.genre || 'High-Energy Gym Drive',
  src: song.audioSrc,
  fallbackSrc: song.audioFallbackSrc,
  durationSeconds: 195,
}));

export default function SongsModal({
  isOpen,
  onClose,
  onPauseBackgroundVoice,
}: SongsModalProps) {
  const [playerMode, setPlayerMode] = useState<'audio' | 'video'>('audio');
  const [selectedSongIndex, setSelectedSongIndex] = useState<number>(0);
  const [videoIds, setVideoIds] = useState<string[]>(
    MOTIVATIONAL_SONGS[0].defaultVideoIds
  );
  const [streamIndex, setStreamIndex] = useState<number>(0);
  const [resolving, setResolving] = useState<boolean>(false);

  // Audio manager state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(195);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const selectedSong = MOTIVATIONAL_SONGS[selectedSongIndex] || MOTIVATIONAL_SONGS[0];

  // Pause voice briefing when music modal opens
  useEffect(() => {
    if (!isOpen) return;
    onPauseBackgroundVoice();
  }, [isOpen, onPauseBackgroundVoice]);

  // Subscribe to background audio engine updates
  useEffect(() => {
    const unsubscribe = workoutMusicManager.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setCurrentTime(state.currentTime);
      if (state.duration > 0 && !isNaN(state.duration)) {
        setDuration(state.duration);
      }
      setVolume(state.volume);
      setIsMuted(state.isMuted);

      // Keep selected song synchronized if track advances automatically
      if (state.currentTrackIndex !== selectedSongIndex) {
        setSelectedSongIndex(state.currentTrackIndex);
      }
    });

    return unsubscribe;
  }, [selectedSongIndex]);

  // When modal opens, set the playlist and start playing the song automatically
  useEffect(() => {
    if (!isOpen) return;
    workoutMusicManager.setPlaylist(MOTIVATION_TRACKS, selectedSongIndex);
    if (playerMode === 'audio') {
      void workoutMusicManager.play();
    }
  }, [isOpen, playerMode, selectedSongIndex]);

  // Load YouTube fallback video IDs when selected song changes
  useEffect(() => {
    if (!isOpen || playerMode !== 'video') return;
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
  }, [selectedSong, isOpen, playerMode]);

  if (!isOpen) {
    return null;
  }

  const activeVideoId =
    videoIds[streamIndex % videoIds.length] || selectedSong.defaultVideoIds[0];

  const handleSelectSong = (index: number) => {
    setSelectedSongIndex(index);
    if (playerMode === 'audio') {
      void workoutMusicManager.playTrack(index);
    }
  };

  const handleTogglePlay = () => {
    workoutMusicManager.togglePlay();
  };

  const handlePrevSong = () => {
    const prevIdx =
      (selectedSongIndex - 1 + MOTIVATIONAL_SONGS.length) % MOTIVATIONAL_SONGS.length;
    handleSelectSong(prevIdx);
  };

  const handleNextSong = () => {
    const nextIdx = (selectedSongIndex + 1) % MOTIVATIONAL_SONGS.length;
    handleSelectSong(nextIdx);
  };

  const handleSwitchStream = () => {
    setStreamIndex((prev) => (prev + 1) % Math.max(1, videoIds.length));
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Full-Screen Dark HUD Header */}
      <div className="bg-slate-900 border-b border-cyan-950 px-4 sm:px-6 py-4 shrink-0 shadow-lg">
        <div className="max-w-5xl w-full mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Motivational Songs Player
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Background Play Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                15 Tracks — Plays continuously in background when minimized
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Player Mode Switcher: Audio vs Video */}
            <div className="hidden sm:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setPlayerMode('audio')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  playerMode === 'audio'
                    ? 'bg-cyan-600 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Background Audio</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlayerMode('video');
                  workoutMusicManager.pause();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  playerMode === 'video'
                    ? 'bg-cyan-600 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Video Clip</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Audio/Video Player + 15 Songs Playlist */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-radial from-slate-900 to-slate-950">
        <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 7 Cols: Active Music Player HUD */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-cyan-900/40 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-2xl backdrop-blur-md">
            {playerMode === 'audio' ? (
              <div className="space-y-6">
                {/* Visualizer & Song Showcase Card */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-cyan-900/50 flex flex-col items-center justify-center p-6 text-center shadow-inner">
                  {/* Subtle Background Glow Rings */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                    <div className="w-64 h-64 rounded-full border border-cyan-400 animate-ping" />
                    <div className="w-48 h-48 rounded-full border border-teal-500" />
                  </div>

                  <div className="relative z-10 space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Track #{selectedSong.id} of 15 — Autoplay Active</span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                      {selectedSong.title}
                    </h3>
                    <p className="text-sm font-semibold text-cyan-400">
                      {selectedSong.artist}
                    </p>
                    <span className="inline-block text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-0.5 rounded-md border border-slate-800">
                      {selectedSong.genre || 'High-Energy Gym Drive'}
                    </span>

                    {/* Animated Sound Equalizer Bars */}
                    <div className="flex items-center justify-center gap-1.5 h-8 pt-2">
                      {[40, 75, 55, 90, 60, 85, 45, 95, 65, 50, 80, 70].map(
                        (height, i) => (
                          <div
                            key={i}
                            className={`w-1 rounded-full bg-cyan-400 transition-all ${
                              isPlaying
                                ? 'animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]'
                                : 'opacity-30'
                            }`}
                            style={{
                              height: isPlaying ? `${height}%` : '20%',
                              animationDelay: `${(i % 5) * 120}ms`,
                              animationDuration: '600ms',
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>

                  {/* Mobile Background Notice */}
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <span className="text-[10px] text-teal-400/90 font-medium">
                      ✓ Audio continues playing when minimized or when phone screen locks
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Timestamps */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="text-cyan-400 font-semibold">{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => workoutMusicManager.seek(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            ) : (
              /* Video Mode: YouTube Embed */
              <div className="space-y-4">
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-cyan-900/50 shadow-inner">
                  <iframe
                    key={`${selectedSong.id}-${activeVideoId}`}
                    src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                    title={`${selectedSong.title} - ${selectedSong.artist}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-cyan-400 font-mono font-bold">
                      Track #{selectedSong.id} of 15
                    </div>
                    <h3 className="text-base font-bold text-white truncate">
                      {selectedSong.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">
                      {selectedSong.artist}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSwitchStream}
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-slate-800 hover:bg-slate-700 border border-cyan-800/40 rounded-xl shrink-0 cursor-pointer"
                    title="Switch alternate stream"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-cyan-400 ${
                        resolving ? 'animate-spin' : ''
                      }`}
                    />
                    <span>
                      Stream ({(streamIndex % videoIds.length) + 1}/
                      {videoIds.length})
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Transport Controls (Play, Pause, Skip, Volume) */}
            <div className="space-y-4 pt-4 mt-4 border-t border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => workoutMusicManager.setMuted(!isMuted)}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      workoutMusicManager.setMuted(false);
                      workoutMusicManager.setVolume(Number(e.target.value));
                    }}
                    className="w-20 sm:w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Primary Playback Buttons */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handlePrevSong}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
                    title="Previous Song"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="min-h-[48px] px-6 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-5 h-5 fill-current" />
                        <span className="text-xs uppercase tracking-wider">Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-current" />
                        <span className="text-xs uppercase tracking-wider">Play</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextSong}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
                    title="Next Song (Autoplay)"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Scrollable List of 15 Songs */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-cyan-900/40 rounded-2xl overflow-hidden flex flex-col max-h-[68vh] shadow-2xl backdrop-blur-md">
            <div className="p-3 bg-slate-950 border-b border-cyan-900/40 flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 tracking-wide">
                MOTIVATION PLAYLIST (15)
              </span>
              <span className="text-[11px] text-teal-400 font-mono">
                Autoplays Next Track
              </span>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-800/60">
              {MOTIVATIONAL_SONGS.map((song, index) => {
                const isCurrent = index === selectedSongIndex;
                return (
                  <button
                    key={song.id}
                    type="button"
                    onClick={() => handleSelectSong(index)}
                    className={`w-full min-h-[58px] px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-cyan-950/70 border-l-4 border-cyan-400 text-white'
                        : 'hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-6 text-xs font-mono tabular-nums font-bold shrink-0 ${
                          isCurrent ? 'text-cyan-400' : 'text-slate-500'
                        }`}
                      >
                        {String(song.id).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div
                          className={`text-xs font-bold truncate ${
                            isCurrent ? 'text-cyan-300' : 'text-slate-100'
                          }`}
                        >
                          {song.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {song.artist}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isCurrent
                          ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
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
