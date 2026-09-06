const MaintenanceModule = (() => {
  async function render(el) {
    const user = AuthModule.currentUser;
    const isAdmin = user.profile?.role === 'admin';
    el.innerHTML = `
      ${isAdmin ? `
      <div class="flex-between mb-2">
        <div>
          <button class="btn-primary" onclick="MaintenanceModule.generateBills()">📄 Generate Monthly Bills</button>
          <button class="btn-outline" onclick="MaintenanceModule.showReport()" style="margin-left:8px;">📊 Download Report</button>
        </div>
        <select id="monthFilter" onchange="MaintenanceModule.loadBills()" style="max-width:200px;">
          <option value="${new Date().toISOString().slice(0,7)}">Current Month</option>
        </select>
      </div>` : ''}
      <div class="card"><table><thead><tr>
        ${isAdmin ? '<th>Resident</th><th>Flat</th>' : ''}
        <th>Month</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th>${isAdmin ? '<th>Actions</th>' : '<th>Pay</th>'}
      </tr></thead><tbody id="billTableBody"></tbody></table></div>
      <div id="paymentModal" class="modal-overlay"></div>`;
    await loadBills();
  }

  async function loadBills() {
    const user = AuthModule.currentUser;
    const isAdmin = user.profile?.role === 'admin';
    const client = supabaseClient.getClient();
    const tbody = document.getElementById('billTableBody');

    let query = client.from('maintenance_bills').select('*, profiles!maintenance_bills_resident_id_fkey(full_name, flat_number)');
    if (!isAdmin) query = query.eq('resident_id', user.id);
    query = query.order('bill_month', { ascending: false }).limit(50);
    const { data } = await query;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:32px;color:var(--text-secondary)">No bills found</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(b => {
      const due = b.amount - b.paid_amount;
      const statusClass = b.status === 'paid' ? 'success' : b.status === 'overdue' ? 'danger' : 'warning';
      return `<tr>
        ${isAdmin ? `<td>${escHtml(b.profiles?.full_name || '-')}</td><td>${escHtml(b.profiles?.flat_number || '-')}</td>` : ''}
        <td>${new Date(b.bill_month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</td>
        <td>₹${b.amount}</td>
        <td>₹${b.paid_amount}</td>
        <td>₹${due > 0 ? due : 0}</td>
        <td><span class="badge badge-${statusClass}">${b.status}</span></td>
        ${isAdmin ? `<td><button class="btn-outline btn-sm" onclick="MaintenanceModule.editBill('${b.id}')">✏️</button></td>` :
        `<td>${due > 0 ? `<button class="btn-primary btn-sm" onclick="MaintenanceModule.showPayment('${b.id}', ${b.amount}, ${b.paid_amount})">Pay ₹${due}</button>` : '✅ Paid'}</td>`}
      </tr>`;
    }).join('');
  }

  async function generateBills() {
    try {
      const client = supabaseClient.getClient();
      const { data: flats } = await client.from('flats').select('*').eq('is_occupied', true);
      if (!flats || flats.length === 0) { showToast('No occupied flats found', 'error'); return; }
      let count = 0;
      for (const flat of flats) {
        const residentId = flat.owner_id || flat.tenant_id;
        if (!residentId) continue;
        const { data: existing } = await client.from('maintenance_bills').select('id').eq('flat_id', flat.id).eq('bill_month', new Date().toISOString().slice(0, 7) + '-01');
        if (existing && existing.length > 0) continue;
        await client.from('maintenance_bills').insert({
          flat_id: flat.id, resident_id: residentId,
          bill_month: new Date().toISOString().slice(0, 7) + '-01',
          amount: CONFIG.MAINTENANCE_RATE,
          due_date: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
        });
        count++;
      }
      showToast(`Generated ${count} bills`, 'success');
      await loadBills();
    } catch (e) { showToast(e.message, 'error'); }
  }

  function showPayment(billId, amount, paid) {
    const due = amount - paid;
    const modal = document.getElementById('paymentModal');
    modal.innerHTML = `
      <div class="modal" style="max-width:420px;">
        <h2>💰 Pay Maintenance</h2>
        <p style="font-size:24px;font-weight:700;color:var(--primary);margin-bottom:16px;">₹${due}</p>
        <div class="form-group"><label>Payment Method</label>
          <select id="pm_method">
            <option value="upi">UPI (GPay / PhonePe)</option>
            <option value="razorpay">Razorpay</option>
            <option value="stripe">Stripe</option>
          </select>
        </div>
        <div id="upiSection">
          <div class="form-group"><label>UPI ID</label><input id="pm_upi" value="${CONFIG.UPI_ID}" disabled></div>
          <div style="text-align:center;padding:16px;background:#f8f9fa;border-radius:8px;margin-bottom:12px;">
            <div style="font-size:48px;margin-bottom:8px;">📱</div>
            <p style="font-size:14px;color:var(--text-secondary)">Scan with any UPI app or use UPI ID above</p>
          </div>
        </div>
        <div id="cardSection" class="hidden">
          <div class="form-group"><label>Card Number</label><input placeholder="4242 4242 4242 4242"></div>
          <div class="form-row"><div class="form-group"><label>Expiry</label><input placeholder="MM/YY"></div><div class="form-group"><label>CVV</label><input placeholder="***"></div></div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-outline" onclick="document.getElementById('paymentModal').classList.remove('active')">Cancel</button>
          <button class="btn-success" onclick="MaintenanceModule.processPayment('${billId}', ${due})">Pay ₹${due}</button>
        </div>
      </div>`;
    document.getElementById('pm_method').addEventListener('change', function() {
      document.getElementById('upiSection').classList.toggle('hidden', this.value !== 'upi');
      document.getElementById('cardSection').classList.toggle('hidden', this.value === 'upi');
    });
    modal.classList.add('active');
  }

  async function processPayment(billId, amount) {
    try {
      const user = AuthModule.currentUser;
      const method = document.getElementById('pm_method').value;
      const client = supabaseClient.getClient();
      const txnId = 'TXN' + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase();
      await client.from('society_payments').insert({
        bill_id: billId, resident_id: user.id, amount, payment_method: method,
        transaction_id: txnId, status: 'success', paid_at: new Date().toISOString()
      });
      const { data: bill } = await client.from('maintenance_bills').select('paid_amount, amount').eq('id', billId).single();
      const newPaid = (bill.paid_amount || 0) + amount;
      const newStatus = newPaid >= bill.amount ? 'paid' : 'partial';
      await client.from('maintenance_bills').update({ paid_amount: newPaid, status: newStatus, payment_date: new Date().toISOString(), payment_method: method, transaction_id: txnId }).eq('id', billId);
      document.getElementById('paymentModal').classList.remove('active');
      showToast('Payment successful! Transaction: ' + txnId, 'success');
      await loadBills();
    } catch (e) { showToast(e.message, 'error'); }
  }

  function editBill(id) {
    showToast('Edit bill feature', 'info');
  }

  function showReport() {
    showToast('Report download started', 'info');
  }

  return { render, loadBills, generateBills, showPayment, processPayment, editBill, showReport };
})();
