import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const LetterRequestSchema = z.object({
  benefit: z.object({
    id: z.string(),
    title: z.string(),
    office: z.string().optional(),
    documents_required: z.array(z.string()).optional(),
    why_it_may_apply: z.string().optional(),
  }),
  confirmedFields: z.record(z.string(), z.any()).optional().default({}),
  answers: z.record(z.string(), z.string()).optional().default({}),
  language: z.enum(['EN', 'HI', 'MR', 'en', 'hi', 'mr']).optional().default('EN'),
});

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const rawBody = await req.json();
    const parseResult = LetterRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid letter request body', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { benefit, confirmedFields, answers, language } = parseResult.data;
    const langCode = (language || 'EN').toUpperCase();
    const langName = langCode === 'HI' ? 'Hindi' : langCode === 'MR' ? 'Marathi' : 'English';

    // Mock only if DEMO_MODE === 'true'
    if (process.env.DEMO_MODE === 'true') {
      const duration_ms = Date.now() - startTime;
      const soldierName = confirmedFields.name || '[Name of Soldier]';
      const rank = confirmedFields.rank || '[Rank]';
      const serviceNo = confirmedFields.service_number || '[Service Number]';
      const unit = confirmedFields.unit || '[Unit]';
      const dod = confirmedFields.date_of_death || '[Date of Death]';

      let mockLetter = '';
      if (langCode === 'HI') {
        mockLetter = `सेवा में,
प्रभारी अधिकारी,
संबंधित अभिलेख / कल्याण कार्यालय

विषय: ${benefit.title} हेतु औपचारिक आवेदन

महोदय/महोदया,

मैं, [आवेदक का पूरा नाम], स्वर्गीय ${rank} ${soldierName} (सेवा क्रमांक: ${serviceNo}, ${unit}) की धर्मपत्नी (वीर नारी), ${benefit.title} हेतु सविनय आवेदन प्रस्तुत कर रही हूँ।

मेरे पति ने ${dod} को राष्ट्र सेवा में सर्वोच्च बलिदान दिया।

वर्तमान पता: [वर्तमान पता]
संपर्क सूत्र: [मोबाइल नंबर]

इस आवेदन पर अंतिम निर्णय संबंधित कार्यालय के अधीन है।

भवदीया,
[आवेदक का नाम व हस्ताक्षर]`;
      } else if (langCode === 'MR') {
        mockLetter = `प्रति,
सक्षम अधिकारी,
संबंधित रेकॉर्ड / कल्याण कार्यालय

विषय: ${benefit.title} साठी औपचारिक अर्ज

महोदय/महोदया,

मी, [अर्जदाराचे पूर्ण नाव], स्व. ${rank} ${soldierName} (सेवा क्रमांक: ${serviceNo}, ${unit}) यांची वीर नारी (पत्नी), ${benefit.title} मिळण्याबाबत अर्ज सादर करत आहे.

माझ्या पतीने ${dod} रोजी देशसेवेदरम्यान सर्वोच्च बलिदान दिले.

पत्ता: [सध्याचा पत्ता]
संपर्क क्रमांक: [संपर्क क्रमांक]

या अर्जाबाबतचा अंतिम निर्णय घेण्याचा अधिकार संबंधित कार्यालयाचा राहील.

आपली नम्र,
[स्वाक्षरी]`;
      } else {
        mockLetter = `To,
The Officer-in-Charge,
The Concerned Records / Welfare Office

Subject: Application for ${benefit.title}

Respected Sir/Madam,

I, [Applicant's Full Name], widow/dependent of Late ${rank} ${soldierName}, Service No. ${serviceNo}, ${unit}, hereby submit my application for ${benefit.title}.

My husband made the supreme sacrifice on ${dod} in the line of duty.

Current Address: [Current Address]
Contact Number: [Mobile Number]

The final decision on sanctioning rests with the concerned office.

Yours faithfully,
[Signature]
[Applicant's Full Name]`;
      }

      return NextResponse.json({
        success: true,
        letter: mockLetter,
        meta: {
          path: 'mock',
          model: 'demo_mock',
          duration_ms,
        },
      });
    }

    // Call Gemini with GEMINI_MODEL from env
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
      return NextResponse.json(
        { error: 'Gemini API key is not configured and DEMO_MODE is not enabled.' },
        { status: 500 }
      );
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

    const systemPrompt = `You are an expert military benefits counselor assisting Veer Naris (widows) and dependents of Indian Armed Forces martyrs.
Write a formal Indian government-style application letter for the requested military entitlement in ${langName}.

STRICT LETTER WRITING RULES:
1. Tone: Respectful, formal, dignified, and clear Indian official correspondence style.
2. Use ONLY the provided confirmed fields.
3. For anything not confirmed or missing (e.g. Applicant's Own Full Name, Current Address, Phone Number, Bank Account Number, IFSC Code), insert a clear bracketed placeholder such as [Applicant's Full Name], [Current Address], [Contact Number].
4. DO NOT invent office names, postal addresses, pin codes, monetary amounts, or scheme regulations. If the benefit office is marked "details to be confirmed with the office" or "TODO_VERIFY", address it to the general concerned authority (e.g. "To, The Concerned Records / Welfare Office, [Office Address to be confirmed]").
5. DO NOT state or claim that the applicant is eligible, approved, or entitled.
6. The letter MUST conclude with a clear formal statement that: "The final decision on sanctioning rests with the concerned office." (translated appropriately into ${langName}).
7. Output ONLY the complete letter text. Do not wrap in markdown code blocks or add preamble/postscript.`;

    const userPrompt = `Entitlement Benefit Details:
${JSON.stringify(benefit, null, 2)}

Confirmed Soldier / Service Details:
${JSON.stringify(confirmedFields, null, 2)}

Applicant Evaluation Answers:
${JSON.stringify(answers, null, 2)}

Requested Language: ${langName}`;

    // Retry once on failure
    let attempt = 0;
    let letterText = '';
    let lastError: any = null;

    const candidateModels = [modelName, 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let usedModel = modelName;

    while (attempt < 2) {
      usedModel = candidateModels[attempt] || candidateModels[0];
      try {
        const response = await ai.models.generateContent({
          model: usedModel,
          contents: [systemPrompt, userPrompt],
          config: {
            temperature: 0.3,
          },
        });

        const text = response.text;
        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from Gemini');
        }
        letterText = text.trim();
        break;
      } catch (err) {
        attempt++;
        lastError = err;
        console.warn(`Gemini letter generation attempt ${attempt} failed:`, err);
        if (attempt < 2) {
          await new Promise((res) => setTimeout(res, 800));
        }
      }
    }

    if (!letterText) {
      console.error('All Gemini letter attempts failed:', lastError);
      return NextResponse.json(
        { error: 'Failed to generate application letter via AI. Please try again.', details: lastError?.message },
        { status: 500 }
      );
    }

    // Strip any markdown code fence wrappers if present
    letterText = letterText.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();

    const duration_ms = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      letter: letterText,
      meta: {
        path: 'gemini',
        model: usedModel,
        duration_ms,
      },
    });

  } catch (error: any) {
    console.error('Letter generation error:', error);
    return NextResponse.json(
      { error: 'Failed to process letter request', details: error.message },
      { status: 500 }
    );
  }
}
