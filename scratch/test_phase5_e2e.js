const fs = require('fs');
const path = require('path');

const dummyProfile = {
  confirmedFields: {
    name: 'RAHUL SHARMA',
    rank: 'Subedar',
    service_number: 'IND-883921',
    unit: '5th Rajputana Rifles',
    date_of_death: '15-AUG-2022',
    cause_category: 'Battle Casualty',
  },
  answers: {
    serviceBranch: 'army',
    maritalStatus: 'widow',
    causeOfDeath: 'battle',
    state: 'maharashtra',
    children: '2',
  },
};

const benefits = {
  EN: {
    id: 'b-01',
    title: 'Liberalized Family Pension',
    office: 'The Concerned Welfare / Records Office',
    why_it_may_apply: 'Likely applicable as next of kin of deceased soldier (Battle Casualty).',
    documents_required: [
      'Casualty Part II Order / Death Certificate',
      'Discharge Book / PPO Copy',
      'Bank Account Mandate'
    ],
  },
  HI: {
    id: 'b-01',
    title: 'उदारीकृत पारिवारिक पेंशन',
    office: 'संबंधित अभिलेख / कल्याण कार्यालय',
    why_it_may_apply: 'शहीद सैनिक के आश्रित / वीर नारी के लिए संभावित रूप से लागू।',
    documents_required: [
      'हताहत भाग II आदेश / मृत्यु प्रमाणपत्र',
      'सेवामुक्ति पुस्तिका / पीपीओ प्रति',
      'बैंक खाता विवरण'
    ],
  },
  MR: {
    id: 'b-01',
    title: 'उदार कौटुंबिक पेन्शन',
    office: 'संबंधित रेकॉर्ड / कल्याण कार्यालय',
    why_it_may_apply: 'शहीद सैनिकांच्या वारसदारांसाठी / वीर नारींसाठी लागू असण्याची शक्यता.',
    documents_required: [
      'कॅज्युअल्टी भाग II आदेश / मृत्यू प्रमाणपत्र',
      'डिस्चार्ज बुक / पीपीओ प्रत',
      'बँक खाते तपशील'
    ],
  },
};

async function testLanguage(lang) {
  console.log(`\n======================================================`);
  console.log(`=== Testing Language: ${lang} ===`);
  console.log(`======================================================`);

  const letterPayload = {
    benefit: benefits[lang],
    confirmedFields: dummyProfile.confirmedFields,
    answers: dummyProfile.answers,
    language: lang,
  };

  const letterRes = await fetch('http://localhost:3000/api/letter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(letterPayload),
  });

  if (!letterRes.ok) {
    const errText = await letterRes.text();
    throw new Error(`Letter API failed with status ${letterRes.status}: ${errText}`);
  }

  const letterData = await letterRes.json();
  console.log(`[Letter API Response]`);
  console.log(`Path: ${letterData.meta.path}`);
  console.log(`Model: ${letterData.meta.model}`);
  console.log(`Duration: ${letterData.meta.duration_ms}ms`);
  console.log(`\n--- Generated Letter (${lang}) ---\n`);
  console.log(letterData.letter);
  console.log(`\n---------------------------------\n`);

  // Now call PDF export API
  console.log(`[PDF API Request for ${lang}]`);
  const pdfRes = await fetch('http://localhost:3000/api/letter/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: benefits[lang].title,
      letter: letterData.letter,
      language: lang,
    }),
  });

  if (!pdfRes.ok) {
    const errText = await pdfRes.text();
    throw new Error(`PDF API failed with status ${pdfRes.status}: ${errText}`);
  }

  const arrayBuffer = await pdfRes.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);
  const outPath = path.join(__dirname, `letter_${lang}.pdf`);
  fs.writeFileSync(outPath, pdfBuffer);

  console.log(`PDF successfully generated: ${outPath} (${pdfBuffer.length} bytes)`);
  return {
    lang,
    meta: letterData.meta,
    letter: letterData.letter,
    pdfSize: pdfBuffer.length,
    pdfPath: outPath,
  };
}

async function run() {
  try {
    const results = [];
    for (const lang of ['EN', 'HI', 'MR']) {
      const res = await testLanguage(lang);
      results.push(res);
    }

    console.log('\n======================================================');
    console.log('=== All 3 Languages Tested Successfully! ===');
    console.log('======================================================');
    results.forEach(r => {
      console.log(`- ${r.lang}: Path=${r.meta.path}, Model=${r.meta.model}, PDF=${r.pdfSize} bytes`);
    });
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

run();
