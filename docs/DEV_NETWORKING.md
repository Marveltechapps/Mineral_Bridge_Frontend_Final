# Dev networking (fast loop: Expo Go + emulator)

This project supports a fast development loop without waiting for cloud APK builds:

- Real phone over Wi‑Fi: use an **HTTPS tunnel** for the API
- Android emulator: use the emulator host alias **`10.0.2.2`**

## Real phone over Wi‑Fi (recommended: HTTPS tunnel)

1) Start your backend on port `5000`.

2) Start an HTTPS tunnel:

```powershell
ngrok http 5000
```

3) Copy the tunnel URL (it will look like `https://xxxx.ngrok-free.app`).

4) Set it as your API base (in `.env` at the project root):

```
EXPO_PUBLIC_API_BASE_URL=https://xxxx.ngrok-free.app
```

5) Start Expo and scan the QR code with **Expo Go**.

## Android emulator (fastest)

If your backend runs on your dev machine at `http://localhost:5000`, then from the Android emulator the API base must be:

- `http://10.0.2.2:5000`

### Good news: this project auto-handles it

`lib/api.js` rewrites **`http://localhost:…` and `http://127.0.0.1:…` to `http://10.0.2.2:…` only on an Android emulator** (not on physical devices). LAN or tunnel URLs in `EXPO_PUBLIC_API_BASE_URL` are left unchanged.

On a **physical phone in `__DEV__`**, if the API base is still loopback, the app tries to substitute the **same private IPv4 host Expo uses for Metro** (`hostUri` / `debuggerHost`), so `http://localhost:5000` can work when the backend is on your PC and you opened the project with **LAN** (not tunnel-only). If that detection fails, set `EXPO_PUBLIC_API_BASE_URL` explicitly (LAN IP or HTTPS tunnel).

## Why APK builds are slow

EAS `preview`/APK builds are full native cloud builds and can take 20–40 minutes on the free queue. Use Expo Go (or a dev client) for daily iteration and reserve APK builds for milestone testing.

