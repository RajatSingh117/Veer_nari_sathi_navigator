import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

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
    message: `Gemini extraction error: ${msg.slice(0, 200)}`,
  };
}

const ExtractedFieldSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    value: { type: Type.STRING, description: "The extracted text value. If not found, use 'Not found'." },
    confidence: { type: Type.NUMBER, description: "Confidence score between 0.0 and 1.0" }
  },
  required: ['value', 'confidence']
};

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
    console.log('[Extract API]: MOCK MODE returning dummy extracted JSON');
    return NextResponse.json({
      success: true,
      data: {
        name: { value: 'RAHUL SHARMA', confidence: 0.95 },
        service_number: { value: 'IND-883921', confidence: 0.98 },
        rank: { value: 'Subedar', confidence: 0.90 },
        unit: { value: '5th Rajputana Rifles', confidence: 0.88 },
        date_of_death: { value: '15-AUG-2022', confidence: 0.99 },
        cause_category: { value: 'Battle Casualty', confidence: 0.95 },
        dependents: { value: '2', confidence: 0.65 },
        issuing_authority: { value: 'Record Office Delhi', confidence: 0.85 }
      }
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const docType = formData.get('docType') as string | null;
    const language = (formData.get('language') as string) || 'EN';
    const langName = language === 'HI' ? 'Hindi' : language === 'MR' ? 'Marathi' : 'English';

    if (!file || !docType) {
      return NextResponse.json({ error: 'Missing file or docType' }, { status: 400 });
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 8MB limit' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');
    let mimeType = file.type;
    
    if (!mimeType) {
      if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (file.name.endsWith('.png')) mimeType = 'image/png';
      else mimeType = 'image/jpeg';
    }

    const prompt = `Strict data extraction: Indian military document type: ${docType}. 
Extract: name, service_number, rank, unit, date_of_death, cause_category, dependents, issuing_authority.
Keep names and numbers exact. If missing, value='Not found' and confidence=0.
Respond in ${langName}.`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const candidateModels = [modelName, 'gemini-1.5-flash', 'gemini-3.1-flash-lite'].filter(
      (m, i, arr) => arr.indexOf(m) === i
    );

    let attempt = 0;
    let lastError: any = null;

    while (attempt < 2) {
      const activeModel = candidateModels[attempt] || candidateModels[0];
      try {
        const response = await ai.models.generateContent({
          model: activeModel,
          contents: [
            prompt,
            { inlineData: { data: base64Data, mimeType } }
          ],
          config: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: ExtractedFieldSchema,
                service_number: ExtractedFieldSchema,
                rank: ExtractedFieldSchema,
                unit: ExtractedFieldSchema,
                date_of_death: ExtractedFieldSchema,
                cause_category: ExtractedFieldSchema,
                dependents: ExtractedFieldSchema,
                issuing_authority: ExtractedFieldSchema
              },
              required: ['name', 'service_number', 'rank', 'unit', 'date_of_death', 'cause_category', 'dependents', 'issuing_authority']
            }
          }
        });
        
        const text = response.text;
        if (!text) throw new Error("Empty response from Gemini");
        const json = JSON.parse(text);
        
        return NextResponse.json({ success: true, data: json });
      } catch (err: any) {
        attempt++;
        lastError = err;
        console.error(`[Gemini Extraction Attempt ${attempt} Failed with model ${activeModel}]:`, err);
        if (attempt >= 2) break;
        await new Promise((res) => setTimeout(res, 500));
      }
    }

    const parsedErr = parseGeminiError(lastError);
    console.error('[Document Extraction Final Error]:', {
      status: parsedErr.status,
      message: parsedErr.message,
      raw: lastError?.message,
      stack: lastError?.stack,
    });

    return NextResponse.json(
      { error: parsedErr.message, details: lastError?.message },
      { status: parsedErr.status }
    );
  } catch (err: any) {
    console.error("[Upload Route Fatal Error]:", err);
    return NextResponse.json({ error: err.message || 'Failed to process document upload.' }, { status: 500 });
  }
}
