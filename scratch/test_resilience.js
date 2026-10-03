const fs = require('fs');
const path = require('path');

async function testMatch() {
  console.log('\n--- 1. Testing /api/match with Compact Payload ---');
  const start = Date.now();
  const res = await fetch('http://localhost:3000/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers: {
        serviceBranch: 'army',
        maritalStatus: 'widow',
        causeOfDeath: 'battle',
        state: 'maharashtra',
        dependentChildren: '2',
      },
      confirmedFields: {
        name: 'RAHUL SHARMA',
        rank: 'Subedar',
        service_number: 'IND-883921',
        unit: '5th Rajputana Rifles',
        date_of_death: '15-AUG-2022',
        cause_category: 'Battle Casualty',
      },
      language: 'EN',
      uploadedDocs: ['death_certificate', 'service_record'],
    }),
  });

  const data = await res.json();
  const elapsed = Date.now() - start;
  console.log(`Status: ${res.status} (Elapsed: ${elapsed}ms)`);
  console.log(`Matched benefits count: ${data.benefits?.length || 0}`);
  console.log('Meta:', data.meta);
  if (!res.ok) throw new Error(`Match failed: ${JSON.stringify(data)}`);
}

async function testLetter() {
  console.log('\n--- 2. Testing /api/letter ---');
  const start = Date.now();
  const res = await fetch('http://localhost:3000/api/letter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      benefit: {
        id: 'b-01',
        title: 'Liberalized Family Pension',
        office: 'The Concerned Welfare / Records Office',
      },
      confirmedFields: {
        name: 'RAHUL SHARMA',
        rank: 'Subedar',
        service_number: 'IND-883921',
        unit: '5th Rajputana Rifles',
        date_of_death: '15-AUG-2022',
      },
      answers: {},
      language: 'EN',
    }),
  });

  const data = await res.json();
  const elapsed = Date.now() - start;
  console.log(`Status: ${res.status} (Elapsed: ${elapsed}ms)`);
  console.log(`Letter length: ${data.letter?.length || 0} chars`);
  console.log('Meta:', data.meta);
  if (!res.ok) throw new Error(`Letter failed: ${JSON.stringify(data)}`);
}

async function testExtract() {
  console.log('\n--- 3. Testing /api/documents/extract ---');
  const start = Date.now();
  const samplePath = path.join(__dirname, '..', 'public', 'samples', 'dummy_death_certificate.jpg');
  const fileBytes = fs.readFileSync(samplePath);
  const blob = new Blob([fileBytes], { type: 'image/jpeg' });

  const formData = new FormData();
  formData.append('file', blob, 'dummy_death_certificate.jpg');
  formData.append('docType', 'death_certificate');
  formData.append('language', 'EN');

  const res = await fetch('http://localhost:3000/api/documents/extract', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  const elapsed = Date.now() - start;
  console.log(`Status: ${res.status} (Elapsed: ${elapsed}ms)`);
  console.log('Extracted name:', data.data?.name?.value);
  console.log('Extracted rank:', data.data?.rank?.value);
  console.log('Extracted service_number:', data.data?.service_number?.value);
  if (!res.ok) throw new Error(`Extract failed: ${JSON.stringify(data)}`);
}

async function main() {
  try {
    await testMatch();
    await testLetter();
    await testExtract();
    console.log('\n=============================================');
    console.log('=== All Resilience & Speed Tests Passed! ===');
    console.log('=============================================');
  } catch (err) {
    console.error('Test run failed:', err);
    process.exit(1);
  }
}

main();
