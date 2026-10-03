const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/GEMINI_API_KEY=(.*)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';
const ai = new GoogleGenAI({ apiKey });

const candidates = [
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash'
];

async function check() {
  for (const m of candidates) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: 'Return {"status": "ok"} in JSON',
        config: {
          responseMimeType: 'application/json'
        }
      });
      console.log(`Success on ${m}:`, res.text);
    } catch (e) {
      console.log(`Error on ${m}:`, e.message);
    }
  }
}

check();
