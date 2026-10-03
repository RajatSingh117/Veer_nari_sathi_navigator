"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { useT } from '@/context/I18nContext';
import { getEntitlementById, localize } from '@/lib/entitlements';
import { BenefitMatch } from '@/lib/types';

export default function BenefitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const benefitId = (params?.id as string) || '';

  const { state, cacheLetter } = useAppContext();
  const { t, lang } = useT();

  // 1. Read selected benefit from client state
  const selectedBenefit: BenefitMatch | undefined = useMemo(() => {
    if (state.benefits && state.benefits.length > 0) {
      const found = state.benefits.find((b) => b.id === benefitId);
      if (found) return found;
    }
    // Fallback if client state not yet populated (e.g. direct deep link/refresh)
    const raw = getEntitlementById(benefitId);
    if (raw) {
      return {
        id: raw.id,
        title: localize(raw.title, lang),
        why_it_may_apply: localize(raw.summary, lang),
        status: 'ready',
        missing_documents: [],
        office: raw.office.includes('TODO_VERIFY') ? 'details to be confirmed with the office' : raw.office,
        steps: (raw.steps || []).map((s) => s.includes('TODO_VERIFY') ? 'details to be confirmed with the office' : s),
        source_url: raw.source_url.includes('TODO_VERIFY') ? 'details to be confirmed with the office' : raw.source_url,
      };
    }
    return undefined;
  }, [state.benefits, benefitId, lang]);

  const [letterText, setLetterText] = useState('');
  const [loadingLetter, setLoadingLetter] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [toast, setToast] = useState('');
  const [voiceNotice, setVoiceNotice] = useState('');

  const cacheKey = `${benefitId}_${lang}`;

  // Call /api/letter to generate letter via Gemini (no string template fallback)
  const generateLetter = useCallback(async () => {
    if (!selectedBenefit) return;
    setLoadingLetter(true);
    setLetterError(null);
    try {
      const res = await fetch('/api/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          benefit: selectedBenefit,
          confirmedFields: state.fields || {},
          answers: state.answers || {},
          language: lang,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t('benefit.generationFailed'));
      }
      const data = await res.json();
      if (!data.letter) {
        throw new Error(t('benefit.generationFailed'));
      }
      setLetterText(data.letter);
      cacheLetter(cacheKey, data.letter);
    } catch (err: any) {
      setLetterError(err.message || t('benefit.generationFailed'));
      setLetterText('');
    } finally {
      setLoadingLetter(false);
    }
  }, [selectedBenefit, state.fields, state.answers, lang, cacheKey, cacheLetter, t]);

  // Load from cache or generate on mount / param change
  useEffect(() => {
    if (!selectedBenefit) return;
    const cached = state.cachedLetters?.[cacheKey];
    if (cached) {
      setLetterText(cached);
      setLoadingLetter(false);
      setLetterError(null);
    } else {
      generateLetter();
    }
  }, [cacheKey, selectedBenefit?.id]); // Re-run if benefit or language changes

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleDownloadPdf = async () => {
    if (!letterText) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch('/api/letter/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedBenefit?.title || 'Application Letter',
          letter: letterText,
          language: lang,
        }),
      });
      if (!res.ok) {
        throw new Error('PDF export failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Application_${benefitId}_${lang}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('PDF downloaded successfully');
    } catch (err) {
      showToast(t('benefit.pdfFailed'));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSpeak = useCallback(() => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(letterText.slice(0, 2500));
    const langCode = lang === 'HI' ? 'hi-IN' : lang === 'MR' ? 'mr-IN' : 'en-IN';
    u.lang = langCode;
    u.rate = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const hasVoice = voices.some((v) => v.lang.startsWith(langCode.split('-')[0]));
    if (!hasVoice && lang !== 'EN') {
      setVoiceNotice(t('speech.noVoice'));
      setTimeout(() => setVoiceNotice(''), 4000);
    }
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }, [speaking, letterText, lang, t]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letterText);
      showToast(t('benefit.copied'));
    } catch {
      showToast(t('benefit.copyFailed'));
    }
  };

  if (!selectedBenefit) {
    return (
      <main className="w-full pt-44 bg-surface min-h-[calc(100vh-200px)] pb-12 px-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-6 text-center">
          <h1 className="font-headline-lg text-primary">Benefit Not Found</h1>
          <p className="font-body-lg text-on-surface-variant">
            The requested benefit details could not be found.
          </p>
          <button
            onClick={() => router.push('/results')}
            className="self-center px-6 py-3 rounded-lg bg-primary text-on-primary font-label-md hover:bg-[#2A3F5F] transition-all"
          >
            {t('benefit.backToResults')}
          </button>
        </div>
      </main>
    );
  }

  const isReady = selectedBenefit.status === 'ready';

  return (
    <main className="w-full pt-44 bg-surface min-h-[calc(100vh-200px)] pb-16 px-4">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        {toast && (
          <div className="fixed top-48 right-6 z-50 bg-primary text-on-primary px-6 py-3 rounded-lg shadow-xl font-label-md animate-bounce">
            {toast}
          </div>
        )}
        {voiceNotice && (
          <div className="fixed top-48 left-6 z-50 bg-secondary-fixed text-on-secondary-fixed px-6 py-3 rounded-lg shadow-xl font-label-md">
            {voiceNotice}
          </div>
        )}

        <button
          onClick={() => router.back()}
          className="self-start flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container text-primary font-label-md hover:bg-surface-variant focus:ring-2 focus:ring-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          {t('benefit.backToResults')}
        </button>

        {/* Hero Card */}
        <div className="bg-primary text-on-primary p-8 rounded-xl shadow-md flex flex-col gap-3">
          <span
            className={`px-3 py-1 rounded font-label-md text-caption inline-block w-fit ${
              isReady ? 'bg-[#ECFDF5] text-[#065F46]' : 'bg-[#FFFBEB] text-[#92400E]'
            }`}
          >
            {isReady ? t('results.readyToApply') : t('results.missingDoc')}
          </span>
          <h1 className="font-headline-xl text-on-primary">{selectedBenefit.title}</h1>
          <p className="font-body-lg text-surface-container-highest leading-relaxed">
            {selectedBenefit.why_it_may_apply}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-3 border-t border-primary-container text-caption text-secondary-fixed">
            <span className="font-semibold">{t('results.office')}:</span>
            <span>{selectedBenefit.office}</span>
          </div>
          <p className="text-secondary-fixed font-label-md mt-1">{t('disclaimer')}</p>
        </div>

        {/* Missing Documents Alert if applicable */}
        {selectedBenefit.missing_documents && selectedBenefit.missing_documents.length > 0 && (
          <div className="bg-[#FFFBEB] border-2 border-[#FDE68A] p-6 rounded-xl shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[#92400E]">
              <span className="material-symbols-outlined text-[24px]">pending_actions</span>
              <h2 className="font-headline-sm font-bold">{t('results.missingDocsLabel')}</h2>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-body-md text-[#92400E]">
              {selectedBenefit.missing_documents.map((doc, idx) => (
                <li key={idx} className="font-medium">{doc}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Steps to Apply */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-md border border-outline-variant">
          <h2 className="font-headline-md text-primary mb-4">{t('benefit.stepsTitle')}</h2>
          <ol className="flex flex-col gap-4">
            {selectedBenefit.steps && selectedBenefit.steps.length > 0 ? (
              selectedBenefit.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low">
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-caption shrink-0">
                    {i + 1}
                  </div>
                  <span className="font-body-lg text-on-surface">{step}</span>
                </li>
              ))
            ) : (
              <li className="p-3 rounded-lg bg-surface-container-low font-body-lg text-on-surface">
                {t('results.zswoDesc')}
              </li>
            )}
          </ol>
        </div>

        {/* Letter Draft Editor */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-md border border-outline-variant">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="font-headline-md text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">description</span>
              {t('benefit.letterTitle')}
            </h2>
            {!loadingLetter && !letterError && letterText && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-4 py-2 rounded-lg font-label-md flex items-center gap-1.5 transition-colors focus:ring-2 focus:ring-[#D97706] ${
                    isEditing
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-surface-container text-primary hover:bg-surface-variant'
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isEditing ? 'check' : 'edit'}
                  </span>
                  {isEditing ? t('benefit.doneEditing') : t('benefit.edit')}
                </button>
                <button
                  onClick={handleSpeak}
                  className={`px-4 py-2 rounded-lg font-label-md flex items-center gap-1.5 transition-colors focus:ring-2 focus:ring-[#D97706] ${
                    speaking
                      ? 'bg-error text-on-error'
                      : 'bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-container'
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {speaking ? 'stop' : 'volume_up'}
                  </span>
                  {speaking ? t('header.stop') : t('header.listen')}
                </button>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-lg bg-surface-container text-primary font-label-md flex items-center gap-1.5 hover:bg-surface-variant focus:ring-2 focus:ring-[#D97706] transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  {t('benefit.copy')}
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md flex items-center gap-1.5 hover:bg-[#2A3F5F] active:scale-[0.98] focus:ring-2 focus:ring-[#D97706] transition-all disabled:opacity-60"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {downloadingPdf ? 'hourglass_top' : 'picture_as_pdf'}
                  </span>
                  {downloadingPdf ? t('benefit.generatingPdf') : t('benefit.downloadPdf')}
                </button>
              </div>
            )}
          </div>

          {loadingLetter ? (
            <div className="flex flex-col items-center justify-center p-12 bg-surface-container-low rounded-lg border border-outline-variant gap-4 text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="font-headline-sm text-primary font-semibold">
                  {t('benefit.generatingLetter')}
                </p>
                <p className="font-body-md text-on-surface-variant mt-1">
                  Writing formal, respectful Indian government-style letter using confirmed service details...
                </p>
              </div>
            </div>
          ) : letterError ? (
            <div className="flex flex-col items-center justify-center p-8 bg-[#FEF2F2] border-2 border-[#FECACA] rounded-lg gap-4 text-center">
              <span className="material-symbols-outlined text-[40px] text-[#DC2626]">error</span>
              <div>
                <p className="font-headline-sm text-[#991B1B] font-bold">
                  {t('benefit.generationFailed')}
                </p>
                <p className="font-body-md text-[#B91C1C] mt-1 max-w-md">
                  {letterError}
                </p>
              </div>
              <button
                onClick={generateLetter}
                className="px-6 py-2.5 rounded-lg bg-[#DC2626] text-white font-label-md hover:bg-[#B91C1C] transition-colors flex items-center gap-2 shadow-sm"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                {t('benefit.retryGeneration')}
              </button>
            </div>
          ) : isEditing ? (
            <textarea
              value={letterText}
              onChange={(e) => setLetterText(e.target.value)}
              className="w-full min-h-[500px] p-6 border-2 border-secondary-container rounded-lg font-body-md text-on-surface bg-surface-container-low focus:ring-2 focus:ring-[#D97706] focus:outline-none resize-y"
              spellCheck
            />
          ) : (
            <pre className="w-full p-6 rounded-lg bg-surface-container-low font-body-md text-on-surface whitespace-pre-wrap leading-relaxed border border-outline-variant font-sans">
              {letterText}
            </pre>
          )}
        </div>
      </div>
    </main>
  );
}