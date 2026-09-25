# Coursify — Project Audit

**Audit date:** 2026-09-23
**Repository root:** `E:\My Projects\Coursify`
**Branch audited:** `main` @ `c2b1eeb` (19 commits, working tree clean at audit start)
**Scope:** every non-binary, non-generated file in the repository (`node_modules/`, `.git/`, `dist/`, `.firebase/` and image assets excluded from line-by-line reading).

---

## 1. Executive summary

Coursify is a **professional social network and curriculum-sharing workspace for educators** (high school and university teachers). The README states it plainly: *"A professional social network for educators. Accounts, follows, messages, and resources live in Firebase (Authentication, Firestore, and Storage), so a teacher can sign in on a phone or a laptop with the same work email."*

The product lets a teacher create a verified faculty profile, upload and share teaching material (slide decks, PDFs, spreadsheets, videos, code archives, or external links), follow colleagues, post short updates to an academic feed, exchange real-time private messages with attachments and voice notes, and organise in-person or online faculty meetups with RSVPs. The recurring line in the UI is *"No teacher should start from a blank page."* The Subjects screen brands itself *"GitHub for Educators — Curriculum Repositories."*

**Target audience:** secondary-school and university teaching staff. **Problem solved:** curriculum material is siloed per teacher; Coursify centralises it into a reusable, attributed, subject-indexed library plus a professional identity layer.

**Business model:** *not stated anywhere in the code or docs.* There is no billing, subscription, plan, pricing, or payment code. A 10 GB per-user storage cap constant and a founder-only admin analytics dashboard are consistent with an early-stage single-tenant SaaS, but this is **a point to clarify with the project owner**. Contact/support routes to a personal Gmail address and an Instagram account (`@cours.ify`), suggesting a pre-revenue, founder-run product.

**Architecture in one line:** a 100 % client-side React SPA talking directly to Firebase (Auth + Firestore + Storage) with no custom backend of any kind.

---

## 2. Full technical stack

### Languages & runtime
| Item | Version / detail |
|---|---|
| TypeScript | `^5.7.0`, `strict: true`, target ES2020, `jsx: react-jsx`, `noEmit`, path alias `@/* → ./src/*` |
| React | `^19.0.0` + `react-dom ^19.0.0` (`createRoot`, `StrictMode`) |
| Node (toolchain) | `22` via `.mise.toml` |
| Package manager | **Ambiguous** — `.mise.toml` pins `npm:pnpm 10.34.3` and every `.figma/make/*` script calls `pnpm`, but the repo contains `package-lock.json` (npm) and **no** `pnpm-lock.yaml`. See §11. |

### Build & tooling
| Item | Version / detail |
|---|---|
| Vite | `^8.0.5` — dev server on `0.0.0.0:$PORT` (default **8443**), `strictPort`, watch ignores `.figma/**` and `data/**` |
| `@vitejs/plugin-react` | `^6.0.0` |
| Tailwind CSS | `^4.0.0` via `@tailwindcss/vite` — **no** `tailwind.config.js`, no PostCSS config; theme tokens declared in `src/index.css` with `@theme` |
| Formatter | `oxfmt ^0.2.0` (`npm run format`) |
| `@types/node` | `^22.0.0` |
| Linting | **none configured** |
| Testing | **none configured** (no test runner, no test files) |

### Backend / infrastructure
| Item | Detail |
|---|---|
| Firebase JS SDK | `^12.4.0` (client SDK only) |
| Firebase Auth | Email/Password provider only; persistence `indexedDBLocalPersistence` → fallback `browserLocalPersistence` |
| Firestore | Native mode, 9 top-level collections (see §5), 2 composite indexes |
| Firebase Storage | Two rule scopes, 50 MiB object cap |
| Firebase Hosting | site `coursify-a1a0d`, public dir `dist`, SPA rewrite `** → /index.html` |
| Firebase project id | `coursify-a1a0d` (`.firebaserc`, alias `default`) |
| Server-side code | **None.** `server/` exists but is **empty**. No Cloud Functions, no Express, no API routes. |
| Alternate hosting | `public/_redirects` (`/* /index.html 200`) supports Netlify/Render static hosting; README mentions Render as an optional extra URL |

### Third-party services referenced at runtime
- Google Fonts (Archivo, Inter, JetBrains Mono) via CSS `@import`.
- Google Maps embed + search URLs for in-person meetup locations (`utils.ts: mapsEmbedUrl`, `mapsSearchUrl`).
- YouTube (`youtube-nocookie.com/embed`) and Vimeo (`player.vimeo.com`) embeds for video resources.
- GitHub repo link parsing for code resources.
- Google Analytics — *supported by the Vite Figma plugin but **not** configured* (`analytics.googleAnalyticsId` absent from `site.json`).
- An optional outbound email webhook at `VITE_EMAIL_DISPATCH_URL` (see §6 and §9).

### Scaffold origin
The project was generated from a **Figma Make** React/Vite scaffold. `vite.config.ts` still carries four Figma-specific plugins and `AGENTS.md` / `CLAUDE.md` are Figma Make agent instructions. `index.html` contains `<!-- figma:* -->` comment slots that the build replaces from `.figma/make/site.json`. The very first commit is titled *"Initial commit from Create Next App"*, but **no Next.js code remains**.

---

## 3. Project structure (annotated tree)

```
Coursify/
├── .figma/make/                 Figma Make scaffold scripts (bash) + site metadata
│   ├── analyze-routes           → figma-analyze routes
│   ├── deploy                   → pnpm build + figma make deploy
│   ├── deploy-preview           → dev-mode build (sourcemaps) + preview deploy
│   ├── dev                      → pnpm run dev
│   ├── dev.json                 Which files trigger reinstall / dev-server restart
│   ├── format / install / langserver
│   └── site.json                Title, description, favicon, robots.index=false
├── .firebase/hosting.*.cache    Deploy cache (generated, gitignored)
├── .env.local                   REAL Firebase web keys (gitignored) — 7 keys present
├── .firebaserc                  default project → coursify-a1a0d
├── .gitattributes / .gitignore / .mise.toml
├── AGENTS.md                    Figma Make agent guidance (stack, styling, code-quality rules)
├── CLAUDE.md                    One line: `@AGENTS.md`
├── README.md                    Firebase setup + deploy runbook (PowerShell)
├── data/
│   ├── .gitkeep
│   └── coursify.json            LEGACY state file from the removed Node server (matched by data/*.json ignore)
├── dist/                        Build output (on disk, gitignored)
├── env.example                  6 VITE_FIREBASE_* placeholder keys
├── firebase.json                Hosting + Firestore rules/indexes + Storage rules + cache headers
├── firestore.indexes.json       2 composite indexes (conversations, messages)
├── firestore.rules              Per-collection security rules; founder email hard-coded
├── storage.rules                avatars/{uid}/**, resources/{uid}/** ; 50 MiB cap
├── index.html                   Vite shell with figma:* slots, #root
├── package.json / package-lock.json
├── picture landing page/        4 source JPEGs — duplicates of public/landing-images (unused by the app)
├── public/
│   ├── favicon.svg
│   ├── _redirects               SPA fallback for Netlify/Render
│   └── landing-images/          picture 1-4.jpg + hero-library.jpg (hero-library.jpg unreferenced)
├── server/                      EMPTY directory (leftover of a deleted Node backend)
├── tsconfig.json
├── vite.config.ts               Vite config + 4 inline Figma plugins (~430 lines)
└── src/
    ├── main.tsx                 React entry: <AppProvider><App/></AppProvider>
    ├── App.tsx                  Shell, phase machine (landing → auth → app), view router
    ├── store.tsx                ~2000-line global store: all Firebase reads/writes (the backend layer)
    ├── types.ts                 All shared domain types
    ├── firebase.ts              Lazy Firebase app/auth/db/storage + error-message mapping
    ├── security.ts              Founder check, email/institution heuristics, text sanitising, legacy PBKDF2
    ├── data.ts                  Nav items, 40 subjects, grades, subject colour tints, storage caps
    ├── formats.ts               Resource format taxonomy, extension maps, upload validation, embeds
    ├── documents.ts             Pure-TS ZIP inflate + PPTX and DOCX parsers (~970 lines, no deps)
    ├── file-vault.ts            IndexedDB blob vault ("coursify_vault") for uploaded files
    ├── notifications.ts         Offline-recipient email dispatch (webhook optional) + cooldown
    ├── sound.ts                 Web Audio synthesised message chime + autoplay unlock
    ├── slides.ts                Slide sanitising helpers (currently unused by any component)
    ├── emojis.ts                7-category emoji catalog (464 emojis) + keyword search
    ├── utils.ts                 Formatting, search/ranking, downloads, presence helpers
    ├── index.css                Tailwind import + @theme design tokens + global resets
    ├── vite-env.d.ts            ImportMetaEnv typing for the 6 VITE_FIREBASE_* keys
    └── components/              29 components (see §8 and §13)
```

