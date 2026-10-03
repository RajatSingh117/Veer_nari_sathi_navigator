const fs = require('fs');
const path = require('path');
const { GoogleGenAI, Type } = require('@google/genai');

// Load environment from .env.local
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const envVars = {};
envContent.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) envVars[k.trim()] = v.join('=').trim();
});

const ai = new GoogleGenAI({ apiKey: envVars.GEMINI_API_KEY });
const modelName = envVars.GEMINI_MODEL || 'gemini-3.1-flash-lite';

const ExtractedFieldSchema = {
  type: Type.OBJECT,
  properties: {
    value: { type: Type.STRING, description: "The extracted text value. If not found, use 'Not found'." },
    confidence: { type: Type.NUMBER, description: "Confidence score between 0.0 and 1.0" },
  },
  required: ['value', 'confidence'],
};

async function testDoc(docPath, docType) {
  console.log(`\n======================================================`);
  console.log(`Testing extraction for: ${path.basename(docPath)} (${docType})`);
  console.log(`======================================================`);

  const fileBytes = fs.readFileSync(docPath);
  const base64Data = fileBytes.toString('base64');

  const prompt = `You are a strict data extraction system analyzing an Indian military document of type: ${docType}. 
Extract the requested fields accurately. Do not translate or modify proper names or service numbers. 
If a field is not present or unreadable, set value to 'Not found' and confidence to 0. 
For readable fields, estimate your confidence between 0.1 and 1.0.`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [
      prompt,
      { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
    ],
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
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
          issuing_authority: ExtractedFieldSchema,
        },
        required: [
          'name',
          'service_number',
          'rank',
          'unit',
          'date_of_death',
          'cause_category',
          'dependents',
          'issuing_authority',
        ],
      },
    },
  });

  const parsed = JSON.parse(response.text);
  console.log(JSON.stringify(parsed, null, 2));
  return parsed;
}

async function run() {
  try {
    const samplesDir = path.join(__dirname, '..', 'public', 'samples');
    await testDoc(path.join(samplesDir, 'dummy_death_certificate.jpg'), 'death_certificate');
    await testDoc(path.join(samplesDir, 'dummy_id_proof.jpg'), 'id_proof');
  } catch (err) {
    console.error('Extraction test error:', err);
    process.exit(1);
  }
}

run();
