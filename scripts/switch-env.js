/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function die(msg) {
  console.error(msg);
  process.exit(1);
}

const mode = process.argv[2]; // "phone" | "emu"
if (!mode || !['phone', 'emu'].includes(mode)) {
  die('Usage: node scripts/switch-env.js <phone|emu>');
}

const root = path.resolve(__dirname, '..');
const primary = path.join(root, `.env.${mode}`);
const fallback = path.join(root, `.env.${mode}.example`);
const src = [primary, fallback].find((p) => fs.existsSync(p));

if (!src) {
  die(
    `Missing ${path.relative(root, primary)} (and no ${path.relative(root, fallback)}).\n` +
      `Create ${path.basename(primary)} by copying ${path.basename(fallback)} and set EXPO_PUBLIC_API_BASE_URL.`
  );
}

if (src === fallback) {
  console.warn(`Using ${path.basename(fallback)} — copy to ${path.basename(primary)} and edit for your machine.`);
}

const dst = path.join(root, '.env');

fs.copyFileSync(src, dst);
console.log(`Switched .env → ${path.basename(src)}`);

