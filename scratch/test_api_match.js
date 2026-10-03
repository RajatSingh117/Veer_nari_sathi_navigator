async function testMatch() {
  const dummyProfile = {
    answers: {
      relationship: 'veer_nari',
      branch: 'army',
      causeOfDeath: 'battle',
      state: 'maharashtra',
      dependentChildren: '2',
    },
    confirmedFields: {
      name: 'RAHUL SHARMA',
      service_number: 'IND-883921',
      rank: 'Subedar',
      unit: '5th Rajputana Rifles',
      date_of_death: '15-AUG-2022',
      cause_category: 'Battle Casualty',
      dependents: '2',
      issuing_authority: 'Record Office Delhi',
    },
    language: 'EN',
  };

  console.log('Sending dummy profile to POST /api/match...');
  const res = await fetch('http://localhost:3000/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dummyProfile),
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('=== MATCH RESPONSE JSON ===');
  console.log(JSON.stringify(data, null, 2));
}

testMatch().catch(console.error);
