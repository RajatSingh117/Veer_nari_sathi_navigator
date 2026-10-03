"use client";

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { useT } from '@/context/I18nContext';

type DocStatus = 'pending' | 'uploading' | 'extracting' | 'success' | 'error';
type ExtractedField = { value: string; confidence: number };
type DocSlot = { key: string; labelKey: string; icon: string; docType: string; required: boolean; status: DocStatus; fileName?: string; error?: string; data?: Record<string, ExtractedField> };

const INITIAL_SLOTS: DocSlot[] = [
  { key: 'service_record', labelKey: 'upload.service_record', icon: 'id_card', docType: 'service_record', required: true, status: 'pending' },
  { key: 'death_certificate', labelKey: 'upload.death_certificate', icon: 'verified', docType: 'death_certificate', required: false, status: 'pending' },
  { key: 'id_proof', labelKey: 'upload.id_proof', icon: 'badge', docType: 'id_proof', required: false, status: 'pending' },
];

export default function UploadPage() {
  const router = useRouter();
  const { updateFields, state } = useAppContext();
  const { t, lang } = useT();
  const [slots, setSlots] = useState<DocSlot[]>(INITIAL_SLOTS);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const updateSlot = (key: string, update: Partial<DocSlot>) => {
    setSlots(prev => prev.map(s => s.key === key ? { ...s, ...update } : s));
  };

  const handleFile = useCallback(async (key: string, file: File) => {
    if (file.size > 8 * 1024 * 1024) { updateSlot(key, { status: 'error', error: t('upload.fileTooLarge') }); return; }
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) { updateSlot(key, { status: 'error', error: t('upload.invalidType') }); return; }
    updateSlot(key, { status: 'uploading', fileName: file.name, error: undefined });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', INITIAL_SLOTS.find(s => s.key === key)!.docType);
    formData.append('language', lang);
    try {
      updateSlot(key, { status: 'extracting' });
      const res = await fetch('/api/documents/extract', { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Extraction failed');
      updateSlot(key, { status: 'success', data: result.data });
    } catch (err: any) {
      updateSlot(key, { status: 'error', error: err.message || 'Failed' });
    }
  }, [lang, t]);

  const handleRemove = (key: string) => {
    updateSlot(key, { status: 'pending', fileName: undefined, data: undefined, error: undefined });
    if (fileRefs.current[key]) fileRefs.current[key]!.value = '';
  };

  const handleFieldChange = (slotKey: string, fieldKey: string, value: string) => {
    setSlots(prev => prev.map(s => {
      if (s.key !== slotKey || !s.data) return s;
      return { ...s, data: { ...s.data, [fieldKey]: { ...s.data[fieldKey], value } } };
    }));
  };

  const anyExtracted = slots.some(s => s.status === 'success');

  const handleConfirm = () => {
    const allFields: Record<string, string> = {};
    const uploadedDocs: string[] = [];
    slots.forEach(s => {
      if (s.status === 'success') {
        uploadedDocs.push(s.docType);
        if (s.data) {
          Object.entries(s.data).forEach(([k, v]) => {
            allFields[k] = v.value;
          });
        }
      }
    });
    allFields['_uploadedDocs'] = JSON.stringify(uploadedDocs);
    updateFields(allFields);
    router.push('/results');
  };

  return (
    <main className="w-full pt-44 bg-surface min-h-[calc(100vh-200px)] px-4 pb-12">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {toast && <div className="fixed top-48 right-6 z-50 bg-primary text-on-primary px-6 py-3 rounded-lg shadow-xl font-label-md animate-bounce">{toast}</div>}

        <div className="bg-surface-container-low p-8 rounded-xl shadow-sm">
          <h1 className="font-headline-xl text-primary">{t('upload.title')}</h1>
          <p className="font-body-lg text-on-surface-variant mt-2">{t('upload.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {slots.map(slot => (
            <div key={slot.key}
              className={`p-6 rounded-xl bg-surface-container-lowest shadow-md border-2 flex flex-col items-center text-center gap-4 transition-all ${slot.status === 'success' ? 'border-[#138808]' : slot.status === 'error' ? 'border-error' : 'border-outline-variant hover:border-primary'}`}
              onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(slot.key, f); }}>
              <span className={`material-symbols-outlined text-[48px] ${slot.status === 'success' ? 'text-[#138808]' : slot.status === 'extracting' ? 'text-secondary animate-pulse' : 'text-primary'}`}>
                {slot.status === 'success' ? 'check_circle' : slot.status === 'extracting' ? 'document_scanner' : slot.icon}
              </span>
              <h3 className="font-headline-sm text-primary">{t(slot.labelKey)}</h3>
              {!slot.required && <span className="text-caption text-on-surface-variant">{t('upload.optional')}</span>}

              {(slot.status === 'pending' || slot.status === 'error') && (<>
                <button onClick={() => fileRefs.current[slot.key]?.click()}
                  className="px-4 py-3 bg-primary text-on-primary rounded-lg font-label-md w-full hover:bg-[#2A3F5F] active:scale-[0.98] focus:ring-2 focus:ring-[#D97706] transition-all">
                  <span className="material-symbols-outlined text-[18px] align-middle mr-1">cloud_upload</span>{t('upload.uploadBtn')}
                </button>
                <p className="text-caption text-on-surface-variant">{t('upload.dragDrop')}</p>
                <input type="file" ref={el => { fileRefs.current[slot.key] = el; }} className="hidden" accept="image/jpeg,image/png,application/pdf" capture="environment"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(slot.key, f); }} />
                {slot.status === 'error' && <p className="text-error text-sm font-label-md">{slot.error}</p>}
              </>)}

              {(slot.status === 'uploading' || slot.status === 'extracting') && (
                <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[32px] animate-spin">sync</span>
                  <span className="font-label-md">{slot.status === 'uploading' ? t('upload.uploading') : t('upload.extracting')}</span>
                  {slot.fileName && <span className="text-caption truncate max-w-full">{slot.fileName}</span>}
                </div>
              )}

              {slot.status === 'success' && (
                <div className="flex flex-col items-center gap-2 w-full">
                  <span className="text-[#065F46] font-bold">✓ {t('upload.extractedOk')}</span>
                  {slot.fileName && <span className="text-caption text-on-surface-variant truncate max-w-full">{slot.fileName}</span>}
                  <button onClick={() => handleRemove(slot.key)}
                    className="mt-1 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant font-label-md text-caption hover:bg-error-container hover:text-on-error-container focus:ring-2 focus:ring-error transition-colors">
                    <span className="material-symbols-outlined text-[16px] align-middle mr-1">delete</span>{t('upload.remove')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {slots.filter(s => s.data).map(slot => (
          <div key={slot.key} className="bg-surface-container-lowest p-8 rounded-xl shadow-md border border-outline-variant">
            <h2 className="font-headline-md text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">edit_note</span>
              {t('upload.reviewTitle', { label: t(slot.labelKey) })}
            </h2>
            <div className="flex flex-col gap-4">
              {Object.entries(slot.data!).map(([key, data]) => {
                const isLow = data.confidence < 0.7 && data.value !== 'Not found';
                return (
                  <div key={key} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 border-b border-surface-container pb-4">
                    <label className="font-label-md text-on-surface-variant md:w-1/3 capitalize">{key.replace(/_/g, ' ')}</label>
                    <input type="text" value={data.value} onChange={e => handleFieldChange(slot.key, key, e.target.value)}
                      className={`flex-1 p-3 border-2 rounded-lg font-body-md focus:ring-2 focus:ring-[#D97706] focus:outline-none transition-colors ${isLow ? 'border-error bg-error-container text-on-error-container' : 'border-outline-variant bg-surface-container-lowest'}`} />
                    <span className={`text-sm font-caption flex items-center gap-1 min-w-[100px] ${isLow ? 'text-error' : 'text-[#065F46]'}`}>
                      {isLow ? (<><span className="material-symbols-outlined text-[16px]">warning</span>{t('upload.pleaseConfirm')}</>) : (<><span className="material-symbols-outlined text-[16px]">check</span>{t('upload.sure', { pct: String(Math.round(data.confidence * 100)) })}</>)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-4">
          <button onClick={handleConfirm} disabled={!anyExtracted}
            className={`px-8 py-4 rounded-lg font-headline-sm shadow-md flex items-center gap-2 transition-all ${anyExtracted ? 'bg-primary text-on-primary hover:bg-[#2A3F5F] active:scale-[0.98]' : 'bg-surface-container-highest text-outline cursor-not-allowed opacity-60'}`}>
            {t('upload.confirmBtn')} <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    </main>
  );
}
