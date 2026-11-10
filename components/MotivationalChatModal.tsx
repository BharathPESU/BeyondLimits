'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Volume2,
  Square,
  Bot,
  Database,
  Sparkles,
  Edit3,
  Check,
  Zap,
  Trash2,
} from 'lucide-react';
import { MotivationalChatMessage } from '@/lib/types';

interface MotivationalChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeakText: (text: string) => Promise<void>;
  onStopVoice: () => void;
  isSpeaking: boolean;
  messages: MotivationalChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<MotivationalChatMessage[]>>;
  isAgentMode: boolean;
  onToggleAgentMode: () => void;
  wakeUpWord: string;
  onUpdateWakeUpWord: (newWord: string) => void;
  userName?: string;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const COACH_PROMPTS = [
  'I feel a strong urge right now, motivate me!',
  'How do I stay focused late at night while coding?',
  'Why is self-control the ultimate superpower?',
  'Give me a 30-second discipline check!',
];

const AGENT_PROMPTS = [
  'How was my day on yesterday? Did I slip or stay clean?',
  'What are my exercise updates and completed achievements?',
  'Analyze my relapse triggers and give me moral guidance',
  'What are my missing challenges and locked badges?',
];

export default function MotivationalChatModal({
  isOpen,
  onClose,
  onSpeakText,
  onStopVoice,
  isSpeaking,
  messages,
  setMessages,
  isAgentMode,
  onToggleAgentMode,
  wakeUpWord,
  onUpdateWakeUpWord,
  userName = 'Bharath',
}: MotivationalChatModalProps) {
  const [inputText, setInputText] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [voicePermissionStatus, setVoicePermissionStatus] = useState<
    'idle' | 'granted' | 'denied'
  >('idle');
  const [statusNotice, setStatusNotice] = useState<string>('');

  // Wake word inline edit
  const [isEditingWakeWord, setIsEditingWakeWord] = useState<boolean>(false);
  const [tempWakeWord, setTempWakeWord] = useState<string>(wakeUpWord);

  useEffect(() => {
    setTempWakeWord(wakeUpWord);
  }, [wakeUpWord]);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, interimTranscript, isSending]);

  const sendMessageToAgent = useCallback(
    async (rawText: string, viaVoice = false) => {
      const trimmed = rawText.trim();
      if (!trimmed || isSending) return;

      const userMsg: MotivationalChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        charCount: trimmed.length,
        createdAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        viaVoice,
        agentMode: isAgentMode,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setInterimTranscript('');
      setIsSending(true);
      setStatusNotice(
        isAgentMode
          ? 'Agent is inspecting read-only database and reasoning...'
          : 'Generating motivational response...'
      );

      try {
        const historyPayload = messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }));

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
            message: trimmed,
            history: historyPayload,
            agentMode: isAgentMode,
            userName,
            userApiKey: userCustomKey,
          }),
        });

        const data = (await res.json()) as {
          reply?: string;
          charCount?: number;
          agentMode?: boolean;
          dbQueryDetails?: {
            table?: string;
            queryType?: string;
            targetDate?: string;
            summary?: string;
          };
          error?: string;
        };

        const replyText = (
          data.reply ||
          `Stay strong, ${userName}! Every urge conquered builds unstoppable momentum toward your goals.`
        ).slice(0, 500);

        const assistantMsg: MotivationalChatMessage = {
          id: `agent-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          charCount: replyText.length,
          createdAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          viaVoice,
          agentMode: data.agentMode || isAgentMode,
          dbQueryDetails: data.dbQueryDetails,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setIsSending(false);
        setStatusNotice('Speaking response aloud...');

        await onSpeakText(replyText);
        setStatusNotice('');
      } catch {
        setIsSending(false);
        setStatusNotice('Could not reach AI brain. Please try again.');
      }
    },
    [isSending, messages, isAgentMode, userName, onSpeakText, setMessages]
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startVoicePermissionAndAutoSend = async () => {
    if (isListening) {
      stopListening();
      return;
    }

    onStopVoice();
    setStatusNotice('Requesting microphone voice permission...');

    if (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        setVoicePermissionStatus('granted');
      } catch {
        setVoicePermissionStatus('denied');
        setStatusNotice(
          'Microphone permission denied. Please allow mic access in browser settings or type below.'
        );
        return;
      }
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognitionCtor =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setStatusNotice(
        'Voice recognition requires Chrome/Edge/Safari. Please type your question below.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      finalTranscriptRef.current = '';

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
        setStatusNotice(
          'Listening... Speak your question now (Auto-sends when you pause)'
        );
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            finalChunk += text;
          } else {
            interim += text;
          }
        }

        if (finalChunk) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalChunk}`.trim();
        }
        setInterimTranscript(
          `${finalTranscriptRef.current} ${interim}`.trim()
        );
      };

      recognition.onerror = () => {
        setIsListening(false);
        setStatusNotice('Voice capture paused. Tap "Speak to AI" to try again.');
      };

      recognition.onend = () => {
        setIsListening(false);
        const spokenText = finalTranscriptRef.current.trim();
        if (spokenText.length > 0) {
          finalTranscriptRef.current = '';
          void sendMessageToAgent(spokenText, true);
        } else {
          setStatusNotice('');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setStatusNotice('Unable to start microphone listener.');
    }
  };

  const handleSaveWakeWordInline = () => {
    const trimmed = tempWakeWord.trim();
    if (trimmed) {
      onUpdateWakeUpWord(trimmed);
      setIsEditingWakeWord(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-modal-title"
    >
      {/* Light Header with Agent Mode Toggle & Wake Word Pill */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 shrink-0">
        <div className="max-w-4xl w-full mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl transition-colors ${
                isAgentMode ? 'bg-emerald-50 text-emerald-700' : 'bg-teal-50 text-teal-700'
              }`}
            >
              {isAgentMode ? <Bot className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            </div>
            <div>
              <h2
                id="chat-modal-title"
                className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2"
              >
                <span>{isAgentMode ? 'Autonomous Discipline Agent' : 'Discipline & Motivation Coach'}</span>
                {isAgentMode && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    DB Connected
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isAgentMode
                  ? 'Accesses your personal database (attendance, streaks, workouts, achievements) with read-only safety'
                  : 'Daily mindset, brotherly tough love, and emotional accountability'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Agent Mode Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isAgentMode}
              onClick={(e) => {
                e.stopPropagation();
                onToggleAgentMode();
              }}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none ${
                isAgentMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md ring-2 ring-emerald-400/40'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
              title="Toggle Agent Mode: Enables database query execution and personalized system prompt evolution"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Agent: {isAgentMode ? 'ON' : 'OFF'}</span>
              <div
                className={`w-7 h-3.5 rounded-full p-0.5 transition-colors flex items-center ${
                  isAgentMode ? 'bg-emerald-950 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-transform ${
                    isAgentMode ? 'bg-emerald-300' : 'bg-white'
                  }`}
                />
              </div>
            </button>

            {/* Clear History Button */}
            <button
              type="button"
              onClick={() => {
                if (confirm('Clear entire conversation history?')) {
                  setMessages([
                    {
                      id: `reset-${Date.now()}`,
                      role: 'assistant',
                      content: 'Conversation history reset. How can I assist you today?',
                      charCount: 52,
                      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      agentMode: isAgentMode,
                    },
                  ]);
                  try {
                    localStorage.removeItem('beyondlimits_chat_history_v2');
                  } catch {}
                }
              }}
              title="Clear Conversation History"
              className="min-h-[38px] px-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>

            {/* Wake Word Pill */}
            {isAgentMode && (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs">
                {isEditingWakeWord ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={tempWakeWord}
                      onChange={(e) => setTempWakeWord(e.target.value)}
                      className="w-20 px-1 py-0.5 text-xs bg-white border border-teal-500 rounded outline-none font-bold text-teal-800"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveWakeWordInline}
                      className="p-1 text-emerald-700 hover:text-emerald-800 cursor-pointer"
                      title="Save Wake Word"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-slate-600">
                    <span>Wake:</span>
                    <strong className="text-emerald-700 font-mono font-bold">&quot;{wakeUpWord}&quot;</strong>
                    <button
                      type="button"
                      onClick={() => setIsEditingWakeWord(true)}
                      className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Edit Wake Word"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                stopListening();
                onStopVoice();
                onClose();
              }}
              aria-label="Close Chat"
              className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl w-full mx-auto space-y-4">
          {/* Quick Starter Chips */}
          <div className="flex flex-wrap gap-2 pb-1">
            {(isAgentMode ? AGENT_PROMPTS : COACH_PROMPTS).map((q) => (
              <button
                key={q}
                type="button"
                disabled={isSending}
                onClick={() => void sendMessageToAgent(q, false)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer text-left ${
                  isAgentMode
                    ? 'bg-emerald-50/60 hover:bg-emerald-100/70 border-emerald-200 text-emerald-900'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-teal-700 text-white rounded-br-xs'
                    : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs shadow-xs'
                }`}
              >
                <p>{msg.content}</p>

                {/* Database Query Execution Badge */}
                {msg.dbQueryDetails && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-start gap-1.5 text-[11px] text-emerald-700 bg-emerald-50/70 p-2 rounded-xl">
                    <Database className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                    <div>
                      <span className="font-bold">
                        Database Query Executed ({msg.dbQueryDetails.table || 'User DB'}):
                      </span>{' '}
                      <span className="text-slate-600">{msg.dbQueryDetails.summary}</span>
                    </div>
                  </div>
                )}

                {msg.role === 'assistant' && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {msg.agentMode ? 'Autonomous Agent' : 'Discipline Coach'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void onSpeakText(msg.content)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Read Aloud</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Live Voice Interim Transcript Bubble */}
          {interimTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl p-3 bg-teal-50 border border-teal-300 text-teal-900 text-xs italic">
                Speaking: &ldquo;{interimTranscript}&rdquo; (Auto-sending on pause...)
              </div>
            </div>
          )}

          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-white border border-slate-200 text-xs font-medium text-teal-700 animate-pulse flex items-center gap-2">
                {isAgentMode ? (
                  <>
                    <Database className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                    <span>Querying your database &amp; compiling agent answer...</span>
                  </>
                ) : (
                  <span>Coach is generating your motivational answer...</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {(statusNotice || isSpeaking || voicePermissionStatus === 'granted') && (
        <div className="px-4 sm:px-6 py-2 bg-white border-t border-slate-200">
          <div className="max-w-4xl w-full mx-auto flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 truncate">
              {statusNotice ||
                (isSpeaking
                  ? 'Speaking response aloud...'
                  : 'Microphone permission active · Tap "Speak to AI" anytime')}
            </span>
            {isSpeaking && (
              <button
                type="button"
                onClick={onStopVoice}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold text-[11px] shrink-0 cursor-pointer"
              >
                <Square className="w-3 h-3" />
                <span>Stop Voice</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Voice Auto-Send & Text Input Controls */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
        <div className="max-w-4xl w-full mx-auto space-y-2.5">
          {/* Primary Prominent Voice Auto-Send Button */}
          <button
            type="button"
            disabled={isSending}
            onClick={() => void startVoicePermissionAndAutoSend()}
            className={`w-full min-h-[46px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : isAgentMode
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                : 'bg-teal-700 hover:bg-teal-800 text-white'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Listening... Speak Now (Auto-Sends When You Finish)</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>
                  {isAgentMode
                    ? `Speak to Autonomous Agent (${wakeUpWord})`
                    : 'Speak to AI Coach (Auto-Send)'}
                </span>
              </>
            )}
          </button>

          {/* Text Chat Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessageToAgent(inputText, false);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isAgentMode
                  ? 'Ask about your day (e.g. "How was my day on Nov 5?"), workouts, triggers...'
                  : 'Or type any question for your motivational AI coach...'
              }
              className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
