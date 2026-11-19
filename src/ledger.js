// Ledger maths, reminders and validation. Pure functions, used by the app and the tests.

/** Amount the customer still owes: credit given minus payments received. */
export const balance = c => c.entries.reduce((s, e) => s + (e.type === 'credit' ? e.amount : -e.amount), 0);

/** Date of the customer's most recent entry, as YYYY-MM-DD, or '' if none. */
export const lastDate = c => c.entries.reduce((m, e) => (e.date > m ? e.date : m), '');

/**
 * Age in days of the oldest credit that is still unpaid.
 * Payments clear the oldest credit first (FIFO), the way shopkeepers settle a khata.
 */
export function oldestUnpaidDays(c, now = Date.now()) {
  let paid = c.entries.filter(e => e.type === 'payment').reduce((s, e) => s + e.amount, 0);
  const credits = c.entries.filter(e => e.type === 'credit').sort((a, b) => a.date.localeCompare(b.date));
  for (const e of credits) {
    if (paid >= e.amount) { paid -= e.amount; continue; }
    return Math.floor((now - new Date(e.date + 'T00:00:00')) / 86400000);
  }
  return 0;
}

/** Entries oldest first, each with the running balance after it. */
export function withRunningBalance(entries) {
  let run = 0;
  return [...entries]
    .sort((x, y) => x.date.localeCompare(y.date) || x.id - y.id)
    .map(e => ({ ...e, run: (run += e.type === 'credit' ? e.amount : -e.amount) }));
}

export const formatRs = v => 'Rs ' + Math.abs(v).toLocaleString('en-PK');

/** Accepts 03XXXXXXXXX or 923XXXXXXXXX, with or without spaces and dashes. */
export const isValidPkMobile = phone => /^(03\d{9}|923\d{9})$/.test(String(phone).replace(/\D/g, ''));

/** 0300 1234567 -> 923001234567, the format wa.me links need. */
export const toInternational = phone => String(phone).replace(/\D/g, '').replace(/^0/, '92');

export function reminderMessage(c, shop) {
  return `Assalam o alaikum ${c.name}, this is ${shop}. Your outstanding balance is ${formatRs(balance(c))}. Kindly clear it at your earliest. JazakAllah.`;
}

export const reminderLink = (c, shop) => `https://wa.me/${toInternational(c.phone)}?text=${encodeURIComponent(reminderMessage(c, shop))}`;
