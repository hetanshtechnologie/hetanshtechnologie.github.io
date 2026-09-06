/* ============================================================================
   BillEase v2 - Reports & Analytics module
   Monthly sales, tax & GST summary, peak hours, top products, outstanding,
   dish margins, day reconciliation and PDF export.
   ========================================================================== */

let reportMonth = monthStr(new Date());
let reportCache = null; // last computed report data

// ---------- Load ----------
function loadReports() {
  const input = document.getElementById('report-month');
  if (!input.value) input.value = reportMonth;
  reportMonth = input.value;
  const recon = document.getElementById('rep-recon-date');
  if (!recon.value) recon.value = todayStr();
  computeReport();
  renderReconciliation();
}

// ---------- Compute ----------
function computeReport() {
  const monthSales = invoices.filter(i => isSale(i) && i.status !== 'cancelled' && monthStr(i.invoice_date) === reportMonth);
  const purchases = invoices.filter(i => i.type === 'purchase' && i.status !== 'cancelled' && monthStr(i.invoice_date) === reportMonth);
  const monthPayments = payments.filter(p => p.direction === 'received' && monthStr(p.payment_date) === reportMonth);
  const monthExpenses = expenses.filter(e => monthStr(e.expense_date) === reportMonth);

  const salesValue = monthSales.reduce((s, i) => s + Number(i.total || 0), 0);
  const taxValue = monthSales.reduce((s, i) => s + Number(i.tax_amount || 0), 0);
  const purchaseValue = purchases.reduce((s, i) => s + Number(i.total || 0), 0);
  const paidValue = monthPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const expenseValue = monthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const outstanding = invoices
    .filter(i => isSale(i) && i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + (Number(i.total) - Number(i.paid_amount)), 0);

  // Daily sales buckets
  const year = Number(reportMonth.slice(0, 4));
  const monthIdx = Number(reportMonth.slice(5, 7)) - 1;
  const days = new Date(year, monthIdx + 1, 0).getDate();
  const daily = new Array(days).fill(0);
  monthSales.forEach(i => { const d = new Date(i.invoice_date + 'T00:00:00'); daily[d.getDate() - 1] += Number(i.total || 0); });

  // Peak hours (orders by hour of day)
  const peak = new Array(24).fill(0);
  monthSales.forEach(i => {
    const h = i.created_at ? new Date(i.created_at).getHours() : 12;
    peak[h]++;
  });

  // Top products by sale value (month)
  const prodMap = {};
  monthSales.forEach(i => (invoiceItems[i.id] || []).forEach(it => {
    prodMap[it.product_name] = (prodMap[it.product_name] || 0) + Number(it.amount || 0);
  }));
  const topProducts = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Outstanding by party
  const outMap = {};
  invoices
    .filter(i => isSale(i) && i.status !== 'paid' && i.status !== 'cancelled')
    .forEach(i => {
      const p = parties.find(x => x.id === i.party_id);
      const key = p ? p.name : 'Unknown';
      outMap[key] = (outMap[key] || 0) + (Number(i.total) - Number(i.paid_amount));
    });
  const outstandingByParty = Object.entries(outMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // GST rate buckets (CGST + SGST split)
  const gstRates = { 0: 0, 5: 0, 12: 0, 18: 0, 28: 0 };
  monthSales.forEach(i => (invoiceItems[i.id] || []).forEach(it => {
    const rate = Number(it.gst_rate || 0);
    const cgst = round2(it.amount * rate / 200);
    gstRates[rate] = (gstRates[rate] || 0) + round2(cgst * 2);
  }));

  // Top dishes & margins (dishes with recipes sold this month)
  const dishMap = {};
  monthSales.forEach(i => (invoiceItems[i.id] || []).forEach(it => {
    if (it.product_id) {
      dishMap[it.product_id] = (dishMap[it.product_id] || { qty: 0, value: 0 });
      dishMap[it.product_id].qty += Number(it.qty || 0);
      dishMap[it.product_id].value += Number(it.amount || 0);
    }
  }));
  const dishMargins = [];
  Object.entries(dishMap).forEach(([pid, v]) => {
    const p = products.find(x => x.id === pid);
    if (!p) return;
    const parts = recipes.filter(r => r.product_id === pid);
    if (!parts.length) return;
    const costPerUnit = parts.reduce((s, r) => {
      const ing = products.find(x => x.id === r.ingredient_id);
      return s + (ing ? Number(ing.purchase_price || 0) * Number(r.qty || 0) : 0);
    }, 0);
    const cost = round2(costPerUnit * v.qty);
    const margin = v.value > 0 ? round2(((v.value - cost) / v.value) * 100) : 0;
    dishMargins.push({ name: p.name, qty: v.qty, value: round2(v.value), cost, margin });
  });
  dishMargins.sort((a, b) => b.value - a.value).slice(0, 8);

  reportCache = {
    reportMonth, salesValue, taxValue, purchaseValue, paidValue, outstanding,
    expenseValue, daily, days, peak, topProducts, outstandingByParty, gstRates, dishMargins
  };

  // Summary cards
  document.getElementById('rep-sales').textContent = fmtMoney(salesValue);
  document.getElementById('rep-tax').textContent = fmtMoney(taxValue);
  document.getElementById('rep-paid').textContent = fmtMoney(paidValue);
  document.getElementById('rep-outstanding').textContent = fmtMoney(outstanding);
  document.getElementById('rep-expense').textContent = fmtMoney(expenseValue);

  renderCharts();
  renderGSTSummary();
  renderDishMargins();
}

// ---------- Charts ----------
function renderCharts() {
  const d = reportCache;
  const dayLabels = [];
  for (let i = 1; i <= d.days; i++) dayLabels.push(String(i));

  upsertChart('chart-daily', {
    type: 'line',
    data: {
      labels: dayLabels,
      datasets: [{
        label: 'Sales',
        data: d.daily,
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13,148,136,0.12)',
        fill: true,
        tension: 0.35
      }]
    },
    options: { scales: { x: { title: { display: true, text: 'Day of month' } } } }
  });

  const hourLabels = [];
  for (let h = 0; h < 24; h++) hourLabels.push((h === 0 ? '12a' : h < 12 ? h + 'a' : h === 12 ? '12p' : (h - 12) + 'p'));
  upsertChart('chart-peak', {
    type: 'bar',
    data: {
      labels: hourLabels,
      datasets: [{
        label: 'Orders',
        data: d.peak,
        backgroundColor: '#f59e0b',
        borderRadius: 4
      }]
    }
  });

  upsertChart('chart-tax', {
    type: 'pie',
    data: {
      labels: Object.keys(d.gstRates).map(r => r + '% GST'),
      datasets: [{
        data: Object.values(d.gstRates),
        backgroundColor: ['#cbd5e1', '#0d9488', '#14b8a6', '#2dd4bf', '#0f766e'],
        borderWidth: 0
      }]
    }
  });

  upsertChart('chart-top', {
    type: 'bar',
    data: {
      labels: d.topProducts.map(t => t[0].length > 18 ? t[0].slice(0, 17) + '…' : t[0]),
      datasets: [{
        label: 'Sales value',
        data: d.topProducts.map(t => t[1]),
        backgroundColor: '#14b8a6',
        borderRadius: 6
      }]
    },
    options: { indexAxis: 'y' }
  });

  upsertChart('chart-outstanding', {
    type: 'bar',
    data: {
      labels: d.outstandingByParty.map(t => t[0].length > 18 ? t[0].slice(0, 17) + '…' : t[0]),
      datasets: [{
        label: 'Outstanding',
        data: d.outstandingByParty.map(t => t[1]),
        backgroundColor: '#f59e0b',
        borderRadius: 6
      }]
    },
    options: { indexAxis: 'y' }
  });
}

