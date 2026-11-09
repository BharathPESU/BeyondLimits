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
      httpOptions: {
        headers: {
          'User-Agent': 'beyondlimits-verify-key',
        },
      },
    });

    const startTime = Date.now();
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Respond with exactly: OK',
      config: {
        maxOutputTokens: 10,
        temperature: 0.1,
      },
    });

    const latencyMs = Date.now() - startTime;
    const text = res.text?.trim() || '';

    if (text) {
      return NextResponse.json({
        valid: true,
        latencyMs,
        model: 'gemini-2.5-flash',
        message: `Key verified successfully! Response in ${latencyMs}ms.`,
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

