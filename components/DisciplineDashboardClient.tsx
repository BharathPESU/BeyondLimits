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
  ShieldCheck,
  AlertTriangle,
  Award,
  TrendingUp,
  Bot,
  Mic,
} from 'lucide-react';
import { SignInButton, SignUpButton, Show, UserButton, useUser } from '@clerk/nextjs';
import {
  DailyMotivationRecord,
  DailyTechNewsRecord,
  DashboardPayload,
  FriendId,
  MotivationalChatMessage,
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
  const { user } = useUser();
  const [profileName, setProfileName] = useState<string>('');

  useEffect(() => {
    const loadLocalProfile = () => {
      try {
        const raw = localStorage.getItem('beyondlimits_user_profile');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.name) setProfileName(parsed.name);
        }
      } catch {}
    };
    loadLocalProfile();
    const handleUpdate = () => loadLocalProfile();
    window.addEventListener('user_profile_updated', handleUpdate);
    return () => window.removeEventListener('user_profile_updated', handleUpdate);
  }, []);

  const displayName = profileName || user?.fullName || user?.firstName || 'Warrior';

  // Autonomous Agent & Wake Word state
  const [isAgentMode, setIsAgentMode] = useState<boolean>(false);
  const [wakeUpWord, setWakeUpWord] = useState<string>('Jarvis');
  const [agentVoiceStatus, setAgentVoiceStatus] = useState<string>('');
  const [agentTranscript, setAgentTranscript] = useState<string>('');

  // Dual-Tier Conversation Memory: Hydrate from localStorage on device
  const [chatMessages, setChatMessages] = useState<MotivationalChatMessage[]>([
    {
      id: 'welcome-agent',
      role: 'assistant',
      content:
        'Discipline Agent ready. Ask about your day, workouts, or triggers by voice or text—I have direct read-only access to your records.',
      charCount: 135,
      createdAt: 'Ready',
      agentMode: true,
    },
  ]);

  const continuousRecognitionRef = useRef<any>(null);
  const isAgentModeRef = useRef<boolean>(false);
  const wakeUpWordRef = useRef<string>('Jarvis');
  const isProcessingWakeWordRef = useRef<boolean>(false);
  const displayNameRef = useRef<string>(displayName);
  const restartRetriesRef = useRef<number>(0);

  useEffect(() => {
    displayNameRef.current = displayName;
  }, [displayName]);

  useEffect(() => {
    isAgentModeRef.current = isAgentMode;
  }, [isAgentMode]);

  useEffect(() => {
    wakeUpWordRef.current = wakeUpWord;
  }, [wakeUpWord]);

  // Hydrate Agent Mode, Wake Word, and Chat History from localStorage
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('beyondlimits_agent_mode');
      if (savedMode === 'true') {
        setIsAgentMode(true);
      }
      const savedWord = localStorage.getItem('beyondlimits_wakeup_word');
      if (savedWord) {
        setWakeUpWord(savedWord);
      }
      const savedHistory = localStorage.getItem('beyondlimits_chat_history_v2');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatMessages(parsed);
        }
      }
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'beyondlimits_agent_mode') {
        setIsAgentMode(e.newValue === 'true');
      }
      if (e.key === 'beyondlimits_wakeup_word' && e.newValue) {
        setWakeUpWord(e.newValue);
      }
      if (e.key === 'beyondlimits_chat_history_v2' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setChatMessages(parsed);
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Persist chat messages to localStorage on device
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && chatMessages.length > 0) {
        localStorage.setItem(
          'beyondlimits_chat_history_v2',
          JSON.stringify(chatMessages.slice(-50))
        );
      }
    } catch {}
  }, [chatMessages]);

  const handleToggleAgentMode = useCallback(() => {
    setIsAgentMode((prev) => {
      const nextVal = !prev;
      try {
        localStorage.setItem('beyondlimits_agent_mode', String(nextVal));
      } catch {}
      return nextVal;
    });
  }, []);

  const handleUpdateWakeUpWord = useCallback((newWord: string) => {
    const trimmed = newWord.trim();
    if (!trimmed) return;
    setWakeUpWord(trimmed);
    try {
      localStorage.setItem('beyondlimits_wakeup_word', trimmed);
    } catch {}
  }, []);

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

  // Daily 8:00 AM Top 5 News state (NewsData.io)
  const [newsRecord, setNewsRecord] = useState<DailyTechNewsRecord | null>(
    initialData.dailyTechNews ?? null
  );
  const [loadingNews, setLoadingNews] = useState<boolean>(false);
  const auto8AmNewsDateRef = useRef<string>('');

  const [selectedFriend, setSelectedFriend] = useState<FriendId>('user');
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

  const handleRefreshLiveNews = useCallback(
    async (filters?: {
      category?: string;
      language?: string;
      country?: string;
    }) => {
      setLoadingNews(true);
      try {
        const res = await fetch('/api/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: filters?.category || 'technology',
            language: filters?.language || 'all',
            country: filters?.country || 'all',
          }),
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
    },
    []
  );

  // Daily 8:00 AM (08:00) News auto-fetch + 8:00 PM (20:00) phone attendance reminder
  useEffect(() => {
    const checkScheduledTasks = async () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const hhmm = `${hh}:${mm}`;
      const todayStr = now.toISOString().slice(0, 10);

      // 1. Daily 8:00 AM Top 5 News refresh
      if (hhmm === '08:00' && auto8AmNewsDateRef.current !== todayStr) {
        auto8AmNewsDateRef.current = todayStr;
        await handleRefreshLiveNews();
      }

      // 2. Daily 8:00 PM Phone Attendance reminder
      const isMarkedToday =
        dashboard.reminderConfig.todayStatus.userMarked ??
        (dashboard.reminderConfig.todayStatus.bharathCdMarked &&
          dashboard.reminderConfig.todayStatus.bharathRMarked);

      if (
        dashboard.reminderConfig.enabled &&
        hhmm === (dashboard.reminderConfig.reminderTime || '20:00') &&
        !isMarkedToday &&
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
            playPromise.catch(() => {
              stopAudioTelemetryLoop();
              setIsSpeaking(false);
              activeAudioRef.current = null;
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

  // Continuous Speech Recognition Listener for Autonomous Agent Wake Word
  useEffect(() => {
    if (!isAgentMode) {
      if (continuousRecognitionRef.current) {
        try {
          continuousRecognitionRef.current.stop();
        } catch {}
        continuousRecognitionRef.current = null;
      }
      setAgentVoiceStatus('');
      setAgentTranscript('');
      return;
    }

    if (isSpeaking) {
      // Don't listen while voice is speaking to prevent feedback loops
      if (continuousRecognitionRef.current) {
        try {
          continuousRecognitionRef.current.stop();
        } catch {}
        continuousRecognitionRef.current = null;
      }
      return;
    }

    const win =
      typeof window !== 'undefined'
        ? (window as unknown as {
            SpeechRecognition?: any;
            webkitSpeechRecognition?: any;
          })
        : {};
    const SpeechRecognitionCtor =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setAgentVoiceStatus('Speech recognition unavailable in this browser.');
      return;
    }

    let recognition: any = null;
    let isActive = true;

    const startContinuous = () => {
      if (!isActive || !isAgentModeRef.current || isSpeaking) return;

      try {
        recognition = new SpeechRecognitionCtor();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
          restartRetriesRef.current = 0;
          setAgentVoiceStatus(`Listening for "${wakeUpWordRef.current}"...`);
        };

        recognition.onresult = async (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0]?.transcript || '';
          }
          const cleaned = transcript.trim();
          if (!cleaned) return;

          setAgentTranscript(cleaned);

          const lowerTranscript = cleaned.toLowerCase();
          const targetWakeWord = wakeUpWordRef.current.toLowerCase();

          if (
            lowerTranscript.includes(targetWakeWord) &&
            !isProcessingWakeWordRef.current
          ) {
            isProcessingWakeWordRef.current = true;

            try {
              recognition.stop();
            } catch {}

            const wakeIndex = lowerTranscript.indexOf(targetWakeWord);
            const afterWake = cleaned
              .slice(wakeIndex + targetWakeWord.length)
              .replace(/^[,.!?\s]+/, '')
              .trim();

            const currentName = displayNameRef.current || 'Bharath';

            if (
              afterWake.length === 0 ||
              /^(hey|hello|hi|are you there|listen|wake up)[?!.]*$/i.test(afterWake)
            ) {
              // Just the wake word
              const greeting = `Hey ${currentName}, how are you doing? I am listening.`;
              setChatMessages((prev) => [
                ...prev,
                {
                  id: `wake-${Date.now()}`,
                  role: 'assistant',
                  content: greeting,
                  charCount: greeting.length,
                  createdAt: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  agentMode: true,
                },
              ]);

              setAgentVoiceStatus(`Responded to "${wakeUpWordRef.current}"`);
              await speakCustomText(greeting);
            } else {
              // Wake word with a query/question
              setChatMessages((prev) => [
                ...prev,
                {
                  id: `user-${Date.now()}`,
                  role: 'user',
                  content: afterWake,
                  charCount: afterWake.length,
                  createdAt: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  viaVoice: true,
                  agentMode: true,
                },
              ]);

              setAgentVoiceStatus(`Querying database for "${afterWake}"...`);

              try {
                const userCustomKey =
                  typeof window !== 'undefined'
                    ? localStorage.getItem('beyondlimits_gemini_api_key') || ''
                    : '';
                const res = await fetch('/api/chat', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(userCustomKey ? { 'x-gemini-api-key': userCustomKey } : {}),
                  },
                  body: JSON.stringify({
                    message: afterWake,
                    agentMode: true,
                    userName: currentName,
                    userApiKey: userCustomKey,
                  }),
                });

                const data = await res.json();
                const replyText =
                  data.reply ||
                  `Stay disciplined, ${currentName}! Conquering urges is your sacred duty.`;

                setChatMessages((prev) => [
                  ...prev,
                  {
                    id: `agent-${Date.now()}`,
                    role: 'assistant',
                    content: replyText,
                    charCount: replyText.length,
                    createdAt: new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    viaVoice: true,
                    agentMode: true,
                    dbQueryDetails: data.dbQueryDetails,
                  },
                ]);

                setAgentVoiceStatus('Speaking agent reply aloud...');
                await speakCustomText(replyText);
              } catch {
                const errMsg = `I could not query your database right now, ${currentName}. Stay strong!`;
                await speakCustomText(errMsg);
              }
            }

            isProcessingWakeWordRef.current = false;
            setAgentTranscript('');
            setAgentVoiceStatus(`Listening for "${wakeUpWordRef.current}"...`);

            if (isAgentModeRef.current) {
              setTimeout(() => {
                startContinuous();
              }, 700);
            }
          }
        };

        recognition.onerror = (e: any) => {
          if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
            isActive = false;
            setAgentVoiceStatus('Microphone blocked. Allow mic access in browser.');
          }
        };

        recognition.onend = () => {
          if (
            isActive &&
            isAgentModeRef.current &&
            !isProcessingWakeWordRef.current &&
            !isSpeaking
          ) {
            restartRetriesRef.current += 1;
            if (restartRetriesRef.current < 25) {
              setTimeout(() => {
                startContinuous();
              }, 600);
            }
          }
        };

        continuousRecognitionRef.current = recognition;
        recognition.start();
      } catch {
        // Recognition start failed
      }
    };

    startContinuous();

    return () => {
      isActive = false;
      if (continuousRecognitionRef.current) {
        try {
          continuousRecognitionRef.current.stop();
        } catch {}
        continuousRecognitionRef.current = null;
      }
    };
  }, [isAgentMode, isSpeaking, speakCustomText]);

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
    return () => {
      clearTimeout(t);
      stopVoice();
      try {
        window.speechSynthesis?.cancel();
      } catch {}
    };
  }, [playMainVoiceClip, stopVoice]);

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

  const openAttendance = (dateStr?: string) => {
    setSelectedDate(dateStr || new Date().toISOString().slice(0, 10));
    setIsAttendanceOpen(true);
  };

  const existingRecord =
    dashboard.records.find(
      (r) =>
        (r.friendId === 'user' || r.friendId === 'bharath_cd') &&
        r.date === selectedDate
    ) || dashboard.records.find((r) => r.date === selectedDate);

  const userStats = dashboard.userStats || {
    userId: 'user',
    userName: displayName,
    totalMarkedDays: 0,
    cleanDays: 0,
    relapseDays: 0,
    disciplineRate: 100,
    relapseRate: 0,
    currentStreak: 0,
    longestStreak: 0,
    weeklyCleanDays: 0,
    weeklyRelapseDays: 0,
    weeklyMarkedDays: 0,
    weeklyDisciplineRate: 100,
    monthlyCleanDays: 0,
    monthlyRelapseDays: 0,
    monthlyMarkedDays: 0,
    monthlyDisciplineRate: 100,
    monthlyRelapseRate: 0,
    averageUrgeIntensity: 2,
    dailyBreakdown: [],
    weeklyTrend: [],
  };

  const weeklyChartData = (userStats.dailyBreakdown || []).map((day) => ({
    name: day.dayName.split(',')[0],
    date: day.date,
    clean: day.status === 'clean' ? 1 : 0,
    relapse: day.status === 'relapsed' ? 1 : 0,
  }));

  const monthlyTrendData = (userStats.weeklyTrend || []).map((week) => ({
    weekLabel: week.weekLabel,
    clean: week.cleanDays,
    relapse: week.relapseDays,
    disciplineRate: week.disciplineRate,
  }));

  const recentRelapses = dashboard.records
    .filter((r) => r.relapsed)
    .slice(0, 4);

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
                {displayName}
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

          {/* Voice Playback & Audio Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isSpeaking ? 'bg-amber-400 animate-pulse' : 'bg-teal-500'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                JARVIS Discipline Voice
              </span>
            </div>

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
                title="Refresh Voice"
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    loadingMotivation ? 'animate-spin' : ''
                  }`}
                />
              </button>

              {/* Agent Mode Toggle Button */}
              <button
                type="button"
                role="switch"
                aria-checked={isAgentMode}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleAgentMode();
                }}
                className={`min-h-[40px] inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer select-none ${
                  isAgentMode
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
                title={`Toggle Autonomous Agent Mode (Wake Word: "${wakeUpWord}")`}
              >
                <Bot className="w-4 h-4" />
                <span>Agent: {isAgentMode ? 'ON' : 'OFF'}</span>
                {/* Visual tactile slider toggle */}
                <div
                  className={`w-7 h-3.5 rounded-full p-0.5 transition-colors flex items-center ${
                    isAgentMode ? 'bg-slate-950 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-transform ${
                      isAgentMode ? 'bg-emerald-400' : 'bg-slate-400'
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Agent Continuous Microphone & Wake Word Live Status Strip */}
          {isAgentMode && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>
                  Continuous Mic Active · Say{' '}
                  <strong className="text-white bg-emerald-900/80 px-1.5 py-0.5 rounded border border-emerald-400/30">
                    &quot;{wakeUpWord}&quot;
                  </strong>{' '}
                  to wake JARVIS
                  {agentTranscript && (
                    <span className="ml-1 text-emerald-200 font-mono italic">
                      (&ldquo;{agentTranscript}&rdquo;)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-emerald-400/90 font-medium">
                <Mic className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <span>{agentVoiceStatus || '3D Reactor Online'}</span>
              </div>
            </div>
          )}
        </section>

        {/* 2. MONTHLY SELF-CONTROL & HABIT PROGRESS */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">
                  Monthly Self-Control &amp; Habit Analytics
                </div>
                <div className="text-xs text-slate-500">
                  Impulse control and masturbation frequency for {displayName}
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
                Daily (This Week)
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
                Weekly Trend (Month)
              </button>
            </div>
          </div>

          {/* Key Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Monthly Control Rate
              </div>
              <div
                className={`text-xl sm:text-2xl font-black font-mono tabular-nums mt-1 ${
                  userStats.monthlyDisciplineRate >= 80
                    ? 'text-teal-700'
                    : userStats.monthlyDisciplineRate >= 60
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                {userStats.monthlyDisciplineRate}%
              </div>
              <div className="text-xs text-slate-600 font-mono tabular-nums mt-0.5">
                {userStats.monthlyCleanDays} Clean · {userStats.monthlyRelapseDays} Relapses
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Active Streak
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-emerald-700 mt-1">
                {userStats.currentStreak} <span className="text-xs font-normal">Days</span>
              </div>
              <div className="text-xs text-slate-600 font-mono tabular-nums mt-0.5">
                Best: {userStats.longestStreak} clean days
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                This Week Control
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-slate-900 mt-1">
                {userStats.weeklyDisciplineRate}%
              </div>
              <div className="text-xs text-slate-600 font-mono tabular-nums mt-0.5">
                {userStats.weeklyCleanDays} Clean · {userStats.weeklyRelapseDays} Relapses
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Avg Urge Intensity
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-teal-800 mt-1">
                {userStats.averageUrgeIntensity} <span className="text-xs font-normal">/ 10</span>
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Urge control resistance
              </div>
            </div>
          </div>

          {/* Self-Control Progress Feedback Banner */}
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
              userStats.monthlyCleanDays === 0 && userStats.monthlyRelapseDays === 0
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : userStats.monthlyRelapseDays === 0
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-medium'
                : userStats.monthlyDisciplineRate >= 80
                ? 'bg-teal-50/90 border-teal-300 text-teal-950 font-medium'
                : userStats.monthlyDisciplineRate >= 60
                ? 'bg-amber-50/90 border-amber-300 text-amber-950 font-medium'
                : 'bg-rose-50/90 border-rose-300 text-rose-950 font-medium'
            }`}
          >
            {userStats.monthlyRelapseDays === 0 ? (
              <Trophy className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : userStats.monthlyDisciplineRate >= 80 ? (
              <Sparkles className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            )}
            <div>
              {userStats.monthlyRelapseDays === 0 && userStats.monthlyCleanDays > 0 ? (
                <span>
                  <strong>Flawless Impulse Control:</strong> You have 0 relapses this month across {userStats.monthlyCleanDays} clean days. You are rewiring your dopamine receptors and building supreme willpower!
                </span>
              ) : userStats.monthlyDisciplineRate >= 80 ? (
                <span>
                  <strong>Strong Self-Control:</strong> You have controlled your urges {userStats.monthlyDisciplineRate}% of the time this month ({userStats.monthlyCleanDays} clean days). Keep your phone docked outside your bed area to stay on track.
                </span>
              ) : userStats.monthlyDisciplineRate >= 60 ? (
                <span>
                  <strong>Urge Warning:</strong> You slipped {userStats.monthlyRelapseDays} times this month (Relapse rate: {userStats.monthlyRelapseRate}%). You need to see this progress and change your environment — avoid late-night solitude.
                </span>
              ) : (
                <span>
                  <strong>Time to Change:</strong> Your masturbation rate is {userStats.monthlyRelapseRate}% ({userStats.monthlyRelapseDays} relapses this month). Settle in your mind that you are capable of stopping. Reset your streak today and conquer this day.
                </span>
              )}
            </div>
          </div>

          {/* Bar Chart Visualization */}
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
                    dataKey="clean"
                    name="Clean (Controlled)"
                    fill="#0d9488"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="relapse"
                    name="Relapse (Masturbated)"
                    fill="#e11d48"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <BarChart
                  data={monthlyTrendData}
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
                    dataKey="clean"
                    name="Clean Days"
                    fill="#0d9488"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="relapse"
                    name="Relapses"
                    fill="#e11d48"
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
                      <span className="font-bold text-slate-900 font-mono">
                        {item.date}
                      </span>
                      <p className="text-rose-900 truncate mt-0.5">
                        Reason: {item.reason || 'No reason specified'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAttendance(item.date)}
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
            onClick={() => openAttendance()}
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
        key={`${selectedDate}-${existingRecord?.id ?? 'new'}-${existingRecord?.updatedAt ?? ''}`}
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        existingRecord={existingRecord}
        onSaved={refreshDashboard}
        userName={displayName}
      />

      {/* Calendar Modal */}
      <AttendanceCalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        records={dashboard.records}
        onEditDay={(_friendId, dateStr) => {
          setIsCalendarOpen(false);
          openAttendance(dateStr);
        }}
        userName={displayName}
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

      {/* Daily 8:00 AM Top 5 News Modal (NewsData.io) */}
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
        messages={chatMessages}
        setMessages={setChatMessages}
        isAgentMode={isAgentMode}
        onToggleAgentMode={handleToggleAgentMode}
        wakeUpWord={wakeUpWord}
        onUpdateWakeUpWord={handleUpdateWakeUpWord}
        userName={displayName}
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
