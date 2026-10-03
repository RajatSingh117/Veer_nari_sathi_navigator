import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    console.log('MOCK MODE: Returning dummy extracted JSON');
    return NextResponse.json({
      success: true,
      data: {
        name: { value: 'RAHUL SHARMA', confidence: 0.95 },
        service_number: { value: 'IND-883921', confidence: 0.98 },
        rank: { value: 'Subedar', confidence: 0.90 },
        unit: { value: '5th Rajputana Rifles', confidence: 0.88 },
        date_of_death: { value: '15-AUG-2022', confidence: 0.99 },
        cause_category: { value: 'Battle Casualty', confidence: 0.95 },
        dependents: { value: '2', confidence: 0.65 }, // low confidence
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
      return NextResponse.json({ error: 'File size exceeds 8MB' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');
    let mimeType = file.type;
    
    // Default fallback if type is empty
    if (!mimeType) {
      if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (file.name.endsWith('.png')) mimeType = 'image/png';
      else mimeType = 'image/jpeg';
    }

    const prompt = `You are a strict data extraction system analyzing an Indian military document of type: ${docType}. 
Extract the requested fields accurately. Do not translate or modify proper names or service numbers. 
If a field is not present or unreadable, set value to 'Not found' and confidence to 0. 
For readable fields, estimate your confidence between 0.1 and 1.0. 
Respond in ${langName}, simple language where applicable.`;

    let attempt = 0;
    while (attempt < 2) {
      try {
        const response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
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
        if (!text) throw new Error("Empty response");
        const json = JSON.parse(text);
        
        return NextResponse.json({ success: true, data: json });
      } catch (err) {
        attempt++;
        if (attempt >= 2) {
          console.error("Gemini Extraction Error:", err);
          return NextResponse.json({ error: 'Failed to process document or quota exceeded.' }, { status: 500 });
        }
      }
    }
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: 'Failed to handle file upload.' }, { status: 500 });
  }
}
