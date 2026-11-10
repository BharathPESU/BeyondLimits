import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface TTSRequestBody {
  text: string;
  voiceName?: string;
  emotion?: 'energetic_confident' | 'fierce_discipline' | 'calm_focus' | string;
  userApiKey?: string;
  userApiKeys?: string[];
}

const TTS_MODELS = [
  'gemini-3.8-flash-tts',
  'gemini-3.8-flash-lite-tts',
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-flash-preview-tts',
];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TTSRequestBody;
    const rawText = body.text?.trim() || '';

    if (!rawText) {
      return NextResponse.json(
        { success: false, error: 'Text prompt is required for TTS' },
        { status: 400 }
      );
    }

    // Limit text to 350 chars for rapid voice delivery and responsive UI
    const cleanText = rawText.slice(0, 350);

    // Apply inline emotion directives as requested by user
    let emotionPrompt = cleanText;
    const emotion = body.emotion || 'energetic_confident';

    if (emotion === 'fierce_discipline') {
      emotionPrompt = `[Speak with fierce discipline, intense masculine authority, and relentless focus]: ${cleanText}`;
    } else if (emotion === 'calm_focus') {
      emotionPrompt = `[Speak with calm composure, stoic depth, and steady confidence]: ${cleanText}`;
    } else {
      // Default: energetic, confident, motivating
      emotionPrompt = `[Speak with high energy, unwavering confidence, and inspiring brotherly motivation]: ${cleanText}`;
    }

    const selectedVoice = body.voiceName || 'Puck';

    // Candidate keys: prioritize user-configured keys in round-robin sequence
    const candidateKeys: string[] = [];
    if (Array.isArray(body.userApiKeys) && body.userApiKeys.length > 0) {
      candidateKeys.push(...body.userApiKeys.filter((k) => typeof k === 'string' && k.trim().length > 0));
    }
    if (body.userApiKey && !candidateKeys.includes(body.userApiKey)) {
      candidateKeys.unshift(body.userApiKey);
    }

    const serverApiKey = process.env.GEMINI_API_KEY?.trim();
    if (serverApiKey && !candidateKeys.includes(serverApiKey)) {
      candidateKeys.push(serverApiKey);
    }

    if (candidateKeys.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No Gemini API keys available for TTS' },
        { status: 400 }
      );
    }

    // Try keys and models in cascading priority
    for (const key of candidateKeys) {
      for (const model of TTS_MODELS) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
          const payload = {
            contents: [
              {
                parts: [{ text: emotionPrompt }],
              },
            ],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: selectedVoice,
                  },
                },
              },
            },
          };

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.warn(`TTS Model ${model} returned HTTP ${res.status}:`, errData);
            continue; // Try next model or next key
          }

          const data = await res.json();
          const part = data.candidates?.[0]?.content?.parts?.[0];

          if (part?.inlineData?.data) {
            return NextResponse.json({
              success: true,
              audioBase64: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'audio/wav',
              model,
              voice: selectedVoice,
              emotion,
            });
          }
        } catch (fetchErr) {
          console.warn(`TTS request to ${model} failed:`, fetchErr);
        }
      }
    }

    return NextResponse.json(
      { success: false, error: 'All Gemini TTS models exhausted or unavailable' },
      { status: 502 }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown TTS error';
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
