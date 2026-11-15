import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
execFileSync('npm', ['run', 'build', '--', '--base=./'], { cwd: root, stdio: 'inherit' });
const output = new URL('../android/app/src/main/assets/public/', import.meta.url);
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(new URL('../dist/', import.meta.url), output, { recursive: true });

writeFileSync(new URL('compatibility.html', output), `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#15231f;color:#ece6cf;font:18px/1.6 sans-serif;padding:30px;max-width:600px;margin:auto}h1{color:#e7c77c}p{color:#bdc8ae}</style></head><body><h1 id="status">Opening Ashglade…</h1><p id="explanation"></p><script src="./compatibility.js"></script></body></html>`);
writeFileSync(new URL('compatibility.js', output), `if(typeof structuredClone==='function' && window.CSS && CSS.supports('height','100svh')){location.replace('./index.html')}else{document.getElementById('status').textContent='Update Android System WebView';document.getElementById('explanation').textContent='Open Google Play and update Android System WebView and Google Chrome, then reopen Ashglade. The game needs a newer version of Android’s web engine.'}`);
