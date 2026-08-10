# 🌱 Plantio

**Plantio** is a farmer-focused web/PWA application built to bring practical agricultural tools into one simple interface. The project combines plant-health scanning, farm management, weather information, land measurement, crop guidance, market/mandi utilities, reminders, journaling, expenses, irrigation and an AI-style assistant experience.

> **Repository:** `uutkarssh/Plantio2-`
>
> **Status:** Active development / prototype-to-production application
>
> **Primary branch:** `main`

---

## 1. What Plantio Does

Plantio is designed around the idea of a single digital workspace for growers. The application currently contains tools and sections for:

- 🏠 Home dashboard
- 🌿 Plant/ crop scanning and scan history
- 🗺️ Land measurement and saved fields
- ☁️ Weather information
- 📚 Agricultural guides and crop knowledge
- 🌾 Yield-related tools
- 💧 Irrigation planning/tools
- 🌱 Seeds information
- 🐄 Cattle management
- 💰 Mandi/market information
- 💸 Farm expense tracking
- 📅 Calendar and reminders
- 🔄 Crop rotation
- 📓 Farm journal
- 📖 Agricultural library
- 💬 Feedback
- 🤖 Ask Plantio experience
- ⚙️ Settings and farm profile
- 🔐 Firebase authentication
- 📦 Offline/local data storage and offline scan queue
- 📱 PWA/service-worker support

The UI is intentionally bold and agricultural: strong borders, sticker-like cards, large touch targets, green/cream/gold tones, expressive icons and a mobile-first layout.

---

## 2. Product Goals

Plantio is intended to be:

1. **Useful for real growers** — agricultural workflows should be understandable without technical knowledge.
2. **Mobile-first** — most farmer interactions should work comfortably on a phone.
3. **Fast** — common screens should avoid unnecessary loading and expensive client-side work.
4. **Offline-friendly** — important local farm data can be retained locally and scans can be queued when connectivity is unavailable.
5. **Multilingual** — the application has an i18n layer and currently exposes English, Hindi and Marathi language choices in the navigation drawer.
6. **Modular** — individual agricultural tools live as separate routes/components so features can evolve independently.
7. **Approachable** — the visual system avoids a corporate enterprise-dashboard feel and instead uses a friendly agricultural product identity.

---

## 3. Technology Stack

### Core application

- **Next.js 16** — application framework
- **React 19** — UI
- **TypeScript** — type safety
- **Tailwind CSS 4** — styling
- **Radix UI** — accessible UI primitives
- **Lucide React** — icons
- **Framer Motion** — motion/interaction where used

### Authentication

- **Firebase Authentication**
- Auth state is watched globally through the application shell.
- Unauthenticated users are redirected to `/auth`.
- Authenticated users can access the main application.
- Sign-out uses Firebase's `signOut()` API.

### Data / backend technologies present in the project

The dependency set includes:

- Prisma / `@prisma/client`
- PostgreSQL / `pg`
- Supabase JS client
- TanStack Query
- Zustand
- Zod

Not every dependency is necessarily used by every route. Treat the source code as the authority for whether a particular package is actively used.

### Maps and geospatial tools

- Leaflet
- React Leaflet
- Turf.js

### Agricultural / AI-related dependencies

- Google Generative AI SDK (`@google/generative-ai`)
- React Markdown
- Additional data/UI utilities used by the application's agricultural tools

### Build/runtime

- Bun is used by the documented production start command.
- Next.js standalone output is prepared by the build script.

---

## 4. Repository Structure

The project follows a standard Next.js application structure. Important areas include:

```text
.
├── public/
│   ├── icons/
│   ├── images/assets used by the application
│   └── service-worker/PWA assets where applicable
├── src/
│   ├── app/
│   │   ├── auth/
│   │   ├── scan/
│   │   ├── measure/
│   │   ├── weather/
│   │   ├── guides/
│   │   ├── yield/
│   │   ├── irrigation/
│   │   ├── seeds/
│   │   ├── cattle/
│   │   ├── mandi/
│   │   ├── expenses/
│   │   ├── calendar/
│   │   ├── rotation/
│   │   ├── journal/
│   │   ├── library/
│   │   ├── feedback/
│   │   ├── settings/
│   │   └── page.tsx
│   ├── components/
│   │   ├── plantio/
│   │   └── ui/
│   └── lib/
│       ├── firebase/
│       ├── plantio/
│       └── shared utilities
├── package.json
├── README.md
└── configuration files
```

