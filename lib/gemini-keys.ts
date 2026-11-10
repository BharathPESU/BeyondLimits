'use client';

/**
 * BeyondLimits Multi-Key Gemini API Manager & Round-Robin Rotation Service
 * 
 * Supports up to 10 Gemini API keys with dynamic round-robin rotation,
 * automatic failover if quota is exhausted, and Jarvis voice preferences.
 */

export const MAX_GEMINI_KEYS = 10;
export const STORAGE_KEYS_LIST = 'beyondlimits_gemini_api_keys';
export const STORAGE_LEGACY_KEY = 'beyondlimits_gemini_api_key';
export const STORAGE_RR_INDEX = 'beyondlimits_gemini_rr_index';

export const STORAGE_VOICE_ID = 'beyondlimits_jarvis_voice_id';
export const STORAGE_VOICE_RATE = 'beyondlimits_jarvis_voice_rate';
export const STORAGE_VOICE_PITCH = 'beyondlimits_jarvis_voice_pitch';
export const STORAGE_VOICE_EMOTION = 'beyondlimits_jarvis_voice_emotion';

export interface JarvisVoiceOption {
  id: string;
  name: string;
  subtitle: string;
  gender: 'male' | 'female';
  geminiVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede';
  puterVoice: string;
  sampleText: string;
}

export const JARVIS_VOICE_OPTIONS: JarvisVoiceOption[] = [
  {
    id: 'puck',
    name: 'Jarvis Dynamic (Puck)',
    subtitle: 'Energetic, confident, motivating brotherly tone',
    gender: 'male',
    geminiVoice: 'Puck',
    puterVoice: 'Matthew',
    sampleText: 'Greetings. I am Jarvis. Conquering urges builds unstoppable power. Let us work!',
  },
  {
    id: 'charon',
    name: 'Jarvis Stoic (Charon)',
    subtitle: 'Deep, commanding stoic masculine mentor',
    gender: 'male',
    geminiVoice: 'Charon',
    puterVoice: 'Brian',
    sampleText: 'Discipline is your highest duty. Master your mind, conquer all weakness today.',
  },
  {
    id: 'fenrir',
    name: 'Jarvis Spartan (Fenrir)',
    subtitle: 'Fierce, intense, iron-will commanding coach',
    gender: 'male',
    geminiVoice: 'Fenrir',
    puterVoice: 'Joey',
    sampleText: 'Stand tall. Every urge defeated transforms into raw athletic power. Lead now.',
  },
  {
    id: 'kore',
    name: 'Jarvis Athena (Kore)',
    subtitle: 'Sharp, relentless, focused feminine intelligence',
    gender: 'female',
    geminiVoice: 'Kore',
    puterVoice: 'Amy',
    sampleText: 'Focus your mind. Pain of discipline is temporary; pain of regret is forever.',
  },
  {
    id: 'aoede',
    name: 'Jarvis Wisdom (Aoede)',
    subtitle: 'Calm, confident, uplifting stoic guide',
    gender: 'female',
    geminiVoice: 'Aoede',
    puterVoice: 'Arthur',
    sampleText: 'Systems online. Your clean streak is your fortress. Never surrender ground.',
  },
];

/**
 * Retrieve all stored Gemini API keys (up to 10)
 */
export function getStoredGeminiKeys(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS_LIST);
    let keys: string[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        keys = parsed.filter((k): k is string => typeof k === 'string' && k.trim().length > 0);
      }
    }

    // Fallback: check legacy single key if array is empty
    if (keys.length === 0) {
      const legacy = localStorage.getItem(STORAGE_LEGACY_KEY)?.trim();
      if (legacy) {
        keys = [legacy];
        localStorage.setItem(STORAGE_KEYS_LIST, JSON.stringify(keys));
      }
    }

    return keys.slice(0, MAX_GEMINI_KEYS);
  } catch {
    return [];
  }
}

/**
 * Save Gemini API keys (up to 10)
 */
export function saveStoredGeminiKeys(keys: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = Array.from(new Set(keys.map((k) => k.trim()).filter((k) => k.length > 0))).slice(
      0,
      MAX_GEMINI_KEYS
    );
    localStorage.setItem(STORAGE_KEYS_LIST, JSON.stringify(clean));
    // Keep legacy single key synced with Key #1
    if (clean.length > 0) {
      localStorage.setItem(STORAGE_LEGACY_KEY, clean[0]);
    } else {
      localStorage.removeItem(STORAGE_LEGACY_KEY);
    }
  } catch {}
}

/**
 * Returns the keys in round-robin order for the current request,
 * and advances the round-robin pointer for the next request.
 * E.g. with 4 keys [A, B, C, D] and current index 1 -> returns [B, C, D, A]
 */
export function getRoundRobinGeminiKeys(): string[] {
  const keys = getStoredGeminiKeys();
  if (keys.length <= 1) return keys;

  let currentIndex = 0;
  try {
    const storedIdx = localStorage.getItem(STORAGE_RR_INDEX);
    if (storedIdx !== null) {
      currentIndex = parseInt(storedIdx, 10);
      if (isNaN(currentIndex)) currentIndex = 0;
    }
  } catch {}

  const validIndex = currentIndex % keys.length;
  // Reorder starting from validIndex, wrapping around
  const reordered = [
    ...keys.slice(validIndex),
    ...keys.slice(0, validIndex),
  ];

  // Advance counter for next request
  const nextIndex = (validIndex + 1) % keys.length;
  try {
    localStorage.setItem(STORAGE_RR_INDEX, String(nextIndex));
  } catch {}

  return reordered;
}

