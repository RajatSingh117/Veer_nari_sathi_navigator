const test = async () => {
  console.log('Testing session API...');
  const res1 = await fetch('http://localhost:3000/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'EN' })
  });
  const session = await res1.json();
  console.log('Session response:', session);
  const cookie = res1.headers.get('set-cookie');
  console.log('Cookie:', cookie);

  if (session.sessionId) {
    console.log('Testing answers API...');
    const res2 = await fetch('http://localhost:3000/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({ answers: { relationship: 'veer_nari' } })
    });
    const answers = await res2.json();
    console.log('Answers response:', answers);
  }
};
test();
