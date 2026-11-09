'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Volume2,
  Square,
  RefreshCw,
  CheckSquare,
  Calendar,
  Trophy,
  Edit3,
  Music,
  Flame,
  Quote,
  Sparkles,
  Newspaper,
  MessageSquare,
  Dumbbell,
  User,
  Settings,
} from 'lucide-react';
import { SignInButton, SignUpButton, Show, UserButton } from '@clerk/nextjs';
import {
  DailyMotivationRecord,
  DailyTechNewsRecord,
  DashboardPayload,
  FriendId,
} from '@/lib/types';
import AttendanceModal from './AttendanceModal';
import AttendanceCalendarModal from './AttendanceCalendarModal';
import SongsModal from './SongsModal';
import ShortsModal from './ShortsModal';
import QuotesModal from './QuotesModal';
import MotivationHubModal from './MotivationHubModal';
import NewsModal from './NewsModal';
import MotivationalChatModal from './MotivationalChatModal';
import WorkoutModal from './WorkoutModal';
import UserProfileModal from './UserProfileModal';
import UserSettingsModal from './UserSettingsModal';
import PWAInstallButton from './PWAInstallButton';
import VoiceFireCanvas, { VoiceAudioTelemetry } from './VoiceFireCanvas';
import JarvisArcReactorCanvas from './JarvisArcReactorCanvas';

const MAIN_VOICE_QUOTES = [
  '/assets/aistudio/main_voice/main_voice_1.mp3', // Quote 1: Initial welcome on app open (only once)
  '/assets/aistudio/main_voice/main_voice_2.mp3', // Quote 2: 1st Jarvis click
  '/assets/aistudio/main_voice/main_voice_3.mp3', // Quote 3: 2nd Jarvis click
  '/assets/aistudio/main_voice/main_voice_4.mp3', // Quote 4: 3rd Jarvis click
  '/assets/aistudio/main_voice/main_voice_5.mp3', // Quote 5: 4th Jarvis click
  '/assets/aistudio/main_voice/main_voice_6.mp3', // Quote 6: 5th Jarvis click
] as const;

interface DisciplineDashboardClientProps {
  initialData: DashboardPayload;
}