// ---------- GST summary ----------
function renderGSTSummary() {
  const gstRows = Object.entries(reportCache.gstRates).filter(([, v]) => v > 0).map(([rate, v]) => {
    const half = round2(v / 2);
    return '<tr><td>' + rate + '%</td><td>' + fmtMoney(half) + '</td><td>' + fmtMoney(half) + '</td><td>' + fmtMoney(v) + '</td></tr>';
  }).join('');
  document.getElementById('rep-gst-summary').innerHTML =
    '<div class="table-wrap"><table class="table"><thead><tr><th>GST Rate</th><th>CGST</th><th>SGST</th><th>Total</th></tr></thead>' +
    '<tbody>' + (gstRows || '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:16px;">No taxable sales this month</td></tr>') +
    '</tbody></table></div>';
}

// ---------- Top dishes & margins ----------
function renderDishMargins() {
  const d = reportCache;
  const el = document.getElementById('rep-margins');
  el.innerHTML = d.dishMargins.length ? d.dishMargins.map(m =>
    '<div class="ledger-item"><span><b>' + escHtml(m.name) + '</b> &mdash; ' + m.qty + ' sold</span>' +
    '<span>Cost ' + fmtMoney(m.cost) + ' &bull; Value ' + fmtMoney(m.value) + ' <span class="' + (m.margin >= 0 ? 'stock-ok' : 'stock-low') + '">' + m.margin + '%</span></span></div>'
  ).join('') : '<p style="color:var(--muted)">Set recipes on your dishes to see margin analysis.</p>';
}

