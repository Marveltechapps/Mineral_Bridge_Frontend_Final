/* eslint-disable no-console */
const fs = require('fs');
const os = require('os');
const path = require('path');

function getLanIPv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && /^192\.168\./.test(net.address)) {
        return net.address;
      }
    }
  }
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

function readEnvValue(filePath, key) {
  if (!fs.existsSync(filePath)) return '';
  const match = fs.readFileSync(filePath, 'utf8').match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match?.[1]?.trim() || '';
}

/** Keep hosted/public API URLs when refreshing Metro LAN settings. */
function shouldPreserveApiUrl(currentUrl) {
  if (!currentUrl) return false;
  const s = currentUrl.trim();
  if (/^https:\/\//i.test(s)) return true;
  try {
    const host = new URL(s.includes('://') ? s : `http://${s}`).hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2') return false;
    if (/^(10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

const ip = getLanIPv4();
if (!ip) {
  console.error('No LAN IPv4 found. Connect to Wi‑Fi and retry.');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const existingApiUrl = readEnvValue(envPath, 'EXPO_PUBLIC_API_BASE_URL');
const preserveApiUrl = shouldPreserveApiUrl(existingApiUrl);
const port = process.env.API_PORT || '5000';
const apiUrl = preserveApiUrl ? existingApiUrl : `http://${ip}:${port}`;

const body = preserveApiUrl
  ? `# Mineral Bridge — hosted backend + LAN Metro (${new Date().toISOString().slice(0, 10)})
# Backend API (mobile app calls this):
EXPO_PUBLIC_API_BASE_URL=${apiUrl}
# Metro bundler = your PC LAN IP (Expo QR) — not the EC2 IP:
REACT_NATIVE_PACKAGER_HOSTNAME=${ip}
EXPO_PUBLIC_API_TIMEOUT=60000
EXPO_PUBLIC_GOOGLE_MAPS_TOKEN=
`
  : `## Real phone over Wi-Fi (LAN) — generated ${new Date().toISOString().slice(0, 10)}
## Backend must be running: cd copy-expo-mineral-backend-master && npm run dev
EXPO_PUBLIC_API_BASE_URL=${apiUrl}
REACT_NATIVE_PACKAGER_HOSTNAME=${ip}
EXPO_PUBLIC_API_TIMEOUT=60000
EXPO_PUBLIC_GOOGLE_MAPS_TOKEN=
`;

for (const name of ['.env.phone', '.env']) {
  fs.writeFileSync(path.join(root, name), body, 'utf8');
}
console.log(
  preserveApiUrl
    ? `Updated Metro LAN IP to ${ip}; kept API URL ${apiUrl}`
    : `Wrote LAN IP ${ip} to .env and .env.phone`
);