/**
 * Get current round-robin index for UI indicator
 */
export function getCurrentRoundRobinIndex(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const stored = localStorage.getItem(STORAGE_RR_INDEX);
    const parsed = stored ? parseInt(stored, 10) : 0;
    return isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
}

/**
 * Get Jarvis Voice Configuration
 */
export function getJarvisVoiceSettings(): {
  voiceId: string;
  geminiVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede';
  puterVoice: string;
  emotion: 'energetic_confident' | 'fierce_discipline' | 'calm_focus';
  rate: number;
  pitch: number;
} {
  if (typeof window === 'undefined') {
    return {
      voiceId: 'puck',
      geminiVoice: 'Puck',
      puterVoice: 'Matthew',
      emotion: 'energetic_confident',
      rate: 1.0,
      pitch: 1.0,
    };
  }

  try {
    const voiceId = localStorage.getItem(STORAGE_VOICE_ID) || 'puck';
    const emotionStr = (localStorage.getItem(STORAGE_VOICE_EMOTION) || 'energetic_confident') as
      | 'energetic_confident'
      | 'fierce_discipline'
      | 'calm_focus';
    const rateStr = localStorage.getItem(STORAGE_VOICE_RATE);
    const pitchStr = localStorage.getItem(STORAGE_VOICE_PITCH);

    // Backward compatibility with previous IDs
    let option = JARVIS_VOICE_OPTIONS.find((v) => v.id === voiceId);
    if (!option) {
      if (voiceId === 'matthew') option = JARVIS_VOICE_OPTIONS[0];
      else if (voiceId === 'brian') option = JARVIS_VOICE_OPTIONS[1];
      else if (voiceId === 'joey') option = JARVIS_VOICE_OPTIONS[2];
      else if (voiceId === 'amy') option = JARVIS_VOICE_OPTIONS[3];
      else if (voiceId === 'arthur') option = JARVIS_VOICE_OPTIONS[4];
      else option = JARVIS_VOICE_OPTIONS[0];
    }

    const rate = rateStr ? parseFloat(rateStr) : 1.0;
    const pitch = pitchStr ? parseFloat(pitchStr) : 1.0;

    return {
      voiceId: option.id,
      geminiVoice: option.geminiVoice,
      puterVoice: option.puterVoice,
      emotion: emotionStr,
      rate: isNaN(rate) ? 1.0 : rate,
      pitch: isNaN(pitch) ? 1.0 : pitch,
    };
  } catch {
    return {
      voiceId: 'puck',
      geminiVoice: 'Puck',
      puterVoice: 'Matthew',
      emotion: 'energetic_confident',
      rate: 1.0,
      pitch: 1.0,
    };
  }
}

/**
 * Save Jarvis Voice Configuration
 */
export function saveJarvisVoiceSettings(settings: {
  voiceId?: string;
  emotion?: 'energetic_confident' | 'fierce_discipline' | 'calm_focus';
  rate?: number;
  pitch?: number;
}): void {
  if (typeof window === 'undefined') return;
  try {
    if (settings.voiceId) {
      localStorage.setItem(STORAGE_VOICE_ID, settings.voiceId);
    }
    if (settings.emotion) {
      localStorage.setItem(STORAGE_VOICE_EMOTION, settings.emotion);
    }
    if (settings.rate !== undefined) {
      localStorage.setItem(STORAGE_VOICE_RATE, String(settings.rate));
    }
    if (settings.pitch !== undefined) {
      localStorage.setItem(STORAGE_VOICE_PITCH, String(settings.pitch));
    }
  } catch {}
}

/**
 * Play speech using native Gemini Text-to-Speech (gemini-3.8-flash-tts)
 * with inline emotions and automatic fallback.
 */
export async function playGeminiTTSAudio(
  text: string,
  options?: {
    voiceName?: string;
    emotion?: string;
    onEnd?: () => void;
    onError?: (err: unknown) => void;
  }
): Promise<HTMLAudioElement | null> {
  if (typeof window === 'undefined') return null;

  try {
    const voiceSettings = getJarvisVoiceSettings();
    const candidateKeys = getRoundRobinGeminiKeys();
    const primaryKey = candidateKeys[0] || '';

    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceName: options?.voiceName || voiceSettings.geminiVoice,
        emotion: options?.emotion || voiceSettings.emotion,
        userApiKey: primaryKey,
        userApiKeys: candidateKeys,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        success?: boolean;
        audioBase64?: string;
        mimeType?: string;
      };

      if (data.success && data.audioBase64) {
        const audioSrc = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
        const audio = new Audio(audioSrc);
        audio.playbackRate = voiceSettings.rate || 1.0;

        if (options?.onEnd) {
          audio.onended = options.onEnd;
        }
        if (options?.onError) {
          audio.onerror = options.onError;
        }

        await audio.play();
        return audio;
      }
    }
  } catch (err) {
    console.warn('Gemini TTS playback request failed:', err);
    if (options?.onError) {
      options.onError(err);
    }
  }
  return null;
}

