import { balance, lastDate, oldestUnpaidDays, withRunningBalance, formatRs, isValidPkMobile, reminderLink } from './src/ledger.js';

/* ---------- data ---------- */
const KEY = 'ledgerlite.v1';
const SHOP = 'Al-Madina General Store';
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

function seed() {
  let id = 0;
  const e = (ago, type, amount, note) => ({ id: ++id, date: daysAgo(ago), type, amount, note });
  return {
    selected: 1,
    customers: [
      { id: 1, name: 'Corner Market', phone: '03001234567', entries: [e(41, 'credit', 6200, 'Cooking oil 5L × 4'), e(30, 'payment', 3000, 'Cash'), e(18, 'credit', 2450, 'Rice 10kg, sugar 5kg'), e(9, 'credit', 1800, 'Tea, biscuits'), e(3, 'payment', 2000, 'JazzCash')] },
      { id: 2, name: 'City Traders', phone: '03111234567', entries: [e(52, 'credit', 12500, 'Flour 40kg × 2'), e(33, 'payment', 5000, 'Bank transfer'), e(12, 'credit', 4700, 'Detergent carton')] },
      { id: 3, name: 'Green Grocers', phone: '03211234567', entries: [e(20, 'credit', 3100, 'Packing bags'), e(6, 'payment', 3100, 'Cash')] },
      { id: 4, name: 'Daily Mart', phone: '03331234567', entries: [e(15, 'credit', 2650, 'Soft drinks crate'), e(4, 'payment', 2000, 'Cash')] },
      { id: 5, name: 'Bilal Kiryana', phone: '03451234567', entries: [e(64, 'credit', 3900, 'Pulses'), e(27, 'credit', 1250, 'Spices')] },
      { id: 6, name: 'Sana Boutique', phone: '03021234567', entries: [e(8, 'credit', 900, 'Stationery'), e(1, 'credit', 650, 'Tissue boxes')] }
    ]
  };
}
let db;
try { db = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { db = seed(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ } };

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const rs = formatRs;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = n => n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const fmtDate = d => new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const current = () => db.customers.find(c => c.id === db.selected) || db.customers[0];

/* ---------- top KPIs ---------- */
function renderKpis() {
  const dues = db.customers.map(balance);
  const month = today().slice(0, 7);
  const collected = db.customers.flatMap(c => c.entries).filter(e => e.type === 'payment' && e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0);
  const overdue = db.customers.filter(c => balance(c) > 0 && oldestUnpaidDays(c) > 30).length;
  $('#kpis').innerHTML = [
    ['To collect', `<b class="owe">${rs(dues.filter(d => d > 0).reduce((a, b) => a + b, 0))}</b>`],
    ['Customers with dues', `<b>${dues.filter(d => d > 0).length} of ${db.customers.length}</b>`],
    ['Overdue 30+ days', `<b class="${overdue ? 'owe' : ''}">${overdue}</b>`],
    ['Collected this month', `<b class="paid">${rs(collected)}</b>`]
  ].map(([k, v]) => `<div class="kpi"><span>${k}</span>${v}</div>`).join('');
}

/* ---------- customer list ---------- */
function renderList() {
  const q = $('#search').value.trim().toLowerCase();
  const sort = $('#sortSel').value;
  const list = db.customers.filter(c => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q));
  list.sort(sort === 'name' ? (a, b) => a.name.localeCompare(b.name) : sort === 'recent' ? (a, b) => lastDate(b).localeCompare(lastDate(a)) : (a, b) => balance(b) - balance(a));
  $('#customerList').innerHTML = list.map(c => {
    const b = balance(c);
    return `<li><button class="cust${c.id === db.selected ? ' on' : ''}" data-id="${c.id}"><span class="initials">${initials(c.name)}</span><span class="cust__main"><b>${esc(c.name)}</b><small>${b > 0 ? 'Oldest due ' + oldestUnpaidDays(c) + ' days ago' : 'Settled'}</small></span><span class="cust__bal ${b > 0 ? 'owe' : 'paid'}">${b > 0 ? rs(b) : 'Rs 0'}</span></button></li>`;
  }).join('') || '<li class="empty">No customers found</li>';
}

