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
} from 'lucide-react';
import { MotivationalChatMessage } from '@/lib/types';

interface MotivationalChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeakText: (text: string) => Promise<void>;
  onStopVoice: () => void;
  isSpeaking: boolean;
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

const QUICK_PROMPTS = [
  'I feel a strong urge right now, motivate me!',
  'How do I stay focused late at night while coding?',
  'Why is self-control the ultimate superpower?',
  'Give me a 30-second brotherhood discipline check!',
];

export default function MotivationalChatModal({
  isOpen,
  onClose,
  onSpeakText,
  onStopVoice,
  isSpeaking,
}: MotivationalChatModalProps) {
  const [messages, setMessages] = useState<MotivationalChatMessage[]>([
    {
      id: 'welcome-coach',
      role: 'assistant',
      content:
        'Discipline Coach ready. Ask any question by voice or text—I am here to push you toward full self-control and success.',
      charCount: 118,
      createdAt: 'Ready',
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [voicePermissionStatus, setVoicePermissionStatus] = useState<
    'idle' | 'granted' | 'denied'
  >('idle');
  const [statusNotice, setStatusNotice] = useState<string>('');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, interimTranscript, isSending]);

  const sendMessageToCoach = useCallback(
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
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setInterimTranscript('');
      setIsSending(true);
      setStatusNotice('Generating motivational response...');

      try {
        const historyPayload = messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            history: historyPayload,
          }),
        });

        const data = (await res.json()) as {
          reply?: string;
          charCount?: number;
          error?: string;
        };

        const replyText = (
          data.reply ||
          'Guard your focus, brother! Every urge conquered builds unstoppable momentum toward your goals.'
        ).slice(0, 500);

        const assistantMsg: MotivationalChatMessage = {
          id: `coach-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          charCount: replyText.length,
          createdAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          viaVoice,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setIsSending(false);
        setStatusNotice('Speaking response aloud...');

        await onSpeakText(replyText);
        setStatusNotice('');
      } catch {
        setIsSending(false);
        setStatusNotice('Could not reach AI coach. Please try again.');
      }
    },
    [isSending, messages, onSpeakText]
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
          void sendMessageToCoach(spokenText, true);
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 w-full h-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-modal-title"
    >
      {/* Full-Screen Light Header (Matches Calendar & Attendance) */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2
              id="chat-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900"
            >
              AI Discipline &amp; Motivation Coach
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              stopListening();
              onStopVoice();
              onClose();
            }}
            aria-label="Close AI Coach Chat"
            className="min-h-[42px] min-w-[42px] inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl w-full mx-auto space-y-4">
          {/* Quick Starter Chips */}
          <div className="flex flex-wrap gap-2 pb-1">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isSending}
                onClick={() => void sendMessageToCoach(q, false)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
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
                    : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs'
                }`}
              >
                <p>{msg.content}</p>

                {msg.role === 'assistant' && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end">
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
              <div className="rounded-2xl px-4 py-3 bg-white border border-slate-200 text-xs font-medium text-teal-700 animate-pulse">
                Coach is generating your motivational answer...
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
                  ? 'Speaking motivational reply aloud...'
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
                <span>Speak to AI (Auto-Send)</span>
              </>
            )}
          </button>

          {/* Text Chat Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessageToCoach(inputText, false);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Or type any question for your motivational AI coach..."
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
