import entitlementsData from '@/data/entitlements.json';

export type LocalizedText = {
  en: string;
  hi: string;
  mr: string;
};

export type Entitlement = {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  applies_when: string;
  documents_required: string[];
  office: string;
  steps: string[];
  source_url: string;
  last_verified: string;
};

type Language = 'EN' | 'HI' | 'MR';

export function getEntitlements(): Entitlement[] {
  return entitlementsData as Entitlement[];
}

export function getEntitlementById(id: string): Entitlement | undefined {
  return getEntitlements().find((e) => e.id === id);
}

/** Return a localized field from a LocalizedText object, with English fallback */
export function localize(text: LocalizedText, lang: Language): string {
  const key = lang.toLowerCase() as 'en' | 'hi' | 'mr';
  return text[key] || text.en;
}
