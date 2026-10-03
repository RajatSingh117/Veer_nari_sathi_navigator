"use client";

import { Noto_Sans } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AppProvider, useAppContext, Language } from '@/context/AppContext'
import { I18nProvider, useT } from '@/context/I18nContext'
import { useState, useCallback } from 'react'
import SaathiChat from '@/components/SaathiChat'

const notoSans = Noto_Sans({
  subsets: ['latin', 'devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans',
})

function HeaderClient() {
  const pathname = usePathname();
  const { state, setLanguage } = useAppContext();
  const { t, lang } = useT();
  const [speaking, setSpeaking] = useState(false);
  const [fontSize, setFontSize] = useState(1);
  const [voiceNotice, setVoiceNotice] = useState('');

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/questions', label: t('nav.questions') },
    { href: '/upload', label: t('nav.upload') },
    { href: '/results', label: t('nav.results') },
    { href: '/checklist', label: t('nav.checklist') },
  ];

  const langs: { code: Language; label: string }[] = [
    { code: 'EN', label: 'EN' },
    { code: 'HI', label: 'हिन्दी' },
    { code: 'MR', label: 'मराठी' },
  ];

  const handleTextSize = (size: number) => {
    setFontSize(size);
    const scale = size === 0 ? 0.9 : size === 2 ? 1.15 : 1;
    document.documentElement.style.fontSize = `${scale * 16}px`;
  };

  const handleListen = useCallback(() => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const main = document.querySelector('main');
    if (!main) return;
    const text = main.innerText.slice(0, 2000);
    const utterance = new SpeechSynthesisUtterance(text);
    const langCode = lang === 'HI' ? 'hi-IN' : lang === 'MR' ? 'mr-IN' : 'en-IN';
    utterance.lang = langCode;
    utterance.rate = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const hasVoice = voices.some(v => v.lang.startsWith(langCode.split('-')[0]));
    if (!hasVoice && lang !== 'EN') {
      setVoiceNotice(t('speech.noVoice'));
      setTimeout(() => setVoiceNotice(''), 4000);
    }

    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, [speaking, lang, t]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
      {voiceNotice && (
        <div className="bg-secondary-fixed text-on-secondary-fixed text-center py-1 font-caption">{voiceNotice}</div>
      )}
      <div className="w-full h-[3px] flex">
        <div className="h-full flex-1 bg-[#FF9933]"></div>
        <div className="h-full flex-1 bg-[#FFFFFF]"></div>
        <div className="h-full flex-1 bg-[#138808]"></div>
      </div>
      <div className="bg-primary text-on-primary py-space-xs px-margin-mobile lg:px-margin">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-space-xs text-caption font-caption">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary-container text-[18px]">verified</span>
            <span className="font-label-md text-caption text-surface-container-highest">{t('header.desw')}</span>
          </div>
          <div className="flex items-center gap-space-sm">
            <div className="flex items-center gap-1 bg-primary-container px-2 py-0.5 rounded">
              <span className="text-caption font-caption text-on-primary-container">{t('header.textSize')}</span>
              {[0, 1, 2].map(s => (
                <button key={s} onClick={() => handleTextSize(s)}
                  className={`px-1.5 py-0.5 rounded text-caption font-label-md transition-colors ${fontSize === s ? 'bg-surface-variant text-on-surface' : 'text-on-primary hover:bg-surface-variant hover:text-on-surface'}`}
                  type="button">{s === 0 ? 'A-' : s === 2 ? 'A+' : 'A'}</button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {langs.map(l => (
                <button key={l.code} onClick={() => setLanguage(l.code)}
                  className={`px-2 py-0.5 rounded text-caption font-label-md transition-colors ${state.language === l.code ? 'bg-secondary-container text-on-secondary-container' : 'text-on-primary hover:bg-primary-container'}`}
                  type="button">{l.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="h-28 max-w-7xl mx-auto px-margin-mobile lg:px-margin flex items-center justify-between gap-space-md">
        <Link href="/" className="flex items-center gap-space-sm group">
          <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-secondary-container shadow-[0_1px_8px_rgba(0,0,0,0.08)] group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[28px]">local_fire_department</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-sm md:text-headline-md text-primary leading-tight tracking-tight">{t('app.name')}</span>
            <span className="font-label-md text-caption md:text-label-md text-on-surface-variant tracking-normal">{t('app.tagline')}</span>
          </div>
        </Link>
        <button onClick={handleListen}
          className={`flex items-center gap-2 h-14 px-space-md rounded-lg font-label-lg text-label-lg shadow-[0_1px_8px_rgba(0,0,0,0.06)] transition-colors ${speaking ? 'bg-error text-on-error' : 'bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-container hover:text-on-secondary-container'}`}
          type="button" aria-label={speaking ? t('header.stop') : t('header.listen')}>
          <span className="material-symbols-outlined text-[24px]">{speaking ? 'stop' : 'volume_up'}</span>
          <span>{speaking ? t('header.stop') : t('header.listen')}</span>
        </button>
      </div>
      <div className="bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin">
          <nav className="flex items-center gap-space-xs overflow-x-auto py-2">
            {navLinks.map(link => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link key={link.href}
                  className={`shrink-0 px-space-md py-2.5 rounded-lg font-label-lg text-label-lg transition-colors ${isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container focus:bg-primary-container focus:text-on-primary'}`}
                  href={link.href}>{link.label}</Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
        <title>Veer Nari Saathi</title>
        <meta name="description" content="Armed Forces Family Navigator" />
      </head>
      <body className={`${notoSans.variable} ${notoSans.className} bg-surface text-on-surface antialiased`}>
        <AppProvider>
          <I18nProvider>
            <HeaderClient />
            {children}
            <SaathiChat />
          </I18nProvider>
        </AppProvider>
      </body>
    </html>
  );
}
