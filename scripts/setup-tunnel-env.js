/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, '.env.tunnel');
const dst = path.join(root, '.env');

if (!fs.existsSync(src)) {
  console.error('Missing .env.tunnel — start localtunnel and set EXPO_PUBLIC_API_BASE_URL there.');
  process.exit(1);
}

fs.copyFileSync(src, dst);
const url = fs.readFileSync(dst, 'utf8').match(/EXPO_PUBLIC_API_BASE_URL=(.+)/)?.[1]?.trim();
console.log(`Copied .env.tunnel → .env${url ? ` (API: ${url})` : ''}`);
console.log('Keep "npx localtunnel --port 5000" running, then restart Expo (Ctrl+C → npm run start:tunnel).');
