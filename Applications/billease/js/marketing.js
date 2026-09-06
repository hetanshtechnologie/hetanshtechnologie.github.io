/* ============================================================================
   BillEase v2 - Marketing & Loyalty module
   SMS / WhatsApp / email campaign drafts with audience targeting, plus the
   customer loyalty points board and points ledger.
   ========================================================================== */

let mktTab = 'campaigns';

// ---------- Tabs ----------
function setMktTab(tab) {
  mktTab = tab;
  document.querySelectorAll('#mkt-seg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('mkt-campaigns-view').classList.toggle('hidden', tab !== 'campaigns');
  document.getElementById('mkt-loyalty-view').classList.toggle('hidden', tab !== 'loyalty');
  renderMarketing();
}

function renderMarketing() {
  renderCampaigns();
  if (mktTab === 'loyalty') renderLoyalty();
}

// ---------- Campaigns ----------
function renderCampaigns() {
  const list = campaigns.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  document.getElementById('campaigns-body').innerHTML = list.map(c =>
    '<tr>' +
      '<td><b>' + escHtml(c.title) + '</b><div class="campaign-msg">' + escHtml(c.message || '') + '</div></td>' +
      '<td>' + escHtml(c.channel) + '</td>' +
      '<td>' + escHtml(c.audience) + '</td>' +
      '<td><span class="badge badge-' + (c.status === 'sent' ? 'paid' : 'draft') + '">' + escHtml(c.status) + '</span></td>' +
      '<td>' + (c.sent_count || 0) + '</td>' +
      '<td class="actions">' +
        (c.status !== 'sent'
          ? '<button class="btn btn-xs btn-success" onclick="sendCampaign(\'' + c.id + '\')">Send</button>'
          : '') +
        '<button class="btn btn-xs btn-secondary" onclick="editCampaign(\'' + c.id + '\')">Edit</button>' +
        '<button class="btn btn-xs btn-danger" onclick="deleteCampaign(\'' + c.id + '\')">Delete</button>' +
      '</td>' +
    '</tr>'
  ).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:30px;">No campaigns yet. Create one to reach your customers.</td></tr>';
}

function resetCampaignForm() {
  document.getElementById('campaign-id').value = '';
  document.getElementById('campaign-title').value = '';
  document.getElementById('campaign-message').value = '';
  document.getElementById('campaign-channel').value = 'whatsapp';
  document.getElementById('campaign-audience').value = 'customers';
}

function showCampaignModal() {
  resetCampaignForm();
  document.getElementById('campaign-modal-title').textContent = 'New Campaign';
  openModal('campaign-modal');
}

function editCampaign(id) {
  const c = campaigns.find(x => x.id === id);
  if (!c) return;
  document.getElementById('campaign-id').value = c.id;
  document.getElementById('campaign-title').value = c.title;
  document.getElementById('campaign-message').value = c.message || '';
  document.getElementById('campaign-channel').value = c.channel;
  document.getElementById('campaign-audience').value = c.audience;
  document.getElementById('campaign-modal-title').textContent = 'Edit Campaign';
  openModal('campaign-modal');
}

async function saveCampaign() {
  const title = document.getElementById('campaign-title').value.trim();
  if (!title) return showToast('Enter a campaign title', 'error');
  const id = document.getElementById('campaign-id').value;
  const payload = {
    title,
    message: document.getElementById('campaign-message').value.trim(),
    channel: document.getElementById('campaign-channel').value,
    audience: document.getElementById('campaign-audience').value
  };
  if (id) {
    const { error } = await sb.from('be_campaigns').update(payload).eq('id', id);
    if (error) return showToast('Update failed: ' + error.message, 'error');
    Object.assign(campaigns.find(x => x.id === id), payload);
    showToast('Campaign updated');
  } else {
    const { data, error } = await sb.from('be_campaigns')
      .insert([{ ...payload, business_id: currentBusiness.id }]).select().single();
    if (error) return showToast('Save failed: ' + error.message, 'error');
    campaigns.push(data);
    showToast('Campaign saved as draft');
  }
  closeModal('campaign-modal');
  renderCampaigns();
}

// Audience count for a campaign: customers / loyalty members / vendors
function campaignAudienceCount(audience) {
  if (audience === 'vendors') return parties.filter(p => p.type === 'vendor').length;
  if (audience === 'loyalty') return parties.filter(p => p.type === 'customer' && Number(p.loyalty_points || 0) > 0).length;
  return parties.filter(p => p.type === 'customer').length;
}

async function sendCampaign(id) {
  const c = campaigns.find(x => x.id === id);
  if (!c) return;
  const count = campaignAudienceCount(c.audience);
  const { error } = await sb.from('be_campaigns')
    .update({ status: 'sent', sent_count: count }).eq('id', c.id);
  if (error) return showToast('Send failed: ' + error.message, 'error');
  c.status = 'sent';
  c.sent_count = count;
  showToast('Campaign sent to ' + count + ' contact(s) via ' + c.channel);
  renderCampaigns();
}

async function deleteCampaign(id) {
  if (!confirm('Delete this campaign?')) return;
  const { error } = await sb.from('be_campaigns').delete().eq('id', id);
  if (error) return showToast('Delete failed: ' + error.message, 'error');
  campaigns = campaigns.filter(x => x.id !== id);
  showToast('Campaign deleted');
  renderCampaigns();
}

// ---------- Loyalty ----------
function renderLoyalty() {
  const customers = parties
    .filter(p => p.type === 'customer')
    .sort((a, b) => Number(b.loyalty_points || 0) - Number(a.loyalty_points || 0));
  document.getElementById('loyalty-body').innerHTML = customers.map(p =>
    '<div class="ledger-item">' +
      '<span><b>' + escHtml(p.name) + '</b>' + (p.phone ? ' &mdash; ' + escHtml(p.phone) : '') + '</span>' +
      '<span class="loyalty-chip">' + Number(p.loyalty_points || 0) + ' pts</span>' +
    '</div>'
  ).join('') || '<p style="color:var(--muted)">No customers yet.</p>';

  const ledger = loyaltyLedger.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 30);
  document.getElementById('loyalty-ledger').innerHTML = ledger.map(l => {
    const p = parties.find(x => x.id === l.party_id);
    return '<div class="ledger-item">' +
      '<span>' + fmtDate(l.created_at) + ' &mdash; <b>' + escHtml(p ? p.name : '?') + '</b> &mdash; ' + escHtml(l.reason || '') + '</span>' +
      '<span class="' + (l.points >= 0 ? 'stock-ok' : 'stock-low') + '">' + (l.points >= 0 ? '+' : '') + l.points + ' pts</span>' +
    '</div>';
  }).join('') || '<p style="color:var(--muted)">No loyalty activity yet. Points are earned on POS bills.</p>';
}