---

## 4. Overall architecture

There is **no server tier**. The browser is the only compute; Firestore security rules are the only authorisation boundary.

```
┌──────────────────────────────────── BROWSER (React 19 SPA) ─────────────────────────────────────┐
│                                                                                                  │
│   main.tsx ──► AppProvider (src/store.tsx)                                                       │
│                  │  • single React Context holding ALL app state                                 │
│                  │  • 9 live onSnapshot listeners (educators×2, resources, posts, follows,       │
│                  │    saves, conversations, messages, events) + meta/stats                       │
│                  │  • every mutation is a direct Firestore write wrapped in withTimeout()        │
│                  │                                                                               │
│                  ├──► App.tsx  (phase: landing | auth | app;  view: 9 values)                    │
│                  │      ├─ Landing / AuthScreen              (signed out)                        │
│                  │      └─ Header + Sidebar + one of:                                            │
│                  │           Dashboard · DirectoryView · MeetupsView · MessagesView ·            │
│                  │           UploadsView · SavedView · SubjectsView · AdminAnalyticsView ·       │
│                  │           Profile                                                             │
│                  │                                                                               │
│                  ├──► IndexedDB "coursify_vault" (file-vault.ts) — original binaries             │
│                  ├──► localStorage — profile cache, badge dismissal, email audit log,            │
│                  │                    landing contact-form submissions                           │
│                  └──► Web Audio / MediaRecorder / Canvas — chime, voice notes, photo crop,       │
│                                                            image compression, PPTX/DOCX parsing  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
          │ Firebase JS SDK v12 (direct, no proxy)              │ optional fetch POST
          ▼                                                     ▼
┌───────────────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐
│ Firebase Authentication       │  │ Cloud Firestore      │  │ VITE_EMAIL_DISPATCH_URL      │
│  Email/Password only          │  │  9 collections       │  │  (unset → no-op; only a      │
│  IndexedDB persistence        │  │  firestore.rules     │  │   console.info is logged)    │
└───────────────────────────────┘  └──────────────────────┘  └──────────────────────────────┘
          │                                   │
          ▼                                   ▼
┌───────────────────────────────┐  ┌──────────────────────┐   ┌─────────────────────────────┐
│ Firebase Storage              │  │ Firebase Hosting     │   │ External embeds             │
│  avatars/{uid}/**             │  │  site coursify-a1a0d │   │  YouTube / Vimeo / GitHub   │
│  resources/{uid}/** (≤50 MiB) │  │  SPA rewrite, cache  │   │  Google Maps embed          │
└───────────────────────────────┘  └──────────────────────┘   └─────────────────────────────┘
```

### Notable architectural decisions (inferred)

1. **Serverless-by-omission.** Commit `dddcecb` ("Add a shared server so educators can sign in, follow, and chat from any device") introduced a Node server persisting to `data/coursify.json`; commit `d853507` ("Configure Firebase cloud integration") replaced it. The empty `server/` folder, the stale `data/coursify.json`, and the unused PBKDF2 password code in `security.ts` are all fossils of that migration.
2. **Spark (free) tier assumed.** Commit `79f2700` is explicit: *"bulletproof uploads with Firestore base64 and local storage fallback on Spark tier."* Firebase Storage uploads are attempted with a **5-second timeout**; on failure the code silently falls back to (a) a base64 data-URI inside the Firestore document when ≤ 650 KB, or (b) a browser `blob:` object URL plus a synthetic `coursify-cloud-storage://` marker URL when larger. The 650 KB / 700 KB thresholds exist to stay inside Firestore's 1 MiB document limit.
3. **Triple-redundant file retention.** Every upload is written to the IndexedDB vault *first*, then attempted to Storage, then possibly to Firestore as base64. `hydrateResource()` resolves in the order: in-memory cache → IndexedDB vault → Storage `getDownloadURL` → fetch-and-base64.
4. **Zero-dependency document parsing.** `documents.ts` implements ZIP central-directory parsing and DEFLATE inflation (via `DecompressionStream`) plus an OOXML slide/geometry/theme renderer by hand rather than pulling in JSZip/pptxgenjs — presumably to keep the bundle small inside the Figma Make scaffold.
5. **Everything in one context.** There is no routing library, no state manager, no data-fetching library. `App.tsx` holds `view` in `useState`; the URL never changes (the SPA rewrite exists only so deep-link refreshes do not 404).

---

## 5. Data models / database schema

### Firestore collections

All documents are flat (no subcollections). Timestamps are **ISO-8601 strings**, not Firestore `Timestamp` objects.

#### `educators/{uid}` — document id **is** the Firebase Auth UID
| Field | Type | Notes |
|---|---|---|
| `email` | string | normalised lowercase; immutable after create (enforced by rules) |
| `name`, `initials` | string | initials derived from name |
| `school` | string | free text, may be empty |
| `subject` | string | free text normalised via `normalizeSubject`; 40 suggested values in `data.ts` |
| `bio` | string | ≤ 800 chars, sanitised |
| `joinedYear` | number | |
| `createdAt` | string ISO | ⚠️ rewritten to *now* on every `educatorPayload()` call |
| `updatedAt` | string ISO | written by `updateProfile` only |
| `storageBytes` | number | incremented/decremented on upload/delete |
| `verified` | boolean | |
| `badgeClaimed` | boolean | |
| `badgeClaimedAt` | string ISO | |
| `institutionLevel` | `"high-school" \| "university"` | |
| `photoData` | string | data-URI (≤ 700 000 chars) or https URL; `deleteField()` when removed |
| `lastActiveAt` | string ISO | presence heartbeat, ≤ 60 s cadence |

#### `resources/{resourceId}` — id generated client-side as `res-<base36 ts>-<rand>`
| Field | Type | Notes |
|---|---|---|
| `title`, `subject`, `grade` | string | |
| `authorId` | string | → `educators.id` |
| `kind` | `"resource" \| "lesson-plan" \| "collection"` | drives the profile tabs |
| `format` | `"video" \| "slides" \| "document" \| "spreadsheet" \| "code"` | |
| `type` | string | display label, e.g. `"Lesson plan · PPTX slides"` |
| `mimeType`, `fileName`, `fileSize`, `fileBytes` | | `fileSize` is a display string, `fileBytes` the number |
| `fileData` | string | base64 data-URI fallback (≤ ~650 KB) |
| `fileUrl` | string | Storage download URL **or** the synthetic `coursify-cloud-storage://…` marker |
| `storagePath` | string | `resources/{uid}/{resourceId}/{fileName}` |
| `sourceUrl` | string | external link (YouTube / Vimeo / GitHub / direct file) |
| `slides` | `Slide[]` | up to 30, auto-extracted from PPTX at upload time |
| `downloads`, `saves` | number | counters, incremented by any signed-in user |
| `hasFile` | boolean | |
| `createdAt` | string | **date-only** `YYYY-MM-DD` (inconsistent with every other collection) |

