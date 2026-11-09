'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Plus,
  Volume2,
  VolumeX,
  Info,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trophy,
  Flame,
  Clock,
  Sparkles,
  CheckCircle2,
  Dumbbell,
  Maximize2,
  ArrowRight,
  Music,
} from 'lucide-react';
import {
  WORKOUT_EXERCISES,
  WorkoutExercise,
  WorkoutRoutine,
  DEFAULT_WORKOUT_ROUTINES,
} from '@/lib/workout-data';
import { workoutSound } from '@/lib/workout-sound';
import { MOTIVATIONAL_SONGS, MotivationalSong } from '@/lib/motivation-media-data';

type WorkoutPhase = 'overview' | 'ready' | 'active' | 'rest' | 'completed';

interface WorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkoutModal({ isOpen, onClose }: WorkoutModalProps) {
  const [phase, setPhase] = useState<WorkoutPhase>('overview');
  const [routines, setRoutines] = useState<WorkoutRoutine[]>(DEFAULT_WORKOUT_ROUTINES);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>('full_body_routine');
  const [workoutSongs, setWorkoutSongs] = useState<MotivationalSong[]>(MOTIVATIONAL_SONGS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showTipsModal, setShowTipsModal] = useState<boolean>(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [totalSecondsElapsed, setTotalSecondsElapsed] = useState<number>(0);
  const [skippedRestCount, setSkippedRestCount] = useState<number>(0);
  const [restExtendedSeconds, setRestExtendedSeconds] = useState<number>(0);
  const [liveWorkoutStreak, setLiveWorkoutStreak] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState<boolean>(true);
  const [workoutSongIndex, setWorkoutSongIndex] = useState<number>(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [isMusicPillExpanded, setIsMusicPillExpanded] = useState<boolean>(false);
  const musicPillRef = useRef<HTMLDivElement | null>(null);

  const workoutIframeRef = useRef<HTMLIFrameElement | null>(null);
  const keepAliveAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSpokenReadyRef = useRef<boolean>(false);
  const hasSpokenHalfwayRef = useRef<boolean>(false);

  // Sync routines and songs from admin API
  useEffect(() => {
    let cancelled = false;
    fetch('/api/workout/routines')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: WorkoutRoutine[] | null) => {
        if (!cancelled && data && Array.isArray(data) && data.length > 0) {
          setRoutines(data);
        }
      })
      .catch(() => {});

    fetch('/api/songs')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MotivationalSong[] | null) => {
        if (!cancelled && data && Array.isArray(data) && data.length > 0) {
          setWorkoutSongs(data);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const activeRoutine =
    routines.find((r) => r.id === selectedRoutineId) || routines[0] || DEFAULT_WORKOUT_ROUTINES[0];
  const activeExercises =
    activeRoutine?.exercises && activeRoutine.exercises.length > 0
      ? activeRoutine.exercises
      : WORKOUT_EXERCISES;

  const currentWorkoutSong: MotivationalSong =
    workoutSongs[workoutSongIndex % workoutSongs.length] || MOTIVATIONAL_SONGS[0];
  const workoutVideoId = currentWorkoutSong.defaultVideoIds[0];

  const currentExercise: WorkoutExercise = activeExercises[currentIndex] || activeExercises[0];
  const nextExercise: WorkoutExercise | null =
    currentIndex + 1 < activeExercises.length ? activeExercises[currentIndex + 1] : null;

  // PostMessage helper to control YouTube iframe playback
  const sendIframeCommand = useCallback((func: string, args: unknown[] = []) => {
    try {
      if (workoutIframeRef.current?.contentWindow) {
        workoutIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      }
    } catch {
      // Ignore postMessage failure
    }
  }, []);

  const playWorkoutMusic = useCallback(() => {
    if (!isMusicEnabled) return;
    sendIframeCommand('playVideo');
    setIsMusicPlaying(true);
  }, [isMusicEnabled, sendIframeCommand]);

  const pauseWorkoutMusic = useCallback(() => {
    sendIframeCommand('pauseVideo');
    setIsMusicPlaying(false);
  }, [sendIframeCommand]);

  const nextWorkoutSong = useCallback(() => {
    setWorkoutSongIndex((prev) => (prev + 1) % workoutSongs.length);
    setIsMusicPlaying(true);
  }, [workoutSongs.length]);

  const toggleWorkoutMusic = () => {
    setIsMusicEnabled((prev) => {
      const next = !prev;
      if (!next) {
        pauseWorkoutMusic();
      } else {
        playWorkoutMusic();
      }
      return next;
    });
  };

  // Collapse expanded music pill when tapping outside
  useEffect(() => {
    if (!isMusicPillExpanded) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (musicPillRef.current && !musicPillRef.current.contains(e.target as Node)) {
        setIsMusicPillExpanded(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isMusicPillExpanded]);

  // Toggle audio mute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    workoutSound.setMuted(nextMuted);
  };

  // Close and cleanup
  const handleClose = useCallback(() => {
    pauseWorkoutMusic();
    workoutSound.stopAll();
    if (timerRef.current) clearInterval(timerRef.current);
    if (keepAliveAudioRef.current) {
      keepAliveAudioRef.current.pause();
    }
    setPhase('overview');
    setCurrentIndex(0);
    setTimeLeft(60);
    setIsPaused(false);
    setShowTipsModal(false);
    setEnlargedImage(null);
    setIsMusicPillExpanded(false);
    onClose();
  }, [onClose, pauseWorkoutMusic]);

  // Start workout from overview
  const startWorkout = useCallback(() => {
    workoutSound.stopAll();
    setCurrentIndex(0);
    setWorkoutSongIndex(0);
    setTimeLeft(10); // 10s "Ready to go" countdown
    setPhase('ready');
    setIsPaused(false);
    setIsMusicPillExpanded(false);
    setTotalSecondsElapsed(0);
    hasSpokenReadyRef.current = false;
    hasSpokenHalfwayRef.current = false;
  }, []);

  // Move directly into the active exercise
  const beginExercise = useCallback((index: number) => {
    setCurrentIndex(index);
    const exercise = activeExercises[index] || activeExercises[0];
    setTimeLeft(exercise.durationSeconds);
    setPhase('active');
    setIsPaused(false);
    hasSpokenHalfwayRef.current = false;
    workoutSound.playBeep('start');
    workoutSound.speak(`${exercise.name}. Let's go!`, () => {
      if (isMusicEnabled && !isPaused) {
        playWorkoutMusic();
      }
    });
    // Ensure music is active and playing during the 1-minute exercise
    if (isMusicEnabled && !isPaused) {
      playWorkoutMusic();
    }
  }, [activeExercises, isMusicEnabled, isPaused, playWorkoutMusic]);

  // Complete an active exercise and transition to rest or complete
  const handleExerciseComplete = useCallback(() => {
    workoutSound.playBeep('rest');
    pauseWorkoutMusic();

    if (currentIndex + 1 < activeExercises.length) {
      setPhase('rest');
      setTimeLeft(30); // 30-second rest
      setIsPaused(false);

      // Play the custom Morgan ElevenLabs motivational voice for the completed exercise:
      const voiceUrl = currentExercise.voiceClipUrl || `/voice/exercise_complete_${Math.min(currentIndex + 1, 12)}.mp3`;
      workoutSound.playAudioClip(voiceUrl, () => {
        // When motivational voice concludes, resume the workout music for the rest period
        if (isMusicEnabled) {
          playWorkoutMusic();
        }
      });
    } else {
      setPhase('completed');
      pauseWorkoutMusic();
      workoutSound.playBeep('complete');

      // Final exercise voice clip
      const finalVoiceUrl = currentExercise.voiceClipUrl || `/voice/exercise_complete_12.mp3`;
      workoutSound.playAudioClip(finalVoiceUrl, () => {
        workoutSound.speak('Congratulations! Workout completed. Great job on keeping your streak alive!');
      });
    }
  }, [currentIndex, currentExercise, activeExercises.length, isMusicEnabled, pauseWorkoutMusic, playWorkoutMusic]);

  // Autoplay next YouTube motivational song in order when current video finishes (info === 0)
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowMessage = (event: MessageEvent) => {
      try {
        const raw = event.data;
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!data) return;

        if (
          (data.event === 'onStateChange' && data.info === 0) ||
          data.info?.playerState === 0
        ) {
          nextWorkoutSong();
        }
      } catch {
        // Ignore non-json messages
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [isOpen, nextWorkoutSong]);

  // Skip rest and start next exercise
  const skipRest = useCallback(() => {
    workoutSound.stopAll();
    if (nextExercise) {
      beginExercise(currentIndex + 1);
    } else {
      setPhase('completed');
    }
  }, [beginExercise, currentIndex, nextExercise]);

  // Extend rest by 10s
  const extendRest = () => {
    setTimeLeft((prev) => prev + 10);
    workoutSound.speak('Rest extended ten seconds.');
  };

  // Skip to next exercise or finish
  const skipActive = () => {
    workoutSound.stopAll();
    handleExerciseComplete();
  };

  // Go back to previous exercise
  const previousExercise = () => {
    workoutSound.stopAll();
    if (currentIndex > 0) {
      beginExercise(currentIndex - 1);
    } else {
      setPhase('overview');
      setTimeLeft(60);
      setIsPaused(false);
    }
  };

  // Announce "Ready to go"
  useEffect(() => {
    if (phase === 'ready' && !hasSpokenReadyRef.current && isOpen) {
      hasSpokenReadyRef.current = true;
      workoutSound.speak(`Ready to go! This is the next exercise: ${currentExercise.name}.`);
    }
  }, [phase, currentExercise, isOpen]);

  // Timer Tick Engine
  useEffect(() => {
    if (!isOpen || isPaused || phase === 'overview' || phase === 'completed') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTotalSecondsElapsed((prev) => prev + 1);

      setTimeLeft((prevTime) => {
        // Countdown beeps at 3, 2, 1
        if (prevTime <= 4 && prevTime > 1) {
          workoutSound.playBeep('countdown');
        }

        // Halfway motivational cue during 60s active exercise
        if (phase === 'active' && prevTime === 31 && !hasSpokenHalfwayRef.current) {
          hasSpokenHalfwayRef.current = true;
          workoutSound.speak('Halfway there! Keep your form solid!');
        }

        if (prevTime <= 1) {
          if (phase === 'ready') {
            beginExercise(currentIndex);
            return currentExercise.durationSeconds;
          }
          if (phase === 'active') {
            handleExerciseComplete();
            return 30;
          }
          if (phase === 'rest') {
            if (nextExercise) {
              beginExercise(currentIndex + 1);
              return nextExercise.durationSeconds;
            } else {
              setPhase('completed');
              return 0;
            }
          }
          return 0;
        }

        return prevTime - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isPaused, phase, currentIndex, currentExercise, nextExercise, beginExercise, handleExerciseComplete]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workout-feature-title"
    >
      {/* ========================================================================= */}
      {/* SHARED FULL-SCREEN LIGHT HEADER (Consistent with Calendar & Motivation Hub) */}
      {/* ========================================================================= */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 shrink-0">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-black p-1 border border-slate-800 shrink-0 shadow-sm">
              <Image
                src="/logo.png"
                alt="BeyondLimits Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="workout-feature-title" className="text-base sm:text-lg font-bold text-slate-900">
                  BeyondLimits Workout
                </h2>
                {phase !== 'overview' && phase !== 'completed' && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                    Step {currentIndex + 1} of {activeExercises.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {activeRoutine?.name || 'Workout'} · {activeExercises.length} Exercises · 1 min each · 30s rest
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Turn On / Off Workout Music Button */}
            <button
              type="button"
              onClick={toggleWorkoutMusic}
              aria-label={isMusicEnabled ? 'Turn off workout music' : 'Turn on workout music'}
              className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                isMusicEnabled
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200 bg-white'
              }`}
              title={isMusicEnabled ? 'Turn off workout music' : 'Turn on workout music'}
            >
              <Music className={`w-4 h-4 ${isMusicEnabled ? 'text-teal-600' : 'text-slate-400'}`} />
              <span className="hidden xs:inline">{isMusicEnabled ? 'Music: ON' : 'Turn on Music'}</span>
            </button>

            {phase !== 'overview' && (
              <button
                type="button"
                onClick={() => setPhase('overview')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Exercise List</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute voice and sound cues' : 'Mute voice and sound cues'}
              className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              title={isMuted ? 'Unmute voice coaching' : 'Mute voice coaching'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-teal-700" />}
            </button>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close workout modal"
              className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* VIEW 1: WORKOUT OVERVIEW (Responsive Laptop Grid + Mobile List)           */}
      {/* ========================================================================= */}
      {phase === 'overview' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl w-full mx-auto space-y-6">
            {/* Multi-Routine Selector Tabs */}
            {routines.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {routines.map((routine) => {
                  const isSelected = routine.id === selectedRoutineId;
                  return (
                    <button
                      key={routine.id}
                      type="button"
                      onClick={() => {
                        setSelectedRoutineId(routine.id);
                        setCurrentIndex(0);
                      }}
                      className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-2 ${
                        isSelected
                          ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                          : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span>{routine.badge || routine.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                          isSelected ? 'bg-teal-800 text-teal-100' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {routine.exercises?.length || 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Hero Card */}
            <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
                  <Flame className="w-4 h-4 text-teal-700" />
                  {activeRoutine?.badge || 'Home Workout'}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {activeRoutine?.name || 'Daily Discipline Workout'}
                </h1>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  {activeRoutine?.description ||
                    'Complete exercises in order with guided audio voice coaching, animated timers, and form instructions.'}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                    <Clock className="w-4 h-4 text-teal-700" />
                    <span>~{Math.round(activeExercises.length * 1.5)} Mins Total</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>{activeExercises.length} Exercises (1 min each)</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Audio Voice Coaching</span>
                  </div>
                </div>
              </div>

              {/* Start Workout Primary CTA */}
              <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
                <button
                  type="button"
                  onClick={startWorkout}
                  className="w-full sm:w-auto lg:w-64 py-4 px-8 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-base sm:text-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>Start Workout</span>
                </button>
              </div>
            </div>

            {/* Exercise Grid (Laptop 3-4 columns, Mobile 1 column) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Exercise Routine ({activeExercises.length} Steps)
                </h3>
                <span className="text-xs font-medium text-slate-500">Tap any exercise to preview</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {activeExercises.map((exercise, idx) => (
                  <div
                    key={exercise.id}
                    onClick={() => beginExercise(idx)}
                    className="bg-white border border-slate-200 hover:border-teal-500/60 hover:shadow-md rounded-2xl p-3.5 flex items-center gap-3.5 cursor-pointer transition-all active:scale-[0.99] group"
                  >
                    <div className="w-16 h-16 rounded-xl bg-slate-50 overflow-hidden relative shrink-0 border border-slate-200">
                      <Image
                        src={exercise.image}
                        alt={exercise.name}
                        fill
                        sizes="64px"
                        className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-teal-700">#{idx + 1}</span>
                        <span className="text-xs font-mono font-semibold text-slate-500">01:00</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5 group-hover:text-teal-700 transition-colors">
                        {exercise.name}
                      </h4>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{exercise.focus}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: READY TO GO (Responsive Laptop Split + Mobile Card)                */}
      {/* ========================================================================= */}
      {phase === 'ready' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
          <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Exercise Graphic Card */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col justify-between relative min-h-[320px] sm:min-h-[420px] lg:min-h-[500px]">
              <div className="flex items-center justify-between z-10 mb-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white">
                  Next Exercise #{currentIndex + 1}
                </span>

                <button
                  type="button"
                  onClick={() => setEnlargedImage(currentExercise.image)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Enlarge Image</span>
                </button>
              </div>

              {/* Graphic container */}
              <div
                className="relative w-full flex-1 min-h-[240px] sm:min-h-[340px] flex items-center justify-center cursor-pointer"
                onClick={() => setEnlargedImage(currentExercise.image)}
                title="Click to view full image"
              >
                <Image
                  src={currentExercise.image}
                  alt={currentExercise.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 600px"
                  className="object-contain"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{currentExercise.focus}</span>
                <span className="text-teal-700 font-semibold">Click image to zoom form tips</span>
              </div>
            </div>

            {/* Right: Countdown & Action Card */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between text-center min-h-[320px] sm:min-h-[420px] lg:min-h-[500px]">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-teal-700">
                  GET READY
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight mt-1">
                  READY TO GO!
                </h2>
                <div className="inline-flex items-center gap-1.5 mt-2">
                  <h3 className="text-xl sm:text-2xl font-black text-teal-800">{currentExercise.name}</h3>
                  <button
                    type="button"
                    onClick={() => setShowTipsModal(true)}
                    aria-label="View instructions"
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <Info className="w-5 h-5 text-teal-700" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">{currentExercise.description}</p>
              </div>

              {/* Circular Countdown Progress Ring */}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 mx-auto my-6 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    strokeWidth="8"
                    className="stroke-slate-100"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={264}
                    strokeDashoffset={264 - (264 * timeLeft) / 10}
                    className="stroke-teal-700 transition-all duration-1000 ease-linear"
                    fill="none"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl sm:text-6xl font-black font-mono text-slate-900">{timeLeft}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                    Seconds
                  </span>
                </div>
              </div>

              {/* Skip prep and begin right now */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => beginExercise(currentIndex)}
                  className="w-full py-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm sm:text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>Skip Prep &amp; Start</span>
                  <SkipForward className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setPhase('overview')}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Return to Exercise Overview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: ACTIVE EXERCISE (1 MINUTE TIMER)                                 */}
      {/* ========================================================================= */}
      {phase === 'active' && (
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 flex flex-col justify-center">
          <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            {/* Left: Graphic Guide Card (People follow form & instruction here) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-sm flex flex-col justify-between relative min-h-[300px] sm:min-h-[440px] lg:min-h-[520px]">
              <div className="flex items-center justify-between z-10 mb-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white">
                  Exercise {currentIndex + 1} of {activeExercises.length}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTipsModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-200"
                  >
                    <Info className="w-3.5 h-3.5 text-teal-700" />
                    <span>Instructions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnlargedImage(currentExercise.image)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-200"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Enlarge</span>
                  </button>
                </div>
              </div>

              {/* Instructional graphic */}
              <div
                className="relative w-full flex-1 min-h-[250px] sm:min-h-[360px] flex items-center justify-center cursor-pointer"
                onClick={() => setEnlargedImage(currentExercise.image)}
                title="Click to view full image diagram"
              >
                <Image
                  src={currentExercise.image}
                  alt={currentExercise.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 700px"
                  className="object-contain"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{currentExercise.focus}</span>
                <span className="text-teal-700 font-medium">Follow form guidance shown in illustration</span>
              </div>
            </div>

            {/* Right: Timer & Playback Controls Card */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm flex flex-col justify-between text-center min-h-[300px] sm:min-h-[440px] lg:min-h-[520px]">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-200/60">
                  {currentExercise.focus}
                </span>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 uppercase tracking-tight mt-2">
                  {currentExercise.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-sm mx-auto">
                  {currentExercise.description}
                </p>
              </div>

              {/* Big Timer (01:00 -> 00:00) */}
              <div className="my-4">
                <div
                  className={`text-6xl sm:text-7xl lg:text-8xl font-black font-mono tracking-tight transition-colors ${
                    timeLeft <= 5 ? 'text-amber-600 animate-pulse' : 'text-slate-900'
                  }`}
                >
                  {formatTime(timeLeft)}
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-xs h-3 bg-slate-100 rounded-full mt-4 overflow-hidden mx-auto border border-slate-200">
                  <div
                    className="h-full bg-teal-700 transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${(timeLeft / currentExercise.durationSeconds) * 100}%` }}
                  />
                </div>
              </div>

              {/* Playback Controls: Prev, Pause/Resume, Next */}
              <div className="space-y-4">
                <div className="w-full max-w-sm mx-auto flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={previousExercise}
                    aria-label="Previous exercise"
                    title="Previous Exercise"
                    className="min-h-[52px] min-w-[52px] rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPaused((prev) => {
                        const next = !prev;
                        if (next) {
                          pauseWorkoutMusic();
                        } else if (isMusicEnabled) {
                          playWorkoutMusic();
                        }
                        return next;
                      });
                    }}
                    aria-label={isPaused ? 'Resume exercise timer' : 'Pause exercise timer'}
                    className="flex-1 min-h-[52px] py-3.5 px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all cursor-pointer"
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-5 h-5 fill-white" />
                        <span>Resume</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-5 h-5 fill-white" />
                        <span>Pause</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={skipActive}
                    aria-label="Skip to next"
                    title="Next Exercise / Skip"
                    className="min-h-[52px] min-w-[52px] rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <span>Exercise {currentIndex + 1} of 12</span>
                  <span>{isPaused ? 'Paused' : 'Timer Active'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: REST SCREEN (30 SECONDS + 10s EXTEND & SKIP)                     */}
      {/* ========================================================================= */}
      {phase === 'rest' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
          <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Preview of Upcoming Exercise */}
            {nextExercise && (
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col justify-between relative min-h-[300px] sm:min-h-[420px] lg:min-h-[480px]">
                <div className="flex items-center justify-between z-10 mb-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                    NEXT #{currentIndex + 2} OF {activeExercises.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => setEnlargedImage(nextExercise.image)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-200"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Preview Full</span>
                  </button>
                </div>

                <div
                  className="relative w-full flex-1 min-h-[240px] sm:min-h-[320px] flex items-center justify-center cursor-pointer"
                  onClick={() => setEnlargedImage(nextExercise.image)}
                >
                  <Image
                    src={nextExercise.image}
                    alt={nextExercise.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 600px"
                    className="object-contain"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">{nextExercise.name}</span>
                  <span>{nextExercise.focus}</span>
                </div>
              </div>
            )}

            {/* Right: Rest Timer & Controls Card */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between text-center min-h-[300px] sm:min-h-[420px] lg:min-h-[480px]">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                  RECOVERY PERIOD
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-1">
                  Take a Rest
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upcoming next:{' '}
                  <span className="font-bold text-teal-700">
                    {nextExercise ? nextExercise.name : 'Final Stretch'}
                  </span>
                </p>
              </div>

              {/* Big Rest Timer */}
              <div className="my-6">
                <div className="text-6xl sm:text-7xl lg:text-8xl font-black font-mono tracking-tight text-teal-700">
                  {formatTime(timeLeft)}
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mt-2">
                  Remaining Rest Time
                </span>
              </div>

              {/* Rest Action Buttons: +10s and Skip */}
              <div className="w-full space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={extendRest}
                    className="py-3.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+10s Rest</span>
                  </button>

                  <button
                    type="button"
                    onClick={skipRest}
                    className="py-3.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Skip Rest</span>
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  Catch your breath and get ready for {nextExercise?.name || 'the next exercise'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 5: WORKOUT COMPLETED CELEBRATION                                    */}
      {/* ========================================================================= */}
      {phase === 'completed' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center items-center">
          <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-sm text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Trophy className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Workout Completed!
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-md mx-auto">
                Incredible dedication! You crushed all 12 exercises, maintained your discipline streak, and pushed your limits.
              </p>
            </div>

            {/* Stats Card */}
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-xs text-slate-500 font-medium">Exercises</span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">12 / 12</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-xs text-slate-500 font-medium">Total Duration</span>
                <div className="text-xl sm:text-2xl font-black text-teal-700 mt-0.5">
                  {formatTime(totalSecondsElapsed)}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={startWorkout}
                className="w-full py-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Do It Again</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm border border-slate-200 transition-colors cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXERCISE TIPS & INSTRUCTIONS MODAL                                       */}
      {/* ========================================================================= */}
      {showTipsModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-slate-900 shadow-xl flex flex-col max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
                  <Info className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-base text-slate-900">{currentExercise.name} Form Guide</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowTipsModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-sm">
              <div>
                <h5 className="text-xs font-bold uppercase text-slate-500">Target Area</h5>
                <p className="text-teal-700 font-semibold mt-0.5">{currentExercise.focus}</p>
              </div>

              <div>
                <h5 className="text-xs font-bold uppercase text-slate-500">How to Perform</h5>
                <p className="text-slate-600 mt-1 leading-relaxed">{currentExercise.description}</p>
              </div>

              <div>
                <h5 className="text-xs font-bold uppercase text-slate-500">Key Form Tips</h5>
                <ul className="mt-2 space-y-2">
                  {currentExercise.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTipsModal(false)}
              className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 font-bold text-sm text-white transition-colors cursor-pointer mt-2"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULLSCREEN / ENLARGED IMAGE LIGHTBOX                                     */}
      {/* ========================================================================= */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center cursor-zoom-out"
          onClick={() => setEnlargedImage(null)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[90vh] h-[90vh] bg-white rounded-2xl sm:rounded-3xl p-4 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-sm font-bold text-slate-900">High-Resolution Exercise Diagram</span>
              <button
                type="button"
                onClick={() => setEnlargedImage(null)}
                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full flex-1 overflow-hidden mt-2">
              <Image
                src={enlargedImage}
                alt="Enlarged exercise illustration"
                fill
                sizes="(max-width: 1024px) 100vw, 800px"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BACKGROUND PERSISTENT YOUTUBE AUDIO PLAYER (NO VISIBLE VIDEO)            */}
      {/* Stays mounted continuously during Active <-> Rest so audio NEVER resets   */}
      {/* ========================================================================= */}
      {isOpen && (
        <div
          className="fixed -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <iframe
            ref={workoutIframeRef}
            id="workout-persistent-youtube-iframe"
            key={`workout-yt-track-${currentWorkoutSong.id}-${workoutVideoId}`}
            src={`https://www.youtube-nocookie.com/embed/${workoutVideoId}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={`${currentWorkoutSong.title} - ${currentWorkoutSong.artist}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            tabIndex={-1}
            className="w-1 h-1 border-0"
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP-CENTER EXPANDABLE WORKOUT MUSIC OVAL / PILL                           */}
      {/* Initial state: sleek small oval. Click to expand for Play, Pause, Next    */}
      {/* ========================================================================= */}
      {isOpen && (phase === 'active' || phase === 'rest' || phase === 'ready') && (
        <div className="fixed top-3.5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
          {!isMusicPillExpanded ? (
            /* Hiding mode: Small sleek oval */
            <button
              type="button"
              onClick={() => setIsMusicPillExpanded(true)}
              className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white backdrop-blur-md border border-slate-200/90 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-slate-800 active:scale-95"
              title="Click to control workout music"
              aria-label="Expand workout music player"
            >
              <div className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                {isMusicEnabled && isMusicPlaying ? (
                  <div className="flex items-center gap-0.5 h-2.5">
                    {[40, 90, 60].map((h, i) => (
                      <span
                        key={i}
                        className="w-0.5 bg-teal-600 rounded-full animate-pulse"
                        style={{ height: `${h}%`, animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                ) : (
                  <Music className="w-3 h-3 text-slate-400" />
                )}
              </div>

              <span className="text-xs font-semibold text-slate-700 max-w-[130px] sm:max-w-[200px] truncate">
                {isMusicEnabled ? currentWorkoutSong.title : 'Music Off'}
              </span>

              {isMusicEnabled && isMusicPlaying ? (
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
              )}

              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
            </button>
          ) : (
            /* Expanded mode: Floating Music Mini Controller */
            <div
              ref={musicPillRef}
              className="w-80 max-w-[92vw] bg-white rounded-2xl border border-slate-200 shadow-2xl p-3.5 transition-all animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700 shrink-0">
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                      {isMusicEnabled ? (isMusicPlaying ? 'Workout Music' : 'Music Paused') : 'Music Muted'}
                    </span>
                    <p className="text-xs font-bold text-slate-800 truncate">
                      #{currentWorkoutSong.id}: {currentWorkoutSong.title}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMusicPillExpanded(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Collapse to oval"
                  aria-label="Collapse music controls"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>

              <div className="py-2 flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate">{currentWorkoutSong.artist}</span>
                <span className="shrink-0 font-medium text-slate-400">
                  {workoutSongIndex + 1} / {workoutSongs.length}
                </span>
              </div>

              {/* Music controls: Play/Pause, Next Track, Music On/Off */}
              <div className="flex items-center justify-between pt-1 gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isMusicPlaying) {
                        pauseWorkoutMusic();
                      } else {
                        playWorkoutMusic();
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer active:scale-95"
                    title={isMusicPlaying ? 'Pause Music' : 'Play Music'}
                  >
                    {isMusicPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={nextWorkoutSong}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                    title="Next Motivational Song"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span>Next</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={toggleWorkoutMusic}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                    isMusicEnabled
                      ? 'bg-teal-50 border-teal-200 text-teal-700'
                      : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                  title={isMusicEnabled ? 'Turn Off Music' : 'Turn On Music'}
                >
                  {isMusicEnabled ? 'MUSIC ON' : 'MUSIC OFF'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
