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

const ip = getLanIPv4();
if (!ip) {
  console.error('No LAN IPv4 found. Connect to Wi‑Fi and retry.');
  process.exit(1);
}

const port = process.env.API_PORT || '5000';
const body = `## Real phone over Wi-Fi (LAN) — generated ${new Date().toISOString().slice(0, 10)}
## Backend must be running: cd copy-expo-mineral-backend-master && npm run dev
EXPO_PUBLIC_API_BASE_URL=http://${ip}:${port}
REACT_NATIVE_PACKAGER_HOSTNAME=${ip}
EXPO_PUBLIC_API_TIMEOUT=60000
EXPO_PUBLIC_GOOGLE_MAPS_TOKEN=
`;

const root = path.resolve(__dirname, '..');
for (const name of ['.env.phone', '.env']) {
  fs.writeFileSync(path.join(root, name), body, 'utf8');
}
console.log(`Wrote LAN IP ${ip} to .env and .env.phone`);
