// sync-version.js
const fs = require('fs');
const path = require('path');

const pkg = require('./package.json');
const infoPath = path.join(__dirname, 'GPU-Upscaler.iinaplugin', 'Info.json');

const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));

info.version = pkg.version;

if (typeof info.ghVersion === 'number') {
  info.ghVersion += 1;
} else {
  info.ghVersion = 1;
}

fs.writeFileSync(infoPath, JSON.stringify(info, null, 2) + '\n');
console.log(`Synced Info.json: version ${info.version}, ghVersion ${info.ghVersion}`);