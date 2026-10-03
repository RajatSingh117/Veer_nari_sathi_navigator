const fs = require('fs');
let code = fs.readFileSync('src/app/questions/page.tsx', 'utf8');

// replace fetch logic with AppContext logic
code = code.replace(/import \{ useRouter \} from 'next\/navigation';/, 'import { useRouter } from \'next/navigation\';\nimport { useAppContext } from \'@/context/AppContext\';');

code = code.replace(/const router = useRouter\(\);/, 'const router = useRouter();\n  const { updateAnswers } = useAppContext();');

code = code.replace(/try \{[\s\S]*?router\.push\('\/upload'\);\s*\}/, 
`try {
      updateAnswers({ relationship: relationship || '' });
      router.push('/upload');
    } catch(err) {
      console.error(err);
      router.push('/upload');
    }`);

fs.writeFileSync('src/app/questions/page.tsx', code);
console.log('Updated questions page with AppContext');
