"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BenefitMatch } from '@/lib/types';

export type Language = 'EN' | 'HI' | 'MR';

export type AppState = {
  language: Language;
  answers: Record<string, string>;
  fields: Record<string, any>;
  benefits?: BenefitMatch[];
  cachedLetters?: Record<string, string>;
};

type AppContextType = {
  state: AppState;
  setLanguage: (lang: Language) => void;
  updateAnswers: (answers: Record<string, string>) => void;
  updateFields: (fields: Record<string, any>) => void;
  setBenefits: (benefits: BenefitMatch[]) => void;
  cacheLetter: (key: string, letter: string) => void;
};

const defaultState: AppState = {
  language: 'EN',
  answers: {},
  fields: {},
  benefits: undefined,
  cachedLetters: {},
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('veerNariState');
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse session state');
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to sessionStorage on state change
  useEffect(() => {
    if (isLoaded) {
      sessionStorage.setItem('veerNariState', JSON.stringify(state));
    }
  }, [state, isLoaded]);

  const setLanguage = (lang: Language) => {
    setState(prev => ({ ...prev, language: lang }));
  };

  const updateAnswers = (answers: Record<string, string>) => {
    setState(prev => ({ ...prev, answers: { ...prev.answers, ...answers } }));
  };

  const updateFields = (fields: Record<string, any>) => {
    setState(prev => ({ ...prev, fields: { ...prev.fields, ...fields } }));
  };

  const setBenefits = (benefits: BenefitMatch[]) => {
    setState(prev => ({ ...prev, benefits }));
  };

  const cacheLetter = (key: string, letter: string) => {
    setState(prev => ({
      ...prev,
      cachedLetters: {
        ...(prev.cachedLetters || {}),
        [key]: letter,
      },
    }));
  };

  return (
    <AppContext.Provider value={{ state, setLanguage, updateAnswers, updateFields, setBenefits, cacheLetter }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
