import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { apiKey?: string };
    const apiKey = body.apiKey?.trim();

    if (!apiKey) {
      return NextResponse.json(
        { valid: false, error: 'Please enter a Gemini API key.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'beyondlimits-verify-key',
        },
      },
    });

    const startTime = Date.now();
    let text = '';
    let usedModel = '';
    let isQuotaExhausted = false;
    let lastError: Error | null = null;

    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ];

    for (const model of candidateModels) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: 'Respond with exactly: OK',
          config: {
            maxOutputTokens: 50,
            temperature: 0.1,
          },
        });
        const extracted =
          res.text?.trim() ||
          (res.candidates?.[0]?.content?.parts as Array<{ text?: string }> | undefined)
            ?.map((p) => p.text || '')
            .join('')
            .trim() ||
          '';

        if (extracted) {
          text = extracted;
          usedModel = model;
          break;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const msg = lastError.message.toLowerCase();
        if (
          msg.includes('quota') ||
          msg.includes('429') ||
          msg.includes('resource_exhausted')
        ) {
          isQuotaExhausted = true;
          usedModel = model;
          break;
        }
      }
    }

    const latencyMs = Date.now() - startTime;

    if (text) {
      return NextResponse.json({
        valid: true,
        latencyMs,
        model: usedModel,
        message: `Key verified successfully with Google (${usedModel}) in ${latencyMs}ms!`,
      });
    }

    if (isQuotaExhausted) {
      return NextResponse.json({
        valid: true,
        quotaExhausted: true,
        latencyMs,
        model: usedModel || 'gemini-2.5-flash',
        message: `Key authenticated with Google! Daily free-tier quota is currently exhausted (429) for ${usedModel || 'gemini'}. Round-robin failover is active.`,
      });
    }

    const errMsg = lastError?.message || 'Gemini returned empty response.';
    return NextResponse.json(
      { valid: false, error: errMsg },
      { status: 400 }
    );
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : 'Invalid Gemini API key or connection error';
    return NextResponse.json({ valid: false, error: errMsg }, { status: 400 });
  }
}
