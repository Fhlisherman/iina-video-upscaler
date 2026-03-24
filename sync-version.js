const fs = require('fs');
const path = require('path');

const pkg = require('./package.json');
const infoPath = path.join(__dirname, 'Video-Upscaler.iinaplugin', 'Info.json');

const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
info.version = pkg.version;

fs.writeFileSync(infoPath, JSON.stringify(info, null, 2) + '\n');
console.log(`Updated Info.json to version ${pkg.version}`);