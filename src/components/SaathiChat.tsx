"use client";

import { useEffect, useRef } from 'react';
import { createChat } from '@n8n/chat';
import '@n8n/chat/style.css';
import { useT } from '@/context/I18nContext';

interface AppInstance {
  unmount: () => void;
}

const CHAT_I18N: Record<
  'EN' | 'HI' | 'MR',
  {
    title: string;
    subtitle: string;
    inputPlaceholder: string;
    initialMessages: string[];
  }
> = {
  EN: {
    title: 'Veer Nari Saathi Help',
    subtitle: 'Free guidance for Veer Naris and families',
    inputPlaceholder: 'Type your question...',
    initialMessages: ['Namaste. I am Saathi.', 'How can I help you with Veer Nari Saathi today?'],
  },
  HI: {
    title: 'वीर नारी साथी सहायता',
    subtitle: 'वीर नारियों और परिवारों के लिए निःशुल्क मार्गदर्शन',
    inputPlaceholder: 'अपना प्रश्न यहाँ लिखें...',
    initialMessages: ['नमस्ते। मैं साथी हूँ।', 'आज मैं आपकी वीर नारी साथी में क्या सहायता कर सकता हूँ?'],
  },
  MR: {
    title: 'वीर नारी साथी मदत',
    subtitle: 'वीर नारी आणि कुटुंबांसाठी मोफत मार्गदर्शन',
    inputPlaceholder: 'तुमचा प्रश्न येथे टाईप करा...',
    initialMessages: ['नमस्ते. मी साथी आहे.', 'आज मी तुम्हाला वीर नारी साथीबद्दल कशी मदत करू शकतो?'],
  },
};

export default function SaathiChat() {
  const { lang } = useT();
  const appRef = useRef<AppInstance | null>(null);

  useEffect(() => {
    // 1. Guard against double-initialization in React StrictMode/dev
    if (appRef.current) {
      try {
        appRef.current.unmount();
      } catch (err) {
        console.warn('SaathiChat unmount warning:', err);
      }
      appRef.current = null;
    }

    // Clean up any leftover DOM container from previous mount
    const existingContainer = document.getElementById('n8n-chat');
    if (existingContainer) {
      existingContainer.remove();
    }

    const currentI18n = CHAT_I18N[lang] || CHAT_I18N.EN;
    const webhookUrl =
      process.env.NEXT_PUBLIC_N8N_CHAT_URL ||
      'https://rajatsingh117.app.n8n.cloud/webhook/02a4cef1-860e-40e6-bbfe-afda78c498ec/chat';

    try {
      // 2. Initialize @n8n/chat
      const app = createChat({
        webhookUrl,
        mode: 'window',
        enableStreaming: true,
        showWelcomeScreen: false,
        initialMessages: currentI18n.initialMessages,
        // Pass only language metadata, strictly omitting any documents or PII
        metadata: {
          language: lang,
        },
        i18n: {
          en: {
            title: currentI18n.title,
            subtitle: currentI18n.subtitle,
            footer: '',
            getStarted: 'Start',
            inputPlaceholder: currentI18n.inputPlaceholder,
            closeButtonTooltip: 'Close',
          },
          [lang.toLowerCase()]: {
            title: currentI18n.title,
            subtitle: currentI18n.subtitle,
            footer: '',
            getStarted: 'Start',
            inputPlaceholder: currentI18n.inputPlaceholder,
            closeButtonTooltip: 'Close',
          },
        },
      });

      appRef.current = app as unknown as AppInstance;
    } catch (err) {
      console.error('Failed to initialize SaathiChat widget:', err);
    }

    // Cleanup on unmount or when language changes
    return () => {
      if (appRef.current) {
        try {
          appRef.current.unmount();
        } catch (err) {
          console.warn('SaathiChat unmount warning on cleanup:', err);
        }
        appRef.current = null;
      }
      const container = document.getElementById('n8n-chat');
      if (container) {
        container.remove();
      }
    };
  }, [lang]);

  return null;
}
