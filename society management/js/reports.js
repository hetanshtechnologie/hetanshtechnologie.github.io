const ReportsModule = (() => {
  async function render(el) {
    el.innerHTML = `
      <div class="grid grid-2 mb-2" id="reportStats"></div>
      <div class="grid grid-2">
        <div class="card"><h3 class="mb-2">💰 Collection vs Expenses</h3><div id="financialChart" class="text-center" style="padding:20px;"></div></div>
        <div class="card"><h3 class="mb-2">📊 Complaint Categories</h3><div id="complaintChart" class="text-center" style="padding:20px;"></div></div>
      </div>
      <div class="grid grid-2 mt-2">
        <div class="card"><h3 class="mb-2">📋 Recent Payments</h3><div id="recentPayments"><div class="spinner"></div></div></div>
        <div class="card"><h3 class="mb-2">📈 Resident Engagement</h3><div id="engagementStats"><div class="spinner"></div></div></div>
      </div>`;
    await loadReportData();
  }

  async function loadReportData() {
    const client = supabaseClient.getClient();
    try {
      const { data: bills } = await client.from('maintenance_bills').select('amount, paid_amount, status');
      const { data: payments } = await client.from('society_payments').select('amount, paid_at, payment_method').order('paid_at', { ascending: false }).limit(10);
      const { data: complaints } = await client.from('complaints').select('category, status');
      const { data: expenses } = await client.from('expenses').select('amount');
      const { data: residents } = await client.from('profiles').select('id').neq('role', 'admin');
      const { data: bookings } = await client.from('facility_bookings').select('id');
      const { data: forumTopics } = await client.from('forum_topics').select('id');

      const totalBilled = (bills || []).reduce((s, b) => s + b.amount, 0);
      const totalPaid = (payments || []).reduce((s, p) => s + p.amount, 0);
      const totalExpenses = (expenses || []).reduce((s, e) => s + e.amount, 0);
      const pendingBills = (bills || []).filter(b => b.status !== 'paid').length;
      const overdueBills = (bills || []).filter(b => b.status === 'overdue').length;
      const resolvedComplaints = (complaints || []).filter(c => c.status === 'resolved' || c.status === 'closed').length;

      document.getElementById('reportStats').innerHTML = `
        <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value">₹${totalPaid.toLocaleString()}</div><div class="stat-label">Total Collected</div></div>
        <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-value">₹${totalExpenses.toLocaleString()}</div><div class="stat-label">Total Expenses</div></div>
        <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value">₹${(totalPaid - totalExpenses).toLocaleString()}</div><div class="stat-label">Net Balance</div></div>
        <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-value">${resolvedComplaints}/${(complaints || []).length}</div><div class="stat-label">Complaints Resolved</div></div>
      `;

      document.getElementById('recentPayments').innerHTML = (payments || []).length > 0 ?
        (payments || []).map(p => `
          <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
            <strong>Payment</strong>
            <span style="float:right;"><strong>₹${p.amount}</strong> <span class="badge badge-info">${p.payment_method || '-'}</span></span>
            <div style="font-size:11px;color:var(--text-secondary);">${new Date(p.paid_at).toLocaleDateString()}</div>
          </div>`).join('') : '<p style="color:var(--text-secondary);">No payments recorded</p>';

      document.getElementById('engagementStats').innerHTML = `
        <div style="padding:12px;background:#f8f9fa;border-radius:8px;margin-bottom:8px;">
          <strong>👥 Total Residents:</strong> ${(residents || []).length}
        </div>
        <div style="padding:12px;background:#f8f9fa;border-radius:8px;margin-bottom:8px;">
          <strong>🏋️ Facility Bookings:</strong> ${(bookings || []).length}
        </div>
        <div style="padding:12px;background:#f8f9fa;border-radius:8px;margin-bottom:8px;">
          <strong>💬 Forum Discussions:</strong> ${(forumTopics || []).length}
        </div>
        <div style="padding:12px;background:#f8f9fa;border-radius:8px;margin-bottom:8px;">
          <strong>⏳ Pending Bills:</strong> ${pendingBills}
        </div>
        <div style="padding:12px;background:#f8f9fa;border-radius:8px;margin-bottom:8px;">
          <strong>🔴 Overdue Bills:</strong> ${overdueBills}
        </div>
      `;

      renderFinancialChart(totalPaid, totalExpenses);
      renderComplaintChart(complaints || []);
    } catch (e) {
      document.getElementById('reportStats').innerHTML = '<p style="color:var(--text-secondary);">Could not load report data</p>';
    }
  }

  function renderFinancialChart(collected, expenses) {
    const el = document.getElementById('financialChart');
    const total = collected + expenses || 1;
    const colPct = (collected / total * 100).toFixed(1);
    const expPct = (expenses / total * 100).toFixed(1);
    el.innerHTML = `
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
          <span>💰 Collected: ₹${collected.toLocaleString()}</span>
          <span>${colPct}%</span>
        </div>
        <div style="height:24px;background:#f1f3f4;border-radius:12px;overflow:hidden;">
          <div style="height:100%;width:${colPct}%;background:var(--success);border-radius:12px;"></div>
        </div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
          <span>📋 Expenses: ₹${expenses.toLocaleString()}</span>
          <span>${expPct}%</span>
        </div>
        <div style="height:24px;background:#f1f3f4;border-radius:12px;overflow:hidden;">
          <div style="height:100%;width:${expPct}%;background:var(--danger);border-radius:12px;"></div>
        </div>
      </div>
      <p style="margin-top:12px;font-weight:600;">Net Balance: ₹${(collected - expenses).toLocaleString()}</p>`;
  }

  function renderComplaintChart(complaints) {
    const el = document.getElementById('complaintChart');
    const categories = {};
    complaints.forEach(c => { categories[c.category] = (categories[c.category] || 0) + 1; });
    const total = complaints.length || 1;
    const keys = Object.keys(categories);
    if (keys.length === 0) {
      el.innerHTML = '<p style="color:var(--text-secondary);">No complaints data</p>';
      return;
    }
    const colors = ['#1a73e8', '#0f9d58', '#f4b400', '#db4437', '#ab47bc', '#00bcd4', '#ff7043'];
    el.innerHTML = keys.map((k, i) => `
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px;">
          <span>${k.replace('_', ' ')}</span>
          <span>${categories[k]}</span>
        </div>
        <div style="height:16px;background:#f1f3f4;border-radius:8px;overflow:hidden;">
          <div style="height:100%;width:${(categories[k]/total*100).toFixed(1)}%;background:${colors[i % colors.length]};border-radius:8px;"></div>
        </div>
      </div>`).join('');
  }

  return { render };
})();