The exact directory contents may change as the project grows. New features should follow the existing route/component/lib separation instead of putting all application logic into one file.

---

## 5. Main Application Shell

The global application shell is responsible for several cross-cutting concerns:

- Firebase authentication protection
- Error boundary
- Internationalization provider
- Top navigation bar
- Hamburger drawer
- Ask Plantio modal
- Bottom navigation
- PWA install banner
- Loading/splash experience
- Service worker registration in production

The auth gate listens with Firebase `onAuthStateChanged`. Authentication routes are allowed through without redirecting, while protected routes redirect unauthenticated users to `/auth`.

### Authentication flow

```text
Open app
   ↓
Firebase auth state check
   ↓
┌──────────────────────┐
│ User authenticated?  │
└──────────┬───────────┘
       Yes │ No
           │
           │       → /auth
           ↓
     Main application
```

---

## 6. Authentication & Logout

Firebase configuration lives in:

```text
src/lib/firebase/config.ts
```

The application exports a shared Firebase app and `firebaseAuth` instance.

The reusable logout component lives in:

```text
src/components/plantio/logout-button.tsx
```

It:

1. Prevents duplicate clicks while signing out.
2. Calls Firebase `signOut(firebaseAuth)`.
3. Runs the optional `onLoggedOut` callback.
4. Redirects to `/auth` after successful logout.
5. Shows a loading state while signing out.

The Settings page includes this logout control in its Account section.

### Security note

Firebase web configuration values such as the API key are normally public client configuration. **Do not put private service-account credentials, admin SDK credentials, database passwords, private API keys or other secrets into client-side source code.** Use environment variables/server-side code for secrets.

---

## 7. Home Dashboard

The homepage is the main overview screen and combines several pieces of farm information.

Current homepage functionality includes concepts such as:

- Last plant scan
- Offline scan queue
- Scan history count
- Weather information
- Agricultural tip of the day
- Seasonal crop information
- Seasonal alerts
- Farm activity statistics
- Recent activity timeline
- Saved fields
- Journal activity
- Expense activity
- Reminders

The home screen reads local application data through the Plantio storage helpers rather than requiring every dashboard value to come from a remote backend.

### Performance considerations

The home page is a large client-side component and should be treated as a performance-sensitive route.

Avoid:

- unnecessary repeated localStorage reads
- large synchronous computations during initial render
- expensive animations on mobile
- fetching the same API data multiple times
- mounting hidden heavyweight components unnecessarily
- unnecessary re-renders caused by unstable callbacks/objects

Prefer:

- memoized derived data
- one-time batched local-data reads
- lazy loading for heavyweight features
- caching weather/API responses where appropriate
- lightweight loading states
- request cancellation when navigating away

The splash experience has also been kept short so it does not make a responsive application feel artificially slow.

---

## 8. Local Storage & Offline Data

Plantio has a local storage layer under:

```text
src/lib/plantio/storage
```

The storage layer is used for local application data such as:

- scan history
- last scan
- offline scan queue
- journal entries
- expenses
- reminders
- saved fields
- settings/profile data

The Settings page provides tools to:

- export Plantio local data
- clear scan history
- clear all Plantio local data
- reset settings
- view approximate local storage usage

### Data export

Export creates a JSON file containing localStorage keys beginning with `plantio-`.

### Important limitation

LocalStorage is browser/device-local storage. It is **not a replacement for a secure cloud database** and should not be treated as a reliable multi-device synchronization system.

If cloud synchronization is introduced, define a clear source-of-truth model and conflict strategy before migrating user data.

---

## 9. Settings

The Settings page is located at:

```text
src/app/settings/page.tsx
```

Current sections include:

### Farm Profile

- Farm name
- State
- District
- Farm size
- Save profile

### Units & Measurements

- Metric / Imperial
- Acres / Bigha / Hectares

### Data Management

- Export all data
- Clear scan history
- Clear all data
- Storage usage summary

### Notifications

