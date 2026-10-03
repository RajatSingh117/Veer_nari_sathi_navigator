const fs = require('fs');
const path = require('path');

const files = [
  { src: 'frontend/document_upload_ai_extraction.html', dest: 'src/app/upload/page.tsx', name: 'UploadPage' },
  { src: 'frontend/results_dashboard_5_benefits_found.html', dest: 'src/app/results/page.tsx', name: 'ResultsPage' },
  { src: 'frontend/benefit_detail_letter_draft.html', dest: 'src/app/benefits/[id]/page.tsx', name: 'BenefitDetailPage' },
  { src: 'frontend/saved_progress_checklist_tracker.html', dest: 'src/app/checklist/page.tsx', name: 'ChecklistPage' }
];

files.forEach(file => {
  let html = fs.readFileSync(file.src, 'utf8');
  
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  if (!mainMatch) return;
  let content = mainMatch[0];

  content = content.replace(/class="/g, 'className="');
  content = content.replace(/for="/g, 'htmlFor="');
  content = content.replace(/stroke-width="/g, 'strokeWidth="');
  content = content.replace(/stroke-linecap="/g, 'strokeLinecap="');
  content = content.replace(/stroke-linejoin="/g, 'strokeLinejoin="');
  content = content.replace(/fill-rule="/g, 'fillRule="');
  content = content.replace(/clip-rule="/g, 'clipRule="');
  content = content.replace(/onclick="/g, 'onClick="');
  content = content.replace(/readonly(=["'][^"']*["'])?/g, 'readOnly');
  
  content = content.replace(/<(img|input|br|hr)([^>]*)>/g, (match, tag, rest) => {
    if (rest.trim().endsWith('/')) return match;
    return `<${tag}${rest} />`;
  });

  content = content.replace(/style="([^"]+)"/g, (match, styles) => {
    let jsxStyles = {};
    styles.split(';').forEach(s => {
      if (!s.trim()) return;
      let [k, v] = s.split(':');
      if (!k || !v) return;
      k = k.trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
      v = v.trim();
      if (v.startsWith("'") && v.endsWith("'")) {
          // keep as string
      } else if (!isNaN(v) && v !== '') {
          v = Number(v);
      }
      jsxStyles[k] = v;
    });
    return `style={${JSON.stringify(jsxStyles)}}`;
  });

  content = content.replace(/<!--[\s\S]*?-->/g, '');
  content = content.replace(/<script[\s\S]*?<\/script>/g, '');
  
  content = content.replace(/onClick="[^"]*"/g, 'onClick={() => {}}');
  content = content.replace(/checked=""/g, 'defaultChecked');

  const tsx = `"use client";\n\nexport default function ${file.name}() {
  return (
    ${content}
  );
}`;

  fs.writeFileSync(file.dest, tsx);
  console.log(`Converted ${file.src} to ${file.dest}`);
});

// Also fix the questions page created by the subagent if it lacks "use client"
let questionsHtml = fs.readFileSync('src/app/questions/page.tsx', 'utf8');
if (!questionsHtml.includes('"use client"')) {
    fs.writeFileSync('src/app/questions/page.tsx', '"use client";\n' + questionsHtml);
}
