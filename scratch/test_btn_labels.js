const en = require('../src/locales/en.json');
const hi = require('../src/locales/hi.json');
const mr = require('../src/locales/mr.json');

const Q_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'];

['EN', 'HI', 'MR'].forEach((lang) => {
  const dict = lang === 'HI' ? hi : lang === 'MR' ? mr : en;
  const t = (k, params) => {
    let str = dict[k] || k;
    if (params) {
      Object.entries(params).forEach(([p, v]) => {
        str = str.replace(new RegExp(`\\{${p}\\}`, 'g'), v);
      });
    }
    return str;
  };

  console.log(`\n=== ${lang} ===`);
  for (let step = 0; step < Q_KEYS.length; step++) {
    const isLast = step === Q_KEYS.length - 1;
    const nextQKey = step + 1 < Q_KEYS.length ? Q_KEYS[step + 1] : null;
    const rawNextTitle = nextQKey ? t(`questions.${nextQKey}.title`) : '';
    const nextTitle =
      rawNextTitle && !rawNextTitle.startsWith('questions.') ? rawNextTitle : '';

    const label = isLast
      ? t('questions.uploadDocs')
      : nextTitle
      ? t('questions.next', { nextTitle })
      : t('questions.nextStep') || 'Next Step';

    console.log(`Step ${step} (${Q_KEYS[step]}) -> Button: "${label} →"`);
  }
});
