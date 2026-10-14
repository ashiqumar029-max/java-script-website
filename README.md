# EXPENZA — Expense Tracker

A responsive personal finance dashboard built with HTML, CSS, and vanilla JavaScript.

## Features
- Add income and expense transactions with category and date
- Automatically calculate balance, income, expenses, and savings rate
- Monthly budget progress and editable budget limit
- Category spending chart powered by Chart.js
- Search and filter transactions
- Export transactions to CSV
- Local Storage persistence
- Responsive dark green dashboard

## Run locally
1. Keep `index.html`, `style.css`, and `script.js` in the same folder.
2. Open the folder in VS Code.
3. Use Live Server to run `index.html`, or open it directly in your browser.
4. Internet is needed for Google Fonts and Chart.js CDN.

## Data and currency
Transactions and budget are stored in this browser's Local Storage; they are not uploaded to a server. The starter currency is USD. In `script.js`, change `CURRENCY` to a supported ISO code such as `PKR` if needed.

## License
MIT
