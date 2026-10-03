"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { useT } from '@/context/I18nContext';

const Q_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'];
const Q_FIELDS = ['relationship', 'branch', 'causeOfDeath', 'state', 'dependentChildren'];
const Q_OPTIONS: Record<string, string[]> = {
  q1: ['veer_nari', 'parents', 'child'],
  q2: ['army', 'navy', 'airforce'],
  q3: ['battle', 'physical', 'natural'],
  q4: ['maharashtra', 'himachal', 'punjab', 'other'],
  q5: ['0', '1', '2', '3+'],
};

export default function QuestionsPage() {
  const router = useRouter();
  const { state, updateAnswers } = useAppContext();
  const { t, lang } = useT();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string>(state.answers[Q_FIELDS[0]] || '');

  const qKey = Q_KEYS[step];
  const fieldKey = Q_FIELDS[step];
  const options = Q_OPTIONS[qKey];
  const progress = ((step + 1) / Q_KEYS.length) * 100;
  const isLast = step === Q_KEYS.length - 1;

  const nextQKey = step + 1 < Q_KEYS.length ? Q_KEYS[step + 1] : null;
  const rawNextTitle = nextQKey ? t(`questions.${nextQKey}.title`) : '';
  const nextTitle = rawNextTitle && !rawNextTitle.startsWith('questions.') ? rawNextTitle : '';

  const nextButtonLabel = isLast
    ? t('questions.uploadDocs')
    : nextTitle
      ? t('questions.next', { nextTitle })
      : t('questions.nextStep') || 'Next Step';

  const handleNext = () => {
    if (!selected) return;
    updateAnswers({ [fieldKey]: selected });
    if (isLast) { router.push('/upload'); return; }
    const ns = step + 1;
    setStep(ns);
    setSelected(state.answers[Q_FIELDS[ns]] || '');
  };

  const handleBack = () => {
    if (step === 0) { router.push('/'); return; }
    updateAnswers({ [fieldKey]: selected });
    const ps = step - 1;
    setStep(ps);
    setSelected(state.answers[Q_FIELDS[ps]] || '');
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'HI' ? 'hi-IN' : lang === 'MR' ? 'mr-IN' : 'en-IN';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  return (
    <main className="w-full pt-44 bg-surface min-h-[calc(100vh-200px)]">
      <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-md lg:py-space-lg w-full">

        {/* Progress */}
        <div className="w-full bg-surface-container-lowest p-space-md lg:p-space-lg rounded-xl shadow-md mb-space-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm mb-space-sm">
            <div className="flex flex-col">
              <span className="font-label-lg text-label-md text-secondary font-semibold uppercase tracking-wider">
                {t('questions.stepOf', { current: String(step + 1), total: String(Q_KEYS.length) })}
              </span>
              <h1 className="font-headline-lg text-headline-sm md:text-headline-lg text-primary">
                {t(`questions.${qKey}.title`)}
              </h1>
            </div>
            <button onClick={() => speak(t(`questions.${qKey}.question`))}
              className="shrink-0 flex items-center justify-center gap-2 h-14 px-space-md rounded-lg bg-secondary-fixed text-on-secondary-fixed font-label-lg text-label-lg hover:bg-secondary-container hover:text-on-secondary-container focus:ring-2 focus:ring-[#D97706] transition-colors shadow-sm" type="button">
              <span className="material-symbols-outlined text-[24px]">volume_up</span>
              <span>{t('questions.readAloud')}</span>
            </button>
          </div>
          <div className="w-full">
            <div className="flex items-center justify-between text-caption font-label-md text-on-surface-variant mb-2">
              <span>{t('questions.progress', { pct: String(Math.round(progress)) })}</span>
              <span>{t('questions.remaining', { n: String(Q_KEYS.length - step - 1) })}</span>
            </div>
            <div className="w-full h-4 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-secondary-container rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          <div className="lg:col-span-8 flex flex-col gap-space-md">

            {/* Question */}
            <div className="bg-surface-container-lowest p-space-md lg:p-space-lg rounded-xl shadow-md">
              <div className="flex items-start gap-space-sm">
                <div className="w-12 h-12 rounded-xl bg-primary text-secondary-fixed flex items-center justify-center shrink-0">
                  <span className="font-headline-md text-headline-sm">Q{step + 1}</span>
                </div>
                <h2 className="font-headline-lg text-headline-sm md:text-headline-lg text-primary leading-snug">
                  {t(`questions.${qKey}.question`)}
                </h2>
              </div>
            </div>

            {/* Options */}
            <fieldset className="flex flex-col gap-space-sm">
              <legend className="sr-only">{t(`questions.${qKey}.question`)}</legend>
              {options.map(opt => {
                const isSel = selected === opt;
                const label = t(`questions.${qKey}.opt.${opt}`);
                const badge = t(`questions.${qKey}.opt.${opt}.badge`);
                const hasBadge = badge !== `questions.${qKey}.opt.${opt}.badge`;
                return (
                  <label key={opt}
                    className={`relative flex items-center gap-space-md p-space-md rounded-xl cursor-pointer shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#D97706] ${isSel ? 'bg-surface-container-low outline outline-3 outline-[#fe932c]' : 'bg-surface-container-lowest hover:bg-surface-container-low'}`}>
                    <input className="sr-only peer" name={fieldKey} type="radio" value={opt} checked={isSel} onChange={() => setSelected(opt)} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${isSel ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-primary'}`}>
                      {isSel ? <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span> : <span className="w-3.5 h-3.5 rounded-full"></span>}
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-headline-sm text-body-xl md:text-headline-sm text-primary">{label}</span>
                          {hasBadge && <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-caption uppercase tracking-wider">{badge}</span>}
                        </div>
                      </div>
                      <button onClick={(e) => { e.preventDefault(); speak(label); }}
                        className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-secondary font-label-md text-caption shadow-sm hover:bg-secondary-fixed focus:ring-2 focus:ring-[#D97706] transition-colors" type="button">
                        <span className="material-symbols-outlined text-[18px]">volume_up</span>
                        <span>{t('questions.readAloud')}</span>
                      </button>
                    </div>
                  </label>
                );
              })}
            </fieldset>

            {/* Nav */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm pt-space-md">
              <button onClick={handleBack}
                className="h-14 px-space-lg rounded-lg bg-surface-container-highest text-primary font-label-lg text-label-lg hover:bg-surface-container focus:ring-2 focus:ring-primary transition-colors shadow-sm flex items-center justify-center gap-2" type="button">
                <span className="material-symbols-outlined text-[22px]">arrow_back</span>
                <span>{t('questions.back')}</span>
              </button>
              <button onClick={handleNext} disabled={!selected}
                className={`h-16 px-space-lg rounded-lg font-label-lg text-body-xl shadow-md flex items-center justify-center gap-3 transition-all ${selected ? 'bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary active:scale-[0.98]' : 'bg-surface-container-highest text-outline cursor-not-allowed opacity-60'}`} type="button">
                <span>{nextButtonLabel}</span>
                <span className="material-symbols-outlined text-[24px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-md">
              <div className="flex items-center justify-between pb-space-sm mb-space-sm">
                <span className="font-label-lg text-label-md text-primary font-bold">{t('questions.guidedPath')}</span>
                <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-caption text-caption">{t('questions.stepsTotal', { n: String(Q_KEYS.length) })}</span>
              </div>
              <ol className="flex flex-col gap-space-sm">
                {Q_KEYS.map((qk, i) => {
                  const done = i < step;
                  const active = i === step;
                  return (
                    <li key={qk} className={`flex items-start gap-3 p-3 rounded-lg ${active ? 'bg-surface-container-low' : ''} ${!active && !done ? 'opacity-60' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-caption shrink-0 ${done ? 'bg-[#138808] text-white' : active ? 'bg-primary text-secondary-container' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                        {done ? <span className="material-symbols-outlined text-[16px]">check</span> : i + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-label-md text-label-md ${active ? 'text-primary font-bold' : 'text-on-surface'}`}>{i + 1}. {t(`questions.${qk}.title`)}</span>
                        {active && <span className="font-caption text-caption text-secondary font-semibold">{t('questions.currentStep')}</span>}
                        {done && state.answers[Q_FIELDS[i]] && <span className="font-caption text-caption text-[#065F46]">✓ {state.answers[Q_FIELDS[i]]}</span>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
            <div className="bg-primary text-on-primary p-space-md rounded-xl shadow-md flex flex-col gap-space-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary-container text-[24px]">account_balance</span>
                <span className="font-label-lg text-label-md text-secondary-fixed">{t('questions.liveGuidance')}</span>
              </div>
              <p className="font-body-md text-caption text-inverse-on-surface leading-relaxed">{t('questions.liveGuidanceDesc')}</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
