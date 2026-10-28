# Auto Parts Manager

A simple app for a car spare parts shop and repair workshop: inventory (new and used parts), purchases, sales,
repair jobs, expenses, a dashboard and profit reports. It runs in the browser on a PC or phone, works offline,
and can be installed like an app. There is no login: it is meant for one person on their own device.

## Start the app

Open a terminal in `D:\Dev\AutoPartsManager` and run:

```
npm run build
npm run preview
```

Then open **http://localhost:4173** in Chrome or Edge. In Chrome or Edge you can install it as an app with the
install icon at the right of the address bar.

Use the same browser and address every time: the data is stored in that browser on this PC (see "Your data" below).

While changing the code, `npm run dev` starts a development version at http://localhost:5173 (it has its own,
separate data).

## Check that everything works

```
npm test           # runs all automated tests once
npm run build      # checks the code for type errors and builds the app into the dist folder
```

A quick hand check:

1. **Inventory → Add part.** For example "Brake pads", sale price 45, opening quantity 4, opening unit cost 20.
2. **Purchases → New purchase.** 6 of the same part at 25. Inventory now shows 10 in stock at an average cost of 23.00.
3. **Sales → New sale.** 3 units (the price fills in as 45.00). The sales list shows total 135.00, cost 69.00, profit 66.00.
4. **Repairs → New repair.** Use 2 units charged at 50 each and labor 60. The total is 160.00, profit 114.00, and 5 remain in stock.
5. **Expenses → New expense.** Rent 300.
6. **Dashboard / Reports.** Revenue 295.00, gross profit 180.00, expenses 300.00, net profit −120.00, stock value 115.00.
7. Try to sell more than is in stock: the app refuses and explains why.

## How the numbers are worked out

- **Money** is stored in whole cents, so totals are exact (no rounding errors).
- **Weighted-average cost.** Each purchase updates the average cost of a part. Parts sold or used in a repair are
  costed at the average cost on that date. When the last unit leaves, its cost is exactly what remains, so total
  cost of goods always equals total purchase cost.
- **Stock is never typed in directly.** It is calculated from the opening stock plus every purchase, sale and
  repair, in date order. Editing or deleting a record always gives correct stock, and repair parts are taken out of
  stock exactly once.
- A save that would make any part's stock go below zero on any date is refused.
- **Gross profit** = sales and repair revenue (parts + labor) − cost of the parts sold or used.
  **Net profit (estimated)** = gross profit − operating expenses.
- **Purchases are not expenses.** Their cost counts only when the parts are sold or used. Reports show
  "stock purchased" for information only. Do not enter stock purchases under Expenses.

## Your data

- Everything is saved **only in this browser on this device**. Clearing the browser's site data deletes it.
- Use **Backup → Download backup file** regularly and keep the file somewhere safe. The dashboard reminds you
  after 7 days.
- **Backup → Restore** replaces all data on the device with a backup file. Use it to recover or to move data to
  another device. A phone and a PC each have their own data; a backup moves it between them.
- After you install a new version, it takes effect the next time the app is opened.

## Install on a phone

A phone can only install the app from an **https** address, so the built app has to be put on a web host:

1. Run `npm run build`. The finished app is in the `dist` folder.
2. Upload the `dist` folder to a static web host that accepts a folder upload, for example Netlify Drop
   (https://app.netlify.com/drop; a free account keeps the site online). No GitHub is needed. The `_redirects` file
   in `dist` makes page links work on Netlify.
3. Open the https address on the phone in Chrome (Android) or Safari (iPhone), then choose **Install app** /
   **Add to Home Screen**.

Hosting the app does not upload any data: data never leaves the device it was entered on.

## Project layout

```
src/lib/money.ts      exact money maths (cents)
src/lib/stock.ts      stock and weighted-average cost, calculated from all records
src/lib/reports.ts    totals and profit for a date range
src/db/               database (IndexedDB via Dexie), save/delete rules, backup and restore
src/pages/            one file per screen
src/components/       layout, shared form pieces, the parts-lines editor
```

Technology: React, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), vite-plugin-pwa, Vitest.
npm's download cache is kept on drive D: by the `.npmrc` file.
