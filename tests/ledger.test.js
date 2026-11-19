import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balance, lastDate, oldestUnpaidDays, withRunningBalance, isValidPkMobile, toInternational, reminderLink } from '../src/ledger.js';

const NOW = new Date('2026-03-31T12:00:00').getTime();
const c = {
  name: 'Corner Market', phone: '0300-1234567',
  entries: [
    { id: 1, date: '2026-03-01', type: 'credit', amount: 1000 },
    { id: 2, date: '2026-03-11', type: 'credit', amount: 500 },
    { id: 3, date: '2026-03-21', type: 'payment', amount: 1200 }
  ]
};

test('balance is credit minus payments', () => {
  assert.equal(balance(c), 300);
  assert.equal(balance({ entries: [] }), 0);
});

test('last activity date', () => {
  assert.equal(lastDate(c), '2026-03-21');
  assert.equal(lastDate({ entries: [] }), '');
});

test('payments clear the oldest credit first', () => {
  // 1,200 paid clears the 1,000 from 1 March and 200 of the 500 from 11 March.
  assert.equal(oldestUnpaidDays(c, NOW), 20);
});

test('a settled customer has nothing overdue', () => {
  const settled = { entries: [...c.entries, { id: 4, date: '2026-03-25', type: 'payment', amount: 300 }] };
  assert.equal(balance(settled), 0);
  assert.equal(oldestUnpaidDays(settled, NOW), 0);
});

test('running balance follows date order', () => {
  assert.deepEqual(withRunningBalance([...c.entries].reverse()).map(e => e.run), [1000, 1500, 300]);
});

test('Pakistani mobile numbers', () => {
  for (const ok of ['03001234567', '0300-1234567', '0300 1234567', '923001234567']) assert.ok(isValidPkMobile(ok), ok);
  for (const bad of ['0300123456', '04201234567', '12345', '']) assert.ok(!isValidPkMobile(bad), bad);
  assert.equal(toInternational('0300-1234567'), '923001234567');
});

test('WhatsApp reminder link carries the number and balance', () => {
  const url = new URL(reminderLink(c, 'Al-Madina General Store'));
  assert.equal(url.origin + url.pathname, 'https://wa.me/923001234567');
  assert.match(url.searchParams.get('text'), /Rs 300/);
  assert.match(url.searchParams.get('text'), /Al-Madina General Store/);
});
