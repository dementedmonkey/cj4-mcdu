/**
 * Remove build/ and dist/ under the workfolder.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

for (const name of ['build', 'dist']) {
  const p = path.join(ROOT, name);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log('Removed', p);
  } else {
    console.log('Skip (missing):', p);
  }
}

console.log('Clean complete.');
