"use client";

import { useRouter } from 'next/navigation';
import { useAppContext, Language } from '@/context/AppContext';
import { useT } from '@/context/I18nContext';

export default function Home() {
  const router = useRouter();
  const { state, setLanguage } = useAppContext();
  const { t } = useT();
  const lang = state.language;

  return (
    <main className="w-full pt-44 bg-surface min-h-screen flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-surface-container-lowest p-space-lg rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.08)] border border-outline-variant text-center flex flex-col gap-space-md">
        <div className="bg-error-container text-on-error-container p-3 rounded-lg font-label-md mb-4 border-l-4 border-error">
          <span className="material-symbols-outlined align-middle mr-2">info</span>
          {t('demo.banner')}
        </div>
        <h1 className="font-headline-xl text-primary mb-space-sm leading-tight">{t('app.name')}</h1>
        <p className="font-body-xl text-on-surface-variant">{t('landing.headline')}</p>
        <div className="flex justify-center gap-space-md my-space-md">
          {(['EN', 'HI', 'MR'] as Language[]).map(l => (
            <button key={l} onClick={() => setLanguage(l)}
              className={`px-space-md py-2 rounded-lg font-label-lg transition-colors ${lang === l ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-variant'}`}>
              {l === 'EN' ? 'English' : l === 'HI' ? 'हिन्दी' : 'मराठी'}
            </button>
          ))}
        </div>
        <button onClick={() => router.push('/questions')}
          className="inline-flex items-center justify-center gap-2 h-16 px-space-xl rounded-lg bg-primary text-on-primary font-headline-sm hover:bg-[#2A3F5F] active:ring-4 active:ring-[#D97706] transition-all shadow-md mx-auto min-w-[280px]">
          <span>{t('landing.start')}</span>
          <span className="material-symbols-outlined text-[24px]">arrow_forward</span>
        </button>
        <p className="font-caption text-on-surface-variant mt-4 opacity-80">{t('disclaimer')}</p>
      </div>
    </main>
  );
}