#### `posts/{autoId}`
`authorId`, `body` (≤ 800 chars), `resourceId?`, `createdAt` (ISO). Auto-created on every resource upload with the body `"Shared <title> with the library."`.

#### `follows/{followerUid}_{followeeUid}`
`followerId`, `followeeId`, `createdAt`. The deterministic id makes follow/unfollow idempotent.

#### `saves/{userUid}_{resourceId}`
`userId`, `resourceId`. Readable only by the owner.

#### `conversations/{uidA:uidB}` — id is the two UIDs sorted and joined with `:`
`participantIds: [string, string]` (sorted), `updatedAt` (ISO), `lastMessage` (string preview — **written but absent from the `Conversation` TypeScript type**), `lastReadAt: { [uid]: ISO }`.

#### `messages/{autoId}`
`conversationId`, `senderId`, `participantIds: string[]` (denormalised for the rules + array-contains query), `body`, `createdAt` (ISO), `attachmentUrl?` (https URL or data-URI ≤ 700 000 chars), `attachmentName?`, `attachmentType?`, `attachmentSize?`, `status?` (`"sent" | "delivered" | "read"` — **always written as `"delivered"`; never transitions to `"read"`**).

#### `events/{eventId}` — meetups, id `evt-<ts>-<rand>`
`title`, `description`, `hostId`, `format` (`"in-person" | "online"`), `startsAt` (ISO), `location?`, `meetingUrl?`, `rsvpIds: string[]`, `createdAt`.

#### `meta/stats` — single global document
`hasAccounts: boolean`, `users: number` (incremented on signup). World-readable, founder-writable per rules; **but the app writes to it from any client on signup**, which the rules forbid for non-founders — see §11.

### Relationships

```
educators 1──N resources      (resources.authorId)
educators 1──N posts          (posts.authorId)
educators 1──N events         (events.hostId)
educators N──N educators      via follows (followerId / followeeId)
educators N──N resources      via saves  (userId / resourceId)
educators 2──1 conversations  (participantIds, sorted pair = doc id)
conversations 1──N messages   (messages.conversationId + denormalised participantIds)
events N──N educators         (events.rsvpIds array)
posts 0..1──1 resources       (posts.resourceId)
```

### Composite indexes (`firestore.indexes.json`)
1. `conversations`: `participantIds` ARRAY_CONTAINS + `updatedAt` DESC
2. `messages`: `participantIds` ARRAY_CONTAINS + `createdAt` ASC

### Firebase Storage layout (`storage.rules`)
| Path | Read | Write |
|---|---|---|
| `avatars/{userId}/**` | any signed-in user | owner only |
| `resources/{userId}/**` | any signed-in user | owner only, object ≤ 50 MiB |

Chat attachments are written to `resources/{uid}/chat/{fileId}_{name}` — i.e. inside the resources scope, not a dedicated one.

### Firestore security rules summary (`firestore.rules`)
- `isFounder()` = `request.auth.token.email == 'kabuyaentambwe03@gmail.com'` (hard-coded).
- `meta/**`: public read, founder-only write.
- `educators`: signed-in read; create restricted to own uid with matching email and `verified == false` (unless founder); update restricted to own uid, email immutable, and `verified` may only flip `false→true` when `badgeClaimed` is also set and *only* the keys `verified`, `badgeClaimed`, `badgeClaimedAt` change; delete own only.
- `resources`: signed-in read; author-only create/delete; update by author **or** by anyone if only `downloads`/`saves` change.
- `posts`: signed-in read; author-only create/delete. **No update rule** (posts are immutable).
- `follows`: signed-in read; create by the follower; delete by either party.
- `saves`: owner-only read/create/delete.
- `conversations`: participants only; `participantIds` immutable on update.
- `messages`: participants read; sender-only create; either participant may delete.
- `events`: signed-in read; host-only create/delete; update by host **or** by anyone if only `rsvpIds` changes.

### Legacy schema — `data/coursify.json`
A snapshot from the deleted Node backend, schema version `5`: `{ educators[], resources[], savedByUser{}, followsByUser{}, posts[], conversations[], messages[] }` with **PBKDF2 `passwordHash`/`passwordSalt`/`sessionToken` per educator** and two seed accounts (`josue@school.edu`, `saskia@school.edu`). It is matched by the `.gitignore` pattern `data/*.json`, so it exists only on this machine. **No running code reads it.**

---

## 6. API / existing endpoints

**There are no HTTP endpoints authored by this project.** No REST routes, no GraphQL, no Cloud Functions, no `server/` implementation. The `server/` directory is empty.

All data access is the Firebase client SDK speaking directly to Google's services. The functional equivalent of an "API layer" is the `AppStore` contract exposed by `src/store.tsx`:

| Store method | Effect on Firestore / Storage / Auth | Returns |
|---|---|---|
| `login(email, password)` | `signInWithEmailAndPassword` + `getDoc(educators/{uid})` | `string \| null` (error message) |
| `signup(input)` | `createUserWithEmailAndPassword` → `setDoc(educators/{uid})` → `setDoc(meta/stats, {hasAccounts, users: increment(1)}, merge)` | `string \| null` |
| `logout()` | `signOut` | `void` |
| `deleteAccount(password)` | reauth, then cascade-deletes resources, posts, saves, follows (both directions), events, conversations, messages, `avatars/{uid}`, `resources/{uid}`, the educator doc, then `deleteUser` | `string \| null` |
| `updateProfile(patch)` | `setDoc(educators/{uid}, {...}, merge)`; removes `photoData` with `deleteField()` | `string \| null` |
| `claimVerifiedBadge()` | `updateDoc(educators/{uid}, {verified, badgeClaimed, badgeClaimedAt})` | `string \| null` |
| `uploadResource(input, onProgress)` | vault save → Storage upload (5 s budget) → `setDoc(resources/{id})` → `addDoc(posts)` → `updateDoc(educators/{uid}, {storageBytes: increment(size)})` | `string \| null` |
| `deleteResource(id)` | vault delete + Storage `deleteObject` + `deleteDoc(resources/{id})` + storageBytes decrement | `void` (fire-and-forget) |
| `hydrateResource(id)` | read-only resolution: memory → IndexedDB → Storage URL → fetch-to-base64 | `Resource \| undefined` |
| `downloadResource(id)` | hydrate + `updateDoc(resources/{id}, {downloads: increment(1)})` | `Resource \| undefined` |
| `toggleSave(id)` | `setDoc`/`deleteDoc(saves/{uid}_{id})` + `saves` counter | `void` (throws on error) |
| `toggleFollow(id)` | `setDoc`/`deleteDoc(follows/{uid}_{id})` | `void` (throws) |
| `publishPost(body, resourceId?)` | `addDoc(posts)` | `string \| null` |
| `uploadChatAttachment(file)` | Storage upload (5 s) → fallback: image compression to JPEG data-URI, or raw data-URI ≤ 500 KB | `ChatAttachment` (throws) |
| `sendMessage(peerId, body, attachment?)` | `setDoc(conversations/{id}, merge)` → `updateDoc(lastReadAt.{uid})` → `addDoc(messages)` → optional offline email dispatch | `string \| null` |
| `markConversationRead(id)` | `updateDoc(conversations/{id}, {lastReadAt.{uid}})` | `void` |
| `createMeetup(input)` | `setDoc(events/{id})` | `string \| null` |
| `toggleEventRsvp(id)` | `updateDoc(events/{id}, {rsvpIds: arrayUnion/arrayRemove})` | `void` (throws) |
| `deleteMeetup(id)` | `deleteDoc(events/{id})` | `void` (throws) |

**Live subscriptions** (all opened in one effect keyed on `authUser.uid`): `educators/{uid}`, `educators` (full collection), `resources` (full), `posts` (full), `follows` (full), `saves where userId == uid`, `conversations where participantIds array-contains uid`, `messages where participantIds array-contains uid`, `events` (full), plus `meta/stats`.

### The one outbound HTTP call
`src/notifications.ts → dispatchOfflineEmailNotification()`

