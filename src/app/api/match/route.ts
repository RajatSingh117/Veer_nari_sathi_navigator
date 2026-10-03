import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import entitlementsData from '@/data/entitlements.json';
import { BenefitMatch, MatchRequestSchema } from '@/lib/types';
import { safetyPostProcessor } from '@/lib/safety';
import { resolveConfirmedDocTypes, computeBenefitDocStatus } from '@/lib/docMatching';

export const maxDuration = 60;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function isRetryableError(err: any): boolean {
  const status = err?.status || err?.statusCode || err?.code;
  const msg = String(err?.message || '');
  if (status === 429 || status === 503) return true;
  if (msg.includes('429') || msg.includes('503')) return true;
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('UNAVAILABLE')) return true;
  if (msg.toLowerCase().includes('high demand') || msg.toLowerCase().includes('quota')) return true;
  return false;
}

function parseGeminiError(err: any): { status: number; message: string } {
  const msg = err?.message || String(err || '');
  const status = err?.status || err?.statusCode;

  if (status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.toLowerCase().includes('quota')) {
    return {
      status: 429,
      message: 'Gemini API quota exceeded. Please wait a moment and retry.',
    };
  }
  if (status === 503 || msg.includes('503') || msg.includes('UNAVAILABLE') || msg.toLowerCase().includes('high demand')) {
    return {
      status: 503,
      message: 'Gemini model is currently experiencing high demand. Please retry.',
    };
  }
  if (status === 400 || status === 401 || status === 403 || msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
    return {
      status: 401,
      message: 'Invalid or unauthorized Gemini API key. Please check your GEMINI_API_KEY configuration.',
    };
  }
  if (status === 404 || msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('is not found')) {
    return {
      status: 404,
      message: 'Configured Gemini model was not found.',
    };
  }
  if (msg.includes('JSON') || msg.includes('SyntaxError') || msg.includes('Empty response')) {
    return {
      status: 502,
      message: 'Gemini generated an invalid or incomplete response. Please retry.',
    };
  }
  return {
    status: typeof status === 'number' && status >= 400 && status < 600 ? status : 500,
    message: `Gemini matching error: ${msg.slice(0, 200)}`,
  };
}

