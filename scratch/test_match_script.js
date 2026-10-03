const { GoogleGenAI, Type } = require('@google/genai');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/GEMINI_API_KEY=(.*)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';

const entitlements = JSON.parse(fs.readFileSync('src/data/entitlements.json', 'utf8'));

const dummyAnswers = {
  relationship: 'veer_nari',
  branch: 'army',
  causeOfDeath: 'battle',
  state: 'himachal',
  dependentChildren: '0'
};

const dummyFields = {
  name: 'RAHUL SHARMA',
  service_number: 'IND-883921',
  rank: 'Subedar',
  unit: '5th Rajputana Rifles',
  date_of_death: '15-AUG-2022',
  cause_category: 'Battle Casualty',
  dependents: '2',
  issuing_authority: 'Record Office Delhi'
};

const ai = new GoogleGenAI({ apiKey });

const systemPrompt = `You are an expert military entitlement guidance assistant for Veer Naris (widows) and families of Indian Armed Forces martyrs.
Given the official Knowledge Base (KB) of entitlements, evaluate the applicant's profile and return all likely applicable benefits.

STRICT RULES:
1. Use ONLY the provided KB entries. Never invent benefits.
2. NEVER state anyone is eligible or approved.
3. Always use "likely applicable" wording (e.g. "Likely applicable because...").
4. If an entry's data is 'TODO_VERIFY' or contains 'TODO_VERIFY', mark it "details to be confirmed with the office".
5. For status: Compare the required documents of each KB entitlement against the applicant's confirmed fields/documents.
   - If the applicant has confirmed details indicating they have the required documents, mark status as 'ready' and missing_documents as [].
   - If any required documents are not confirmed or still needed (e.g., Bank details, Domicile certificate, School ID), mark status as 'missing_docs' and list the specific missing documents in missing_documents[].
6. Respond in the requested language (if Hindi: titles and text in Hindi; if Marathi: titles and text in Marathi; if English: titles and text in English).
`;

const prompt = `Knowledge Base:
${JSON.stringify(entitlements, null, 2)}

Applicant Answers:
${JSON.stringify(dummyAnswers, null, 2)}

Applicant Confirmed Fields:
${JSON.stringify(dummyFields, null, 2)}
`;

async function run() {
  let attempt = 0;
  let lastError;
  while (attempt < 2) {
    try {
      console.log(`Attempt ${attempt + 1}...`);
      const r = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
        contents: [systemPrompt, prompt],
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
      console.log('Success:');
      console.log(r.text);
      return;
    } catch (e) {
      console.log(`Attempt ${attempt + 1} failed:`, e.message);
      lastError = e;
      attempt++;
      if (attempt < 2) {
        await new Promise(res => setTimeout(res, 1000));
      }
    }
  }
  console.error('All attempts failed:', lastError);
}

run().catch(console.error);