- **Method/URL:** `POST ${import.meta.env.VITE_EMAIL_DISPATCH_URL}` — **only if that variable is set**. It is not in `env.example`, not in `.env.local`, and not typed in `vite-env.d.ts`.
- **Body:** `{ to, toName, fromName, subject, html, text }` — a ready-made transactional email.
- **Trigger:** a message is sent to a recipient whose `lastActiveAt` is older than 2 minutes.
- **Guard:** 10-minute per-recipient cooldown tracked in memory + `localStorage`.
- **Current behaviour with no endpoint configured:** the payload is appended to a `localStorage` audit log (`coursify.notifications.email_log`, capped at 50) and printed with `console.info`. **No email is ever delivered.**

---

## 7. Implemented features

Status legend: **Working** = complete, coherent code path; **Partial** = works but with a material limitation or unfinished branch; **Broken/Defective** = a defect is visible in the code (not runtime-verified in this audit).

### Working

| Feature | Detail |
|---|---|
| Email/password signup & sign-in | Firebase Auth; 8-char minimum; detailed error-code → human-message mapping in `firebase.ts`; a "No account found" branch offers a one-click jump to signup with the email pre-filled. |
| Session persistence | IndexedDB (→ localStorage fallback) + a localStorage profile cache so a reload restores the profile before Firestore answers. |
| Profile CRUD | Name, school, subject (searchable 40-item picker), bio, institution level, photo. Text is sanitised (tags + control chars stripped, length-capped). |
| Avatar upload & cropping | `photo-cropper.tsx`: 192×192 canvas crop with zoom/pan, exported as JPEG q0.72 data-URI; ≤ 8 MB source, rejects non-images. |
| Account deletion | Re-authentication required, then a full cascade delete of all user rows and Storage folders, then `deleteUser`. |
| Follow / unfollow | Deterministic doc ids; mutual-connection, "Follows you" and "Follow back" states are computed and surfaced in the UI. |
| Resource upload | 5 formats × 3 kinds, file **or** external link, subject + grade metadata, per-format extension validation, 50 MiB cap, 10 GB per-user quota check, live progress bar. |
| Automatic PPTX slide extraction | On upload of a `.pptx`, the first 30 slides' text is parsed into `slides[]` for in-app preview. |
| In-app resource preview | Full modal renderer: YouTube/Vimeo embed, `<video>`, PDF via iframe/object URL, CSV table, plain text, DOCX text extraction, native PPTX slide rendering (shapes, fills, gradients, images, tables, theme colours), GitHub repo card, generic file notice. |
| Download / open | Data-URI → Blob download, direct URL download, or `window.open` for link-only resources; download counter incremented. |
| Save / bookmark | Per-user `saves` docs + a `saves` counter on the resource; dedicated Saved view. |
| Academic feed | Posts from yourself + everyone you follow, with an optional attached resource card; free-text composer with a resource dropdown. |
| Direct messaging | Real-time via `onSnapshot`; conversation list with previews, unread counts and search; auto-scroll; Enter-to-send; unread state from `lastReadAt`. |
| Voice notes | `MediaRecorder` Opus @ 20 kbps mono, hard 3-minute limit, live timer and waveform animation, custom playback bubble with scrubber. |
| Chat attachments | Images auto-compressed (canvas, max 1200 px, q0.75→0.55→0.5) to fit the 700 KB ceiling; other files ≤ 500 KB inline. |
| Emoji picker | 464 emojis across 7 categories (Smileys, People, Academic, Symbols, Celebration, Daily, Flags) with keyword search. |
| Message chime | Synthesised two-note Web Audio chime, fired only for messages from others less than 25 s old; autoplay unlocked on first gesture. |
| Presence | `lastActiveAt` heartbeat ≤ every 60 s on pointer/key/focus/visibility; "Active now" / "Active 12m ago" labels; green/grey dots. |
| Meetups | Create in-person (with Google Maps embed preview) or online (URL validated/normalised) events; RSVP toggle; filters Upcoming / In person / Online / Going / Hosting; host can cancel. |
| Colleague directory | Search by name/school/subject/email/bio with diacritic folding and multi-token matching; filters by institution level and discipline; results hidden until a query or filter is set (privacy-by-default). |
| Subjects view | 40 subject cards with per-subject resource and download counts; Community ↔ My Materials scope toggle. |
| Global search | Header search (⌘K / Ctrl+K) with a live colleague dropdown; Enter routes to Discover. |
| Admin analytics | Founder-only dashboard: educator/resource/meetup/RSVP totals, high-school vs university split, verified count, per-format breakdown, download/save/byte totals, 10 newest educators, 5 next meetups. Double-gated (`isFounder` + `isFounderEmail`). |
| CV generation | Derives a plain-text CV from the profile, with a preview modal and `.txt` download. |
| Landing page | Full marketing site: hero, product, practice, meetups, mission, contact, 4-column footer. |
| Toasts | Global 2.8 s toast viewport driven by `notify()`. |
| Offline/reconnect banner | A navy bar appears whenever a snapshot listener errors (`live === false`). |
| Responsive shell | Mobile drawer nav, mobile search row, sticky header, `overflow-x-hidden` guards. |

### Partial

| Feature | Limitation |
|---|---|
| **File storage** | Firebase Storage is attempted with only a **5-second** timeout and, on any failure, abandoned *silently*. On a slow connection a perfectly valid Storage upload is cancelled and the file degrades to a Firestore base64 blob or a browser-local `blob:` URL. Files > 650 KB that miss the Storage window get `fileUrl = "coursify-cloud-storage://…"`, which is **not a real URL**: the resource is then downloadable only in the uploading browser (from the IndexedDB vault); on any other device `fileToDataUrl()` throws *"Local simulated storage; please download directly."* |
| **Offline email notifications** | End-to-end code exists but there is no configured endpoint. Without `VITE_EMAIL_DISPATCH_URL` no email is ever sent — only a console log and a localStorage entry. The variable is also undocumented in `env.example`. |
| **Landing contact form** | Submissions are written to `localStorage` under `coursify.contact.v1` and an artificial 550 ms delay simulates sending. **Nothing is transmitted anywhere**; the founder never receives the message. The success screen nonetheless reads as though it was delivered. |
| **Message read receipts** | `status` is written as `"delivered"` and never updated to `"read"`. Unread state is derived from `conversations.lastReadAt` instead, so the per-message tick UI cannot show a true read state. |
| **Verified badge** | Two independent mechanisms coexist: an auto-award effect and a manual "Claim" banner, plus `toEducator`/`mergeEducator` locally coercing `verified` to `true` whenever `badgeClaimed` is set. Criteria: complete profile + ≥ 3 published resources (or founder email). There is no human review step despite the "Verified Educator" language. |
| **"Verified educators only" gating** | `auth-screen.tsx` displays *"Verified educators only"* and `security.ts` contains a 70-domain free-email blocklist plus institutional-domain heuristics — but `professionalEmailError()` **only checks that the string looks like an email**. `isInstitutionalEmail` and `isFreeEmailProvider` are never called. Commit `fb343ae` ("allow all valid emails") deliberately relaxed this; the copy was not fully updated (the signup body text does say "any valid email address"). |
| **`slides` upload input** | `UploadInput.slides` and the whole `src/slides.ts` sanitiser exist, but no component lets a user author slides manually; only auto-extraction from PPTX populates the field. |
| **Search relevance** | `rankEducatorSearchResults` sorts alphabetically (self first). There is no relevance scoring despite the "ranked" name. |
| **`hasAccounts` meta** | Read from `meta/stats` to show "No educators have registered yet" on the login screen, and written on signup — but the write violates the founder-only rule (see below), so the flag likely never turns true in production. |

### Broken / defective (visible in code)

