async function testProfiles() {
  const profileA = {
    answers: {
      relationship: 'veer_nari',
      branch: 'army',
      causeOfDeath: 'non-battle/natural',
      state: 'uttar_pradesh',
      dependentChildren: '0',
    },
    confirmedFields: {
      name: 'AMIT KUMAR',
      service_number: 'IND-102938',
      rank: 'Havildar',
      unit: '14 Rajput',
      date_of_death: '12-JAN-2021',
      cause_category: 'Natural Cause',
      dependents: '1',
      issuing_authority: 'Record Office',
    },
    language: 'EN',
    uploadedDocs: ['service_record', 'death_certificate'],
  };

  const profileB = {
    answers: {
      relationship: 'veer_nari',
      branch: 'army',
      causeOfDeath: 'battle',
      state: 'maharashtra',
      dependentChildren: '3',
    },
    confirmedFields: {
      name: 'VIKRAM PATIL',
      service_number: 'IND-554433',
      rank: 'Naik',
      unit: 'Maratha Light Infantry',
      date_of_death: '05-MAY-2023',
      cause_category: 'Battle Casualty',
      dependents: '4',
      issuing_authority: 'Record Office Belgaum',
    },
    language: 'EN',
    uploadedDocs: ['service_record', 'death_certificate', 'id_proof'],
  };

  console.log('====================================================');
  console.log('TESTING PROFILE (a): cause "non-battle/natural", state "uttar_pradesh", 0 children');
  console.log('====================================================');
  const resA = await fetch('http://localhost:3000/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileA),
  });
  const dataA = await resA.json();
  console.log('Status code:', resA.status);
  console.log(JSON.stringify(dataA, null, 2));

  console.log('\n====================================================');
  console.log('TESTING PROFILE (b): cause "battle", state "maharashtra", 3 children');
  console.log('====================================================');
  const resB = await fetch('http://localhost:3000/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileB),
  });
  const dataB = await resB.json();
  console.log('Status code:', resB.status);
  console.log(JSON.stringify(dataB, null, 2));

  console.log('\n====================================================');
  console.log('COMPARISON:');
  console.log('Profile (a) matched IDs:', dataA.benefits.map((b) => b.id));
  console.log('Profile (b) matched IDs:', dataB.benefits.map((b) => b.id));
  console.log('Engine path (a):', dataA.meta?.path, 'Model:', dataA.meta?.model);
  console.log('Engine path (b):', dataB.meta?.path, 'Model:', dataB.meta?.model);
  console.log('====================================================');
}

testProfiles().catch(console.error);
