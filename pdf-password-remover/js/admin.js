// Admin dashboard: analytics, user management, processing log.
const PAGE_SIZE = 25;

const state = { offset: 0, status: '', selfId: null };

const el = {
  statCards: document.getElementById('stat-cards'),
  chart: document.getElementById('chart'),
  axisStart: document.getElementById('axis-start'),
  axisEnd: document.getElementById('axis-end'),
  usersBody: document.getElementById('users-body'),
  leaderBody: document.getElementById('leader-body'),
  logsBody: document.getElementById('logs-body'),
  filterStatus: document.getElementById('filter-status'),
  refreshBtn: document.getElementById('refresh-btn'),
  prevBtn: document.getElementById('prev-btn'),
  nextBtn: document.getElementById('next-btn'),
  pageLabel: document.getElementById('page-label'),
  msg: document.getElementById('admin-msg'),
};

// ---------- stats ----------
function renderStats(s) {
  const totalRuns = Number(s.total_runs) || 0;
  const success = Number(s.success_runs) || 0;
  const failure = Number(s.failure_runs) || 0;
  const rate = totalRuns ? Math.round((success / totalRuns) * 100) : 0;

  el.statCards.innerHTML = `
    <div class="card stat">
      <div class="label">Total users</div>
      <div class="value">${Number(s.total_users) || 0}</div>
      <div class="sub">${Number(s.blocked_users) || 0} blocked</div>
    </div>
    <div class="card stat">
      <div class="label">Active users</div>
      <div class="value">${Number(s.active_users) || 0}</div>
      <div class="sub">${Number(s.runs_last_24h) || 0} runs in 24h</div>
    </div>
    <div class="card stat">
      <div class="label">PDFs processed</div>
      <div class="value">${totalRuns}</div>
      <div class="sub">${Number(s.runs_last_7d) || 0} in the last 7 days</div>
    </div>
    <div class="card stat">
      <div class="label">Success rate</div>
      <div class="value">${rate}%</div>
      <div class="sub">${failure} failed attempt${failure === 1 ? '' : 's'}</div>
    </div>`;
}

function renderChart(rows) {
  const data = rows || [];
  if (!data.length) {
    el.chart.innerHTML = '<div class="small muted" style="width:100%">No activity yet.</div>';
    return;
  }

  const max = Math.max(1, ...data.map((d) => Number(d.total) || 0));
  el.chart.innerHTML = data
    .map((d) => {
      const total = Number(d.total) || 0;
      const h = total ? Math.max(4, Math.round((total / max) * 100)) : 1;
      const day = String(d.day).slice(5);
      const ok = Number(d.success) || 0;
      const bad = Number(d.failure) || 0;
      return `<div class="bar" style="height:${h}%" title="${day}: ${total} run(s) — ${ok} ok, ${bad} failed"></div>`;
    })
    .join('');

  el.axisStart.textContent = String(data[0].day).slice(0, 10);
  el.axisEnd.textContent = String(data[data.length - 1].day).slice(0, 10);
}

// ---------- users ----------
function renderUsers(users) {
  if (!users?.length) {
    el.usersBody.innerHTML = '<tr><td colspan="5" class="small muted">No users yet.</td></tr>';
    return;
  }

  el.usersBody.innerHTML = users
    .map((u) => {
      const isSelf = u.id === state.selfId;
      const blocked = u.status === 'blocked';
      const roleBadge = u.role === 'admin'
        ? '<span class="badge admin">admin</span>'
        : '<span class="badge user">user</span>';
      const statusBadge = blocked
        ? '<span class="badge blocked">blocked</span>'
        : '<span class="badge active">active</span>';

      let action = '<span class="small muted">&mdash;</span>';
      if (!isSelf && u.role !== 'admin') {
        action = `<button class="btn ghost sm ${blocked ? 'ok' : 'danger'}" type="button"
                   data-user="${escapeHtml(u.id)}" data-blocked="${blocked}">
                   ${blocked ? 'Unblock' : 'Block'}</button>`;
      }

      return `<tr>
        <td class="wrap-any">${escapeHtml(u.email)}${isSelf ? ' <span class="badge user">you</span>' : ''}</td>
        <td>${roleBadge}</td>
        <td>${statusBadge}</td>
        <td class="num">${Number(u.total_runs) || 0}</td>
        <td>${action}</td>
      </tr>`;
    })
    .join('');
}

el.usersBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-user]');
  if (!btn) return;

  const userId = btn.dataset.user;
  const blocked = btn.dataset.blocked === 'true';
  const verb = blocked ? 'Unblock' : 'Block';
  if (!window.confirm(`${verb} this user?`)) return;

  btn.disabled = true;
  try {
    await callFunction(CONFIG.ADMIN_FUNCTION, { action: 'set_status', userId, blocked });
    showMessage(el.msg, 'ok', `User ${blocked ? 'unblocked' : 'blocked'}.`);
    await Promise.all([loadUsers(), loadStats()]);
  } catch (err) {
    showMessage(el.msg, 'err', err.message);
    btn.disabled = false;
  }
});

