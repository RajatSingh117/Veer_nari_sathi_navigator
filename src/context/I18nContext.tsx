"use client";

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useAppContext, Language } from '@/context/AppContext';

import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import mr from '@/locales/mr.json';

type Locale = Record<string, string>;
const locales: Record<Language, Locale> = { EN: en, HI: hi, MR: mr };

type I18nContextType = {
  t: (key: string, params?: Record<string, string | number>) => string;
  lang: Language;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { state } = useAppContext();
  const lang = state.language;

  // Set <html lang> attribute
  useEffect(() => {
    const htmlLang = lang === 'HI' ? 'hi' : lang === 'MR' ? 'mr' : 'en';
    document.documentElement.lang = htmlLang;
  }, [lang]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let str = locales[lang]?.[key] || locales.EN[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return str;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ t, lang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used within I18nProvider');
  return ctx;
}
