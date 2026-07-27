# Building the ZENIN Mobile APK

## What the APK is

A **thin WebView shell** — zero business logic, zero Firebase credentials, zero source code in the binary. The APK opens a full-screen browser pointed at your VPS. Authentication, data, and UI all run server-side.

---

## Prerequisites

| Tool | Install |
|---|---|
| Node.js ≥ 18 | https://nodejs.org |
| EAS CLI | `npm install -g eas-cli` |
| Expo account | https://expo.dev (free) |

---

## Step 1 — Configure the VPS URL

Open `eas.json` and set `EXPO_PUBLIC_DOMAIN` in the `preview` profile to your server's domain (no `https://`, no trailing slash):

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_DOMAIN": "yourdomain.com"
      }
    }
  }
}
```

The WebView loads `https://<EXPO_PUBLIC_DOMAIN>/zenin`.

---

## Step 2 — Log in to EAS

```bash
cd artifacts/mobile
eas login           # enter your Expo account credentials
eas project:init    # link this project to your Expo account (one-time)
```

---

## Step 3 — Build the APK

```bash
eas build --platform android --profile preview
```

EAS builds in the cloud and emails you a download link when done (~10–15 min).

---

## What you get

| File | Type | Size |
|---|---|---|
| `*.apk` | Android Package | ~15–25 MB |

Install on any Android device via `adb install *.apk` or transfer and tap to install.

---

## How the WebView works

- `app/index.tsx` — single screen, full-screen `react-native-webview`
- Loads `https://<EXPO_PUBLIC_DOMAIN>/zenin`
- Cookies and `localStorage` persist (user stays logged in between app launches)
- Android hardware back button navigates back within the web app
- Pull-to-refresh supported

There is **no auth code, no Firebase SDK, no API keys** in the APK. Everything lives on the VPS.

---

## Local dev (Expo Go)

```bash
cd artifacts/mobile
pnpm dev
```

Scan the QR code with Expo Go. The WebView will load against the `EXPO_PUBLIC_DOMAIN` set in your local `.env` file.