// ---------- Day reconciliation ----------
function renderReconciliation() {
  const date = document.getElementById('rep-recon-date').value || todayStr();
  const dayPayments = payments.filter(p => p.payment_date === date);
  const dayExpenses = expenses.filter(e => e.expense_date === date);
  const openingCash = Number((currentBusiness && currentBusiness.opening_cash) || 0);

  const byMethod = {};
  const expected = {};
  ['cash', 'upi', 'card', 'bank', 'online', 'credit', 'other'].forEach(m => { byMethod[m] = 0; expected[m] = 0; });
  dayPayments.forEach(p => {
    if (p.direction === 'received') byMethod[p.method] = (byMethod[p.method] || 0) + Number(p.amount || 0);
  });
  dayExpenses.forEach(e => {
    expected[e.payment_method] = (expected[e.payment_method] || 0) + Number(e.amount || 0);
  });

  const totalIn = Object.values(byMethod).reduce((s, v) => s + v, 0);
  const totalOut = Object.values(expected).reduce((s, v) => s + v, 0);
  const closing = round2(openingCash + totalIn - totalOut);

  const methodRows = Object.keys(byMethod).filter(m => byMethod[m] > 0 || expected[m] > 0).map(m =>
    '<div class="ledger-item"><span><b>' + m.toUpperCase() + '</b></span>' +
    '<span>In: ' + fmtMoney(byMethod[m]) + ' &nbsp; Out: ' + fmtMoney(expected[m]) + '</span></div>'
  ).join('');

  document.getElementById('rep-recon-body').innerHTML =
    '<p style="color:var(--muted)">Date: ' + fmtDate(date) + ' &mdash; Opening cash: ' + fmtMoney(openingCash) + '</p>' +
    methodRows +
    '<div class="ledger-item"><span><b>Total received</b></span><b>' + fmtMoney(totalIn) + '</b></div>' +
    '<div class="ledger-item"><span><b>Total paid out (expenses)</b></span><b>' + fmtMoney(totalOut) + '</b></div>' +
    '<div class="ledger-item"><span><b>Expected closing cash</b></span><b>' + fmtMoney(closing) + '</b></div>';
}

// ---------- PDF export ----------
function exportReportPDF() {
  if (!reportCache) return showToast('Load the report first', 'error');
  const d = reportCache;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const monthLabel = new Date(d.reportMonth + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  doc.setFillColor(13, 148, 136);
  doc.rect(0, 0, pageW, 26, 'F');
  doc.setTextColor(255);
  doc.setFontSize(16);
  doc.text('BillEase - Monthly Report (' + monthLabel + ')', 14, 17);
  doc.setFontSize(9);
  doc.text((currentBusiness && currentBusiness.name) || 'My Business', 14, 24);

  doc.setTextColor(0);
  doc.autoTable({
    startY: 34,
    head: [['Metric', 'Value']],
    body: [
      ['Gross Sales', fmtMoney(d.salesValue)],
      ['Sales (net of tax)', fmtMoney(round2(d.salesValue - d.taxValue))],
      ['Tax Collected (GST)', fmtMoney(d.taxValue)],
      ['Payments Received', fmtMoney(d.paidValue)],
      ['Purchases', fmtMoney(d.purchaseValue)],
      ['Expenses', fmtMoney(d.expenseValue)],
      ['Outstanding (dues)', fmtMoney(d.outstanding)]
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [13, 148, 136] },
    margin: { left: 14, right: 14 }
  });

  const topBody = d.topProducts.length
    ? d.topProducts.map(([n, v]) => [n, fmtMoney(v)])
    : [['No product sales this month', '-']];
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [['Top Products', 'Sales Value']],
    body: topBody,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [13, 148, 136] },
    margin: { left: 14, right: 14 }
  });

  const dishBody = d.dishMargins.length
    ? d.dishMargins.map(m => [m.name, String(m.qty), fmtMoney(m.cost), fmtMoney(m.value), m.margin + '%'])
    : [['No recipes with sales', '-', '-', '-', '-']];
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [['Dish', 'Qty', 'Cost', 'Value', 'Margin']],
    body: dishBody,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [245, 158, 11] },
    margin: { left: 14, right: 14 }
  });

  const outBody = d.outstandingByParty.length
    ? d.outstandingByParty.map(([n, v]) => [n, fmtMoney(v)])
    : [['No outstanding dues', '-']];
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [['Outstanding by Party', 'Amount']],
    body: outBody,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [245, 158, 11] },
    margin: { left: 14, right: 14 }
  });

  const gstBody = Object.entries(d.gstRates).filter(([, v]) => v > 0).map(([rate, v]) => [rate + '%', fmtMoney(round2(v / 2)), fmtMoney(round2(v / 2)), fmtMoney(v)]);
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [['GST Rate', 'CGST', 'SGST', 'Total']],
    body: gstBody,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [13, 148, 136] },
    margin: { left: 14, right: 14 }
  });

  doc.save('billease-report-' + d.reportMonth + '.pdf');
}

// ---------- Events ----------
document.getElementById('report-month').addEventListener('change', e => {
  reportMonth = e.target.value;
  computeReport();
});
document.getElementById('rep-recon-date').addEventListener('change', renderReconciliation);