- Weather alerts
- Mandi alerts
- Crop reminders

### About & Legal

- App version
- Privacy information
- Terms information
- Open-source library list

### Danger Zone

- Reset settings
- Delete/clear all application data

### Account

- Firebase account sign-out

All destructive actions should remain behind confirmation dialogs.

---

## 10. Navigation

The main drawer is implemented in:

```text
src/components/plantio/drawer.tsx
```

It organizes routes into:

### Tools

- Home
- Scan Plant
- Scan History
- Measure Land
- Weather
- Guides
- Yield
- Irrigation
- Seeds

### Manage

- Cattle
- Mandi
- Expenses
- Calendar
- Rotation
- Journal

### Information

- Library
- About
- Feedback
- Settings

The drawer also exposes the Ask Plantio action and language selection.

---

## 11. Internationalization

Plantio has a dedicated i18n layer under:

```text
src/lib/plantio/i18n
```

The current navigation language choices are:

- English (`en`)
- Hindi (`hi`)
- Marathi (`mr`)

When adding user-facing text:

1. Add the translation key to the i18n resources.
2. Use `t("...")` from `useI18n()`.
3. Avoid hard-coding UI copy when the surrounding screen is already localized.
4. Check text length in Hindi/Marathi because button widths and card layouts can change.

---

## 12. UI / Design System

Plantio uses a custom visual language built around:

- Forest/mid-green agricultural colors
- Cream backgrounds
- Leaf accents
- Gold highlights
- Strong dark borders
- Sticker-like cards and buttons
- Rounded corners
- Bold display typography
- Lucide agricultural icons
- Large touch-friendly controls
- Mobile-first spacing

Reusable visual components are primarily under:

```text
src/components/plantio/
```

The design should remain consistent across new modules.

### UX principles

- Keep important actions obvious.
- Avoid tiny controls.
- Avoid excessive animation.
- Make destructive actions explicit.
- Keep navigation predictable.
- Prefer useful information over decorative UI.
- Preserve readability outdoors and on lower-end mobile devices.

---

## 13. PWA / Offline Support

The application includes service-worker registration in production.

The shell registers:

```text
/sw.js
```

when supported by the browser and when the app is running in production mode.

The project also contains install-related UI such as the install banner and app icons.

A service worker should be changed carefully. Incorrect caching can cause users to receive stale JavaScript or stale application routes after deployment.

When changing caching behavior, test:

- fresh install
- existing installed PWA
- offline launch
- online recovery
- new deployment after an old cached version

---

## 14. Development Setup

### Requirements

Recommended development environment:

- Node.js compatible with the project's Next.js version
- Bun for the documented production start workflow
- Git
- A Firebase project for authentication

### Install dependencies

```bash
bun install
```

or, if using npm:

```bash
npm install
```

### Run development server

```bash
bun run dev
```

The repository's development script runs Next.js on port `3000` and writes command output to `dev.log`.

Open:

```text
http://localhost:3000
```

---

## 15. Production Build

The repository defines:

```bash
bun run build
```

The build command runs the Next.js production build and prepares the standalone output by copying the required static assets and `public` directory.

Start the generated standalone server with:

```bash
bun run start
```

The production start command runs the standalone Next.js server and writes output to `server.log`.

---

## 16. Useful Scripts

| Command | Purpose |
|---|---|
| `bun run dev` | Start development server on port 3000 |
| `bun run build` | Create production Next.js build and standalone assets |
| `bun run start` | Start standalone production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Prisma schema to database; accepts data loss |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run Prisma development migration |
| `bun run db:reset` | Reset Prisma database |

### Warning about database commands

`db:push` uses `--accept-data-loss`. Do **not** run destructive database commands against production data unless you fully understand the consequences and have backups.

---

## 17. Dependency Areas

The package configuration currently includes libraries for several application concerns:

- React / Next.js
- Firebase
- Prisma / PostgreSQL
- Supabase
- Radix UI
- Tailwind CSS
- Leaflet / Turf
- Forms / validation
- Charts / tables
- Drag and drop
- Markdown
- Date handling
- Animations
- State management
- Google Generative AI

Because the dependency list is broad, periodically audit unused dependencies and remove packages that are no longer needed. Keeping the dependency graph smaller improves maintainability and reduces attack surface.

