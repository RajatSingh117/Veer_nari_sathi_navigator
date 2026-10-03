const fs = require('fs');

let code = fs.readFileSync('src/app/questions/page.tsx', 'utf8');

if (!code.includes('handleNext')) {
  code = code.replace(/export default function QuestionsPage\(\) \{/, 
  `import { useRouter } from 'next/navigation';\n\nexport default function QuestionsPage() {
  const router = useRouter();
  const handleNext = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target.closest('form') || document.querySelector('form'));
    const relationship = formData.get('relationship');
    try {
      await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: { relationship } })
      });
      router.push('/upload');
    } catch(err) {
      console.error(err);
      router.push('/upload');
    }
  };`);

  if (!code.includes('<form')) {
    code = code.replace(/<fieldset/, '<form><fieldset');
    code = code.replace(/<\/fieldset>/, '</fieldset></form>');
  }

  code = code.replace(
    /<Link className="([^"]+)" href="\/upload">([\s\S]*?)<\/Link>/s,
    '<button onClick={handleNext} type="submit" className="$1">$2</button>'
  );

  fs.writeFileSync('src/app/questions/page.tsx', code);
  console.log('Updated questions page');
}