const GeminiRawOutputSchema = z.object({
  benefits: z.array(
    z.object({
      id: z.string(),
      why_it_may_apply: z.string(),
    })
  ),
});

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const rawBody = await req.json();
    const parseResult = MatchRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.format() }, { status: 400 });
    }

    const { answers, confirmedFields, language, uploadedDocs } = parseResult.data;
    const langCode = (language || 'EN').toUpperCase();
    const langName = langCode === 'HI' ? 'Hindi' : langCode === 'MR' ? 'Marathi' : 'English';
    const langKey = langCode.toLowerCase() as 'en' | 'hi' | 'mr';

    // Resolve which doc types the user has uploaded/confirmed
    const confirmedDocSet = resolveConfirmedDocTypes(uploadedDocs, confirmedFields);
    const confirmedDocList = Array.from(confirmedDocSet);

    // DEMO_MODE fallback
    if (process.env.DEMO_MODE === 'true') {
      console.log('[Match API]: DEMO_MODE=true returning rule-based mock');
      const filtered = entitlementsData.filter((item: any) => {
        if (item.id === 'b-01') return true;
        if (item.id === 'b-02') return true;
        if (item.id === 'b-03') {
          const children = answers.dependentChildren || '';
          return children !== '0' && children !== '' && children !== 'none';
        }
        if (item.id === 'b-04') {
          const st = (answers.state || '').toLowerCase();
          return st.includes('maharashtra');
        }
        if (item.id === 'b-05') {
          const cause = (answers.causeOfDeath || confirmedFields.cause_category || '').toLowerCase();
          return cause.includes('battle') && !cause.includes('non-battle');
        }
        return true;
      });

      const matchedBenefits = filtered.map((item: any) => {
        let rawTitle = item.title[langKey] || item.title.en;
        if (rawTitle.includes('TODO_VERIFY')) rawTitle = item.title.en;
        let rawSummary = item.summary[langKey] || item.summary.en;
        if (rawSummary.includes('TODO_VERIFY')) rawSummary = item.summary.en;
        const { status, missingDocs } = computeBenefitDocStatus(item.documents_required || [], confirmedDocSet);

        return {
          id: item.id,
          title: rawTitle,
          summary: rawSummary,
          why_it_may_apply: `Likely applicable based on official ${rawTitle} guidelines.`,
          status,
          missing_documents: missingDocs,
          office: item.office.includes('TODO_VERIFY') ? 'details to be confirmed with the office' : item.office,
          steps: (item.steps || []).map((s: string) => s.includes('TODO_VERIFY') ? 'details to be confirmed with the office' : s),
          source_url: item.source_url.includes('TODO_VERIFY') ? 'details to be confirmed with the office' : item.source_url,
        };
      });

      const safeOutput = safetyPostProcessor(matchedBenefits, langCode);
      return NextResponse.json({
        success: true,
        meta: { path: 'mock_fallback', model: 'demo_rule_based_kb', duration_ms: Date.now() - startTime },
        benefits: safeOutput.benefits,
        disclaimer: safeOutput.disclaimer,
      });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
      console.error('[Match API Error]: Gemini API key is missing or not configured.');
      return NextResponse.json(
        { error: 'Gemini API key is not configured and DEMO_MODE is not enabled.' },
        { status: 401 }
      );
    }

    // Shrink prompt: Only send fields the model needs (id, title, applies_when, required documents)
    const compactKB = entitlementsData.map((item: any) => {
      let title = item.title[langKey] || item.title.en;
      if (title.includes('TODO_VERIFY')) title = item.title.en;
      return {
        id: item.id,
        title,
        applies_when: item.applies_when,
        documents_required: item.documents_required || [],
      };
    });

    const systemPrompt = `You are a military entitlement matching assistant for families of Indian Armed Forces martyrs.
Evaluate the profile against the provided KB and return ONLY applicable benefits.
Rules:
1. Use ONLY provided KB entries. Never invent benefits.
2. Check applies_when: b-01/b-02: deceased kin; b-03: dependentChildren > 0; b-04: Maharashtra only; b-05: Battle casualty only.
3. NEVER claim eligible or approved; use "likely applicable" wording.
4. why_it_may_apply MUST be concise (maximum 25 words).
5. Respond in ${langName}.`;

    const userPrompt = `KB:
${JSON.stringify(compactKB)}

Answers:
${JSON.stringify(answers)}

Confirmed Fields:
${JSON.stringify(confirmedFields)}`;

    const configuredModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const modelCandidates = [
      configuredModel,
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    let rawBenefits: Array<{ id: string; why_it_may_apply: string }> | null = null;
    let usedModel = configuredModel;
    let retryHappened = false;
    let lastError: any = null;
    const geminiCallStart = Date.now();

    for (let attempt = 0; attempt < 2; attempt++) {
      usedModel = modelCandidates[attempt] || modelCandidates[0];
      if (attempt > 0) {
        retryHappened = true;
      }

      try {
        const response = await ai.models.generateContent({
          model: usedModel,
          contents: [systemPrompt, userPrompt],
          config: {
            temperature: 0,
            maxOutputTokens: 800,
            thinkingConfig: {
              thinkingBudget: 0,
            },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                benefits: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      why_it_may_apply: { type: Type.STRING },
                    },
                    required: ['id', 'why_it_may_apply'],
                  },
                },
              },
              required: ['benefits'],
            },
          },
        });

        const text = response.text;
        if (!text) throw new Error('Empty response from Gemini');
        const parsed = JSON.parse(text);
        const validated = GeminiRawOutputSchema.parse(parsed);
        rawBenefits = validated.benefits;
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Match API]: Gemini attempt ${attempt + 1} with ${usedModel} failed:`, err?.message || err);

        // Only retry on 429/503 with a 2-second backoff
        if (attempt === 0 && isRetryableError(err)) {
          console.warn('[Match API]: Encountered 429/503. Retrying in 2 seconds...');
          await new Promise((res) => setTimeout(res, 2000));
          continue;
        }

        // Not retryable or already retried
        break;
      }
    }

    const geminiDuration = Date.now() - geminiCallStart;
    console.log(`[Match API]: Gemini call took ${geminiDuration}ms, retry: ${retryHappened}`);

    if (!rawBenefits) {
      const parsedErr = parseGeminiError(lastError);
      console.error('[Match API Final Failure]:', {
        status: parsedErr.status,
        message: parsedErr.message,
        raw: lastError?.message,
        stack: lastError?.stack,
      });

      return NextResponse.json(
        { error: parsedErr.message, details: lastError?.message },
        { status: parsedErr.status }
      );
    }

    // Populate localized KB data in code (title, summary, office, steps, source_url)
    const populatedBenefits: BenefitMatch[] = [];
    for (const b of rawBenefits) {
      const kbItem = entitlementsData.find((e: any) => e.id === b.id);
      if (!kbItem) continue;

      let title = (kbItem.title as any)[langKey] || kbItem.title.en;
      if (title.includes('TODO_VERIFY')) title = kbItem.title.en;

      let summary = (kbItem.summary as any)[langKey] || kbItem.summary.en;
      if (summary.includes('TODO_VERIFY')) summary = kbItem.summary.en;

      const requiredDocs = kbItem.documents_required || [];
      const { status, missingDocs } = computeBenefitDocStatus(requiredDocs, confirmedDocSet);

      populatedBenefits.push({
        id: kbItem.id,
        title,
        summary,
        why_it_may_apply: b.why_it_may_apply,
        status,
        missing_documents: missingDocs,
        office: kbItem.office.includes('TODO_VERIFY') ? 'details to be confirmed with the office' : kbItem.office,
        steps: (kbItem.steps || []).map((s: string) => s.includes('TODO_VERIFY') ? 'details to be confirmed with the office' : s),
        source_url: kbItem.source_url.includes('TODO_VERIFY') ? 'details to be confirmed with the office' : kbItem.source_url,
      });
    }

    // Post-processor: Safety filter (strip forbidden terms, append disclaimer)
    const safeOutput = safetyPostProcessor(populatedBenefits, langCode);

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      meta: {
        path: 'gemini',
        model: usedModel,
        duration_ms: elapsed,
        gemini_duration_ms: geminiDuration,
        retry_happened: retryHappened,
      },
      benefits: safeOutput.benefits,
      disclaimer: safeOutput.disclaimer,
    });

  } catch (error: any) {
    console.error('Match endpoint error:', error);
    return NextResponse.json({ error: 'Failed to process match request', details: error.message }, { status: 500 });
  }
}
