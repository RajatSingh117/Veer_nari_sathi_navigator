const fs = require('fs');

const code = `"use client";
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

type ExtractStatus = 'pending' | 'uploading' | 'extracting' | 'success' | 'error';
type ExtractedField = { value: string; confidence: number };

export default function UploadPage() {
  const router = useRouter();
  const { updateFields } = useAppContext();
  const [status, setStatus] = useState<ExtractStatus>('pending');
  const [errorMsg, setErrorMsg] = useState('');
  const [extractedData, setExtractedData] = useState<Record<string, ExtractedField> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', 'service_record');

    try {
      setStatus('extracting');
      const res = await fetch('/api/documents/extract', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || 'Failed to extract');
      
      setExtractedData(result.data);
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleFieldChange = (key: string, newValue: string) => {
    if (extractedData) {
      setExtractedData({
        ...extractedData,
        [key]: { ...extractedData[key], value: newValue }
      });
    }
  };

  const handleConfirm = () => {
    if (extractedData) {
      const finalFields: Record<string, string> = {};
      for (const [k, v] of Object.entries(extractedData)) {
        finalFields[k] = v.value;
      }
      updateFields(finalFields);
      router.push('/results');
    }
  };

  return (
    <main className="w-full pt-44 bg-surface min-h-[calc(100vh-200px)] px-4">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        
        <div className="bg-surface-container-low p-8 rounded-xl shadow-sm">
          <h1 className="font-headline-xl text-primary">Upload Documents</h1>
          <p className="font-body-lg text-on-surface-variant mt-2">
            Securely upload the service record or PPO to extract details automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-surface-container-lowest shadow-md border border-outline-variant flex flex-col items-center text-center gap-4">
            <span className="material-symbols-outlined text-[48px] text-primary">id_card</span>
            <h3 className="font-headline-sm text-primary">Service Record</h3>
            
            {status === 'pending' || status === 'error' ? (
              <>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md w-full"
                >
                  Upload JPG/PDF
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleFileUpload} 
                />
              </>
            ) : status === 'success' ? (
              <div className="text-secondary font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[24px]">check_circle</span>
                Extracted
              </div>
            ) : (
              <div className="text-on-surface-variant animate-pulse flex flex-col items-center">
                <span className="material-symbols-outlined text-[32px] animate-spin">sync</span>
                <span className="mt-2">{status === 'uploading' ? 'Uploading...' : 'AI Extracting...'}</span>
              </div>
            )}
            
            {status === 'error' && <p className="text-error text-sm">{errorMsg}</p>}
          </div>
          
          <div className="p-6 rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant opacity-50 flex flex-col items-center text-center gap-4">
            <span className="material-symbols-outlined text-[48px] text-outline">verified</span>
            <h3 className="font-headline-sm text-primary">Death Certificate</h3>
            <p className="text-sm">Optional</p>
          </div>
          
          <div className="p-6 rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant opacity-50 flex flex-col items-center text-center gap-4">
            <span className="material-symbols-outlined text-[48px] text-outline">badge</span>
            <h3 className="font-headline-sm text-primary">ID Proof</h3>
            <p className="text-sm">Optional</p>
          </div>
        </div>

        {extractedData && (
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-md border border-outline-variant">
            <h2 className="font-headline-md text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">edit_note</span>
              Review Extracted Details
            </h2>
            <div className="flex flex-col gap-4">
              {Object.entries(extractedData).map(([key, data]) => {
                const isLowConfidence = data.confidence < 0.7 && data.value !== 'Not found';
                return (
                  <div key={key} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 border-b border-surface-container pb-4">
                    <label className="font-label-md text-on-surface-variant w-1/3 capitalize">
                      {key.replace(/_/g, ' ')}
                    </label>
                    <input 
                      type="text" 
                      value={data.value}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      className={\`flex-1 p-2 border rounded-md \${isLowConfidence ? 'border-error bg-error-container text-on-error-container' : 'border-outline-variant'}\`}
                    />
                    {isLowConfidence && (
                      <span className="text-error font-caption text-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        Please confirm
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-8 flex justify-end gap-4">
              <button 
                onClick={handleConfirm}
                className="px-8 py-3 bg-secondary-container text-on-secondary-container font-headline-sm rounded-lg hover:bg-secondary hover:text-on-secondary shadow-md transition-colors flex items-center gap-2"
              >
                Confirm & Find Matches <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
`;

fs.writeFileSync('src/app/upload/page.tsx', code);
console.log('Upload page rewritten.');
