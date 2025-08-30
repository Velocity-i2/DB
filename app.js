// ====== CONFIG ======
const API_BASE = 'https://script.google.com/macros/s/AKfycbyy0h2WkSZCYBDDBKKVaju9MciehzACx889cXJCjxTQ7U6PjiiYSgnWfcU5QoZpnSwtMg/exec'; // replace with your Apps Script Web App URL

// ====== STATE ======
let PASSWORD = null;
let transactions = [];
let charts = { month: null, category: null };

// ====== LOGIN ======
const loginModal = document.getElementById('loginModal');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

function showLogin() { loginModal.style.display = 'flex'; }
function hideLogin() { loginModal.style.display = 'none'; }

loginBtn.addEventListener('click', async () => {
  const pwd = passwordInput.value.trim();
  if (!pwd) return;
  PASSWORD = pwd;
  sessionStorage.setItem('ADMIN_PASSWORD', PASSWORD);
  hideLogin();
  await boot();
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('ADMIN_PASSWORD');
  location.reload();
});

// ====== API HELPERS ======
async function apiGet(action) {
  const res = await fetch(`${API_BASE}?action=${encodeURIComponent(action)}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'API error');
  return json.data;
}

async function apiPost(body) {
  body.password = PASSWORD;
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'API error');
  return json;
}

// ====== FORM ======
const txForm = document.getElementById('txForm');
const txId = document.getElementById('txId');
const txDate = document.getElementById('txDate');
const txCategory = document.getElementById('txCategory');
const txDesc = document.getElementById('txDesc');
const txAmount = document.getElementById('txAmount');
const txType = document.getElementById('txType');
const resetBtn = document.getElementById('resetBtn');
const txTableBody = document.querySelector('#txTable tbody');
const searchInput = document.getElementById('searchInput');

const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const netEl = document.getElementById('net');

function resetForm() {
  txId.value = '';
  txDate.value = new Date().toISOString().slice(0,10);
  txCategory.value = '';
  txDesc.value = '';
  txAmount.value = '';
  txType.value = 'Expense';
}
resetBtn.addEventListener('click', resetForm);

txForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    ID: txId.value || undefined,
    Date: txDate.value,
    Category: txCategory.value,
    Description: txDesc.value,
    Amount: parseFloat(txAmount.value),
    Type: txType.value
  };
  try {
    const action = payload.ID ? 'update' : 'create';
    await apiPost({ action, payload });
    await loadData();
    resetForm();
  } catch (err) {
    alert(err.message);
  }
});

// ====== TABLE ======
function renderTable(list) {
  txTableBody.innerHTML = '';
  list.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.Date||''}</td>
      <td>${r.Category||''}</td>
      <td>${r.Description||''}</td>
      <td>${Number(r.Amount||0).toFixed(2)}</td>
      <td>${r.Type||''}</td>
      <td>
        <button class="act secondary" data-id="${r.ID}" data-action="edit">Edit</button>
        <button class="act" data-id="${r.ID}" data-action="delete">Delete</button>
      </td>
    `;
    txTableBody.appendChild(tr);
  });
}

txTableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button.act');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === 'edit') {
    const row = transactions.find(r => r.ID === id);
    if (!row) return;
    txId.value = row.ID;
    txDate.value = row.Date;
    txCategory.value = row.Category;
    txDesc.value = row.Description;
    txAmount.value = row.Amount;
    txType.value = row.Type;
    window.scrollTo({ top:0, behavior:'smooth' });
  }

  if (action === 'delete') {
    if (!confirm('Delete this transaction?')) return;
    await apiPost({ action:'delete', id });
    await loadData();
  }
});

// ====== SEARCH ======
searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  const filtered = transactions.filter(r =>
    (r.Description||'').toLowerCase().includes(q) ||
    (r.Category||'').toLowerCase().includes(q)
  );
  renderTable(filtered);
});

// ====== CHARTS ======
function renderCharts(stats) {
  if (charts.month) charts.month.destroy();
  if (charts.category) charts.category.destroy();

  const months = Object.keys(stats.byMonth).sort();
  const income = months.map(m => stats.byMonth[m].income);
  const expense = months.map(m => stats.byMonth[m].expense);

  charts.month = new Chart(document.getElementById('monthChart'), {
    type:'bar',
    data:{ labels:months, datasets:[{label:'Income',data:income},{label:'Expense',data:expense}] }
  });

  const cats = Object.keys(stats.byCategory);
  const vals = cats.map(c => stats.byCategory[c]);

  charts.category = new Chart(document.getElementById('categoryChart'), {
    type:'pie',
    data:{ labels:cats, datasets:[{ data:vals }] }
  });
}

function renderCards(stats) {
  totalIncomeEl.textContent = stats.totalIncome.toFixed(2);
  totalExpenseEl.textContent = stats.totalExpense.toFixed(2);
  netEl.textContent = stats.net.toFixed(2);
}

// ====== DATA LOADING ======
async function loadData() {
  transactions = await apiGet('list');
  renderTable(transactions);
  const stats = await apiGet('stats');
  renderCards(stats);
  renderCharts(stats);
}

// ====== INIT ======
async function boot() {
  resetForm();
  await loadData();
}

(function init(){
  PASSWORD = sessionStorage.getItem('ADMIN_PASSWORD');
  if (!PASSWORD) showLogin(); else { hideLogin(); boot(); }
})();
