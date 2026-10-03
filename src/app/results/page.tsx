"use client";

import Link from 'next/link';
import { useState, useEffect, useCallback, useTransition } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useT } from '@/context/I18nContext';
import { BenefitMatch } from '@/lib/types';

export default function ResultsPage() {
  const [filter, setFilter] = useState<'all' | 'ready' | 'missing_docs'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disclaimerText, setDisclaimerText] = useState<string>('');
  const [meta, setMeta] = useState<{ path: 'gemini' | 'mock_fallback'; model: string } | null>(null);
  const { state, setBenefits } = useAppContext();
  const { t, lang } = useT();
  const [, startTransition] = useTransition();

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: state.answers,
          confirmedFields: state.fields,
          language: lang,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      if (!data.success || !Array.isArray(data.benefits)) {
        throw new Error('Invalid match response received from server');
      }

      setBenefits(data.benefits);
      if (data.meta) {
        setMeta(data.meta);
      }
      if (data.disclaimer) {
        setDisclaimerText(data.disclaimer);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Failed to load matches:', err);
      if (err.name === 'AbortError') {
        setError('Evaluation timed out after 90 seconds. The server took too long to evaluate benefits. Please click Retry.');
      } else {
        setError(err.message || 'Failed to match entitlements. Please click Retry.');
      }
    } finally {
      setLoading(false);
    }
  }, [state.answers, state.fields, lang, setBenefits]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const benefits: BenefitMatch[] = state.benefits || [];

  const readyCount = benefits.filter((b) => b.status === 'ready').length;
  const missingCount = benefits.filter((b) => b.status === 'missing_docs').length;

  const filtered = filter === 'all'
    ? benefits
    : benefits.filter((b) => b.status === filter);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'HI' ? 'hi-IN' : lang === 'MR' ? 'mr-IN' : 'en-IN';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  return (
    <main className="w-full pt-44 bg-surface min-h-[calc(100vh-200px)] pb-16">
      <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin">

        {/* Header Banner */}
        <div className="w-full bg-primary rounded-xl overflow-hidden shadow-md mb-space-lg">
          <div className="w-full h-1.5 flex">
            <div className="h-full flex-1 bg-secondary-container"></div>
            <div className="h-full flex-1 bg-surface-container-lowest"></div>
            <div className="h-full flex-1 bg-tertiary-fixed-dim"></div>
          </div>
          <div className="p-space-md lg:p-space-lg flex flex-col gap-space-sm text-on-primary">
            <h1 className="font-headline-xl text-headline-xl tracking-tight text-on-primary mb-2">
              {loading ? t('results.loadingTitle') : t('results.title', { n: String(benefits.length) })}
            </h1>
            <p className="font-body-xl text-body-xl text-surface-container-highest font-normal leading-relaxed">
              {loading ? t('results.loadingSubtitle') : t('results.subtitle')}
            </p>
            <p className="text-secondary-fixed font-label-md mt-1">
              {disclaimerText || t('disclaimer')}
            </p>
            {meta && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-primary-container text-caption text-surface-container-highest">
                <span className="material-symbols-outlined text-[16px] text-secondary-container">neurology</span>
                <span>
                  Engine: <strong className="text-secondary-fixed">{meta.path === 'gemini' ? 'Gemini AI' : 'Rule-based Knowledge Base'}</strong> ({meta.model})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-12 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant text-center gap-4 animate-pulse">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <h2 className="font-headline-md text-primary">{t('results.loadingTitle')}</h2>
            <p className="font-body-lg text-on-surface-variant max-w-xl">{t('results.loadingSubtitle')}</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-8 bg-error-container text-on-error-container rounded-xl shadow-md border border-error flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[32px] text-error">error</span>
              <h2 className="font-headline-md">{t('results.errorTitle')}</h2>
            </div>
            <p className="font-body-lg text-on-error-container">{error || t('results.errorSubtitle')}</p>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <button
                type="button"
                onClick={() => fetchMatches()}
                className="px-6 py-3 rounded-lg bg-primary text-on-primary font-label-lg hover:bg-[#2A3F5F] transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">refresh</span>
                {t('results.retryBtn')}
              </button>
              <Link
                href="/questions"
                className="px-6 py-3 rounded-lg bg-surface-container text-primary font-label-lg hover:bg-surface-variant transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">edit</span>
                <span>{t('questions.back')}</span>
              </Link>
            </div>
          </div>
        )}

        {/* Empty State: Suggest ZSWO */}
        {!loading && !error && benefits.length === 0 && (
          <div className="flex flex-col gap-6">
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-md border border-outline-variant text-center flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-[54px] text-on-surface-variant">info</span>
              <h2 className="font-headline-lg text-primary">{t('results.emptyTitle')}</h2>
              <p className="font-body-lg text-on-surface-variant max-w-2xl">{t('results.emptySubtitle')}</p>
            </div>

            {/* ZSWO Guidance Highlight */}
            <div className="bg-surface-container-low border-2 border-secondary p-8 rounded-xl shadow-md flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[28px]">account_balance</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-headline-md text-primary">{t('results.zswoTitle')}</h3>
                  <p className="font-body-lg text-on-surface leading-relaxed">{t('results.zswoDesc')}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/questions"
                  className="px-6 py-3.5 rounded-lg bg-surface-container text-primary font-label-lg hover:bg-surface-variant transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                  <span>{t('questions.back')}</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Populated State */}
        {!loading && !error && benefits.length > 0 && (
          <>
            {/* Filter Tabs */}
            <div className="bg-surface-container-low p-2 rounded-xl flex flex-wrap items-center gap-2 shadow-sm mb-space-md">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-space-md py-3 rounded-lg font-label-lg text-label-lg transition-colors focus:ring-2 focus:ring-[#D97706] ${
                  filter === 'all'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                {t('results.filterAll')} ({benefits.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('ready')}
                className={`px-space-md py-3 rounded-lg font-label-lg text-label-lg transition-colors focus:ring-2 focus:ring-[#D97706] ${
                  filter === 'ready'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                {t('results.filterReady')} ({readyCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('missing_docs')}
                className={`px-space-md py-3 rounded-lg font-label-lg text-label-lg transition-colors focus:ring-2 focus:ring-[#D97706] ${
                  filter === 'missing_docs'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                {t('results.filterMissingDocs')} ({missingCount})
              </button>
            </div>

            {/* List of Benefit Cards */}
            <div className="flex flex-col gap-space-md">
              {filtered.map((benefit) => (
                <article
                  key={benefit.id}
                  className="bg-surface-container-lowest rounded-xl p-space-md lg:p-space-lg shadow-sm hover:shadow-md transition-shadow flex flex-col gap-space-sm border border-outline-variant"
                >
                  <div className="flex flex-wrap items-start justify-between gap-space-xs">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`px-3 py-1 rounded font-label-md text-caption flex items-center gap-1.5 w-fit ${
                          benefit.status === 'ready'
                            ? 'bg-[#ECFDF5] text-[#065F46]'
                            : 'bg-[#FFFBEB] text-[#92400E]'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            benefit.status === 'ready' ? 'bg-[#138808]' : 'bg-[#D97706]'
                          }`}
                        ></span>
                        {benefit.status === 'ready' ? t('results.readyToApply') : t('results.missingDoc')}
                      </span>
                      <h2 className="font-headline-lg text-headline-lg text-primary mt-1">
                        {benefit.title}
                      </h2>
                    </div>

                    <button
                      onClick={() => speak(`${benefit.title}. ${benefit.why_it_may_apply}`)}
                      className="h-10 px-3 rounded-lg bg-secondary-fixed text-on-secondary-fixed font-label-md text-caption flex items-center gap-1.5 hover:bg-secondary-container hover:text-on-secondary-container focus:ring-2 focus:ring-[#D97706] transition-colors"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">volume_up</span>
                      <span>{t('header.listen')}</span>
                    </button>
                  </div>

                  {/* Why it may apply */}
                  <p className="font-body-xl text-body-xl text-on-surface leading-relaxed">
                    {benefit.why_it_may_apply}
                  </p>

                  {/* Missing Documents Alert (if any) */}
                  {benefit.status === 'missing_docs' && benefit.missing_documents?.length > 0 && (
                    <div className="bg-[#FFFBEB] border border-[#FDE68A] p-3 rounded-lg flex flex-col gap-1">
                      <span className="font-label-md text-caption text-[#92400E] font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                        {t('results.missingDocsLabel')}
                      </span>
                      <ul className="list-disc list-inside text-caption text-[#92400E] pl-1">
                        {benefit.missing_documents.map((doc, idx) => (
                          <li key={idx}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Office & Action Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pt-2 border-t border-surface-container-low">
                    <div className="flex flex-col">
                      <span className="font-caption text-caption text-on-surface-variant">
                        {t('results.office')}
                      </span>
                      <span className="font-label-md text-label-md text-primary">
                        {benefit.office}
                      </span>
                    </div>

                    <Link
                      href={`/benefits/${benefit.id}`}
                      className="h-14 px-space-md rounded-lg bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 hover:bg-[#2A3F5F] active:scale-[0.98] focus:ring-2 focus:ring-[#D97706] transition-all"
                    >
                      <span>{t('results.openGuide')}</span>
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}