# LedgerLite

A digital khata for small shops. It replaces the paper credit register: who owes what, since when, and a one-tap reminder to collect it.

**Live demo:** [usman1905.github.io/ledgerlite](https://usman1905.github.io/ledgerlite/)

[![Tests](https://github.com/usman1905/ledgerlite/actions/workflows/ci.yml/badge.svg)](https://github.com/usman1905/ledgerlite/actions/workflows/ci.yml)

## What it does

- Customer list sorted by balance, name or recent activity, with search
- Record credit given and payments received, with a running balance per entry
- Shows how long each customer's oldest unpaid credit has been open (payments clear the oldest credit first)
- Shop totals: amount to collect, customers with dues, overdue 30+ days, collected this month
- **Send WhatsApp reminder** opens WhatsApp with a polite, pre-filled message and the exact balance
- **Print statement** prints a clean customer statement using print styles
- Validates Pakistani mobile numbers and blocks removing a customer who still owes money

Data is stored in the browser with `localStorage`. The demo starts with a sample shop.

## Tech

Plain HTML, CSS and JavaScript, no framework.

| Path | Purpose |
| --- | --- |
| `index.html` | Layout, customer list and the new-customer dialog |
| `style.css` | Interface and print styles, responsive layout |
| `app.js` | User interface: rendering, events and storage |
| `src/ledger.js` | Balances, FIFO overdue ageing, running balance, phone validation, WhatsApp reminder links (no DOM, fully tested) |
| `tests/ledger.test.js` | 7 tests for the ledger maths and reminders |
| `.github/workflows/ci.yml` | Runs the tests on every push |

## Run locally

The app uses ES modules, so serve the folder rather than opening the file directly:

```bash
npm start
```

Then open the address it prints.

## Tests

Needs Node.js 18 or newer. No dependencies to install.

```bash
npm test
```

## Roadmap

- Urdu interface option
- Multi-device sync with a Node.js API and MySQL
- Automatic weekly reminders for overdue balances

## License

MIT. Built by [Usman](https://usman1905.github.io).
