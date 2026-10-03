import { BenefitMatch } from './types';

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b(is|are|was|were)\s+eligible\b/gi, replacement: 'may be applicable' },
  { pattern: /\beligibility\b/gi, replacement: 'applicability' },
  { pattern: /\beligible\b/gi, replacement: 'potentially applicable' },
  { pattern: /\b(is|are|was|were)\s+approved\b/gi, replacement: 'is provisionally identified' },
  { pattern: /\bapproved\b/gi, replacement: 'provisionally identified' },
  { pattern: /\bapproval\b/gi, replacement: 'provisional identification' },
  { pattern: /\b(is|are|was|were)\s+rejected\b/gi, replacement: 'may not apply' },
  { pattern: /\brejected\b/gi, replacement: 'not indicated' },
  { pattern: /\brejection\b/gi, replacement: 'non-applicability' },
  { pattern: /\b(is|are|was|were)\s+entitled\b/gi, replacement: 'may be eligible for support' },
  { pattern: /\bentitled\b/gi, replacement: 'potentially applicable' },
  { pattern: /\bentitlement(s)?\b/gi, replacement: 'support measure$1' },
];

export function sanitizeText(text: string): string {
  if (!text) return '';
  let cleaned = text;
  for (const { pattern, replacement } of FORBIDDEN_PATTERNS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  // Also clean up any lingering TODO_VERIFY placeholders
  cleaned = cleaned.replace(/TODO_VERIFY[A-Z0-9_]*/g, 'details to be confirmed with the office');
  return cleaned;
}

export function safetyPostProcessor(
  benefits: BenefitMatch[],
  language: string = 'EN'
): { benefits: BenefitMatch[]; disclaimer: string } {
  const sanitizedBenefits: BenefitMatch[] = benefits.map((b) => ({
    id: sanitizeText(b.id),
    title: sanitizeText(b.title),
    why_it_may_apply: sanitizeText(b.why_it_may_apply),
    status: b.status,
    missing_documents: (b.missing_documents || []).map(sanitizeText),
    office: sanitizeText(b.office),
    steps: (b.steps || []).map(sanitizeText),
    source_url: sanitizeText(b.source_url),
  }));

  const disclaimerMap: Record<string, string> = {
    HI: 'अस्वीकरण: यह केवल मार्गदर्शन के लिए है। अंतिम निर्णय संबंधित कार्यालय द्वारा लिया जाता है।',
    MR: 'अस्वीकरण: हे केवळ मार्गदर्शनासाठी आहे. अंतिम निर्णय संबंधित कार्यालयाद्वारे घेतला जातो.',
    EN: 'Disclaimer: This is for guidance only. Final decisions are made by the concerned office.',
  };

  const upperLang = (language || 'EN').toUpperCase();
  const disclaimer = disclaimerMap[upperLang] || disclaimerMap.EN;

  return {
    benefits: sanitizedBenefits,
    disclaimer,
  };
}
