# Coursify

A professional social network for educators. Accounts, follows, messages, and resources live in **Firebase** (Authentication, Firestore, and Storage), so a teacher can sign in on a phone or a laptop with the same work email.

The frontend is a static React/Vite app. Deploy it for free with **Firebase Hosting**.

This repo already includes production-ready Firebase files. You do **not** need `firebase init` unless you are starting from a blank folder:

- `firebase.json` — Hosting (`dist`), Firestore rules/indexes, Storage rules
- `.firebaserc` — default project id (replace with yours)
- `src/firebase.ts` — Auth, Firestore, and Storage client SDK

## 1. Firebase Console (once)

1. Open https://console.firebase.google.com and create a project (Spark / free plan is enough).
2. Build → **Authentication** → Sign-in method → enable **Email/Password**.
3. Build → **Firestore Database** → Create database → start in **production** mode (this repo deploys the rules).
4. Build → **Storage** → Get started.
5. Project settings → **Your apps** → add a **Web** app. Copy the config values into `.env.local`.

## 2. Terminal commands (from the project folder)

PowerShell:

```powershell
cd "D:\My Projects\Coursify"

npm install
npm install -g firebase-tools

firebase login
firebase use --add
```

When `firebase use --add` asks:

- select the Firebase project you just created
- alias: `default`

Copy the example env file and paste your Web app keys:

```powershell
copy env.example .env.local
notepad .env.local
```

`.env.local` must contain:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

`VITE_FIREBASE_PROJECT_ID` must match the project you selected with `firebase use --add`.

Build the static site, then deploy Hosting, Firestore rules, indexes, and Storage rules together:

```powershell
npm run build
firebase deploy
```

Equivalent one-liner after `.env.local` is filled in:

```powershell
npm run deploy
```

When deploy finishes, Firebase prints the free URLs:

- `https://YOUR_PROJECT_ID.web.app`
- `https://YOUR_PROJECT_ID.firebaseapp.com`

Sign in on a phone and a laptop with the same school email. Both devices use the same Firestore database.

## 3. Local development

```powershell
npm run dev
```

Open http://localhost:8443/

## Optional: `firebase init`

Skip this if you cloned this repo. Only run it on an empty project.

If you run it anyway, choose **Hosting**, **Firestore**, and **Storage**, use existing `firebase.json` / rules files, set the public directory to `dist`, and answer **Yes** to configure as a single-page app.

## Render (optional extra URL)

You can still publish `dist` as a Render Static Site. Add the same `VITE_FIREBASE_*` values as **build-time** environment variables so Vite bakes them into the bundle.
