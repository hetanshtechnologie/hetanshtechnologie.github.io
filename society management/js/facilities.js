const FacilitiesModule = (() => {
  async function render(el) {
    const user = AuthModule.currentUser;
    const isAdmin = user.profile?.role === 'admin';
    el.innerHTML = `
      ${isAdmin ? `<div class="flex-between mb-2"><button class="btn-primary" onclick="FacilitiesModule.showAddFacility()">+ Add Facility</button></div>` : ''}
      <div class="grid grid-3" id="facilitiesList"></div>
      <div id="facilityModal" class="modal-overlay"></div>
      <div id="bookingModal" class="modal-overlay"></div>
      <div id="calendarModal" class="modal-overlay"></div>`;
    await loadFacilities();
  }

  async function loadFacilities() {
    const client = supabaseClient.getClient();
    const { data } = await client.from('facilities').select('*').eq('is_active', true);
    const container = document.getElementById('facilitiesList');
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><h3>No facilities available</h3></div>';
      return;
    }
    container.innerHTML = data.map(f => `
      <div class="card text-center">
        <div style="font-size:40px;margin-bottom:8px;">${getFacilityIcon(f.name)}</div>
        <h3>${escHtml(f.name)}</h3>
        <p style="font-size:13px;color:var(--text-secondary);">${escHtml(f.description || '')}</p>
        <p style="margin:8px 0;font-weight:600;">Capacity: ${f.capacity || 'N/A'} | ₹${f.hourly_rate || 0}/hr</p>
        <button class="btn-primary btn-sm" onclick="FacilitiesModule.showBooking('${f.id}', '${escHtml(f.name)}', ${f.hourly_rate || 0})">Book Now</button>
        <button class="btn-outline btn-sm" onclick="FacilitiesModule.showCalendar('${f.id}', '${escHtml(f.name)}')" style="margin-left:4px;">📅</button>
      </div>`).join('');
  }

  function showAddFacility() {
    const modal = document.getElementById('facilityModal');
    modal.innerHTML = `
      <div class="modal">
        <h2>Add Facility</h2>
        <div class="form-group"><label>Name *</label><input id="fac_name" placeholder="e.g. Clubhouse"></div>
        <div class="form-group"><label>Description</label><textarea id="fac_desc" rows="3"></textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Capacity</label><input type="number" id="fac_capacity" placeholder="50"></div>
          <div class="form-group"><label>Hourly Rate (₹)</label><input type="number" id="fac_rate" placeholder="500"></div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-outline" onclick="document.getElementById('facilityModal').classList.remove('active')">Cancel</button>
          <button class="btn-primary" onclick="FacilitiesModule.saveFacility()">Add</button>
        </div>
      </div>`;
    modal.classList.add('active');
  }

  async function saveFacility() {
    const name = document.getElementById('fac_name').value.trim();
    if (!name) { showToast('Name is required', 'error'); return; }
    try {
      await supabaseClient.getClient().from('facilities').insert({
        name, description: document.getElementById('fac_desc').value.trim(),
        capacity: parseInt(document.getElementById('fac_capacity').value) || null,
        hourly_rate: parseFloat(document.getElementById('fac_rate').value) || 0
      });
      document.getElementById('facilityModal').classList.remove('active');
      showToast('Facility added', 'success');
      await loadFacilities();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function showBooking(facilityId, name, rate) {
    const modal = document.getElementById('bookingModal');
    const today = new Date().toISOString().slice(0, 10);
    modal.innerHTML = `
      <div class="modal" style="max-width:450px;">
        <h2>Book ${name}</h2>
        <div class="form-group"><label>Date</label><input type="date" id="bk_date" min="${today}" value="${today}"></div>
        <div class="form-row">
          <div class="form-group"><label>From</label><input type="time" id="bk_start" value="10:00"></div>
          <div class="form-group"><label>To</label><input type="time" id="bk_end" value="11:00"></div>
        </div>
        <div class="form-group"><label>Purpose</label><textarea id="bk_purpose" rows="2" placeholder="Event description"></textarea></div>
        <p style="font-weight:600;">Estimated: ₹<span id="bk_estimate">${rate}</span></p>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-outline" onclick="document.getElementById('bookingModal').classList.remove('active')">Cancel</button>
          <button class="btn-success" onclick="FacilitiesModule.confirmBooking('${facilityId}', ${rate})">Confirm Booking</button>
        </div>
      </div>`;
    modal.classList.add('active');
    document.getElementById('bk_date').addEventListener('change', updateEstimate);
    document.getElementById('bk_start').addEventListener('change', updateEstimate);
    document.getElementById('bk_end').addEventListener('change', updateEstimate);
    function updateEstimate() {
      const start = document.getElementById('bk_start').value;
      const end = document.getElementById('bk_end').value;
      if (start && end) {
        const hrs = (new Date(`2000-01-01T${end}`) - new Date(`2000-01-01T${start}`)) / 3600000;
        document.getElementById('bk_estimate').textContent = (hrs > 0 ? hrs * rate : rate).toFixed(2);
      }
    }
  }

  async function confirmBooking(facilityId, rate) {
    const date = document.getElementById('bk_date').value;
    const start = document.getElementById('bk_start').value;
    const end = document.getElementById('bk_end').value;
    const purpose = document.getElementById('bk_purpose').value.trim();
    if (!date || !start || !end) { showToast('Please fill all fields', 'error'); return; }
    if (start >= end) { showToast('End time must be after start time', 'error'); return; }
    try {
      const user = AuthModule.currentUser;
      const hrs = (new Date(`2000-01-01T${end}`) - new Date(`2000-01-01T${start}`)) / 3600000;
      const amount = hrs > 0 ? hrs * rate : rate;
      await supabaseClient.getClient().from('facility_bookings').insert({
        facility_id: facilityId, resident_id: user.id, booking_date: date,
        start_time: start, end_time: end, purpose, amount_paid: amount, status: 'confirmed'
      });
      document.getElementById('bookingModal').classList.remove('active');
      showToast('Booking confirmed!', 'success');
      await loadFacilities();
    } catch (e) { showToast(e.message || 'Time slot may be taken', 'error'); }
  }

  async function showCalendar(facilityId, name) {
    const modal = document.getElementById('calendarModal');
    const { data } = await supabaseClient.getClient().from('facility_bookings').select('*').eq('facility_id', facilityId).neq('status', 'cancelled');
    const bookings = data || [];
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    let days = '<div class="calendar-header">Sun</div><div class="calendar-header">Mon</div><div class="calendar-header">Tue</div><div class="calendar-header">Wed</div><div class="calendar-header">Thu</div><div class="calendar-header">Fri</div><div class="calendar-header">Sat</div>';
    for (let i = 0; i < firstDay; i++) days += '<div></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayBookings = bookings.filter(b => b.booking_date === dateStr);
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      days += `<div class="calendar-day ${isToday ? 'today' : ''}">
        <div class="day-number">${d}</div>
        ${dayBookings.length > 0 ? `<div style="font-size:11px;color:var(--primary);">${dayBookings.length} booking${dayBookings.length > 1 ? 's' : ''}</div>` : ''}
      </div>`;
    }

    modal.innerHTML = `
      <div class="modal" style="max-width:600px;">
        <h2>📅 ${name} - ${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
        <div class="calendar-grid mt-2">${days}</div>
        <div style="margin-top:16px;">
          <h4 class="mb-1">Bookings Today:</h4>
          ${bookings.filter(b => b.booking_date === today.toISOString().slice(0,10)).map(b => `
            <div style="padding:8px;background:#e8f0fe;border-radius:6px;margin-bottom:4px;font-size:13px;">
              ${b.start_time.slice(0,5)} - ${b.end_time.slice(0,5)} • ${b.purpose || 'No purpose'}
            </div>`).join('') || '<p style="color:var(--text-secondary);font-size:13px;">No bookings today</p>'}
        </div>
        <button class="btn-outline mt-2" onclick="document.getElementById('calendarModal').classList.remove('active')">Close</button>
      </div>`;
    modal.classList.add('active');
  }

  function getFacilityIcon(name) {
    const icons = { club: '🏠', gym: '🏋️', pool: '🏊', party: '🎉', guest: '🛏️', garden: '🌳', hall: '🏛️', sport: '⚽' };
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(icons)) { if (lower.includes(k)) return v; }
    return '🏠';
  }

  return { render, showAddFacility, saveFacility, showBooking, confirmBooking, showCalendar };
})();
