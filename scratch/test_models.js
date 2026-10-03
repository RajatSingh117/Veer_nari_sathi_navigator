const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/GEMINI_API_KEY=(.*)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';
const ai = new GoogleGenAI({ apiKey });

const models = ['gemini-3.8-flash', 'gemini-2.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

async function testModels() {
  for (const model of models) {
    try {
      console.log(`Testing ${model}...`);
      const res = await ai.models.generateContent({
        model,
        contents: 'Hi'
      });
      console.log(`Success ${model}:`, res.text);
      return model;
    } catch (e) {
      console.log(`Failed ${model}:`, e.message);
    }
  }
}

testModels();
