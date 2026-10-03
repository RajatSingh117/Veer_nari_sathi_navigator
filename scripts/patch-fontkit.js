const fs = require('fs');
const path = require('path');

const dirsToSearch = [
  path.join(__dirname, '..', 'node_modules', 'fontkit', 'dist'),
  path.join(__dirname, '..', 'node_modules', '@pdf-lib', 'fontkit', 'dist'),
];

dirsToSearch.forEach((dir) => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs')) {
      const fullPath = path.join(dir, file);
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Unminified patterns
      if (/getAnchor\s*\(anchor\)\s*\{/.test(content) && !content.includes('if (!anchor) return { x: 0, y: 0 };')) {
        content = content.replace(
          /getAnchor\s*\(anchor\)\s*\{/g,
          'getAnchor(anchor) {\n        if (!anchor) return { x: 0, y: 0 };'
        );
        modified = true;
      }
      if (/getAnchor:\s*function\s*\(anchor\)\s*\{/.test(content) && !content.includes('if (!anchor) return { x: 0, y: 0 };')) {
        content = content.replace(
          /getAnchor:\s*function\s*\(anchor\)\s*\{/g,
          'getAnchor: function (anchor) {\n        if (!anchor) return { x: 0, y: 0 };'
        );
        modified = true;
      }

      // Minified pattern: .getAnchor=function(e){var t=e.xCoordinate
      if (/\.getAnchor\s*=\s*function\s*\(([a-zA-Z0-9_]+)\)\s*\{\s*var\s+([a-zA-Z0-9_]+)\s*=\s*\1\.xCoordinate/.test(content)) {
        content = content.replace(
          /\.getAnchor\s*=\s*function\s*\(([a-zA-Z0-9_]+)\)\s*\{\s*var\s+([a-zA-Z0-9_]+)\s*=\s*\1\.xCoordinate/g,
          '.getAnchor=function($1){if(!$1)return{x:0,y:0};var $2=$1.xCoordinate'
        );
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log('Patched fontkit dist file:', fullPath);
      }
    }
  });
});
console.log('Patch fontkit script completed.');