export default function DisciplineDashboardClient({
  initialData,
}: DisciplineDashboardClientProps) {
  const [dashboard, setDashboard] = useState<DashboardPayload>(initialData);
  const [graphMode, setGraphMode] = useState<'weekly' | 'monthly'>('weekly');
  const [isAttendanceOpen, setIsAttendanceOpen] = useState<boolean>(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [isMotivationHubOpen, setIsMotivationHubOpen] = useState<boolean>(false);
  const [isSongsOpen, setIsSongsOpen] = useState<boolean>(false);
  const [isShortsOpen, setIsShortsOpen] = useState<boolean>(false);
  const [isQuotesOpen, setIsQuotesOpen] = useState<boolean>(false);
  const [isNewsOpen, setIsNewsOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isWorkoutOpen, setIsWorkoutOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Daily 7:00 AM AI & Tech News state
  const [newsRecord, setNewsRecord] = useState<DailyTechNewsRecord | null>(
    initialData.dailyTechNews ?? null
  );
  const [loadingNews, setLoadingNews] = useState<boolean>(false);
  const newsRefreshIndexRef = useRef<number>(0);
  const auto7AmNewsDateRef = useRef<string>('');

  const [selectedFriend, setSelectedFriend] = useState<FriendId>('bharath_cd');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );

  // Voice & Motivation state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [loadingMotivation, setLoadingMotivation] = useState<boolean>(false);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserTimerRef = useRef<number | null>(null);
  const wordPulseBoostRef = useRef<number>(0);
  const hasAutoPlayedRef = useRef<boolean>(false);
  const jarvisQuoteIndexRef = useRef<number>(1); // Index 1 is Quote 2 in MAIN_VOICE_QUOTES
  const auto8PmTriggeredRef = useRef<string>(
    initialData.reminderConfig.lastTriggeredDate || ''
  );

  // Shared mutable ref read at 60fps by Three.js VoiceFireCanvas
  const telemetryRef = useRef<VoiceAudioTelemetry>({
    level: 0.12,
    bass: 0.1,
    mid: 0.08,
    treble: 0.05,
    isSpeaking: false,
  });

  const refreshDashboard = useCallback(async () => {
    const res = await fetch('/api/attendance', { cache: 'no-store' });
    if (res.ok) {
      const updated = (await res.json()) as DashboardPayload;
      setDashboard(updated);
    }
  }, []);

  const loadDailyTechNews = useCallback(async () => {
    try {
      const res = await fetch('/api/news', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { news?: DailyTechNewsRecord };
        if (data.news) {
          setNewsRecord(data.news);
        }
      }
    } catch {
      // ignore background fetch error
    }
  }, []);

  const handleRefreshLiveNews = useCallback(async () => {
    setLoadingNews(true);
    try {
      newsRefreshIndexRef.current += 1;
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshIndex: newsRefreshIndexRef.current }),
      });
      if (res.ok) {
        const data = (await res.json()) as { news?: DailyTechNewsRecord };
        if (data.news) {
          setNewsRecord(data.news);
        }
      }
    } finally {
      setLoadingNews(false);
    }
  }, []);

  // Daily 7:00 AM (07:00) AI & Tech News auto-fetch + 8:00 PM (20:00) phone attendance reminder
  useEffect(() => {
    const checkScheduledTasks = async () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const hhmm = `${hh}:${mm}`;
      const todayStr = now.toISOString().slice(0, 10);

      // 1. Daily 7:00 AM AI & Tech News refresh
      if (hhmm === '07:00' && auto7AmNewsDateRef.current !== todayStr) {
        auto7AmNewsDateRef.current = todayStr;
        await handleRefreshLiveNews();
      }

      // 2. Daily 8:00 PM Phone Attendance reminder
      const bothMarked =
        dashboard.reminderConfig.todayStatus.bharathCdMarked &&
        dashboard.reminderConfig.todayStatus.bharathRMarked;

      if (
        dashboard.reminderConfig.enabled &&
        hhmm === (dashboard.reminderConfig.reminderTime || '20:00') &&
        !bothMarked &&
        auto8PmTriggeredRef.current !== todayStr
      ) {
        auto8PmTriggeredRef.current = todayStr;
        await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceManual: false }),
        }).catch(() => {});
      }
    };

    const interval = setInterval(checkScheduledTasks, 30000);
    return () => clearInterval(interval);
  }, [dashboard.reminderConfig, handleRefreshLiveNews]);

  const stopAudioTelemetryLoop = useCallback(() => {
    if (analyserTimerRef.current !== null) {
      window.clearInterval(analyserTimerRef.current);
      analyserTimerRef.current = null;
    }
    telemetryRef.current = {
      level: 0.05,
      bass: 0.04,
      mid: 0.03,
      treble: 0.02,
      isSpeaking: false,
    };
  }, []);

  const startAudioTelemetryLoop = useCallback(
    (audioEl?: HTMLAudioElement) => {
      stopAudioTelemetryLoop();

      let analyser: AnalyserNode | null = null;
      let freqData: Uint8Array<ArrayBuffer> | null = null;

      if (audioEl && typeof window !== 'undefined') {
        try {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          if (!audioCtxRef.current && AudioContextClass) {
            audioCtxRef.current = new AudioContextClass();
          }
          const ctx = audioCtxRef.current;
          if (ctx) {
            if (ctx.state === 'suspended') {
              void ctx.resume();
            }
            audioEl.crossOrigin = 'anonymous';
            const source = ctx.createMediaElementSource(audioEl);
            analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.72;
            source.connect(analyser);
            analyser.connect(ctx.destination);
            freqData = new Uint8Array(
              new ArrayBuffer(analyser.frequencyBinCount)
            );
          }
        } catch {
          analyser = null;
        }
      }

      const startTime = performance.now();
      analyserTimerRef.current = window.setInterval(() => {
        let measuredLevel = 0;
        let measuredBass = 0;
        let measuredMid = 0;
        let measuredTreble = 0;

        if (analyser && freqData) {
          analyser.getByteFrequencyData(freqData);
          let bassSum = 0;
          let midSum = 0;
          let trebleSum = 0;

          for (let i = 0; i < 12; i++) bassSum += freqData[i];
          for (let i = 12; i < 40; i++) midSum += freqData[i];
          for (let i = 40; i < 80; i++) trebleSum += freqData[i];

          measuredBass = Math.min(1, bassSum / (12 * 200));
          measuredMid = Math.min(1, midSum / (28 * 170));
          measuredTreble = Math.min(1, trebleSum / (40 * 140));
          measuredLevel = Math.min(
            1,
            measuredBass * 0.45 + measuredMid * 0.4 + measuredTreble * 0.15
          );
        }

        const t = (performance.now() - startTime) * 0.001;
        wordPulseBoostRef.current *= 0.86;
        const syllableWave =
          Math.max(0, Math.sin(t * 11.5) * 0.55 + Math.sin(t * 5.2) * 0.45) *
          (0.65 + 0.35 * Math.sin(t * 2.3));
        const cadenceBass = Math.min(
          1,
          0.35 + syllableWave * 0.55 + wordPulseBoostRef.current * 0.4
        );
        const cadenceMid = Math.min(
          1,
          0.25 +
            Math.abs(Math.sin(t * 17.0)) * 0.55 +
            wordPulseBoostRef.current * 0.35
        );
        const cadenceTreble = Math.min(
          1,
          0.2 + Math.abs(Math.cos(t * 23.0)) * 0.6
        );
        const cadenceLevel = Math.min(
          1,
          cadenceBass * 0.45 + cadenceMid * 0.35 + cadenceTreble * 0.2
        );

        telemetryRef.current = {
          level: Math.max(measuredLevel, cadenceLevel),
          bass: Math.max(measuredBass, cadenceBass),
          mid: Math.max(measuredMid, cadenceMid),
          treble: Math.max(measuredTreble, cadenceTreble),
          isSpeaking: true,
        };
      }, 30);
    },
    [stopAudioTelemetryLoop]
  );

  const stopVoice = useCallback(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    stopAudioTelemetryLoop();
    setIsSpeaking(false);
  }, [stopAudioTelemetryLoop]);

  const playBrowserMaleFallbackPromise = useCallback(
    (text: string): Promise<boolean> => {
      return new Promise((resolve) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
          resolve(false);
          return;
        }
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          const voices = window.speechSynthesis.getVoices();
          const maleVoice = voices.find((v) =>
            /matthew|david|daniel|alex|male|guy|mark|james|george/i.test(v.name)
          );
          if (maleVoice) utterance.voice = maleVoice;
          utterance.pitch = 0.82;
          utterance.rate = 0.96;

          utterance.onstart = () => {
            setIsSpeaking(true);
            startAudioTelemetryLoop();
          };
          utterance.onboundary = () => {
            wordPulseBoostRef.current = 1.0;
          };
          utterance.onend = () => {
            stopAudioTelemetryLoop();
            setIsSpeaking(false);
            resolve(true);
          };
          utterance.onerror = () => {
            stopAudioTelemetryLoop();
            setIsSpeaking(false);
            resolve(false);
          };
          window.speechSynthesis.speak(utterance);
        } catch {
          resolve(false);
        }
      });
    },
    [startAudioTelemetryLoop, stopAudioTelemetryLoop]
  );

  const speakCustomText = useCallback(
    async (scriptText: string, isAutoMount = false): Promise<void> => {
      stopVoice();

      let puterObj = typeof window !== 'undefined' ? window.puter : undefined;
      if (!puterObj && typeof window !== 'undefined') {
        for (let i = 0; i < 8; i++) {
          await new Promise((r) => setTimeout(r, 120));
          if (window.puter?.ai?.txt2speech) {
            puterObj = window.puter;
            break;
          }
        }
      }

      if (puterObj?.ai?.txt2speech) {
        try {
          const audio = await puterObj.ai.txt2speech(scriptText, {
            provider: 'aws-polly',
            voice: 'Matthew',
            engine: 'neural',
            language: 'en-US',
          });
          activeAudioRef.current = audio;

          await new Promise<void>((resolve, reject) => {
            audio.onplay = () => {
              setIsSpeaking(true);
              startAudioTelemetryLoop(audio);
            };
            audio.onended = () => {
              stopAudioTelemetryLoop();
              setIsSpeaking(false);
              resolve();
            };
            audio.onpause = () => {
              stopAudioTelemetryLoop();
              setIsSpeaking(false);
              resolve();
            };
            audio.onerror = () => {
              stopAudioTelemetryLoop();
              setIsSpeaking(false);
              reject(new Error('Audio element error'));
            };
            audio.play().catch(reject);
          });
          return;
        } catch (err) {
          const errName = err instanceof Error ? err.name : '';
          if (isAutoMount && errName === 'NotAllowedError') {
            await playBrowserMaleFallbackPromise(scriptText);
            return;
          }
        }
      }

      await playBrowserMaleFallbackPromise(scriptText);
    },
    [
      playBrowserMaleFallbackPromise,
      startAudioTelemetryLoop,
      stopAudioTelemetryLoop,
      stopVoice,
    ]
  );

  const playMainVoiceClip = useCallback(
    async (clipUrl: string, isAutoMount = false): Promise<void> => {
      stopVoice();

      try {
        const audio = new Audio(clipUrl);
        audio.preload = 'auto';
        activeAudioRef.current = audio;

        await new Promise<void>((resolve, reject) => {
          audio.onplay = () => {
            setIsSpeaking(true);
            startAudioTelemetryLoop(audio);
          };
          audio.onended = () => {
            stopAudioTelemetryLoop();
            setIsSpeaking(false);
            activeAudioRef.current = null;
            resolve();
          };
          audio.onpause = () => {
            stopAudioTelemetryLoop();
            setIsSpeaking(false);
            resolve();
          };
          audio.onerror = () => {
            stopAudioTelemetryLoop();
            setIsSpeaking(false);
            activeAudioRef.current = null;
            reject(new Error(`Failed to load audio: ${clipUrl}`));
          };

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              stopAudioTelemetryLoop();
              setIsSpeaking(false);
              activeAudioRef.current = null;
              if (isAutoMount && err.name === 'NotAllowedError') {
                const handleFirstUserInteraction = () => {
                  window.removeEventListener('pointerdown', handleFirstUserInteraction);
                  window.removeEventListener('keydown', handleFirstUserInteraction);
                  void playMainVoiceClip(clipUrl, false);
                };
                window.addEventListener('pointerdown', handleFirstUserInteraction, { once: true });
                window.addEventListener('keydown', handleFirstUserInteraction, { once: true });
              }
              resolve();
            });
          }
        });
      } catch {
        stopAudioTelemetryLoop();
        setIsSpeaking(false);
      }
    },
    [startAudioTelemetryLoop, stopAudioTelemetryLoop, stopVoice]
  );

  const handleJarvisClick = useCallback(() => {
    // Current quote index from the 2-6 sequence (1 to 5)
    const currentIdx = jarvisQuoteIndexRef.current;
    const clipUrl = MAIN_VOICE_QUOTES[currentIdx] || MAIN_VOICE_QUOTES[1];

    // Play the current quote
    void playMainVoiceClip(clipUrl, false);

    // Advance to next quote in the loop: 2 -> 3 -> 4 -> 5 -> 6 -> 2 -> 3...
    // In 0-based indices: 1 -> 2 -> 3 -> 4 -> 5 -> 1 -> 2...
    jarvisQuoteIndexRef.current = currentIdx >= 5 ? 1 : currentIdx + 1;
  }, [playMainVoiceClip]);

  // Immediately speak Quote 1 (and only Quote 1) once only when website opens
  useEffect(() => {
    if (hasAutoPlayedRef.current) return;
    hasAutoPlayedRef.current = true;
    const t = setTimeout(() => {
      void playMainVoiceClip(MAIN_VOICE_QUOTES[0], true);
    }, 350);
    return () => clearTimeout(t);
  }, [playMainVoiceClip]);

  const handleRefreshMotivation = async () => {
    setLoadingMotivation(true);
    try {
      const res = await fetch('/api/motivation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await res.json();
        await refreshDashboard();
        handleJarvisClick();
      }
    } finally {
      setLoadingMotivation(false);
    }
  };

  const openAttendanceFor = (friendId: FriendId, dateStr?: string) => {
    setSelectedFriend(friendId);
    setSelectedDate(dateStr || new Date().toISOString().slice(0, 10));
    setIsAttendanceOpen(true);
  };

  const existingRecord = dashboard.records.find(
    (r) => r.friendId === selectedFriend && r.date === selectedDate
  );

  const weeklyChartData = dashboard.weeklyAchievement.dailyBreakdown.map(
    (day) => ({
      name: day.dayName.split(',')[0],
      date: day.date,
      bharathCdClean: day.bharathCdStatus === 'clean' ? 1 : 0,
      bharathRClean: day.bharathRStatus === 'clean' ? 1 : 0,
      bharathCdRelapse: day.bharathCdStatus === 'relapsed' ? 1 : 0,
      bharathRRelapse: day.bharathRStatus === 'relapsed' ? 1 : 0,
    })
  );

  const recentRelapses = dashboard.records
    .filter((r) => r.relapsed)
    .slice(0, 4);

  const cdStats = dashboard.stats.bharath_cd;
  const brStats = dashboard.stats.bharath_r;
  const motivation = dashboard.dailyMotivation;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-24">
      {/* Main Focused Content: ONLY Motivation & Progress Graph */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Top Header / BeyondLimits Brand Logo Bar */}
        <header className="flex items-center justify-between pb-2 pt-1 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-black p-1 shadow-md border border-slate-800 shrink-0">
              <Image
                src="/logo.png"
                alt="BeyondLimits Logo"
                width={44}
                height={44}
                priority
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                  Beyond<span className="text-teal-700">Limits</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  Discipline &amp; Fitness
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Bharath CD &amp; Bharath R
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition-all cursor-pointer hidden sm:inline-block"
                >
                  Sign Up
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'w-8 h-8 sm:w-9 sm:h-9 ring-2 ring-teal-600/30 hover:ring-teal-500 transition-all cursor-pointer',
                  },
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.Action
                    label="My Profile"
                    labelIcon={<User className="w-4 h-4 text-teal-600" />}
                    onClick={() => setIsProfileModalOpen(true)}
                  />
                  <UserButton.Action
                    label="AI & Gemini Settings"
                    labelIcon={<Settings className="w-4 h-4 text-teal-600" />}
                    onClick={() => setIsSettingsModalOpen(true)}
                  />
                </UserButton.MenuItems>
              </UserButton>
            </Show>
            <PWAInstallButton />
          </div>
        </header>
        {/* 1. DAILY MOTIVATION + THREE.JS JARVIS ARC REACTOR STAGE */}
        <section className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-5">
          {/* Three.js Iron Man JARVIS Arc Reactor Stage */}
          <JarvisArcReactorCanvas
            telemetryRef={telemetryRef}
            isSpeaking={isSpeaking}
            onReplayVoice={handleJarvisClick}
          />

          {/* Voice Playback & Refresh Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Daily Discipline Briefing ({motivation.date})
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleJarvisClick}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-xl transition-colors cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>{isSpeaking ? 'Speaking...' : 'Play Voice'}</span>
              </button>

              {isSpeaking && (
                <button
                  type="button"
                  onClick={stopVoice}
                  aria-label="Stop Voice"
                  className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-xl transition-colors cursor-pointer"
                >
                  <Square className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                disabled={loadingMotivation}
                onClick={handleRefreshMotivation}
                title="Find New Motivation (Tavily + Gemini)"
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    loadingMotivation ? 'animate-spin' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          <h1 className="text-lg sm:text-2xl font-bold tracking-tight leading-snug text-balance">
            {motivation.headline}
          </h1>

          <blockquote className="text-sm sm:text-base text-slate-200 italic border-t border-slate-800 pt-3 leading-relaxed">
            &ldquo;{motivation.quote}&rdquo;
            <footer className="not-italic text-xs font-semibold text-amber-300 mt-1.5">
              — {motivation.author}
            </footer>
          </blockquote>

          <p className="text-xs text-slate-300 bg-slate-800/80 rounded-xl p-3.5 leading-relaxed">
            <strong className="text-amber-300">Today&apos;s Rule: </strong>
            {motivation.actionableHabit}
          </p>

          {/* Well-Organized Motivation Media Section (Songs, Shorts, Quotes) */}
          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Motivation Media Vault
              </span>
              <button
                type="button"
                onClick={() => setIsMotivationHubOpen(true)}
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 cursor-pointer"
              >
                View Full Hub &rarr;
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setIsSongsOpen(true)}
                className="min-h-[52px] rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 px-3 py-2.5 flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-teal-500/15 text-teal-400 shrink-0">
                  <Music className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    Songs
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    15 Tracks
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsShortsOpen(true)}
                className="min-h-[52px] rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 px-3 py-2.5 flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    Shorts
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    20 Reels
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsQuotesOpen(true)}
                className="min-h-[52px] rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 px-3 py-2.5 flex items-center gap-2.5 text-left transition-colors cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-teal-500/15 text-teal-400 shrink-0">
                  <Quote className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    Quotes
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    20 Voice
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* 2. PROGRESS GRAPH & WEEKLY ACHIEVEMENT CARD */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">
                  Weekly Achievement Leader (Less Masturbation)
                </div>
                <div className="text-base font-bold text-slate-900">
                  {dashboard.weeklyAchievement.leaderName}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setGraphMode('weekly')}
                className={`min-h-[38px] px-3.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  graphMode === 'weekly'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Weekly Graph
              </button>
              <button
                type="button"
                onClick={() => setGraphMode('monthly')}
                className={`min-h-[38px] px-3.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  graphMode === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Monthly Graph
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Bharath CD
                </span>
                <span className="text-xs font-mono tabular-nums font-bold text-teal-700">
                  {graphMode === 'weekly'
                    ? `${cdStats.weeklyDisciplineRate}%`
                    : `${cdStats.monthlyDisciplineRate}%`}
                </span>
              </div>
              <div className="text-xs text-slate-600 font-mono tabular-nums mt-1">
                {graphMode === 'weekly'
                  ? `${cdStats.weeklyCleanDays} Clean · ${cdStats.weeklyRelapseDays} Relapsed`
                  : `${cdStats.monthlyCleanDays} Clean · ${cdStats.monthlyRelapseDays} Relapsed`}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Bharath R
                </span>
                <span className="text-xs font-mono tabular-nums font-bold text-teal-700">
                  {graphMode === 'weekly'
                    ? `${brStats.weeklyDisciplineRate}%`
                    : `${brStats.monthlyDisciplineRate}%`}
                </span>
              </div>
              <div className="text-xs text-slate-600 font-mono tabular-nums mt-1">
                {graphMode === 'weekly'
                  ? `${brStats.weeklyCleanDays} Clean · ${brStats.weeklyRelapseDays} Relapsed`
                  : `${brStats.monthlyCleanDays} Clean · ${brStats.monthlyRelapseDays} Relapsed`}
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {graphMode === 'weekly' ? (
                <BarChart
                  data={weeklyChartData}
                  margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#475569' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: '#475569' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar
                    dataKey="bharathCdClean"
                    name="Bharath CD Clean"
                    fill="#0d9488"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="bharathRClean"
                    name="Bharath R Clean"
                    fill="#334155"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="bharathCdRelapse"
                    name="Bharath CD Relapsed"
                    fill="#e11d48"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="bharathRRelapse"
                    name="Bharath R Relapsed"
                    fill="#fb7185"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <BarChart
                  data={dashboard.monthlyProgress.weeklyTrend}
                  margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="weekLabel"
                    tick={{ fontSize: 12, fill: '#475569' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: '#475569' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar
                    dataKey="bharathCdClean"
                    name="Bharath CD Clean Days"
                    fill="#0d9488"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="bharathRClean"
                    name="Bharath R Clean Days"
                    fill="#334155"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="bharathCdRelapses"
                    name="Bharath CD Relapses"
                    fill="#e11d48"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="bharathRRelapses"
                    name="Bharath R Relapses"
                    fill="#fb7185"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {recentRelapses.length > 0 && (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="text-xs font-semibold text-slate-600">
                Recent Relapse Reasons (Tap to Update Reason)
              </div>
              <div className="space-y-2">
                {recentRelapses.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-rose-50/50 border border-rose-200/80 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900">
                        {item.friendName}
                      </span>{' '}
                      <span className="font-mono tabular-nums text-slate-500">
                        ({item.date})
                      </span>
                      <p className="text-rose-900 truncate mt-0.5">
                        Reason: {item.reason}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAttendanceFor(item.friendId, item.date)}
                      className="min-h-[38px] inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shrink-0 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Update</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Fixed Bottom Navigation Bar: Attendance, Calendar, Exercise, Motivation, News, Chat */}
      <nav
        aria-label="Primary Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-30 p-2.5 bg-white/95 backdrop-blur-md border-t border-slate-200"
      >
        <div className="grid grid-cols-6 gap-1 max-w-xl mx-auto">
          <button
            type="button"
            onClick={() => openAttendanceFor('bharath_cd')}
            className="min-h-[46px] rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-[11px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Attendance</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCalendarOpen(true)}
            className="min-h-[46px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-[11px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-teal-700" />
            <span>Calendar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWorkoutOpen(true)}
            className="min-h-[46px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-[11px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
          >
            <Dumbbell className="w-4 h-4 text-teal-700" />
            <span>Exercise</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMotivationHubOpen(true)}
            className="min-h-[46px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-[11px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Motivation</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsNewsOpen(true);
              void loadDailyTechNews();
            }}
            className="min-h-[46px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-[11px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
          >
            <Newspaper className="w-4 h-4 text-teal-700" />
            <span>News</span>
          </button>

          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            className="min-h-[46px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-[11px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-teal-700" />
            <span>Chat</span>
          </button>
        </div>
      </nav>

      {/* Attendance Modal */}
      <AttendanceModal
        key={`${selectedFriend}-${selectedDate}-${existingRecord?.id ?? 'new'}-${existingRecord?.updatedAt ?? ''}`}
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        selectedFriend={selectedFriend}
        onSelectFriend={setSelectedFriend}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        existingRecord={existingRecord}
        onSaved={refreshDashboard}
      />

      {/* Calendar Modal */}
      <AttendanceCalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        records={dashboard.records}
        onEditDay={(friendId, dateStr) => {
          setIsCalendarOpen(false);
          openAttendanceFor(friendId, dateStr);
        }}
      />

      {/* Organized Motivation Hub Modal (Songs, Shorts, Quotes) */}
      <MotivationHubModal
        isOpen={isMotivationHubOpen}
        onClose={() => setIsMotivationHubOpen(false)}
        dailyMotivation={motivation}
        isSpeaking={isSpeaking}
        onSpeakDailyMotivation={handleJarvisClick}
        onOpenSongs={() => {
          setIsMotivationHubOpen(false);
          setIsSongsOpen(true);
        }}
        onOpenShorts={() => {
          setIsMotivationHubOpen(false);
          setIsShortsOpen(true);
        }}
        onOpenQuotes={() => {
          setIsMotivationHubOpen(false);
          setIsQuotesOpen(true);
        }}
      />

      {/* Songs In-App Player Modal */}
      <SongsModal
        isOpen={isSongsOpen}
        onClose={() => setIsSongsOpen(false)}
        onPauseBackgroundVoice={stopVoice}
      />

      {/* Shorts Instagram-Style Vertical Reels Modal */}
      <ShortsModal
        isOpen={isShortsOpen}
        onClose={() => setIsShortsOpen(false)}
        onPauseBackgroundVoice={stopVoice}
      />

      {/* Quotes Voice-Enabled Modal */}
      <QuotesModal
        isOpen={isQuotesOpen}
        onClose={() => setIsQuotesOpen(false)}
        onSpeakQuoteText={(text) => speakCustomText(text, false)}
        onStopVoice={stopVoice}
        isSpeaking={isSpeaking}
      />

      {/* Daily 7:00 AM Top 5 AI & Tech News Modal */}
      <NewsModal
        isOpen={isNewsOpen}
        onClose={() => setIsNewsOpen(false)}
        newsRecord={newsRecord}
        loadingNews={loadingNews}
        onRefreshNews={handleRefreshLiveNews}
        onSpeakText={(text) => speakCustomText(text, false)}
        onStopVoice={stopVoice}
        isSpeaking={isSpeaking}
      />

      {/* Motivational Voice & Text AI Chat Modal (<= 500 chars) */}
      <MotivationalChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onSpeakText={(text) => speakCustomText(text, false)}
        onStopVoice={stopVoice}
        isSpeaking={isSpeaking}
      />

      {/* 12-Exercise Workout Modal */}
      <WorkoutModal
        isOpen={isWorkoutOpen}
        onClose={() => setIsWorkoutOpen(false)}
      />

      {/* User Profile Modal (Name, Age, DOB, Blood Group, Height, Place) */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenSettings={() => {
          setIsProfileModalOpen(false);
          setIsSettingsModalOpen(true);
        }}
      />

      {/* User Settings Modal (Custom Gemini API Key + Google AI Studio link + Fallback) */}
      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onOpenProfile={() => {
          setIsSettingsModalOpen(false);
          setIsProfileModalOpen(true);
        }}
      />
    </div>
  );
}
