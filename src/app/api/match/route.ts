import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import entitlementsData from '@/data/entitlements.json';
import { BenefitMatch, BenefitMatchSchema, MatchRequestSchema } from '@/lib/types';
import { safetyPostProcessor } from '@/lib/safety';
import { resolveConfirmedDocTypes, computeBenefitDocStatus } from '@/lib/docMatching';

export const maxDuration = 60;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function parseGeminiError(err: any): { status: number; message: string } {
  const msg = err?.message || String(err || '');
  const status = err?.status || err?.statusCode;

  if (status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.toLowerCase().includes('quota')) {
    return {
      status: 429,
      message: 'Gemini API quota exceeded. Please wait a moment and retry.',
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

const BenefitsOutputSchema = z.object({
  benefits: z.array(BenefitMatchSchema)
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
        const { status, missingDocs } = computeBenefitDocStatus(item.documents_required || [], confirmedDocSet);

        return {
          id: item.id,
          title: rawTitle,
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

    // Keep KB compact to ensure fast response and low token count
    const compactKB = entitlementsData.map((item: any) => {
      let title = item.title[langKey] || item.title.en;
      if (title.includes('TODO_VERIFY')) title = item.title.en;
      return {
        id: item.id,
        title,
        applies_when: item.applies_when,
        documents_required: item.documents_required || [],
        office: item.office.includes('TODO_VERIFY') ? 'details to be confirmed with the office' : item.office,
        steps: (item.steps || []).map((s: string) => s.includes('TODO_VERIFY') ? 'details to be confirmed with the office' : s),
        source_url: item.source_url.includes('TODO_VERIFY') ? 'details to be confirmed with the office' : item.source_url,
      };
    });

    const systemPrompt = `You are a military entitlement assistant for families of Indian Armed Forces martyrs.
Evaluate the profile against the provided KB and return ONLY applicable benefits.
Rules:
1. Use ONLY provided KB entries. Never invent benefits.
2. Check applies_when: b-01/b-02: deceased kin; b-03: dependentChildren > 0; b-04: Maharashtra only; b-05: Battle casualty only.
3. NEVER claim eligible or approved; use "likely applicable" wording.
4. Compare documents_required with confirmed docs: ${JSON.stringify(confirmedDocList)}. Status: 'ready' (all present) or 'missing_docs' (missing ones listed).
5. Respond entirely in ${langName}.`;

    const userPrompt = `KB:
${JSON.stringify(compactKB)}

Answers:
${JSON.stringify(answers)}

Confirmed Fields:
${JSON.stringify(confirmedFields)}`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const modelCandidates = [
      modelName,
      'gemini-1.5-flash',
      'gemini-3.1-flash-lite',
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    let matchedBenefits: BenefitMatch[] | null = null;
    let usedModel = modelName;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < 2) {
      usedModel = modelCandidates[attempt] || modelCandidates[0];
      try {
        const response = await ai.models.generateContent({
          model: usedModel,
          contents: [systemPrompt, userPrompt],
          config: {
            temperature: 0,
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
                      title: { type: Type.STRING },
                      why_it_may_apply: { type: Type.STRING },
                      status: { type: Type.STRING, enum: ['ready', 'missing_docs'] },
                      missing_documents: { type: Type.ARRAY, items: { type: Type.STRING } },
                      office: { type: Type.STRING },
                      steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                      source_url: { type: Type.STRING }
                    },
                    required: ['id', 'title', 'why_it_may_apply', 'status', 'missing_documents', 'office', 'steps', 'source_url']
                  }
                }
              },
              required: ['benefits']
            }
          }
        });

        const text = response.text;
        if (!text) throw new Error('Empty response from Gemini');
        const parsed = JSON.parse(text);
        const validated = BenefitsOutputSchema.parse(parsed);
        matchedBenefits = validated.benefits;
        break;
      } catch (err: any) {
        attempt++;
        lastError = err;
        console.error(`[Match API Gemini Attempt ${attempt} Failed with ${usedModel}]:`, err);
        if (attempt >= 2) break;
        await new Promise((res) => setTimeout(res, 500));
      }
    }

    if (!matchedBenefits) {
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

    // Post-processor step 1: Deterministically enforce status & truly missing documents
    matchedBenefits = matchedBenefits.map((benefit) => {
      const kbItem = entitlementsData.find((e) => e.id === benefit.id);
      const requiredDocs = kbItem?.documents_required || [];
      const { status, missingDocs } = computeBenefitDocStatus(requiredDocs, confirmedDocSet);
      return {
        ...benefit,
        status,
        missing_documents: missingDocs,
      };
    });

    // Post-processor step 2: Safety filter (strip forbidden terms, append disclaimer)
    const safeOutput = safetyPostProcessor(matchedBenefits, langCode);

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      meta: {
        path: 'gemini',
        model: usedModel,
        duration_ms: elapsed,
      },
      benefits: safeOutput.benefits,
      disclaimer: safeOutput.disclaimer,
    });

  } catch (error: any) {
    console.error('Match endpoint error:', error);
    return NextResponse.json({ error: 'Failed to process match request', details: error.message }, { status: 500 });
  }
}
