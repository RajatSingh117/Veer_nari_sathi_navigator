import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import entitlementsData from '@/data/entitlements.json';
import { BenefitMatch, BenefitMatchSchema, MatchRequestSchema } from '@/lib/types';
import { safetyPostProcessor } from '@/lib/safety';
import { resolveConfirmedDocTypes, computeBenefitDocStatus } from '@/lib/docMatching';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    // Resolve which doc types the user has uploaded/confirmed
    const confirmedDocSet = resolveConfirmedDocTypes(uploadedDocs, confirmedFields);
    const confirmedDocList = Array.from(confirmedDocSet);

    const systemPrompt = `You are an expert military entitlement guidance assistant for Veer Naris (widows) and families of Indian Armed Forces martyrs.
Given the official Knowledge Base (KB) of entitlements, evaluate the applicant's profile and return ONLY the benefits whose KB 'applies_when' condition strictly matches the applicant.

STRICT KB EVALUATION RULES:
1. Use ONLY the provided KB entries. Never invent benefits.
2. Strictly check 'applies_when' for each benefit:
   - b-01: Applies if applicant is next of kin of deceased personnel.
   - b-02: Applies if applicant/family are dependents of deceased personnel.
   - b-03: Applies ONLY if the applicant has dependent children (dependentChildren > 0). If dependentChildren is '0' or none, EXCLUDE b-03.
   - b-04: Applies ONLY if domiciled/residing in Maharashtra. If state is NOT Maharashtra (e.g. Uttar Pradesh, Punjab, etc.), EXCLUDE b-04.
   - b-05: Applies ONLY if death is a battle casualty / death in harness. If cause of death is natural, non-battle, or illness, EXCLUDE b-05.
3. NEVER state anyone is eligible or approved.
4. Always use "likely applicable" wording (e.g. "Likely applicable because...").
5. If an entry's data is 'TODO_VERIFY' or contains 'TODO_VERIFY', mark it "details to be confirmed with the office".
6. DOCUMENT STATUS LOGIC:
   - Compare each benefit's 'documents_required' against the user's Confirmed Document Types: ${JSON.stringify(confirmedDocList)}.
   - If ALL required documents for a benefit are confirmed, mark status as 'ready' and missing_documents as [].
   - If any required documents are not confirmed, mark status as 'missing_docs' and list ONLY the truly missing documents in missing_documents[].
7. LANGUAGE REQUIREMENT:
   - Respond entirely in ${langName}.
   - Titles, 'why_it_may_apply', and 'missing_documents' must be in ${langName}.
   - For TODO_VERIFY entries: English: "details to be confirmed with the office", Hindi: "कार्यालय से पुष्टि की जानी है", Marathi: "कार्यालयाकडून पुष्टी करणे आवश्यक".`;

    const userPrompt = `Knowledge Base:
${JSON.stringify(entitlementsData, null, 2)}

Applicant Answers:
${JSON.stringify(answers, null, 2)}

Applicant Confirmed Fields:
${JSON.stringify(confirmedFields, null, 2)}

User Confirmed Document Types:
${JSON.stringify(confirmedDocList, null, 2)}
`;

    let matchedBenefits: BenefitMatch[] | null = null;
    let usedPath: 'gemini' | 'mock_fallback' = 'mock_fallback';
    let usedModel: string = 'rule_based_mock';

    const modelCandidates = [
      process.env.GEMINI_MODEL,
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest'
    ].filter(Boolean) as string[];

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_api_key_here') {
      let attempt = 0;
      while (attempt < 2) {
        const currentModel = modelCandidates[attempt] || modelCandidates[0];
        try {
          const response = await ai.models.generateContent({
            model: currentModel,
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
          usedPath = 'gemini';
          usedModel = currentModel;
          break;
        } catch (err) {
          attempt++;
          console.warn(`Gemini matching attempt ${attempt} failed:`, err);
          if (attempt < 2) {
            await new Promise((res) => setTimeout(res, 800));
          }
        }
      }
    }

    // Fallback rule-based matching if Gemini calls failed or no API key
    if (!matchedBenefits) {
      usedPath = 'mock_fallback';
      usedModel = 'rule_based_kb';

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

      matchedBenefits = filtered.map((item: any) => {
        const langKey = langCode.toLowerCase() as 'en' | 'hi' | 'mr';
        let rawTitle = item.title[langKey] || item.title.en;
        if (rawTitle.includes('TODO_VERIFY')) rawTitle = item.title.en;

        const { status, missingDocs } = computeBenefitDocStatus(item.documents_required || [], confirmedDocSet);

        return {
          id: item.id,
          title: rawTitle,
          why_it_may_apply: `Likely applicable based on family criteria and official ${rawTitle} guidelines.`,
          status,
          missing_documents: missingDocs,
          office: item.office.includes('TODO_VERIFY') ? 'details to be confirmed with the office' : item.office,
          steps: (item.steps || []).map((s: string) => s.includes('TODO_VERIFY') ? 'details to be confirmed with the office' : s),
          source_url: item.source_url.includes('TODO_VERIFY') ? 'details to be confirmed with the office' : item.source_url,
        };
      });
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
        path: usedPath,
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
