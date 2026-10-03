import { NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
// @ts-ignore
import * as fontkit from 'fontkit';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const letterText = body.letterText || body.letter;
    const benefitTitle = body.benefitTitle || body.title;
    const language = body.language || 'EN';

    if (!letterText || typeof letterText !== 'string') {
      return NextResponse.json({ error: 'Missing letterText or letter' }, { status: 400 });
    }

    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);

    // Read fonts from public/fonts
    const fontRegularPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');
    const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Bold.ttf');

    if (!fs.existsSync(fontRegularPath) || !fs.existsSync(fontBoldPath)) {
      throw new Error('Noto Sans Devanagari font files not found in public/fonts');
    }

    const fontRegularBytes = fs.readFileSync(fontRegularPath);
    const fontBoldBytes = fs.readFileSync(fontBoldPath);

    const regularFont = await doc.embedFont(fontRegularBytes);
    const boldFont = await doc.embedFont(fontBoldBytes);

    const PAGE_WIDTH = 595.28; // A4
    const PAGE_HEIGHT = 841.89;
    const MARGIN_LEFT = 50;
    const MARGIN_RIGHT = 50;
    const MARGIN_TOP = 50;
    const MARGIN_BOTTOM = 60;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

    let currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let currentY = PAGE_HEIGHT - MARGIN_TOP;

    const drawHeader = (page: typeof currentPage, pageNum: number, totalPagesPlaceholder = '') => {
      // Header banner bar
      page.drawRectangle({
        x: MARGIN_LEFT,
        y: PAGE_HEIGHT - 38,
        width: CONTENT_WIDTH,
        height: 2,
        color: rgb(0.1, 0.16, 0.25), // Navy primary #1B2A41
      });

      page.drawText('VEER NARI SAATHI - OFFICIAL APPLICATION DRAFT', {
        x: MARGIN_LEFT,
        y: PAGE_HEIGHT - 32,
        size: 8,
        font: boldFont,
        color: rgb(0.1, 0.16, 0.25),
      });

      if (benefitTitle) {
        page.drawText(benefitTitle.slice(0, 50), {
          x: MARGIN_LEFT,
          y: PAGE_HEIGHT - 48,
          size: 7,
          font: regularFont,
          color: rgb(0.3, 0.35, 0.45),
        });
      }
    };

    const drawFooter = (page: typeof currentPage) => {
      page.drawRectangle({
        x: MARGIN_LEFT,
        y: MARGIN_BOTTOM + 8,
        width: CONTENT_WIDTH,
        height: 0.5,
        color: rgb(0.7, 0.72, 0.76),
      });

      const disclaimerText =
        'Disclaimer: This draft application is generated for guidance only. Final decisions are made by the concerned office.';
      page.drawText(disclaimerText, {
        x: MARGIN_LEFT,
        y: MARGIN_BOTTOM - 4,
        size: 7,
        font: regularFont,
        color: rgb(0.4, 0.45, 0.5),
      });
    };

    drawHeader(currentPage, 1);
    drawFooter(currentPage);
    currentY = PAGE_HEIGHT - 75;

    // Helper: word-wrap text into lines that fit within CONTENT_WIDTH
    const wrapLine = (textLine: string, fontSize: number): string[] => {
      if (textLine.trim().length === 0) return [''];
      const words = textLine.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine.length === 0 ? word : `${currentLine} ${word}`;
        try {
          const testWidth = regularFont.widthOfTextAtSize(testLine, fontSize);
          if (testWidth <= CONTENT_WIDTH) {
            currentLine = testLine;
          } else {
            if (currentLine.length > 0) lines.push(currentLine);
            currentLine = word;
          }
        } catch {
          // If measurement throws, append safely
          if (currentLine.length > 0) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine.length > 0) lines.push(currentLine);
      return lines;
    };

    const fontSize = 10;
    const lineHeight = 15;

    // Process all raw lines from letter
    const rawParagraphs = letterText.split('\n');

    for (const para of rawParagraphs) {
      const wrappedLines = wrapLine(para, fontSize);

      for (const line of wrappedLines) {
        // Check if page overflow
        if (currentY - lineHeight < MARGIN_BOTTOM + 15) {
          currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          drawHeader(currentPage, doc.getPageCount());
          drawFooter(currentPage);
          currentY = PAGE_HEIGHT - 75;
        }

        if (line.trim().length > 0) {
          const isBoldHeading =
            line.startsWith('Subject:') ||
            line.startsWith('विषय:') ||
            line.startsWith('To,') ||
            line.startsWith('सेवा में,') ||
            line.startsWith('प्रति,');

          currentPage.drawText(line, {
            x: MARGIN_LEFT,
            y: currentY,
            size: fontSize,
            font: isBoldHeading ? boldFont : regularFont,
            color: rgb(0.08, 0.1, 0.15),
          });
        }
        currentY -= lineHeight;
      }
    }

    const pdfBytes = await doc.save();

    const sanitizedTitle = (benefitTitle || 'benefit')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 30);

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="application_letter_${sanitizedTitle}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF document', details: error.message },
      { status: 500 }
    );
  }
}