| Issue | Where | Consequence |
|---|---|---|
| Duplicated presence heartbeat | `store.tsx` has **two** separate heartbeat effects (one keyed on `authUser.uid`, one on `authUser`/`currentUser.id`), each with its own listeners, interval and throttle. | Double the listeners and roughly double the Firestore writes; the two throttles are independent so the intended 60 s floor is not honoured. |
| Duplicated badge auto-award | `store.tsx` has an inline auto-award effect **and** a second effect calling `claimVerifiedBadge()` under the same condition. | Two concurrent `updateDoc` writes and potentially two "Congratulations" toasts. |
| `createdAt` overwritten | `educatorPayload()` always sets `createdAt: new Date().toISOString()`. | Any full-profile persist resets the join date. Admin analytics sorts "newest educators" by `createdAt`, so that ordering is unreliable. |
| `meta/stats` write vs. rules | `signup()` writes `meta/stats` from the new user's client; `firestore.rules` allows `meta` writes only for the founder. | The write is rejected (the error is caught and surfaced as a toast). `hasAccounts` stays stale. |
| `logout()` error handling inverted | Local state is cleared **only in the `catch`** branch. On a *successful* `signOut`, clearing relies on the `onAuthStateChanged` listener. | Works in practice, but the intent is inverted and a slow listener leaves stale UI. |
| Unused duplicate component path | `src/components/resource-feed.tsx` is imported **only** through a re-export at the bottom of `dashboard.tsx`. Three views import it from `dashboard`, dragging the whole Dashboard module into their graph. | Pointless coupling; confusing to a new reader. |
| `photoData` size mismatch | `persistablePhoto` caps at 700 000 chars; the dead `sanitizeEducator` caps at 900 000; the cropper emits ≈ 40–80 KB. | Harmless today, but photos above the cap are silently dropped with no user feedback. |
| Chat attachments outside the quota | `uploadChatAttachment` writes to `resources/{uid}/chat/…` but never updates `storageBytes`. | The 10 GB quota under-counts chat files. |

---

## 8. Existing UI / screens

### Top-level phases (`App.tsx`)
1. `WorkspaceSplash` — "Opening your workspace…" while `ready === false`.
2. `landing` — marketing site (signed out).
3. `auth` — sign-in / sign-up split screen.
4. `app` — Header + Sidebar + one of nine views.

Post-signup, if `bio` or `school` is empty, the user is routed straight to their profile with the editor open.

### Authenticated views (`View` union, 9 values)
| View | Component | Purpose |
|---|---|---|
| `dashboard` | `dashboard.tsx` | "Academic feed": navy hero with greeting and date, colleague-search results, new-follower follow-back cards, 4 stat tiles (Following / Followers / Your uploads / Feed posts), post composer with resource attach, post list, "Discover colleagues" sidebar. |
| `discover` | `directory-view.tsx` | Faculty directory: large search bar, institution-level filter, 8 popular-discipline chips + a full-subject `<select>`, results as `EducatorCard`s. Results stay empty until a query or filter is applied. |
| `meetups` | `meetups-view.tsx` | Event board with 5 filters, "Host a meetup" CTA, RSVP, embedded Google Map for in-person events, join link for online events. |
| `messages` | `messages-view.tsx` (1160 lines) | Two-pane chat: conversation list (search, previews, unread badges, timestamps) + thread (header with presence, message bubbles, attachment cards, audio bubbles, timestamp/receipt row), input bar with emoji picker, file attach, voice recorder and send. |
| `uploads` | `uploads-view.tsx` | `ResourceFeed` over `myResources` with subject chips. |
| `saved` | `saved-view.tsx` | `ResourceFeed` over `savedResources`. |
| `subjects` | `subjects-view.tsx` | 40 subject cards with counts, Community/My-Materials toggle, then a filtered `ResourceFeed`. |
| `admin` | `admin-analytics-view.tsx` | Founder-only platform metrics; shows an "Access Restricted" card to anyone else. |
| `profile` | `profile.tsx` | Cover banner, avatar, name + verified/founder pill, school, subject, institution level, join year, 4 metric tiles, bio panel, CV panel (download + preview), tabbed uploads grid (Resources / Lesson Plans / Collections), Follow/Message or Edit/Upload actions. |

### Modals & overlays
| Component | Purpose |
|---|---|
| `upload-modal.tsx` | Format selector (5 tiles), title, subject picker, grade, kind, file drop/browse or link field, progress bar, format-specific hints. |
| `resource-preview.tsx` | Full-screen resource viewer (see §7) with download and save actions. |
| `profile-editor.tsx` | Edit name/school/subject/bio/institution/photo; danger zone with password-confirmed account deletion. |
| `photo-cropper.tsx` | 192 px square crop with zoom slider and drag pan. |
| `cv-modal.tsx` | CV preview with download. |
| `meetup-modal.tsx` | Create meetup: title, description, format toggle, datetime-local, venue (with live map preview) or meeting URL. |
| `subject-picker.tsx` | Searchable combobox over the 40 subjects, with free-text custom entry. |
| `toast-viewport.tsx` | Bottom-right (bottom-centre on mobile) toast stack. |
| `verified-badge-banner.tsx` | Celebratory banner after earning the badge (dismissal stored per user in localStorage) or a "Claim Verified Badge" CTA. |
| Mobile nav drawer | Inline in `App.tsx`, `<lg` breakpoint. |

### Shared presentational components
`header.tsx` (sticky top bar, search, messages badge, upload, profile chip), `sidebar.tsx` (8 nav items + storage meter + support/Instagram links + sign out), `avatar.tsx`, `logo.tsx` (`Logo` + `CoursifyMark` SVG), `icons.tsx` (48 hand-drawn 20×20 SVG icons), `format-mark.tsx`, `resource-card.tsx`, `resource-feed.tsx`, `post-card.tsx`, `educator-card.tsx`.

### Design system (`src/index.css`)
Tokens via Tailwind v4 `@theme`: `canvas #f6f5f2`, `surface #ffffff`, `ink #12141c`, `muted #6b6f7a`, `line #e7e5e0`, `line-strong #d8d5ce`, `navy #1a2b4a`, `navy-hover #101d38`, `navy-soft #eef1f7`. Fonts: Archivo (display), Inter (sans), JetBrains Mono (mono). **Light mode only — there is no dark-mode definition anywhere.**

---

## 9. Configuration & required environment variables

### Required to run (`env.example`, consumed in `src/firebase.ts`, typed in `src/vite-env.d.ts`)
| Variable | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `coursify-a1a0d.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | must match the project selected by `firebase use --add` |
| `VITE_FIREBASE_STORAGE_BUCKET` | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | |
| `VITE_FIREBASE_APP_ID` | |

All six are checked by `isFirebaseConfigured()`; if any is missing the app boots into a "not connected to Firebase" state where login and signup return an explanatory error.

### Present but unused / undocumented
| Variable | Status |
|---|---|
| `VITE_FIREBASE_measurement_Id` | Present in the local `.env.local` (note the non-standard casing) but **never read** — `firebaseConfig` has no `measurementId`, and Analytics is not initialised. |
| `VITE_EMAIL_DISPATCH_URL` | Read by `notifications.ts` for the offline-email webhook. **Missing from `env.example` and from `vite-env.d.ts`.** Point to clarify with the owner: is an email service planned, and which one? |
| `PORT` | Read by `vite.config.ts` for both dev and preview servers; defaults to `8443`. |
| `FIGMA_PUBLIC_URL` | If set, becomes the Vite `base` path (Figma Make preview hosting). |

### Non-env configuration
| File | Contents |
|---|---|
| `.firebaserc` | `projects.default = "coursify-a1a0d"` |
| `firebase.json` | Hosting site `coursify-a1a0d`, public `dist`, SPA rewrite, `no-cache` on `index.html`, 1-year immutable cache on hashed assets; Firestore + Storage rule/index file paths |
| `.figma/make/site.json` | Title "Coursify", meta description, favicon `/favicon.svg`, **`robots.index: false`** → every production build emits `robots.txt` with `Disallow: /` and a `noindex, nofollow` meta tag. The public site is therefore de-indexed. **Point to clarify with the project owner.** |
| `.mise.toml` | Node 22, pnpm 10.34.3 |
| `public/_redirects` | SPA fallback for Netlify/Render |

### Hard-coded values worth knowing
| Value | Location |
|---|---|
| Founder email `kabuyaentambwe03@gmail.com` | `src/security.ts` (`FOUNDER_EMAIL`), `firestore.rules`, `src/components/landing.tsx` (`SUPPORT_EMAIL`), `src/components/sidebar.tsx` (mailto link) — **four places** |
| App URL `https://coursify-a1a0d.web.app` | `src/notifications.ts` (email template default) |
| Instagram `https://www.instagram.com/cours.ify/` | `landing.tsx`, `sidebar.tsx` |
| `STORAGE_CAP_BYTES = 10_000_000_000` (10 GB per educator) | `src/data.ts` |
| `MAX_FILE_BYTES = 50 MiB` | `src/data.ts`, mirrored in `storage.rules` |
| Firestore inline-file thresholds: 650 000 / 700 000 chars | `store.tsx`, `messages-view.tsx` |
| Voice note limit 180 s | `messages-view.tsx` |
| Presence "online" window: 2 minutes | `utils.ts` |
| Request timeouts: 12 s generic, 8 s reads, 45 s / **5 s** uploads | `store.tsx` |

