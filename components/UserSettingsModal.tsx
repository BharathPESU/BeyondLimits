'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  X,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Sparkles,
  ShieldCheck,
  Fingerprint,
  Mic,
  Volume2,
  Play,
  Square,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  isBiometricSupported,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  verifyDeviceBiometric,
  registerLocalBiometricCredential,
} from '@/lib/biometric-auth';
import {
  MAX_GEMINI_KEYS,
  JARVIS_VOICE_OPTIONS,
  JarvisVoiceOption,
  getStoredGeminiKeys,
  saveStoredGeminiKeys,
  getCurrentRoundRobinIndex,
  getJarvisVoiceSettings,
  saveJarvisVoiceSettings,
  playGeminiTTSAudio,
} from '@/lib/gemini-keys';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile?: () => void;
}

export default function UserSettingsModal({
  isOpen,
  onClose,
}: UserSettingsModalProps) {
  const { user, isLoaded } = useUser();

  // Multi-Key Gemini API State
  const [keysList, setKeysList] = useState<string[]>([]);
  const [newKeyInput, setNewKeyInput] = useState<string>('');
  const [keyVerifyingIndex, setKeyVerifyingIndex] = useState<number | null>(null);
  const [keyVerificationResults, setKeyVerificationResults] = useState<
    Record<number, { valid: boolean; message: string }>
  >({});
  const [isSavingKeys, setIsSavingKeys] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Jarvis Voice Configuration State
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('puck');
  const [voiceEmotion, setVoiceEmotion] = useState<'energetic_confident' | 'fierce_discipline' | 'calm_focus'>('energetic_confident');
  const [voiceRate, setVoiceRate] = useState<number>(1.0);
  const [isPlayingDemo, setIsPlayingDemo] = useState<boolean>(false);
  const demoAudioRef = useRef<HTMLAudioElement | null>(null);

  // Wake-up word state
  const [wakeUpWord, setWakeUpWord] = useState<string>('Jarvis');
  const [wakeWordSaveStatus, setWakeWordSaveStatus] = useState<string | null>(null);

  // Biometric & Screen Lock State
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(false);
  const [biometricSupported, setBiometricSupported] = useState<boolean>(false);
  const [isTestingBiometric, setIsTestingBiometric] = useState<boolean>(false);
  const [biometricTestStatus, setBiometricTestStatus] = useState<string | null>(null);

  // Hydrate stored settings on open
  useEffect(() => {
    if (!isOpen) return;

    isBiometricSupported().then((supported) => setBiometricSupported(supported));
    setBiometricEnabled(isBiometricLockEnabled() || (user?.passkeys?.length ?? 0) > 0);

    // 1. Load Gemini Keys
    const storedKeys = getStoredGeminiKeys();
    setKeysList(storedKeys);

    // 2. Load Voice Settings
    const voiceSettings = getJarvisVoiceSettings();
    setSelectedVoiceId(voiceSettings.voiceId);
    setVoiceEmotion(voiceSettings.emotion);
    setVoiceRate(voiceSettings.rate);

    // 3. Load Wake Word
    try {
      const storedWakeWord = localStorage.getItem('beyondlimits_wakeup_word');
      if (storedWakeWord) {
        setWakeUpWord(storedWakeWord);
      }
    } catch {}

    // Hydrate from Clerk metadata if available
    if (isLoaded && user) {
      const meta = (user.unsafeMetadata || {}) as Record<string, unknown>;
      if (Array.isArray(meta.geminiApiKeys) && meta.geminiApiKeys.length > 0) {
        const validMeta = meta.geminiApiKeys.filter((k): k is string => typeof k === 'string');
        setKeysList(validMeta);
        saveStoredGeminiKeys(validMeta);
      }
      if (typeof meta.jarvisVoiceId === 'string') {
        setSelectedVoiceId(meta.jarvisVoiceId);
      }
      if (typeof meta.wakeUpWord === 'string') {
        setWakeUpWord(meta.wakeUpWord);
      }
    }
  }, [isOpen, isLoaded, user]);

  if (!isOpen) return null;

  // Add a new Gemini API Key (up to 10)
  const handleAddKey = () => {
    const trimmed = newKeyInput.trim();
    if (!trimmed) return;

    if (keysList.length >= MAX_GEMINI_KEYS) {
      setSaveStatus(`Maximum of ${MAX_GEMINI_KEYS} Gemini API keys reached.`);
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }

    if (keysList.includes(trimmed)) {
      setSaveStatus('This key is already in your rotation list.');
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }

    const updated = [...keysList, trimmed];
    setKeysList(updated);
    saveStoredGeminiKeys(updated);
    setNewKeyInput('');

    // Sync to Clerk metadata
    if (user) {
      user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          geminiApiKeys: updated,
          geminiApiKey: updated[0] || '',
        },
      }).catch(() => {});
    }

    setSaveStatus(`Key added! Total keys in Round-Robin rotation: ${updated.length}`);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // Remove a key from rotation
  const handleRemoveKey = (indexToRemove: number) => {
    const updated = keysList.filter((_, idx) => idx !== indexToRemove);
    setKeysList(updated);
    saveStoredGeminiKeys(updated);

    // Clear verification result for this index
    const copy = { ...keyVerificationResults };
    delete copy[indexToRemove];
    setKeyVerificationResults(copy);

    if (user) {
      user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          geminiApiKeys: updated,
          geminiApiKey: updated[0] || '',
        },
      }).catch(() => {});
    }

    setSaveStatus(`Key removed. ${updated.length} keys remaining.`);
    setTimeout(() => setSaveStatus(null), 2500);
  };

  // Test an individual Gemini Key
  const handleVerifyIndividualKey = async (keyToTest: string, index: number) => {
    setKeyVerifyingIndex(index);
    try {
      const res = await fetch('/api/settings/verify-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToTest }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setKeyVerificationResults((prev) => ({
          ...prev,
          [index]: { valid: true, message: data.message || 'Key Active & Verified!' },
        }));
      } else {
        setKeyVerificationResults((prev) => ({
          ...prev,
          [index]: { valid: false, message: data.error || 'Verification failed / Quota exhausted' },
        }));
      }
    } catch (err) {
      setKeyVerificationResults((prev) => ({
        ...prev,
        [index]: { valid: false, message: err instanceof Error ? err.message : 'Network error' },
      }));
    } finally {
      setKeyVerifyingIndex(null);
    }
  };

  // Play voice demo sample for selected voice using Gemini TTS (with fallback)
  const handlePlayVoiceDemo = async () => {
    if (isPlayingDemo) {
      if (demoAudioRef.current) {
        demoAudioRef.current.pause();
        demoAudioRef.current = null;
      }
      try {
        window.speechSynthesis?.cancel();
      } catch {}
      setIsPlayingDemo(false);
      return;
    }

    const voice = JARVIS_VOICE_OPTIONS.find((v) => v.id === selectedVoiceId) || JARVIS_VOICE_OPTIONS[0];
    setIsPlayingDemo(true);

    // 1. Prioritize Gemini Text-to-Speech (gemini-3.8-flash-tts) with selected emotion
    try {
      const audio = await playGeminiTTSAudio(voice.sampleText, {
        voiceName: voice.geminiVoice,
        emotion: voiceEmotion,
        onEnd: () => setIsPlayingDemo(false),
        onError: () => {},
      });
      if (audio) {
        demoAudioRef.current = audio;
        return;
      }
    } catch {}

    // 2. Fallback to Puter.js
    try {
      let puterObj = typeof window !== 'undefined' ? window.puter : undefined;
      if (!puterObj && typeof window !== 'undefined') {
        for (let i = 0; i < 4; i++) {
          await new Promise((r) => setTimeout(r, 100));
          if (window.puter?.ai?.txt2speech) {
            puterObj = window.puter;
            break;
          }
        }
      }

      if (puterObj?.ai?.txt2speech) {
        const audio = await puterObj.ai.txt2speech(voice.sampleText, {
          provider: 'aws-polly',
          voice: voice.puterVoice,
          engine: 'neural',
          language: 'en-US',
        });
        demoAudioRef.current = audio;
        audio.onended = () => setIsPlayingDemo(false);
        audio.onerror = () => setIsPlayingDemo(false);
        await audio.play();
        return;
      }
    } catch {}

    // 3. Fallback to Web Speech API
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(voice.sampleText);
        utterance.rate = voiceRate;
        utterance.onend = () => setIsPlayingDemo(false);
        utterance.onerror = () => setIsPlayingDemo(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsPlayingDemo(false);
      }
    } else {
      setIsPlayingDemo(false);
    }
  };

  // Save Voice selection
  const handleSaveVoice = (newVoiceId: string) => {
    setSelectedVoiceId(newVoiceId);
    saveJarvisVoiceSettings({ voiceId: newVoiceId, emotion: voiceEmotion, rate: voiceRate });
    if (user) {
      user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          jarvisVoiceId: newVoiceId,
        },
      }).catch(() => {});
    }
  };

  // Save Emotion selection
  const handleSaveEmotion = (newEmotion: 'energetic_confident' | 'fierce_discipline' | 'calm_focus') => {
    setVoiceEmotion(newEmotion);
    saveJarvisVoiceSettings({ voiceId: selectedVoiceId, emotion: newEmotion, rate: voiceRate });
    if (user) {
      user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          jarvisVoiceEmotion: newEmotion,
        },
      }).catch(() => {});
    }
  };

  // Save Voice Rate
  const handleSaveRate = (newRate: number) => {
    setVoiceRate(newRate);
    saveJarvisVoiceSettings({ rate: newRate });
  };

  // Save Wake-Up Word
  const handleSaveWakeUpWord = async () => {
    const trimmed = wakeUpWord.trim();
    if (!trimmed) return;

    try {
      localStorage.setItem('beyondlimits_wakeup_word', trimmed);
      if (user) {
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            wakeUpWord: trimmed,
          },
        });
      }
      setWakeWordSaveStatus(`Wake-up word updated to "${trimmed}"!`);
      setTimeout(() => setWakeWordSaveStatus(null), 3000);
    } catch {
      setWakeWordSaveStatus('Saved locally to browser.');
      setTimeout(() => setWakeWordSaveStatus(null), 3000);
    }
  };

  // Biometric toggle
  const handleToggleBiometric = async (enabled: boolean) => {
    setBiometricEnabled(enabled);
    setBiometricLockEnabled(enabled);
    setBiometricTestStatus(null);
  };

  const handleTestBiometric = async () => {
    setIsTestingBiometric(true);
    setBiometricTestStatus(null);
    try {
      const res = await verifyDeviceBiometric();
      if (res.success) {
        setBiometricTestStatus('Fingerprint / Screen Lock verified successfully!');
      } else {
        setBiometricTestStatus(res.error || 'Verification cancelled or failed.');
      }
    } catch (err) {
      setBiometricTestStatus(err instanceof Error ? err.message : 'Biometric test failed.');
    } finally {
      setIsTestingBiometric(false);
    }
  };

  const currentRRIndex = getCurrentRoundRobinIndex();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 my-8 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/60 shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  AI &amp; Jarvis Settings
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60">
                  Multi-Key
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Round-robin keys, voice configuration &amp; biometric lock
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {saveStatus && (
          <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 flex items-center gap-2 text-xs font-semibold text-teal-800">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{saveStatus}</span>
          </div>
        )}

        {/* =========================================================================
            SECTION 1: MULTI-KEY GEMINI API MANAGER (UP TO 10 KEYS, ROUND-ROBIN)
            ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-teal-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Gemini API Keys ({keysList.length}/{MAX_GEMINI_KEYS})
              </h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-100/70 text-teal-800 rounded-md border border-teal-200">
              Round-Robin Active
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Add up to <strong>10 Gemini API keys</strong>. Requests dynamically rotate across your keys so your free quota never exhausts. If any key hits rate limits, Jarvis automatically fails over to the next key.
          </p>

          {/* Add Key Input */}
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={newKeyInput}
              onChange={(e) => setNewKeyInput(e.target.value)}
              placeholder="Paste new Gemini API key (AIzaSy...)"
              disabled={keysList.length >= MAX_GEMINI_KEYS}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 outline-none transition-all disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleAddKey}
              disabled={!newKeyInput.trim() || keysList.length >= MAX_GEMINI_KEYS}
              className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Key</span>
            </button>
          </div>

          {/* Keys List */}
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {keysList.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                No custom keys added yet. The app is currently using the shared server key. Add your personal Google keys above for higher limits!
              </div>
            ) : (
              keysList.map((keyStr, idx) => {
                const isNextInRotation = keysList.length > 0 && idx === currentRRIndex % keysList.length;
                const verification = keyVerificationResults[idx];
                const isThisVerifying = keyVerifyingIndex === idx;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex flex-col gap-2 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 shrink-0">
                          Key #{idx + 1}
                        </span>
                        {isNextInRotation && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                            Next
                          </span>
                        )}
                        <span className="font-mono text-xs text-slate-700 truncate">
                          {keyStr.slice(0, 8)}••••••••{keyStr.slice(-4)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleVerifyIndividualKey(keyStr, idx)}
                          disabled={isThisVerifying}
                          className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-white border border-teal-200 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          {isThisVerifying ? (
                            <Loader2 className="w-3 h-3 animate-spin text-teal-600" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          <span>Test</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveKey(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Remove Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {verification && (
                      <div
                        className={`text-[10px] font-medium flex items-center gap-1.5 ${
                          verification.valid ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {verification.valid ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                        )}
                        <span>{verification.message}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-teal-700 hover:underline flex items-center gap-1"
            >
              <span>Get more free keys on Google AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: JARVIS VOICE CONFIGURATION & REAL-TIME DEMO
            ========================================================================= */}
        <div className="space-y-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-teal-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Jarvis Voice Persona &amp; Audio Demo
              </h4>
            </div>
            <span className="text-[10px] font-bold text-slate-500">
              Neural Text-to-Speech
            </span>
          </div>

          {/* Voice Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Select Voice Tone:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {JARVIS_VOICE_OPTIONS.map((voice) => {
                const isSelected = voice.id === selectedVoiceId;
                return (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() => handleSaveVoice(voice.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50 border-teal-600 text-teal-950 ring-1 ring-teal-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{voice.name}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                        {voice.gender}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                      {voice.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Emotion & Tone Mode (User-configurable inline emotion) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Jarvis Emotion &amp; Motivation Style:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSaveEmotion('energetic_confident')}
                className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  voiceEmotion === 'energetic_confident'
                    ? 'bg-teal-50 border-teal-600 text-teal-950 ring-1 ring-teal-500 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <span className="text-[11px] block">Energetic</span>
                <span className="text-[9px] text-slate-500 block">High confidence</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveEmotion('fierce_discipline')}
                className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  voiceEmotion === 'fierce_discipline'
                    ? 'bg-teal-50 border-teal-600 text-teal-950 ring-1 ring-teal-500 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <span className="text-[11px] block">Fierce</span>
                <span className="text-[9px] text-slate-500 block">Iron discipline</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveEmotion('calm_focus')}
                className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  voiceEmotion === 'calm_focus'
                    ? 'bg-teal-50 border-teal-600 text-teal-950 ring-1 ring-teal-500 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <span className="text-[11px] block">Calm Focus</span>
                <span className="text-[9px] text-slate-500 block">Stoic depth</span>
              </button>
            </div>
          </div>

          {/* Speed / Rate Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Speech Rate / Speed:</span>
              <span className="font-mono text-teal-700 font-bold">{voiceRate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.85"
              max="1.25"
              step="0.05"
              value={voiceRate}
              onChange={(e) => handleSaveRate(parseFloat(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
          </div>

          {/* Voice Demo Preview Player */}
          <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-3 shadow-md">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Audio Preview: {JARVIS_VOICE_OPTIONS.find((v) => v.id === selectedVoiceId)?.name}</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Tap to hear how Jarvis speaks your motivation &amp; chat responses
              </p>
            </div>

            <button
              type="button"
              onClick={handlePlayVoiceDemo}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isPlayingDemo
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 animate-pulse'
                  : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md shadow-teal-500/30'
              }`}
            >
              {isPlayingDemo ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Demo</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: WAKE-UP WORD & AGENT ACTIVATION
            ========================================================================= */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-teal-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Agent Wake-Up Word
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={wakeUpWord}
              onChange={(e) => setWakeUpWord(e.target.value)}
              placeholder="Jarvis"
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-xs font-bold text-slate-900 outline-none"
            />
            <button
              type="button"
              onClick={handleSaveWakeUpWord}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              Save Word
            </button>
          </div>

          {wakeWordSaveStatus && (
            <p className="text-[11px] font-semibold text-teal-700">
              {wakeWordSaveStatus}
            </p>
          )}
        </div>

        {/* =========================================================================
            SECTION 4: BIOMETRIC SCREEN LOCK SECURITY
            ========================================================================= */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-emerald-600" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  App Lock (Fingerprint / Screen Lock)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Require device authentication before launching app
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={biometricEnabled}
              onClick={() => handleToggleBiometric(!biometricEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                biometricEnabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  biometricEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {biometricEnabled && (
            <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-emerald-800 font-semibold">
                  Hardware Authentication Active
                </span>
                <button
                  type="button"
                  onClick={handleTestBiometric}
                  disabled={isTestingBiometric}
                  className="px-2.5 py-1 text-[10px] font-bold text-emerald-800 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1"
                >
                  {isTestingBiometric ? (
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                  ) : (
                    <Fingerprint className="w-3 h-3 text-emerald-600" />
                  )}
                  <span>Test Sensor</span>
                </button>
              </div>

              {biometricTestStatus && (
                <p className="text-[10px] font-medium text-emerald-900">
                  {biometricTestStatus}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
          >
            Done / Close Settings
          </button>
        </div>
      </div>
    </div>
  );
}
