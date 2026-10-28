# Auto Parts Manager — Project Status

Last updated: 2026-10-28
Project folder: `D:\Dev\AutoPartsManager`

> **Current state in one line:** the first complete version is built. All core features work, 128 automated tests
> pass, the production build succeeds, and the app was checked by hand in a browser.
> **Not done yet:** installing it on a phone (it needs an https web host first).

---

## 1. Project goal and required features

A simple, reliable web app for one person who runs a car spare parts shop and repair workshop.
It must work on a PC, have a mobile-friendly layout, and be installable on a phone as a Progressive Web App (PWA).

| Required feature | Status |
|---|---|
| Inventory of new and used parts | Done |
| Purchases that add stock, weighted-average costing | Done |
| Sales with stock deduction and accurate gross profit | Done |
| Repair jobs with labor; parts deducted from stock exactly once | Done |
| Operating expenses and estimated net profit | Done |
| Dashboard and date-range financial reports | Done |
| Local data storage, backup export and restore | Done |
| Responsive interface for PC and phone, installable PWA | Done on PC (checked); phone install needs hosting (section 4) |

Rules from the owner: one user, no login or accounts, no GitHub or remote repositories, simple code, no extra
features, accurate tested money maths, weighted-average costing, repair parts deducted exactly once, stock purchases
never counted again as expenses, npm cache and dependencies on drive D:, and never claim untested results.

---

## 2. Technology stack and architecture

| Part | Choice |
|---|---|
| Language | TypeScript (strict mode) |
| UI | React 19, React Router 7 |
| Build / dev server | Vite 8 |
| Styling | Tailwind CSS 4 (scans `src` only, set in `src/index.css`) |
| Data storage | IndexedDB in the browser via Dexie 4 + `dexie-react-hooks` |
| PWA | `vite-plugin-pwa` (manifest, icons, service worker for offline use) |
| Tests | Vitest 5 + jsdom + React Testing Library + `fake-indexeddb` |

Key decisions (all implemented):

- **Data stays on the device** (IndexedDB). No server. Each device has its own data; backup files move it.
- **Money is stored in whole cents.** All maths goes through `src/lib/money.ts`. Display format `1,234.50`, no currency symbol.
- **Dates** are stored as `YYYY-MM-DD` text. UI language is English.
- **Stock is calculated, never stored** (`src/lib/stock.ts`). Current quantity, stock value and the cost of every
  sale and repair come from replaying opening stock + all purchases, sales and repairs in date order
  (same day: purchases first, then by entry time). Each record is counted once, so repair parts are deducted exactly
  once, and editing or deleting any record gives correct results.
- **Weighted-average cost:** a purchase adds quantity and cost; units leaving take `round(value × qty ÷ quantity)`
  (round half up, exact integer maths). The last unit takes exactly the remaining value, so there is no rounding drift.
- **Every save/delete that affects stock** (`src/db/actions.ts`) replays stock with the change inside one database
  transaction and refuses it if any part would go below zero on any date. A part used in any record cannot be deleted.
- **Profit:** gross profit = sales + repair revenue (parts + labor) − cost of parts sold/used.
  Net profit (estimated) = gross profit − operating expenses. **Purchases are not expenses**; reports show
  "stock purchased" for information only, and the expense form says to use Purchases for stock.
