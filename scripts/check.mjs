import { access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
for (const path of ['dist/index.html','dist/style.css','dist/app.js','dist/model.js','dist/content.js']) {
  await access(path);
  if (path.endsWith('.js')) execFileSync(process.execPath,['--check',path]);
}
console.log('Build verified: static dist/ and JavaScript syntax are ready.');
