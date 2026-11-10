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
    let usedModel = 'gemini-2.5-flash';

    try {
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Respond with exactly: OK',
        config: {
          maxOutputTokens: 200,
          temperature: 0.1,
        },
      });
      text = res.text?.trim() || '';
    } catch {
      usedModel = 'gemini-3.5-flash-lite';
      const res = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: 'Respond with exactly: OK',
        config: {
          maxOutputTokens: 200,
          temperature: 0.1,
        },
      });
      text = res.text?.trim() || '';
    }

    const latencyMs = Date.now() - startTime;

    if (text) {
      return NextResponse.json({
        valid: true,
        latencyMs,
        model: usedModel,
        message: `Key verified successfully with Google (${usedModel})! Response in ${latencyMs}ms.`,
      });
    } else {
      return NextResponse.json(
        { valid: false, error: 'Gemini returned empty response.' },
        { status: 400 }
      );
    }
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : 'Invalid Gemini API key or connection error';
    return NextResponse.json({ valid: false, error: errMsg }, { status: 400 });
  }
}
