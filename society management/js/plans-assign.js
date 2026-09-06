// Plan Assignment Module — admin can assign/change plans for users
const PlanAssignment = (() => {
  let plans = [];

  async function render(el) {
    el.innerHTML = '<div class="spinner"></div>';
    try {
      const client = supabaseClient.getClient();
      const [plansRes, usersRes, purchasesRes] = await Promise.all([
        client.from('society_plans').select('*').order('price'),
        client.from('profiles').select('id, user_id, email, full_name, role').order('full_name'),
        client.from('society_purchases').select('*, society_plans(name, slug, price)').order('created_at', { ascending: false }),
      ]);

      plans = plansRes.data || [];
      const users = usersRes.data || [];
      const purchases = purchasesRes.data || [];

      // Build a map: user_id -> active purchase
      const purchaseMap = {};
      purchases.forEach(p => {
        if (p.status === 'active' && !purchaseMap[p.user_id]) {
          purchaseMap[p.user_id] = p;
        }
      });

      el.innerHTML = `
        <div style="padding:20px;">
          <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">Plan Assignment</h2>
          <div id="plan-assign-alert"></div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm" style="border-collapse:collapse;">
              <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;text-align:left;">
                <th style="padding:10px 12px;font-weight:600;">User</th>
                <th style="padding:10px 12px;font-weight:600;">Email</th>
                <th style="padding:10px 12px;font-weight:600;">Role</th>
                <th style="padding:10px 12px;font-weight:600;">Current Plan</th>
                <th style="padding:10px 12px;font-weight:600;">Expires</th>
                <th style="padding:10px 12px;font-weight:600;">Assign Plan</th>
              </tr></thead>
              <tbody>${users.map(u => {
                const purchase = purchaseMap[u.user_id];
                const planName = purchase?.society_plans?.name || purchase?.plan_id ? 'Plan #' + purchase.plan_id : 'None';
                const planColor = planName === 'Premium' ? '#7c3aed' : planName === 'Standard' ? '#2563eb' : planName === 'Free' ? '#16a34a' : '#94a3b8';
                const expires = purchase?.current_period_end ? new Date(purchase.current_period_end).toLocaleDateString() : '-';
                const isAdmin = u.role === 'admin' || u.role === 'super_admin';
                return '<tr style="border-bottom:1px solid #f1f5f9;" class="hover:bg-gray-50">' +
                  '<td style="padding:10px 12px;font-weight:500;">' + escHtml(u.full_name || '-') + (isAdmin ? ' <span style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:8px;">' + escHtml(u.role) + '</span>' : '') + '</td>' +
                  '<td style="padding:10px 12px;color:#64748b;font-size:13px;">' + escHtml(u.email || '-') + '</td>' +
                  '<td style="padding:10px 12px;font-size:12px;">' + escHtml(u.role || 'resident') + '</td>' +
                  '<td style="padding:10px 12px;"><span style="font-size:12px;font-weight:600;color:' + planColor + ';">' + escHtml(planName) + '</span></td>' +
                  '<td style="padding:10px 12px;font-size:12px;color:#64748b;">' + expires + '</td>' +
                  '<td style="padding:10px 12px;">' +
                    '<select class="plan-select" data-user-id="' + u.user_id + '" style="padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;">' +
                      '<option value="">-- Select --</option>' +
                      plans.map(p => '<option value="' + p.id + '">' + escHtml(p.name) + (p.price > 0 ? ' (₹' + (p.price/100).toLocaleString() + ')' : ' (Free)') + '</option>').join('') +
                    '</select>' +
                    ' <button class="plan-assign-btn btn-sm" data-user-id="' + u.user_id + '" style="padding:4px 10px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer;margin-left:4px;">Assign</button>' +
                  '</td>' +
                '</tr>';
              }).join('')}</tbody>
            </table>
          </div>
          <div style="padding:12px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;margin-top:8px;">${users.length} users total</div>
        </div>
      `;

      // Bind assign buttons
      el.querySelectorAll('.plan-assign-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
          const userId = this.dataset.userId;
          const select = el.querySelector('.plan-select[data-user-id="' + userId + '"]');
          const planId = parseInt(select.value);
          if (!planId) { showToast('Select a plan first', 'error'); return; }
          this.disabled = true;
          this.textContent = '...';
          try {
            const now = new Date().toISOString();
            const year = new Date(Date.now() + 365 * 86400000).toISOString();
            // Deactivate old plans
            await client.from('society_purchases').update({ status: 'expired' }).eq('user_id', userId).eq('status', 'active');
            // Insert new plan
            const { error } = await client.from('society_purchases').insert({
              user_id: userId, plan_id: planId, status: 'active',
              current_period_start: now, current_period_end: year,
            });
            if (error) throw error;
            showToast('Plan assigned successfully', 'success');
            render(el);
          } catch (e) {
            document.getElementById('plan-assign-alert').innerHTML = '<div style="background:#fce8e6;color:#db4437;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:13px;">' + escHtml(e.message) + '</div>';
          }
          this.disabled = false;
          this.textContent = 'Assign';
        });
      });

    } catch (e) {
      el.innerHTML = '<div style="padding:20px;color:#db4437;">Error loading data: ' + escHtml(e.message) + '</div>';
    }
  }

  return { render };
})();
