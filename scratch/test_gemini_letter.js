const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/GEMINI_API_KEY=(.*)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';
const ai = new GoogleGenAI({ apiKey });

const dummyBenefit = {
  id: 'b-01',
  title: 'Family Pension',
  office: 'details to be confirmed with the office',
  documents_required: [
    'Death Certificate',
    'Service Discharge Book or PPO (Pension Payment Order)',
    'Bank Account Details (Single account)'
  ]
};

const dummyConfirmedFields = {
  name: 'RAHUL SHARMA',
  service_number: 'IND-883921',
  rank: 'Subedar',
  unit: '5th Rajputana Rifles',
  date_of_death: '15-AUG-2022',
  cause_category: 'Battle Casualty',
  dependents: '2',
  issuing_authority: 'Record Office Delhi'
};

const dummyAnswers = {
  relationship: 'veer_nari',
  branch: 'army',
  causeOfDeath: 'battle',
  state: 'maharashtra',
  dependentChildren: '2'
};

async function testLetter(lang) {
  const langName = lang === 'HI' ? 'Hindi' : lang === 'MR' ? 'Marathi' : 'English';
  
  const systemPrompt = `You are an expert military benefits counselor assisting Veer Naris (widows) and dependents of Indian Armed Forces martyrs.
Write a formal Indian government-style application letter for the requested military entitlement in ${langName}.

STRICT LETTER WRITING RULES:
1. Tone: Respectful, formal, dignified, and clear Indian official correspondence style.
2. Use ONLY the provided confirmed fields.
3. For anything not confirmed or missing (e.g. Applicant's Own Full Name, Current Address, Phone Number, Bank Account Number, IFSC Code), insert a clear bracketed placeholder such as [Applicant's Full Name], [Current Address], [Contact Number].
4. DO NOT invent office names, postal addresses, pin codes, monetary amounts, or scheme regulations. If the benefit office is marked "details to be confirmed with the office", address it to the general concerned authority (e.g. "To, The Concerned Records / Welfare Office, [Office Address to be confirmed]").
5. DO NOT state or claim that the applicant is eligible, approved, or entitled.
6. The letter MUST conclude with a clear formal statement that: "The final decision on sanctioning rests with the concerned office." (translated appropriately into ${langName}).
7. Output ONLY the complete letter text. Do not wrap in markdown code blocks or add preamble/postscript.`;

  const userPrompt = `Entitlement Benefit Details:
${JSON.stringify(dummyBenefit, null, 2)}

Confirmed Soldier / Service Details:
${JSON.stringify(dummyConfirmedFields, null, 2)}

Applicant Evaluation Answers:
${JSON.stringify(dummyAnswers, null, 2)}

Requested Language: ${langName}`;

  const res = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: [systemPrompt, userPrompt],
    config: {
      temperature: 0.3
    }
  });

  console.log(`\n=================== ${langName.toUpperCase()} LETTER ===================`);
  console.log(res.text.trim());
}

async function main() {
  await testLetter('EN');
  await testLetter('HI');
  await testLetter('MR');
}

main().catch(console.error);