---

## 18. Code Organization Rules

When adding a feature:

### Route

Create a route under:

```text
src/app/<feature>/
```

### Reusable UI

Place reusable Plantio-specific UI under:

```text
src/components/plantio/
```

Generic Radix/shadcn-style primitives belong under:

```text
src/components/ui/
```

### Shared business logic

Place shared agricultural/application logic under:

```text
src/lib/plantio/
```

### Avoid giant components

The home page already contains a substantial amount of dashboard functionality. New functionality should preferably be extracted into focused components/hooks instead of continually increasing the size of the homepage component.

---

## 19. Error Handling

The application has an error-boundary layer in the application shell.

Individual features should still:

- handle failed network requests
- provide meaningful empty states
- avoid crashing when localStorage contains malformed data
- handle unavailable geolocation/weather services
- handle Firebase authentication failures
- prevent duplicate submissions
- provide retry actions for recoverable errors

Never silently swallow errors when doing so would leave the user believing an important operation succeeded.

---

## 20. Performance Checklist

Before merging a significant UI change, check:

- [ ] Does the route render quickly on a low-end Android phone?
- [ ] Are unnecessary client components avoided?
- [ ] Are large images optimized?
- [ ] Are expensive libraries loaded only where needed?
- [ ] Are effects cleaned up?
- [ ] Are event listeners unsubscribed?
- [ ] Are timers/intervals cleared?
- [ ] Are Firebase listeners unsubscribed?
- [ ] Are repeated localStorage reads avoided?
- [ ] Are animations limited on content-heavy screens?
- [ ] Does the screen work with slow network conditions?
- [ ] Does the PWA still work after a fresh deployment?

---

## 21. Accessibility Checklist

For every new feature:

- Use semantic buttons/links.
- Provide accessible labels for icon-only controls.
- Maintain keyboard focus behavior.
- Ensure sufficient text contrast.
- Do not use color as the only indicator of state.
- Provide useful empty/error states.
- Keep touch targets large enough for mobile use.
- Ensure dialogs can be closed and navigated correctly.

---

## 22. Data & Privacy Principles

Plantio handles potentially sensitive farm information. Future development should follow these principles:

- Collect only information that is needed.
- Do not expose user farm data publicly.
- Keep secrets server-side.
- Use Firebase/other backend security rules appropriately.
- Validate user input.
- Sanitize data displayed as HTML/Markdown where necessary.
- Avoid putting credentials in Git.
- Provide a clear deletion/export path.

Local data can be exported from Settings, and application-local Plantio data can be cleared from the Settings data-management/danger-zone controls.

---

## 23. Environment Variables

If a feature requires a private API key or server credential, use environment variables rather than committing secrets.

For example:

```env
# Example only — use the exact variables required by the implementation.
PRIVATE_API_KEY=...
DATABASE_URL=...
```

Public client-side configuration should be clearly separated from secrets.

Do not commit:

```text
.env
.env.local
service-account.json
private keys
production database passwords
```

unless a value is intentionally public and safe to distribute.

---

## 24. Firebase Notes

The current application uses Firebase Authentication through a shared Firebase configuration module.

When modifying authentication:

1. Preserve the global auth listener.
2. Test direct navigation to `/auth`.
3. Test a logged-in session.
4. Test a logged-out session.
5. Test browser refresh while logged in.
6. Test logout.
7. Test an expired/invalid session.
8. Do not expose privileged Firebase Admin credentials in the browser.

---

## 25. Adding a New Agricultural Tool

A recommended workflow:

```text
Idea
 ↓
Define farmer problem
 ↓
Define minimum useful workflow
 ↓
Create route
 ↓
Create reusable UI
 ↓
Add local/cloud data model if required
 ↓
Add i18n strings
 ↓
Add loading + empty + error states
 ↓
Test mobile UX
 ↓
Test offline/slow network behavior
 ↓
Run lint/build
 ↓
Deploy
```

A new tool should not be added simply because it looks useful. It should have a clear farmer workflow and a measurable benefit.

---

## 26. Testing Priorities

Before a production release, manually test the highest-value flows:

### Authentication

