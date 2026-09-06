/* ============================================================================
   BillEase v2 - Bookkeeping & Expenses module
   Monthly income (payments received), expense tracking with category
   breakdown and net cash flow summary.
   ========================================================================== */

let expenseMonth = monthStr(new Date());

// ---------- Render ----------
function renderExpenses() {
  if (!currentBusiness) return;
  const input = document.getElementById('exp-month');
  if (!input.value) input.value = expenseMonth;
  expenseMonth = input.value;

  const monthExpenses = expenses.filter(e => monthStr(e.expense_date) === expenseMonth);
  const expTotal = round2(monthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0));

  const income = round2(payments
    .filter(p => p.direction === 'received' && monthStr(p.payment_date) === expenseMonth)
    .reduce((s, p) => s + Number(p.amount || 0), 0));

  document.getElementById('exp-income').textContent = fmtMoney(income);
  document.getElementById('exp-total').textContent = fmtMoney(expTotal);
  document.getElementById('exp-net').textContent = fmtMoney(round2(income - expTotal));

  renderExpenseCategories(monthExpenses);
  renderExpenseRows(monthExpenses);
}

function renderExpenseCategories(monthExpenses) {
  const map = {};
  monthExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + Number(e.amount || 0); });
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const el = document.getElementById('exp-by-category');
  el.innerHTML = entries.map(([cat, v]) =>
    '<div class="ledger-item">' +
      '<span><b>' + escHtml(cat) + '</b> &mdash; ' + Math.round((v / total) * 100) + '%</span>' +
      '<b>' + fmtMoney(v) + '</b></div>' +
    '<div style="height:6px;background:var(--surface-2);border-radius:4px;margin:0 0 8px;overflow:hidden;">' +
      '<div style="height:100%;width:' + Math.round((v / total) * 100) + '%;background:var(--primary);"></div>' +
    '</div>'
  ).join('') || '<p style="color:var(--muted)">No expenses this month.</p>';
}

function renderExpenseRows(monthExpenses) {
  const list = monthExpenses.slice().sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
  document.getElementById('expenses-body').innerHTML = list.map(e =>
    '<tr>' +
      '<td>' + fmtDate(e.expense_date) + '</td>' +
      '<td>' + escHtml(e.category) + '</td>' +
      '<td>' + escHtml(e.vendor_name || '&mdash;') + '</td>' +
      '<td>' + escHtml(e.payment_method) + '</td>' +
      '<td>' + fmtMoney(e.amount) + '</td>' +
      '<td>' + escHtml(e.notes || '&mdash;') + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-xs btn-secondary" onclick="editExpense(\'' + e.id + '\')">Edit</button>' +
        '<button class="btn btn-xs btn-danger" onclick="deleteExpense(\'' + e.id + '\')">Delete</button>' +
      '</td>' +
    '</tr>'
  ).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px;">No expenses recorded this month</td></tr>';
}

// ---------- Modal ----------
function resetExpenseForm() {
  document.getElementById('expense-id').value = '';
  document.getElementById('expense-category').value = 'Ingredients';
  document.getElementById('expense-amount').value = '';
  document.getElementById('expense-date').value = todayStr();
  document.getElementById('expense-method').value = 'cash';
  document.getElementById('expense-vendor').value = '';
  document.getElementById('expense-notes').value = '';
}

function showExpenseModal() {
  resetExpenseForm();
  document.getElementById('expense-modal-title').textContent = 'Add Expense';
  openModal('expense-modal');
}

function editExpense(id) {
  const e = expenses.find(x => x.id === id);
  if (!e) return;
  document.getElementById('expense-id').value = e.id;
  document.getElementById('expense-category').value = e.category;
  document.getElementById('expense-amount').value = e.amount;
  document.getElementById('expense-date').value = e.expense_date;
  document.getElementById('expense-method').value = e.payment_method;
  document.getElementById('expense-vendor').value = e.vendor_name || '';
  document.getElementById('expense-notes').value = e.notes || '';
  document.getElementById('expense-modal-title').textContent = 'Edit Expense';
  openModal('expense-modal');
}

async function saveExpense() {
  const amount = Number(document.getElementById('expense-amount').value || 0);
  if (amount <= 0) return showToast('Enter a valid amount', 'error');
  const id = document.getElementById('expense-id').value;
  const payload = {
    category: document.getElementById('expense-category').value,
    amount: round2(amount),
    expense_date: document.getElementById('expense-date').value,
    payment_method: document.getElementById('expense-method').value,
    vendor_name: document.getElementById('expense-vendor').value.trim(),
    notes: document.getElementById('expense-notes').value.trim()
  };
  if (id) {
    const { error } = await sb.from('be_expenses').update(payload).eq('id', id);
    if (error) return showToast('Update failed: ' + error.message, 'error');
    Object.assign(expenses.find(x => x.id === id), payload);
    showToast('Expense updated');
  } else {
    const { data, error } = await sb.from('be_expenses')
      .insert([{ ...payload, business_id: currentBusiness.id }]).select().single();
    if (error) return showToast('Save failed: ' + error.message, 'error');
    expenses.push(data);
    showToast('Expense added');
  }
  closeModal('expense-modal');
  renderExpenses();
}

async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  const { error } = await sb.from('be_expenses').delete().eq('id', id);
  if (error) return showToast('Delete failed: ' + error.message, 'error');
  expenses = expenses.filter(x => x.id !== id);
  showToast('Expense deleted');
  renderExpenses();
}

// ---------- Events ----------
document.getElementById('exp-month').addEventListener('change', e => {
  expenseMonth = e.target.value;
  renderExpenses();
});