// ---------- leaderboard ----------
function renderLeaderboard(rows) {
  const data = (rows || []).filter((r) => Number(r.total_runs) > 0);
  if (!data.length) {
    el.leaderBody.innerHTML = '<tr><td colspan="5" class="small muted">No runs recorded yet.</td></tr>';
    return;
  }
  el.leaderBody.innerHTML = data
    .map((r) => `<tr>
      <td class="wrap-any">${escapeHtml(r.email)}</td>
      <td class="num">${Number(r.total_runs) || 0}</td>
      <td class="num">${Number(r.success_runs) || 0}</td>
      <td class="num">${Number(r.failure_runs) || 0}</td>
      <td title="${escapeHtml(formatDate(r.last_run_at))}">${escapeHtml(timeAgo(r.last_run_at))}</td>
    </tr>`)
    .join('');
}

// ---------- logs ----------
function renderLogs(rows) {
  if (!rows?.length) {
    el.logsBody.innerHTML = '<tr><td colspan="6" class="small muted">Nothing on this page.</td></tr>';
    return;
  }

  el.logsBody.innerHTML = rows
    .map((l) => {
      const badge = l.status === 'success'
        ? `<span class="badge success">${l.password_removed ? 'unlocked' : 'no password'}</span>`
        : '<span class="badge failure">failed</span>';
      const detail = l.status === 'failure'
        ? escapeHtml(l.error_message || '-')
        : escapeHtml(l.was_encrypted === false ? 'File was not encrypted' : 'Password removed');
      return `<tr>
        <td title="${escapeHtml(formatDate(l.created_at))}">${escapeHtml(timeAgo(l.created_at))}</td>
        <td class="wrap-any">${escapeHtml(l.email)}</td>
        <td class="wrap-any">${escapeHtml(l.filename)}</td>
        <td>${badge}</td>
        <td class="num">${escapeHtml(formatBytes(l.file_size_bytes))}</td>
        <td class="wrap-any small muted">${detail}</td>
      </tr>`;
    })
    .join('');

  el.pageLabel.textContent = `Page ${Math.floor(state.offset / PAGE_SIZE) + 1}`;
  el.prevBtn.disabled = state.offset === 0;
  el.nextBtn.disabled = rows.length < PAGE_SIZE;
}

async function loadLogs() {
  el.logsBody.innerHTML = '<tr><td colspan="6"><div class="skeleton"></div></td></tr>';
  try {
    const { logs } = await callFunction(CONFIG.ADMIN_FUNCTION, {
      action: 'logs',
      limit: PAGE_SIZE,
      offset: state.offset,
      status: state.status || null,
    });
    renderLogs(logs);
  } catch (err) {
    el.logsBody.innerHTML = `<tr><td colspan="6" class="small muted">${escapeHtml(err.message)}</td></tr>`;
  }
}

// ---------- loaders ----------
async function loadStats() {
  const { stats } = await callFunction(CONFIG.ADMIN_FUNCTION, { action: 'stats' });
  renderStats(stats || {});
}

async function loadChart() {
  const { daily } = await callFunction(CONFIG.ADMIN_FUNCTION, { action: 'daily_volume' });
  renderChart(daily);
}

async function loadUsers() {
  const { users } = await callFunction(CONFIG.ADMIN_FUNCTION, { action: 'users' });
  renderUsers(users);
}

async function loadLeaderboard() {
  const { leaderboard } = await callFunction(CONFIG.ADMIN_FUNCTION, { action: 'leaderboard', limit: 10 });
  renderLeaderboard(leaderboard);
}

async function loadAll() {
  hideMessage(el.msg);
  const results = await Promise.allSettled([loadStats(), loadChart(), loadUsers(), loadLeaderboard(), loadLogs()]);
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length === results.length) {
    showMessage(el.msg, 'err', failed[0].reason?.message || 'Could not load the dashboard.');
  }
}

// ---------- wiring ----------
el.refreshBtn.addEventListener('click', loadAll);
el.filterStatus.addEventListener('change', () => {
  state.status = el.filterStatus.value;
  state.offset = 0;
  loadLogs();
});
el.prevBtn.addEventListener('click', () => {
  state.offset = Math.max(0, state.offset - PAGE_SIZE);
  loadLogs();
});
el.nextBtn.addEventListener('click', () => {
  state.offset += PAGE_SIZE;
  loadLogs();
});

// ---------- boot ----------
(async function init() {
  const profile = await guardPage('admin');
  if (!profile) return;

  state.selfId = profile.id;
  renderTopbar(profile, 'admin');
  await loadAll();
})();