/* ---------- customer detail ---------- */
function renderDetail() {
  const c = current();
  if (!c) { $('#detail').innerHTML = '<div class="card empty">Add your first customer to start.</div>'; return; }
  const b = balance(c);
  const credit = c.entries.filter(e => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
  const paid = credit - b;
  const rows = withRunningBalance(c.entries).reverse();

  $('#detail').innerHTML = `
    <div class="card">
      <p class="print-only muted">${SHOP} · Statement printed ${fmtDate(today())}</p>
      <div class="head">
        <div><h1>${esc(c.name)}</h1><p class="muted">${esc(c.phone)} · last activity ${lastDate(c) ? fmtDate(lastDate(c)) : 'none'}</p></div>
        <div class="head__actions no-print">
          <a class="btn btn--wa" href="${reminderLink(c, SHOP)}" target="_blank" rel="noopener" ${b > 0 ? '' : 'aria-disabled="true"'}>Send WhatsApp reminder</a>
          <button class="btn" id="printBtn">Print statement</button>
          <button class="btn" id="deleteCustomerBtn">Remove</button>
        </div>
      </div>
      <div class="summary">
        <div class="sum"><span>Balance due</span><b class="${b > 0 ? 'owe' : 'paid'}">${rs(b)}</b></div>
        <div class="sum"><span>Total credit given</span><b>${rs(credit)}</b></div>
        <div class="sum"><span>Total paid</span><b class="paid">${rs(paid)}</b></div>
      </div>
    </div>
    <form class="card entry-form no-print" id="entryForm">
      <div class="seg" role="radiogroup" aria-label="Entry type">
        <input type="radio" name="type" id="tCredit" value="credit" checked><label for="tCredit">Credit given</label>
        <input type="radio" name="type" id="tPay" value="payment"><label for="tPay">Payment received</label>
      </div>
      <label>Amount (Rs)<input name="amount" type="number" min="1" step="1" required></label>
      <label>Note<input name="note" placeholder="Items or payment method"></label>
      <label>Date<input name="date" type="date" value="${today()}" required></label>
      <button class="btn btn--primary">Add entry</button>
    </form>
    <div class="card">
      <h3 style="font-size:15px;margin-bottom:8px">Entries</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Type</th><th>Note</th><th class="num">Amount</th><th class="num">Balance</th><th class="no-print"></th></tr></thead>
        <tbody>${rows.map(e => `<tr><td>${fmtDate(e.date)}</td><td><span class="type type--${e.type}">${e.type === 'credit' ? 'Credit' : 'Payment'}</span></td><td>${esc(e.note || '')}</td><td class="num ${e.type === 'credit' ? 'owe' : 'paid'}">${e.type === 'credit' ? '+' : '−'}${rs(e.amount)}</td><td class="num">${rs(e.run)}</td><td class="no-print"><button class="del" data-del="${e.id}" aria-label="Delete entry">Delete</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No entries yet</td></tr>'}</tbody>
      </table></div>
    </div>`;
}

function render() { renderKpis(); renderList(); renderDetail(); }

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const cust = e.target.closest('.cust');
  if (cust) { db.selected = +cust.dataset.id; save(); render(); return; }
  const del = e.target.closest('[data-del]');
  if (del) { const c = current(); c.entries = c.entries.filter(x => x.id !== +del.dataset.del); save(); render(); toast('Entry deleted'); return; }
  if (e.target.id === 'printBtn') window.print();
  if (e.target.id === 'deleteCustomerBtn') {
    const c = current();
    if (balance(c) > 0) { toast('Clear the balance before removing this customer'); return; }
    db.customers = db.customers.filter(x => x !== c); db.selected = db.customers[0]?.id; save(); render(); toast('Customer removed');
  }
  if (e.target.matches('[data-close]')) e.target.closest('dialog').close();
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'entryForm') return;
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const amount = Math.round(+f.amount);
  if (!(amount > 0)) return;
  const c = current();
  const id = Math.max(0, ...db.customers.flatMap(x => x.entries.map(y => y.id))) + 1;
  c.entries.push({ id, date: f.date, type: f.type, amount, note: f.note.trim() });
  save(); render(); toast(f.type === 'credit' ? 'Credit added' : 'Payment recorded');
});
$('#search').addEventListener('input', renderList);
$('#sortSel').addEventListener('input', renderList);
$('#addCustomerBtn').addEventListener('click', () => { $('#customerForm').reset(); $('#customerError').textContent = ''; $('#customerDialog').showModal(); });
$('#customerForm').addEventListener('submit', e => {
  const f = Object.fromEntries(new FormData(e.target));
  const phone = f.phone.replace(/\D/g, '');
  if (!isValidPkMobile(phone)) { e.preventDefault(); $('#customerError').textContent = 'Enter a Pakistani mobile number, for example 03001234567.'; return; }
  if (db.customers.some(c => c.name.toLowerCase() === f.name.trim().toLowerCase())) { e.preventDefault(); $('#customerError').textContent = 'A customer with this name already exists.'; return; }
  const id = Math.max(0, ...db.customers.map(c => c.id)) + 1;
  db.customers.push({ id, name: f.name.trim(), phone, entries: [] }); db.selected = id; save(); render(); toast('Customer added');
});
let tt;
function toast(m) { const el = $('#toast'); el.textContent = m; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 1800); }

render();
