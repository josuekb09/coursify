# Coursify

A professional social network for educators. Accounts, follows, messages, and resources now live on a **shared server**, so a teacher can sign in on a phone and a laptop with the same work email.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:8443/

## Production (Render)

This app is a **Node web service**, not a static site. The API at `/api` stores every educator in `data/coursify.json` on the server.

In the Render dashboard:

1. Open the Coursify service.
2. If it is a **Static Site**, convert it or create a new **Web Service** from https://github.com/josuekb09/coursify
3. Set:
   - **Build command:** `npm ci && npm run build`
   - **Start command:** `npm start`
4. Deploy. Confirm https://coursify-kgf0.onrender.com/api/health returns `{ "ok": true }`.

Until the live URL serves `/api/health` as JSON, logins cannot sync across devices.