- **Backup** is one JSON file. Restore checks the file (app id, version, every record's fields, stock adds up)
  before replacing anything, then replaces all data in one transaction.
- **Arabic, right to left** (since 2026-10-28): every screen, message and the Excel file are in Arabic; `index.html` has
  `lang="ar" dir="rtl"`, layout uses start/end classes (`ms-`, `me-`, `text-end`, `end-0`). Saved values stay in English
  (expense categories such as `Rent`, condition `new`/`used`) so old data and backups still load; the screens show them
  through `categoryLabel` / `CONDITION_LABELS` in `src/types.ts`. Dates use `LOCALE` (`ar-LB-u-nu-latn`: Lebanese month
  names, Western digits) from `src/lib/dates.ts`. Search also understands Arabic month names. Every button shows the
  hand cursor (`src/index.css`).
- **Online for phones** (since 2026-10-28): https://mohamadarabacc-glitch.github.io/auto-parts-manager/ (GitHub Pages,
  public repo https://github.com/mohamadarabacc-glitch/auto-parts-manager, code on `main`, built site on `gh-pages`).
  To publish an update: `npm run build:pages`, then in `dist-pages/` commit and force-push to branch `gh-pages`.
  Each device keeps its own data; move it with Backup/Restore. Local git save points are made before each step ("back step").
- **Look** (since 2026-10-28): IBM Plex Sans Arabic font (`@fontsource/ibm-plex-sans-arabic`, Arabic + Latin, weights
  400/500/700, cached for offline), teal main colour, amber warnings, green profit / red loss. Shared styles and the
  line icons (`Icon`) are in `src/components/ui.tsx`; on phones the menu is a 4 × 2 grid of icons.
- **Excel export** (Backup page, "Download Excel file", added 2026-10-28) writes an .xlsx with sheets Parts, Sales,
  Repairs, Purchases, Expenses for reading only; it cannot be restored. No library: `src/lib/xlsx.ts` writes the
  file (XML + uncompressed zip), `src/lib/excelExport.ts` builds the rows. The JSON backup stays the only restore file.

---

## 3. What has been implemented

| Area | Files |
|---|---|
| Record types | `src/types.ts` |
| Money, quantities, dates | `src/lib/money.ts`, `src/lib/quantity.ts`, `src/lib/dates.ts` |
| Inventory, sales, purchases, repairs and expenses search | `src/lib/search.ts` (+ `search.test.ts`); shared month list `src/components/MonthPicker.tsx` |
| Stock and weighted-average cost | `src/lib/stock.ts` |
| Reports (date range totals) | `src/lib/reports.ts` |
| Database, save/delete rules, backup | `src/db/db.ts`, `src/db/actions.ts`, `src/db/backup.ts` |
| Live data hook | `src/hooks/useAppData.ts` |
| Shared UI | `src/components/Layout.tsx`, `ui.tsx`, `form.ts`, `PartLinesEditor.tsx` |
| Screens | `src/pages/`: Dashboard, Inventory + PartForm, Purchases + PurchaseForm, Sales + SaleForm, Repairs + RepairForm, Expenses + ExpenseForm, Reports, Backup |
| Routes | `src/App.tsx` (`/`, `/inventory`, `/inventory/new`, `/inventory/:id`, same for purchases, sales, repairs, expenses; `/reports`, `/backup`) |
| PWA icons | made from the owner's photo (2026-10-28; the original was deleted at their request): `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon-32.png`; the name under the icon is **Fayad** |
| Hosting helper | `public/_redirects` (page links work on Netlify) |
| Preview server config | `.claude/launch.json` (used by Claude's browser check) |
| Docs | `README.md` (how to launch, test, back up, install on a phone) |
| Excel export | `src/lib/xlsx.ts`, `src/lib/excelExport.ts` (button in `src/pages/BackupPage.tsx`) |
| Tests | `src/lib/money.test.ts`, `xlsx.test.ts`, `helpers.test.ts`, `stock.test.ts`, `reports.test.ts`, `src/db/actions.test.ts`, `backup.test.ts`, `src/App.test.tsx` |

Screen features: search parts by part name or car, e.g. "Mercedes C200" (since 2026-10-26: part numbers are not
searched and the New/Used filter was removed, new and used show together); Sales list (since 2026-10-27): click a row to open the sale and see its parts, search by part name or date (e.g. coupling, October, 10, 2026, 2026-10, 2026-10-05), a Parts column (part names only), and a small calendar button that opens our own 12-month list (works in every browser) and works together with the search; Purchases list (since 2026-10-27) works the same way as Sales (clickable rows, Parts column, search, calendar month list; both use `matchesRecordSearch` and `MonthPicker`); Repairs list (since 2026-10-28) works the same way too, and its search also looks in the customer and the car (e.g. Ali, Mercedes); New purchase has a "+ New part (not in inventory yet)" box (name + Fits required) that saves the part with 0 opening stock and puts it on the purchase, and the purchase form opens even with an empty inventory; the part picker in sale/purchase/repair forms no longer shows New/Used and now shows the car it fits (e.g. "Coupling · Mercedes C200 · 8 in stock"); low-stock warnings; opening stock;
multi-part purchases, sales and repairs with usual price filled in; edit and delete for every record (with
confirmation); dashboard for the current month with backup reminder; reports with This month / Last month / This
year or any dates; backup download and restore. `navigator.storage.persist()` is requested at start-up.

Since 2026-10-26 the Add/Edit part form no longer shows Part number or Condition. The fields stay in the data
model, backup and old records (editing keeps old values; new parts save `''` and `'new'`). The Inventory Condition
column was also removed (user approved). The part picker label in `PartLinesEditor.tsx` still shows number and New/Used.
Also 2026-10-26: whole Inventory row is clickable (opens the part); rows with 0 stock are red; Fits is required on
the part form (form-level only, so old parts/backups still load); new parts start with Opening quantity 1.

---

## 4. Incomplete, limitations and known issues

- **Phone installation not done.** It needs the `dist` folder on an https host (README explains Netlify Drop).
  Not tested on a real phone. The phone layout was checked only in a 375 px phone-sized browser view.
- **Backup download button was not clicked in the browser** (to avoid saving a file on this PC). The backup and
  restore logic is covered by automated tests, but the file download and file picker have not been tried by hand.
- Persistent storage was **not granted** in the test browser (`navigator.storage.persisted()` returned false).
  Browsers usually grant it for installed apps; regular backups are the real protection.
- After a new build, the service worker shows the new version from the **second** load (checked in the browser).
- The parts picker is a plain dropdown; with hundreds of parts a searchable picker may be wanted later.
- No currency symbol is shown (a setting could be added later if wanted).
- The old copy at `C:\Users\Dell\OneDrive\Desktop\AutoPartsManager` still exists (was locked); it is outdated
  and can be deleted by hand. npm's old cache on C: (~0.9 GB) can be cleared with `npm cache clean --force` run
  outside this folder.

---

## 5. Dependencies and installation problems

Installed (from `npm ls --depth=0` on 2026-10-21; no packages added since):

| Runtime | Development |
|---|---|
| react 19.3.1, react-dom 19.3.1 | vite 8.3.4, @vitejs/plugin-react 6.1.2 |
| react-router 7.18.4 | typescript 7.0.2 |
| dexie 4.4.6, dexie-react-hooks 4.4.0 | tailwindcss 4.3.3, @tailwindcss/vite 4.3.3 |
| | vite-plugin-pwa 2.0.0 |
| | vitest 5.0.5, jsdom 29.1.1, fake-indexeddb 6.2.6 |
| | @testing-library/react 16.3.3, @testing-library/dom 10.4.2, @types/react(-dom) 19.3.0 |

Tools: Node.js 22.14.0, npm 10.9.2. `.npmrc` keeps npm's cache at `D:/Dev/npm-cache`.

Problems met:

1. First install on drive C: failed with `ENOSPC` (disk full). The project was moved to `D:\Dev\AutoPartsManager`
   (verified by SHA-256) and installed there successfully.
2. Node 22.14 is too old for react-router 8 and jsdom 30, so react-router 7.18.4 and jsdom 29.1.1 are used.
3. Warning only: `npm warn deprecated glob@11.1.0` (indirect dependency). `npm audit`: 0 vulnerabilities.
4. Headless Edge rendered the 192 px and 180 px icons blank; they were made by scaling down the correct 512 px icon.

---

## 6. Tests and build commands actually run

| Date | Command | Real result |
|---|---|---|
| 2026-10-20 | `npm install` on C: | **Failed**: ENOSPC (disk full) |
| 2026-10-20 | `npm install` on D: | Succeeded: 427 packages, 0 vulnerabilities |
| 2026-10-20 | `npx tsc`, `npx vitest run` (foundation) | Passed: 49 tests |
| 2026-10-21 | `npx vitest run src/lib` | Passed: 3 files, 78 tests |
| 2026-10-21 | `npx vitest run src/lib/reports.test.ts` | Passed: 7 tests |
| 2026-10-21 | `npx vitest run src/db` | Passed: 2 files, 14 tests |
| 2026-10-21 | `npx tsc` (whole app) | Passed: exit code 0 |
| 2026-10-21 | `npx vitest run` (full suite) | **Passed: 7 files, 113 tests**, no failures |
| 2026-10-21 | `npm run build` | **Passed**: type check OK, JS 404.89 kB (125.03 kB gzip), service worker precaches 9 files |
| 2026-10-21 | `npm run build` (after adding `_redirects` and limiting Tailwind to `src`) | **Passed**: CSS 17.26 kB |
| 2026-10-21 | `npx vitest run` (final, after the last code change) | **Passed: 7 files, 113 tests** |
| 2026-10-26 | `npm test` (after copying the new Inventory search files to D:) | **Passed: 8 files, 119 tests** |
| 2026-10-26 | `npm run build`, then `npm run preview` | **Passed**; /inventory shows the new search box, no New/Used filter |
| 2026-10-27 | `npx vitest run`, `tsc -b`, `npm run build` (after the Sales list search and clickable rows) | **Passed: 8 files, 124 tests**; build OK; browser check not done (preview server was not running) |
| 2026-10-27 | `npx vitest run`, `npm run build`, browser check of /sales (after Parts column, month picker, and removing New/Used from the part picker) | **Passed: 8 files, 124 tests**; build OK; month picker shows. Note: an old service worker kept the old page after a normal reload |
| 2026-10-27 | `npx vitest run`, `npm run build`, browser check of /sales (Parts column without quantities, calendar button instead of a month field) | **Passed: 8 files, 124 tests**; build OK; button shows the picked month |
| 2026-10-27 | `npx vitest run`, `npm run build`, browser click test of the new month list on /sales | **Passed: 8 files, 124 tests**; clicking the calendar opens the months, picking Oct shows "October 2026" |

| 2026-10-27 | `npx vitest run`, `npm run build`, browser check of /purchases and /purchases/new (search, calendar, new-part box) | **Passed: 8 files, 126 tests**; build OK |
| 2026-10-28 | `npx vitest run`, `npm run build`, browser check of /repairs (search box and calendar show) | **Passed: 8 files, 127 tests**; build OK |
| 2026-10-28 | `npx vitest run`, `npm run build`, browser click of "Download Excel file", sample file opened in Microsoft Excel | **Passed: 9 files, 131 tests**; build OK; file named auto-parts-data-2026-10-28.xlsx; Excel opened all 5 sheets with no repair prompt, part number 0123 kept, Arabic text OK |
| 2026-10-28 | `npx vitest run src/lib/xlsx.test.ts`, `npm run build` (removed Part number and Condition columns from the Excel Parts sheet) | **Passed: 3 tests**; build OK |
| 2026-10-28 | `npx vitest run`, `npm run build`, browser check of /, /purchases/new, /sales month list; Arabic sample file opened in Microsoft Excel (after translating the whole app to Arabic) | **Passed: 9 files, 132 tests**; build OK; pages right to left; Excel sheets open right to left with Arabic names |
| 2026-10-28 | `npm run build:pages`, push to GitHub, open the live link | **Passed**: site live (HTTP 200), /reports opens in Arabic, service worker and manifest load from /auto-parts-manager/ |
| 2026-10-28 | `npx vitest run`, `npm run build`, browser check on desktop and phone size, `npm run build:pages` and publish (new look) | **Passed: 9 files, 132 tests**; build OK; new version live on the GitHub link |
| 2026-10-28 | `npx vitest run`, `npm run build:pages` and publish (new icon from the owner's photo, name Fayad) | **Passed: 9 files, 132 tests**; build OK; live manifest shows name Fayad and the new icons |

Test counts per file: money 49, helpers (quantity, dates) 17, stock 13, reports 7, database actions 9,
backup 5, app screens 13.

**Hand check in a browser** (`npm run preview`, http://localhost:4173, 2026-10-21), all results matched hand maths:

- Part with opening stock 4 @ 20.00 → inventory 4 units, avg 20.00, value 80.00.
- Purchase 6 @ 25.00 → 10 in stock.
- Sale 3 @ 45.00 (price filled in automatically) → total 135.00, cost 69.00, profit 66.00.
- Repair: 2 parts @ 50.00 + labor 60.00 → total 160.00, profit 114.00.
- Expense: rent 300.00.
- Dashboard after fresh page loads: revenue 295.00, gross profit 180.00, expenses 300.00, net −120.00,
  stock value 115.00, 5 units. Reports page matched, with stock purchased (150.00) shown separately.
- Service worker active; manifest, name, standalone display and all icons served.
- Phone size (375 px): no sideways scrolling, forms stack. PC size (1280 px): sidebar layout. No console errors.
- The test data was deleted from the test browser afterwards.

---

## 7. Next steps (optional)

1. Use the app with real data in Chrome or Edge on the PC (`npm run build`, `npm run preview`, open
   http://localhost:4173, optionally install it from the address bar). Make a backup file regularly.
2. To use it on a phone: put `dist` on an https host (README "Install on a phone"), install it, and move data with
   backup/restore if needed. Remember the phone and the PC keep separate data.
3. Try Backup → Download and Backup → Restore once by hand.
4. Possible later improvements, only if wanted: searchable part picker, currency symbol, printable sale/repair receipt.

### Commands (run in `D:\Dev\AutoPartsManager`)

```
npm run build      # type check + production build into dist/
npm run preview    # serve the built app at http://localhost:4173
npm test           # run all tests once
npm run dev        # development version at http://localhost:5173 (separate data)
```

---

## 8. Learning Progress and Next Step

Recorded: 2026-10-21

**Preview server (current state)**

- Project path: `D:\Dev\AutoPartsManager`
- The existing production preview is running with `npm run preview` on port 4173.
- Local URL: http://localhost:4173
- The page was verified to respond (HTTP 200) with the title "Auto Parts Manager".
- No rebuild, no application file changes and no test data entry happened during preview startup.

**Learning goal**

The user wants to learn how this application was built: the actual code, the architecture, the data flow,
the technology choices and the reasons for them, testing, debugging, and how a developer thinks through problems.

**How to teach**

- In simple Lebanese Arabic, with practical examples.
- One small topic at a time. Avoid information overload.
- Confirm the user has understood before moving to the next topic.

**Next session, in this order**

1. Open the app in the user's own Chrome or Edge browser at http://localhost:4173.
2. Briefly explain what localhost is, what port 4173 means, and what `npm run preview` does.
3. Look at the real project structure and `package.json` together.
4. Choose one small feature and trace its real code step by step.

Do not rebuild the app or change application features during these first learning steps.

**Still pending**

- Testing on a real phone.
- Manual backup and restore testing (download a backup file, then restore it).

**Later goal**

Concise documentation summarizing the important concepts, the code structure and the technology decisions
learned throughout the project.