### Setup runbook (from `README.md`)
1. Create a Firebase project (Spark plan is enough). 2. Enable Email/Password auth. 3. Create a Firestore database in production mode. 4. Enable Storage. 5. Add a Web app and copy the config into `.env.local`. 6. `npm install`, `npm i -g firebase-tools`, `firebase login`, `firebase use --add` (alias `default`). 7. `npm run build && firebase deploy` — or `npm run deploy`. Local dev: `npm run dev`, then `http://localhost:8443/`.
*(The README's example `cd` path is `D:\My Projects\Coursify`; the repository is actually on `E:`.)*

---

## 10. Existing tests

**There are none.**

- No test runner in `package.json` (no Vitest, Jest, Playwright, Cypress, Testing Library).
- No `*.test.*`, `*.spec.*`, `__tests__/`, or `*.stories.*` files anywhere in the repo.
- `vite.config.ts` configures a `figmaMakeKitPlugin` with `storiesGlob: '/src/**/*.stories.{ts,tsx,js,jsx}'` for the Figma design surface, but **zero story files exist**, so that route renders an empty registry.
- No CI configuration (`.github/`, `.gitlab-ci.yml`, etc.) exists.
- Firestore rules are untested (no `@firebase/rules-unit-testing`, no emulator config in `firebase.json`).
- There is no type-check step either: `tsc --noEmit` is never run by `npm run build` (Vite does not type-check).

Quality assurance is therefore entirely manual. Several commit messages ("QA: …", "Fix sign-in loop …", "Reset form loading states so Save, Delete, and Upload never stick") confirm a manual test-and-patch cycle.

---

## 11. Technical debt and identified weaknesses

### Architecture & structure
1. **`store.tsx` is a 1 989-line god-module.** It contains the domain mapping layer, every Firestore query and mutation, the file upload/fallback strategy, image compression, PPTX extraction glue, presence, badge logic and the React context. It has no internal boundaries, and every consumer re-renders on any state change.
2. **Whole-collection listeners.** `educators`, `resources`, `posts`, `follows` and `events` are subscribed **without any `where`, `limit`, or `orderBy`**. Every signed-in client downloads every document in those collections and re-downloads on every change. This does not scale past a few hundred users/resources and has a direct Firestore read-cost impact.
3. **Sorting and filtering are all client-side** (feed order, conversation order, subject counts, directory ranking, analytics aggregates). The admin dashboard computes platform-wide statistics in the browser from the fully-downloaded collections.
4. **Dead `server/` directory and stale `data/coursify.json`** left over from the removed Node backend.
5. **Awkward import path:** `saved-view`, `uploads-view` and `subjects-view` import `ResourceFeed` from `dashboard.tsx`, which merely re-exports `resource-feed.tsx`.

### Dead / unused code
6. **`src/security.ts`** still exports a full legacy auth stack that nothing calls: `randomToken`, `hashPassword`, `createPasswordRecord`, `passwordsMatch`, `PersistedEducator`, `sanitizeEducator`, `publicEducator` (≈ 110 lines of PBKDF2/session-token code superseded by Firebase Auth).
7. **`isInstitutionalEmail` / `isFreeEmailProvider`** (a 70-entry domain blocklist plus institutional heuristics) are defined and never invoked — the "verified educators only" promise is unenforced.
8. **`src/slides.ts`** (`sanitizeSlide`, `sanitizeDeck`) is imported by nothing.
9. **`isSubject`** in `data.ts` is only referenced from the dead `sanitizeEducator`.
10. **`public/landing-images/hero-library.jpg`** (1.8 MB) is unreferenced; `picture 1.jpg` is byte-identical to it. The whole `picture landing page/` folder (5.7 MB of JPEGs) duplicates `public/landing-images/` and is not used by the build.

### Duplication
11. **`readFileAsDataUrl`** is implemented twice, identically — in `store.tsx` and in `utils.ts`.
12. **`isHttpUrl`** is implemented twice, identically — in `utils.ts` and in `formats.ts`.
13. **Two presence heartbeat effects** and **two badge auto-award paths** in `store.tsx` (see §7).
14. **Four hard-coded copies of the founder email**; only `security.ts` and `admin-analytics-view.tsx` use the `FOUNDER_EMAIL` constant.
15. **`ResourceFeed`** exists once but is reached through two module paths.
16. A **51-branch nested ternary** maps file extensions to MIME types in `store.tsx::uploadResource` — `formats.ts` already owns the extension taxonomy and should own this too.

### Correctness & data integrity
17. **`createdAt` is overwritten on every profile persist** (`educatorPayload`).
18. **`resources.createdAt` is date-only** (`YYYY-MM-DD`) while every other collection uses full ISO timestamps; ordering within a day is arbitrary.
19. **`conversations.lastMessage`** is written but missing from the `Conversation` type, so it is invisible to TypeScript consumers.
20. **`ChatMessage.status`** never leaves `"delivered"`.
21. **The `meta/stats` signup write contradicts `firestore.rules`** and always fails for non-founders.
22. **Counters are not transactional.** `downloads`, `saves` and `storageBytes` use `increment()` from the client with no transaction wrapping the paired writes; a partial failure (e.g. the `saves` doc written but the counter update rejected) permanently desynchronises them. `toggleSave` does exactly two sequential writes with no rollback.
23. **`deleteResource` is fire-and-forget** (`void (async () => …)()`), so callers cannot surface failures.
24. **Chat attachments bypass `storageBytes`**, so the quota under-counts.

### Security & privacy
25. **Any signed-in user can read the entire `educators` collection, including every colleague's email address.** The rules allow it and the client downloads it; `Profile` hides the email in the UI for non-owners, but the data is on the wire.
26. **Any signed-in user can mutate any resource's `downloads`/`saves`** and any event's `rsvpIds` (the rules permit key-scoped writes with no value validation) — trivial counter inflation or RSVP tampering.
27. **Either participant can delete any message in a conversation**, including the other person's messages.
28. **Self-service verification.** The `verified` flag can be flipped `false→true` by the user themselves as long as `badgeClaimed` is set in the same write. The client-side "≥ 3 resources + complete profile" check is **not** mirrored in the rules, so it is bypassable by anyone using the SDK directly.
29. **Client-side-only sanitisation.** `sanitizePlainText` strips tags and control characters, but nothing server-side validates field shapes, lengths, or types — the rules check ownership, not content. A crafted client can write arbitrary fields.
30. **`.env.local` contains live Firebase keys** in the working tree. It is gitignored, and Firebase web keys are not secrets, so this is expected practice — but the `measurement_Id` casing suggests hand-editing.
31. **`robots.index: false`** ships `noindex, nofollow` + a blocking `robots.txt` to production. If the marketing landing page is meant to be discoverable, this is a live defect.
32. **`window.confirm`** is used for resource deletion — no custom dialog, inconsistent with every other modal in the app.

### Reliability & UX
33. **The 5-second Storage upload budget** is the single most consequential piece of debt: it converts a transient network hiccup into permanent data degradation (file reachable only from the uploading browser) with **no user-visible warning** — the toast says the resource "was added to your library".
34. **Silent `catch {}` blocks** are pervasive (over 30 empty or comment-only catch handlers). Storage failures, vault failures, heartbeat failures and cache failures are all swallowed.
35. **Fake progress bar.** `upload-modal.tsx` runs a `setInterval` that fabricates progress (15 → 45 → 75 → 92 %) alongside the real `onProgress` callbacks, taking `Math.max` of the two.
36. **The landing contact form and the offline-email feature both present success to the user while delivering nothing.**
37. **No error boundary.** A render-time exception in any view unmounts the whole app to a blank page.
38. **No list virtualisation** anywhere; the message thread, directory and resource grids all render every item.
39. **`live` is set `true` optimistically in several places** and only `false` on a listener error, so the "Reconnecting…" banner may not reflect reality.

### Tooling & process
40. **Package-manager split**: `package-lock.json` (npm) is committed while all scaffold scripts and `.mise.toml` use pnpm. `dev.json` watches `pnpm-lock.yaml`, which does not exist.
41. **No linter, no formatter enforcement, no type-check in CI, no CI at all.**
42. **`dist/` and `.firebase/` exist on disk** although gitignored — stale build output can be deployed accidentally.
43. **`CLAUDE.md`/`AGENTS.md` describe a generic Figma Make scaffold**, not Coursify; a newcomer reading them learns nothing about the product.
44. **Zero `TODO`/`FIXME` comments** in the codebase — pleasant, but it also means none of the known limitations above are flagged in-code.

---

## 12. Unclear points / questions to clarify with the project owner

1. **Business model.** No pricing, billing, plan or payment code exists. Is Coursify intended to be free, freemium (the 10 GB cap suggests tiering), institution-licensed, or something else?
2. **`robots.index: false`.** Is the production site deliberately de-indexed (private beta), or is this an unnoticed Figma Make default?
3. **Email delivery.** `VITE_EMAIL_DISPATCH_URL` expects a `{to, subject, html, text}` webhook. Which provider is planned (SendGrid, Resend, a Cloud Function)? Is there an existing endpoint not captured in this repo?
4. **The landing contact form.** It only writes to `localStorage`. Was a backend intended, or is the mailto/Instagram path the real channel?
5. **Founder email discrepancy.** The code and rules use `kabuyaentambwe03@gmail.com`; the git author email on every commit is `kabuyatambwe03@gmail.com` (no "en"). Which is the real founder account that must satisfy `isFounder()`? *Resolved 2026-09-25: the correct address is `kabuyatambwe03@gmail.com`; code and rules now use it via the `FOUNDER_EMAIL` constant.*
6. **Verification policy.** Is the automatic merit badge (complete profile + 3 resources) the intended final policy, or is manual review planned? Should the dormant institutional-email gate in `security.ts` be re-enabled, given commit `fb343ae` deliberately relaxed it?
7. **Storage tier.** The 5-second upload timeout and base64 fallbacks exist because of the Spark free plan. Is a Blaze upgrade planned? That single decision determines whether the file-fallback machinery can be removed.
8. **`data/coursify.json` and `server/`.** Safe to delete, or is the legacy JSON a data set someone still needs to migrate into Firestore?
9. **Multi-device file access.** Is the current behaviour — large files uploaded during a Storage outage being readable only in the uploading browser — known and accepted?
10. **Subjects taxonomy.** `Subject` is a free string with 40 suggestions plus free-text entry. Is a fixed taxonomy wanted (it would enable reliable filtering and analytics), or is open entry deliberate?
11. **Admin scope.** Is single-founder admin (`isFounder` by email) the long-term model, or is a role/claims system expected? Firebase custom claims are not used anywhere.
12. **`picture landing page/` folder and `hero-library.jpg`.** Source assets to keep, or removable duplicates (≈ 7.5 MB of unused JPEGs)?
13. **Analytics.** `VITE_FIREBASE_measurement_Id` is present in `.env.local` but unused, and no `googleAnalyticsId` is set in `site.json`. Is product analytics wanted?
14. **Target deployment surface.** Firebase Hosting is configured, `public/_redirects` targets Netlify/Render, and `.figma/make/deploy` targets Figma Make hosting. Which is canonical?
15. **Package manager.** npm (lockfile) or pnpm (mise + scripts)? The two are currently inconsistent.
16. **Institutional tier.** The domain-heuristic code distinguishes `.edu`/`.ac.`/`.k12.`/`.sch.` domains and infers `institutionLevel`. Was a school/university account tier planned?

---

## 13. File-by-file inventory

### Root configuration & documentation
| Path | Role |
|---|---|
| `AGENTS.md` | Figma Make scaffold guidance: stack, project layout, Tailwind v4 usage, code-quality rules (quoting, closed JSX, default exports). |
| `CLAUDE.md` | Single line `@AGENTS.md` — includes the above into Claude Code sessions. |
| `README.md` | Product blurb plus the full Firebase setup and PowerShell deploy runbook. |
| `package.json` | Name `coursify` v1.0.0, ESM, 3 runtime deps (firebase, react, react-dom), 9 dev deps, scripts `dev`/`build`/`preview`/`format`/`deploy`. |
| `package-lock.json` | npm lockfile (conflicts with the pnpm toolchain — see §11). |
| `tsconfig.json` | Strict TS, ES2020, bundler resolution, `@/*` alias, `noEmit`. |
| `vite.config.ts` | Vite config plus four inline Figma plugins: site-metadata HTML injection, HMR error-overlay replay, React Refresh boundary fallback, and the `/.figma/make/kit.html` story host. |
| `index.html` | Vite shell with `<!-- figma:* -->` slots and `#root`. |
| `.mise.toml` | Toolchain pins: Node 22, pnpm 10.34.3. |
| `.gitignore` | Ignores `node_modules`, `dist`, `.env*`, `.firebase/`, `data/*.json`, logs, plugin dirs. |
| `.gitattributes` | Line-ending/diff attributes for the scaffold. |
| `env.example` | The six `VITE_FIREBASE_*` placeholders. |
| `.env.local` | Real Firebase web config for `coursify-a1a0d`, plus an unused `VITE_FIREBASE_measurement_Id`. |
| `.firebaserc` | Default project alias → `coursify-a1a0d`. |
| `firebase.json` | Hosting (site, `dist`, SPA rewrite, cache headers) + Firestore rules/indexes + Storage rules. |
| `firestore.rules` | Per-collection authorisation; hard-coded founder email; badge-claim key allowlist. |
| `firestore.indexes.json` | Two composite indexes for conversations and messages. |
| `storage.rules` | `avatars/{uid}` and `resources/{uid}` owner-write, signed-in read, 50 MiB object cap. |
| `public/favicon.svg` | Site icon. |
| `public/_redirects` | `/* /index.html 200` SPA fallback for Netlify/Render. |
| `public/landing-images/*.jpg` | Landing photography (`picture 1-4`); `hero-library.jpg` is unreferenced. |
| `picture landing page/*.jpg` | Unused source duplicates of the landing photos. |
| `data/.gitkeep` | Keeps the (now purposeless) data directory in git. |
| `data/coursify.json` | Legacy Node-server state snapshot (v5) with PBKDF2 hashes and two seed accounts. Read by nothing. |
| `server/` | **Empty** — remnant of the deleted backend. |
| `.figma/make/dev\|install\|format\|deploy\|deploy-preview\|langserver\|analyze-routes` | Bash scripts the Figma Make harness invokes (all pnpm-based). |
| `.figma/make/dev.json` | Declares which files trigger reinstall vs. dev-server restart. |
| `.figma/make/site.json` | Site title, description, favicon, `robots.index: false`, accessibility flags. |
| `.firebase/hosting.ZGlzdA.cache` | Firebase deploy cache (generated). |
| `dist/` | Vite build output (generated). |

### Application source — `src/`
| Path | Role |
|---|---|
| `src/main.tsx` | React entry point; mounts `<AppProvider><App/></AppProvider>` into `#root` under `StrictMode`; imports `index.css`. |
| `src/App.tsx` | Application shell: phase machine (landing → auth → app), view state, post-signup onboarding redirect, header/sidebar/mobile-drawer layout, view switch, reconnect banner. |
| `src/store.tsx` | The de-facto backend: React context `AppStore` with ~45 members; Firestore document→domain mappers; 10 realtime listeners; auth, profile, resource, save, follow, post, message, meetup and account-deletion operations; upload fallback strategy; presence heartbeat; badge award; toast queue. |
| `src/types.ts` | All shared types: `View`, `Educator`, `Resource`, `Slide`, `Post`, `Conversation`, `ChatMessage`, `ChatAttachment`, `Meetup`, `UploadInput`, `SignupInput`, `ProfilePatch`, `Toast`, `Session`, plus the string-literal unions. |
| `src/firebase.ts` | Lazily initialises the Firebase app, Auth (with a persistence fallback chain), Firestore and Storage; `isFirebaseConfigured()`; `firebaseErrorMessage()` maps ~15 error codes to human copy. |
| `src/security.ts` | `FOUNDER_EMAIL` + `isFounderEmail`; `sanitizePlainText`/`normalizeEmail`; free-email and institutional-domain heuristics; `inferInstitutionLevel`; **plus dead PBKDF2/session-token code from the old server**. |
| `src/data.ts` | `STORAGE_CAP_BYTES` (10 GB), `MAX_FILE_BYTES` (50 MiB), the 8 nav items, 40 `subjectOptions`, `grades`, `institutionLabels`, `subjectTint` colour map, `profileTabs`, `normalizeSubject`. |
| `src/formats.ts` | Resource-format taxonomy: extension↔format maps, per-format accept strings and copy, `uploadIssue()` validation, YouTube/Vimeo/GitHub URL parsers, `videoEmbedUrl`, a CSV preview parser, and the `isPdf/isPptx/isDocx/isCsv/isText/isVideo` resource predicates. |
| `src/documents.ts` | Dependency-free OOXML toolkit: ZIP central-directory reader + `DecompressionStream` inflate, `parsePptx` (slides, theme colours, gradients, geometry, images, tables, text runs) and `parseDocx` (text extraction), data-URI ↔ bytes ↔ Blob helpers. |
| `src/file-vault.ts` | IndexedDB (`coursify_vault`/`files`) put/get/delete of the original uploaded `Blob`s plus `blobToDataUrl`; all failures degrade silently. |
| `src/notifications.ts` | Offline-recipient email payload builder, 10-minute per-recipient cooldown (memory + localStorage), optional `VITE_EMAIL_DISPATCH_URL` POST, localStorage audit log. |
| `src/sound.ts` | Web Audio two-oscillator message chime and a one-shot autoplay-unlock listener bound at module load. |
| `src/slides.ts` | `sanitizeSlide` / `sanitizeDeck` for manually authored decks — **currently unused**. |
| `src/emojis.ts` | `EMOJI_CATALOG`: 7 categories (Smileys, People, Academic, Symbols, Celebration, Daily, Flags), 464 emojis with keywords, plus `searchEmojis`. |
| `src/utils.ts` | Download helpers (blob/data-URI/text), `initialsFromName`, `uid`, `formatCount`/`formatBytes`/`formatWhen`/`formatEventWhen`/`todayLabel`, diacritic-folding educator search and ranking, `filterResources`, `conversationIdFor`, `buildCvText`, Google Maps URL builders, the `deliverResource` delivery strategy, `isEducatorOnline`/`formatEducatorActivity`. |
| `src/index.css` | Google Fonts imports, `@import "tailwindcss"`, `@theme` design tokens, full-height/overflow resets, media max-width, custom scrollbars, selection colour. |
| `src/vite-env.d.ts` | Types the six `VITE_FIREBASE_*` env vars. |

### Components — `src/components/`
| Path | Role |
|---|---|
| `admin-analytics-view.tsx` | Founder-only platform analytics dashboard; double-gated, renders "Access Restricted" otherwise. |
| `auth-screen.tsx` | Split-screen sign-in / sign-up with institution-type toggle and a "No account found → create one" recovery path. |
| `avatar.tsx` | Photo or initials avatar at any size/radius. |
| `cv-modal.tsx` | Read-only CV preview with a download action. |
| `dashboard.tsx` | The academic feed (hero, colleague search, follow-back cards, stat tiles, post composer, post list, suggestion sidebar); also re-exports `ResourceFeed`. |
| `directory-view.tsx` | Faculty directory with search, institution-level filter and discipline chips; results gated behind a query/filter. |
| `educator-card.tsx` | Colleague card: avatar with presence dot, verified/founder pill, subject and level, bio snippet, follower count, mutual-connection state, follow and message actions. |
| `format-mark.tsx` | Maps a `ResourceFormat` to its icon. |
| `header.tsx` | Sticky top bar: logo, ⌘K search with live colleague dropdown, messages button with badge, upload button, profile chip. |
| `icons.tsx` | 48 hand-drawn 20×20 stroke SVG icon components exported as one `Icons` object. |
| `landing.tsx` | The full marketing site: hero, product, practice, meetups, mission, contact (email card, Instagram card, localStorage-backed form) and a 4-column footer. |
| `logo.tsx` | `CoursifyMark` SVG glyph and the `Logo` wordmark (light/dark variants). |
| `meetup-modal.tsx` | Meetup creation form with format toggle, datetime picker, live Google Maps preview or meeting-URL field. |
| `meetups-view.tsx` | Meetup board: 5 filters, event cards with map embeds/join links, RSVP and host-cancel. |
| `messages-view.tsx` | The complete chat experience: conversation sidebar, thread, attachment and audio bubbles, emoji picker, file attach, voice recorder (`MediaRecorder`), send bar. Includes the local `AudioMessageBubble` player component. |
| `photo-cropper.tsx` | 192 px square avatar cropper with zoom/pan and canvas JPEG export. |
| `post-card.tsx` | Feed post: author identity, timestamp, body and an optional embedded resource card. |
| `profile-editor.tsx` | Modal profile form plus the password-confirmed account-deletion danger zone. |
| `profile.tsx` | Educator profile page: cover, identity, metrics, bio, CV panel, tabbed uploads grid, follow/message or edit/upload actions. |
| `resource-card.tsx` | Resource tile: subject tint, format badge, title, author, counters, preview/save/delete/download actions; opens the preview via a portal. |
| `resource-feed.tsx` | Titled resource grid with subject filter chips and an empty state. |
| `resource-preview.tsx` | Full-screen viewer dispatching to video embeds, `<video>`, PDF, CSV table, plain text, DOCX text, native PPTX slide rendering, a GitHub card or a generic file notice. |
| `saved-view.tsx` | `ResourceFeed` over the user's saved resources. |
| `sidebar.tsx` | Desktop/mobile nav: 8 items (admin hidden for non-founders) with unread and follow-back badges, storage meter, support and Instagram links, sign out. |
| `subject-picker.tsx` | Searchable subject combobox over the 40 options with free-text entry. |
| `subjects-view.tsx` | Subject grid with per-discipline counts, Community/My-Materials scope toggle, and a filtered resource feed. |
| `toast-viewport.tsx` | Fixed toast stack driven by the store. |
| `upload-modal.tsx` | Resource upload form: format tiles, metadata fields, file or link input, validation and progress. |
| `uploads-view.tsx` | `ResourceFeed` over the user's own uploads. |
| `verified-badge-banner.tsx` | Celebratory "Merit Verified" banner (dismissal persisted per user) or the "Claim Verified Badge" CTA. |

---

*End of audit. This document describes the repository as it stands at commit `c2b1eeb`; it proposes no changes and no roadmap.*