- Sign up/sign in
- Refresh while authenticated
- Logout
- Access protected page while logged out

### Scan

- New scan
- Scan result
- History
- Offline queue
- Retry queued scan

### Farm management

- Add/edit farm profile
- Save field
- Measure land
- Add journal entry
- Add expense
- Add reminder

### Information tools

- Weather
- Guides
- Mandi
- Seeds
- Irrigation
- Crop rotation

### Settings

- Change language
- Change units
- Export data
- Clear scan history
- Reset settings
- Delete/clear all data
- Sign out

### PWA

- Install
- Launch installed app
- Offline behavior
- Reconnect
- New deployment after cached version

---

## 27. Known Architecture Considerations

### Large homepage client component

The homepage currently coordinates many dashboard data sources and visual sections. This is convenient but makes it a prime candidate for future component splitting and performance optimization.

### Local-first data

A significant amount of farm activity is browser-local. This is useful for offline behavior but means that data is not automatically available on another device unless a cloud synchronization layer is implemented.

### Broad dependency set

The project contains dependencies for multiple backend, UI, mapping, AI and data technologies. Future cleanup should distinguish active dependencies from legacy/unused dependencies.

### PWA caching

Service-worker caching must be handled carefully to avoid stale deployments.

---

## 28. Contribution Guidelines

When contributing:

1. Keep changes focused.
2. Preserve the existing Plantio design language.
3. Avoid unnecessary dependencies.
4. Prefer reusable components.
5. Add translations for user-facing strings.
6. Handle loading/error/empty states.
7. Test mobile layouts.
8. Run lint before committing.
9. Run a production build for significant changes.
10. Never commit secrets.

Recommended commit style:

```text
feat: add irrigation schedule
fix: improve home dashboard loading
perf: reduce weather requests
refactor: split scan result components
docs: update project documentation
```

---

## 29. Deployment

The project is structured for a Next.js deployment and can be deployed to a platform supporting Next.js/Node/Bun-compatible workflows.

For a production deployment:

1. Install dependencies.
2. Configure required environment variables.
3. Verify Firebase configuration and authorized domains.
4. Run lint.
5. Run the production build.
6. Deploy the generated application.
7. Verify authentication.
8. Verify PWA/service-worker behavior.
9. Test the major farmer workflows on a real Android device.

If deploying behind a CDN, pay particular attention to service-worker and static asset caching.

---

## 30. Product Philosophy

Plantio should feel like a **practical digital farm companion**, not a complicated enterprise platform.

The ideal experience is:

> **Open → understand → act → record → improve.**

Every screen should help the grower make a decision, complete a task, or understand their farm better.

---

## 31. Current Project Snapshot

Based on the current repository implementation, Plantio is a Next.js/React/TypeScript agricultural application with Firebase authentication, a custom Plantio UI system, local-first farm data utilities, PWA support, multiple agricultural tools and multilingual navigation.

The repository's package configuration identifies Next.js 16, React 19, TypeScript, Tailwind CSS, Firebase, Prisma/PostgreSQL tooling, Supabase, Leaflet/Turf, Radix UI, Lucide, Google Generative AI and other supporting libraries. fileciteturn202file0

The global shell currently combines authentication, i18n, navigation, Ask Plantio, install UI and service-worker registration. fileciteturn191file0

The navigation drawer exposes the major Plantio tools and Settings route. fileciteturn192file0

The Settings implementation provides farm profile, measurement settings, data management, notifications, legal/about information and destructive-data controls. fileciteturn195file0 fileciteturn196file0 fileciteturn197file0

---

## 32. License

No explicit open-source license is established by this README. Unless a license is added to the repository, assume the project's source code remains under the copyright/default rights of its owner and is **not automatically licensed for unrestricted reuse**.

If this project is intended to be open source, add an appropriate `LICENSE` file and update this section.

---

## 33. Maintainer Notes

This README is intended to be the living technical/product reference for the repository.

When major architecture changes occur, update:

- Tech stack
- Repository structure
- Authentication flow
- Data model/storage strategy
- PWA behavior
- Environment variables
- Deployment instructions
- Known limitations
- Testing checklist

Keep documentation aligned with the actual source code rather than allowing it to become a historical description of an older version of Plantio.
