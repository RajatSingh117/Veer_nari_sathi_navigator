"use client";

import { useState, useEffect } from 'react';
import { useT } from '@/context/I18nContext';

const CHECKLIST_IDS = [
  { id: 'ck-1', category: 'Documents' },
  { id: 'ck-2', category: 'Documents' },
  { id: 'ck-3', category: 'Documents' },
  { id: 'ck-4', category: 'Documents' },
  { id: 'ck-5', category: 'Identity' },
  { id: 'ck-6', category: 'Steps' },
  { id: 'ck-7', category: 'Steps' },
  { id: 'ck-8', category: 'Steps' },
  { id: 'ck-9', category: 'Steps' },
  { id: 'ck-10', category: 'Follow-up' },
];

const CAT_KEYS: Record<string, string> = {
  'Documents': 'checklist.catDocuments',
  'Identity': 'checklist.catDocuments',
  'Steps': 'checklist.catSteps',
  'Follow-up': 'checklist.catFollowup',
};

const CAT_ICONS: Record<string, string> = {
  'Documents': 'folder', 'Identity': 'folder', 'Steps': 'checklist', 'Follow-up': 'notifications',
};

export default function ChecklistPage() {
  const { t } = useT();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [reminders, setReminders] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = sessionStorage.getItem('veerNariChecklist');
    if (saved) { try { const p = JSON.parse(saved); setChecked(p.checked || {}); setReminders(p.reminders || {}); } catch {} }
  }, []);

  useEffect(() => { sessionStorage.setItem('veerNariChecklist', JSON.stringify({ checked, reminders })); }, [checked, reminders]);

  const toggleCheck = (id: string) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const setReminder = (id: string, date: string) => setReminders(prev => ({ ...prev, [id]: date }));

  const completedCount = Object.values(checked).filter(Boolean).length;
  const totalCount = CHECKLIST_IDS.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  const categories = [...new Set(CHECKLIST_IDS.map(i => i.category))];

  return (
    <main className="w-full pt-44 bg-surface min-h-[calc(100vh-200px)] pb-12 px-4">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-md border border-outline-variant">
          <h1 className="font-headline-xl text-primary mb-2">{t('checklist.title')}</h1>
          <p className="font-body-lg text-on-surface-variant">{t('checklist.subtitle')}</p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-md flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
              <path className="text-surface-container-highest" stroke="currentColor" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-[#138808]" stroke="currentColor" strokeWidth="3" strokeDasharray={`${percentage}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-headline-sm text-primary">{percentage}%</span>
          </div>
          <div>
            <p className="font-headline-md text-primary">{t('checklist.completed', { done: String(completedCount), total: String(totalCount) })}</p>
            <p className="font-body-md text-on-surface-variant">{t('checklist.encouragement')}</p>
          </div>
        </div>

        {categories.map(cat => (
          <div key={cat} className="bg-surface-container-lowest p-6 rounded-xl shadow-md border border-outline-variant">
            <h2 className="font-headline-sm text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px]">{CAT_ICONS[cat]}</span>
              {t(CAT_KEYS[cat])}
            </h2>
            <div className="flex flex-col gap-3">
              {CHECKLIST_IDS.filter(i => i.category === cat).map(item => (
                <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg transition-colors ${checked[item.id] ? 'bg-[#ECFDF5]' : 'bg-surface-container-low hover:bg-surface-container'}`}>
                  <label className="flex items-center gap-3 flex-1 cursor-pointer">
                    <input type="checkbox" checked={!!checked[item.id]} onChange={() => toggleCheck(item.id)} className="w-6 h-6 rounded accent-primary cursor-pointer" />
                    <span className={`font-body-lg ${checked[item.id] ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                      {t(`checklist.item.${item.id}`)}
                    </span>
                  </label>
                  <div className="flex items-center gap-2 shrink-0">
                    <input type="date" value={reminders[item.id] || ''} onChange={e => setReminder(item.id, e.target.value)}
                      className="px-3 py-2 rounded-lg border border-outline-variant text-caption font-body-md bg-surface-container-lowest focus:ring-2 focus:ring-[#D97706] focus:outline-none" />
                    {reminders[item.id] && <span className="text-caption text-secondary flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">alarm</span>{t('checklist.reminderSet')}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="p-4 rounded-lg bg-surface-container-low text-on-surface-variant font-caption text-center">{t('disclaimer')}</div>
      </div>
    </main>
  );
}