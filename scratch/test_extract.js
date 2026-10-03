const fs = require('fs');

async function testExtract() {
  const filePath = 'public/samples/dummy_service_record.jpg';
  const fileBuffer = fs.readFileSync(filePath);
  
  const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
  const formData = new FormData();
  formData.append('file', blob, 'dummy_service_record.jpg');
  formData.append('docType', 'service_record');

  try {
    const res = await fetch('http://localhost:3000/api/documents/extract', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
testExtract();
