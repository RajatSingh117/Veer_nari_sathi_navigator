const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('fontkit');
const fs = require('fs');
const path = require('path');

async function testPdf() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const devanagariFontBytes = fs.readFileSync(path.join('public', 'fonts', 'NotoSansDevanagari-Regular.ttf'));
  const devanagariFont = await doc.embedFont(devanagariFontBytes);

  const devanagariBoldBytes = fs.readFileSync(path.join('public', 'fonts', 'NotoSansDevanagari-Bold.ttf'));
  const devanagariBold = await doc.embedFont(devanagariBoldBytes);

  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const hindiText = `सेवा में,
संबंधित कल्याण / अभिलेख कार्यालय

विषय: पारिवारिक पेंशन हेतु औपचारिक आवेदन पत्र

महोदय / महोदया,
सविनय निवेदन है कि स्वर्गीय सूबेदार राहुल शर्मा (सेवा क्रमांक: IND-883921) राष्ट्र सेवा में शहीद हुए थे।
कृपया नियमानुसार आवश्यक कार्यवाही करने की कृपा करें।

अंतिम निर्णय संबंधित कार्यालय के अधीन है।`;

  const marathiText = `प्रति,
संबंधित कल्याण / अभिलेख कार्यालय

विषय: कौटुंबिक निवृत्तीवेतन मंजुरीबाबत अर्ज

महोदय / महोदया,
मी स्वर्गीय सुभेदार राहुल शर्मा यांची पत्नी असून सदर लाभासाठी अर्ज करत आहे.

अंतिम निर्णय संबंधित कार्यालयाच्या अखत्यारीत राहील.`;

  const englishText = `To,
The Concerned Records / Welfare Office

Subject: Application for Family Pension

Respected Sir/Madam,
I hereby submit the application for Family Pension in respect of Late Subedar Rahul Sharma.

The final decision rests with the concerned office.`;

  let y = height - 50;
  page.drawText('ENGLISH APPLICATION LETTER', { x: 50, y, size: 14, font: devanagariBold, color: rgb(0.1, 0.15, 0.25) });
  y -= 25;
  for (const line of englishText.split('\n')) {
    page.drawText(line, { x: 50, y, size: 10, font: devanagariFont, color: rgb(0.1, 0.1, 0.1) });
    y -= 15;
  }

  y -= 20;
  page.drawText('HINDI APPLICATION LETTER (हिन्दी आवेदन पत्र)', { x: 50, y, size: 14, font: devanagariBold, color: rgb(0.1, 0.15, 0.25) });
  y -= 25;
  for (const line of hindiText.split('\n')) {
    page.drawText(line, { x: 50, y, size: 10, font: devanagariFont, color: rgb(0.1, 0.1, 0.1) });
    y -= 15;
  }

  y -= 20;
  page.drawText('MARATHI APPLICATION LETTER (मराठी अर्ज)', { x: 50, y, size: 14, font: devanagariBold, color: rgb(0.1, 0.15, 0.25) });
  y -= 25;
  for (const line of marathiText.split('\n')) {
    page.drawText(line, { x: 50, y, size: 10, font: devanagariFont, color: rgb(0.1, 0.1, 0.1) });
    y -= 15;
  }

  const pdfBytes = await doc.save();
  fs.writeFileSync('scratch/test_output.pdf', pdfBytes);
  console.log('PDF saved successfully, size:', pdfBytes.length);
}

testPdf().catch(console.error);
