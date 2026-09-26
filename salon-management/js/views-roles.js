(() => {
  "use strict";

  const G = window.Glowly;
  const { state, app, modalRoot, icon, escapeHtml, initials, formatDate, formatLongDate, formatTime, formatCurrency, currentDateLabel, todayIso, dateOffset, getProfile, getSalon } = G;
  const availabilitySlots = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"];

  function currentStylist() {
    return state.data.stylists.find(item => item.id === getProfile().id) || state.data.stylists[0] || { ...getProfile(), role: "Stylist", specialty: "Hair & styling", color: "lavender" };
  }

  function renderStylistView() {
    if (state.activeView === "schedule") return renderStylistSchedulePage();
    if (state.activeView === "availability") return renderAvailabilityPage();
    return renderStylistOverview();
  }

  function renderStylistOverview() {
    const stylist = currentStylist();
    const appointments = state.data.appointments.filter(item => item.stylistId === stylist.id);
    return `${G.renderPageHeading(`${currentDateLabel()} · Your studio`, `${G.greeting()}, ${stylist.name.split(" ")[0]}`, "A focused view of your clients, chair and schedule.", `<button class="button button-secondary" data-action="availability-shortcut" type="button">${icon("clock", 15)} Availability</button>`)}<div class="stats-grid">${G.renderStatCard("Today’s appointments", appointments.filter(item => item.date === todayIso()).length, "2 remaining", "", "calendar", "")}${G.renderStatCard("Chair hours", `${Math.min(12, appointments.length * 1.5).toFixed(1)}h`, "Live schedule", "positive", "clock", "mint")}${G.renderStatCard("This month", formatCurrency(appointments.reduce((sum, item) => sum + Number(item.price || 0), 0)), "Live bookings", "positive", "wallet", "peach")}${G.renderStatCard("Client rating", stylist.rating || "New", "Current profile", "", "star", "sky")}</div><div class="dashboard-grid equal"><section class="card"><div class="card-header"><div><h2 class="card-title">Today’s schedule</h2><p class="card-subtitle">Your next appointments at a glance</p></div><button class="card-link" data-view="schedule" type="button">Full schedule ${icon("arrow", 13)}</button></div>${renderScheduleList(appointments.filter(item => item.date === todayIso()).slice(0, 4))}</section><section class="card"><div class="card-header"><div><h2 class="card-title">Your availability</h2><p class="card-subtitle">This week</p></div><button class="card-link" data-view="availability" type="button">Edit ${icon("arrow", 13)}</button></div>${renderMiniAvailability()}</section></div><section class="card" style="margin-top:18px"><div class="card-header"><div><h2 class="card-title">A note from the studio</h2><p class="card-subtitle">${escapeHtml(getSalon().name)} · Team updates</p></div>${icon("sparkle", 17)}</div><div class="team-list"><div class="team-row"><span class="avatar avatar-peach">LT</span><span class="profile-copy"><strong>Keep your service menu fresh</strong><span>Check the latest availability before your next consultation.</span></span><span class="status-pill basic">New</span></div><div class="team-row"><span class="avatar avatar-mint">AM</span><span class="profile-copy"><strong>Team huddle at 4:30 PM</strong><span>Join the lounge for a quick studio reset.</span></span><span class="status-pill basic">Today</span></div></div></section>`;
  }

  function renderStylistSchedulePage() {
    const stylist = currentStylist();
    const filter = state.stylistAppointmentFilter;
    const appointments = state.data.appointments.filter(item => item.stylistId === stylist.id && (filter === "all" || (filter === "upcoming" ? item.date >= todayIso() : item.date < todayIso())));
    return `${G.renderPageHeading("Your calendar", "My schedule", "Keep your chair moving and your clients in the loop.", `<button class="button button-secondary" data-action="calendar-view" type="button">${icon("calendar", 15)} Week view</button>`)}<div class="filter-row"><label class="filter-search">${icon("search", 15)}<input data-search data-search-scope="stylist-schedule" type="search" value="${escapeHtml(state.search)}" placeholder="Search clients or services"></label><select class="select-control" data-filter="stylist-appointment"><option value="all" ${filter === "all" ? "selected" : ""}>All appointments</option><option value="upcoming" ${filter === "upcoming" ? "selected" : ""}>Upcoming</option><option value="past" ${filter === "past" ? "selected" : ""}>Past</option></select></div><section class="card"><div class="card-header"><div><h2 class="card-title">${formatLongDate(todayIso())}</h2><p class="card-subtitle">${appointments.length} appointment${appointments.length === 1 ? "" : "s"} · ${escapeHtml(stylist.name)}</p></div>${G.renderStatus("active")}</div>${renderScheduleList(appointments)}</section>`;
  }

  function renderAvailabilityPage() {
    return `${G.renderPageHeading("Your working hours", "Availability", "Let clients know when your chair is open.", `<button class="button button-primary" data-action="save-availability" type="button">${icon("check", 15)} Save availability</button>`)}<section class="card"><div class="card-header"><div><h2 class="card-title">This week</h2><p class="card-subtitle">Click a slot to toggle availability</p></div><button class="button button-quiet button-sm" data-action="copy-availability" type="button">${icon("copy", 14)} Copy Monday</button></div>${renderAvailabilityGrid()}</section>`;
  }

  function renderScheduleList(appointments) {
    if (!appointments.length) return `<div class="empty-state">${icon("calendar")}No appointments scheduled.</div>`;
    return `<div class="schedule-list">${appointments.map(item => `<div class="schedule-row"><span class="schedule-time">${formatTime(item.time)}</span><span class="schedule-detail"><strong>${escapeHtml(item.customerName || "Guest")}</strong><span>${escapeHtml(item.service || "Salon service")} · ${escapeHtml(item.duration || "60 min")}</span></span>${item.status === "pending" ? `<button class="button button-mint button-sm" data-action="confirm-appointment" data-id="${escapeHtml(item.id)}" type="button">Confirm</button>` : item.status === "confirmed" ? `<button class="button button-quiet button-sm" data-action="appointment-menu" data-id="${escapeHtml(item.id)}" type="button">${icon("more", 14)}</button>` : G.renderStatus(item.status)}</div>`).join("")}</div>`;
  }

  function renderMiniAvailability() {
    const days = Array.from({ length: 5 }, (_, index) => index);
    return `<div class="availability-grid">${days.map(index => { const date = dateOffset(index); return `<div class="availability-day"><strong>${formatDate(date, { weekday: "short" })}</strong><span>${formatDate(date)}</span>${availabilitySlots.slice(0, 4).map(time => `<span class="slot ${G.isSlotAvailable(date, time, getProfile().id) ? "" : "off"}">${G.isSlotAvailable(date, time, getProfile().id) ? formatTime(time) : "Off"}</span>`).join("")}</div>`; }).join("")}</div>`;
  }

  function renderAvailabilityGrid() {
    const days = Array.from({ length: 7 }, (_, index) => index);
    return `<div class="availability-grid">${days.map(index => { const date = dateOffset(index); return `<div class="availability-day"><strong>${formatDate(date, { weekday: "short" })}</strong><span>${formatDate(date)}</span>${availabilitySlots.map(time => { const available = G.isSlotAvailable(date, time, getProfile().id); return `<button class="slot ${available ? "" : "off"}" data-action="toggle-slot" data-date="${date}" data-time="${time}" type="button">${available ? formatTime(time) : "Off"}</button>`; }).join("")}</div>`; }).join("")}</div>`;
  }

  function renderCustomerView() {
    if (state.activeView === "discover") return renderDiscoverPage();
    if (state.activeView === "appointments") return renderCustomerAppointmentsPage();
    if (state.activeView === "profile") return renderProfilePage();
    return renderCustomerOverview();
  }

  function renderCustomerOverview() {
    const appointments = state.data.appointments.filter(item => item.customerName === getProfile().name && item.status !== "cancelled").slice(0, 3);
    const favorite = state.data.adminSalons.find(item => state.favorites.has(item.id)) || state.data.adminSalons[0];
    return `${G.renderPageHeading("Your beauty ritual", `Welcome back, ${getProfile().name.split(" ")[0]}`, "Your next moment of self-care is closer than you think.", `<button class="button button-primary" data-action="open-booking" type="button">${icon("plus", 15)} Book a service</button>`)}<section class="customer-dashboard-hero"><div class="hero-copy"><div class="eyebrow">Your Glowly space</div><h1>Make time for yourself.</h1><p>Discover thoughtful services, trusted stylists and appointments that fit your rhythm.</p></div><div class="hero-orbit">${icon("sparkle", 30)}</div></section><div class="stats-grid" style="margin-top:18px">${G.renderStatCard("Upcoming visits", appointments.length, "Next 30 days", "", "calendar", "")}${G.renderStatCard("Favorite salon", favorite?.name || "Your next find", favorite?.rating ? "4.9 rating" : "Discover studios", "", "heart", "mint")}${G.renderStatCard("Beauty credits", "2", "Earn 1 next visit", "", "sparkle", "peach")}${G.renderStatCard("Member since", "2022", "18 visits", "", "star", "sky")}</div><div class="booking-layout"><section class="card"><div class="card-header"><div><h2 class="card-title">Upcoming appointments</h2><p class="card-subtitle">A little time set aside for you</p></div><button class="card-link" data-view="appointments" type="button">See all ${icon("arrow", 13)}</button></div>${renderUpcomingList(appointments)}</section><section class="card"><div class="card-header"><div><h2 class="card-title">Your favorite services</h2><p class="card-subtitle">Ready when you are</p></div>${icon("heart", 17)}</div><div class="team-list">${state.data.services.slice(0, 3).map(item => `<div class="team-row"><span class="service-icon" style="width:30px;height:30px;border-radius:9px">${icon("sparkle", 14)}</span><span class="profile-copy"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.duration || "60 min")}</span></span><span class="team-rating"><span>${formatCurrency(item.price)}</span></span></div>`).join("") || `<div class="empty-state">No services yet.</div>`}</div><button class="card-link" data-view="discover" type="button" style="margin-top:12px">Explore services ${icon("arrow", 12)}</button></section></div>`;
  }

  function renderUpcomingList(appointments) {
    if (!appointments.length) return `<div class="empty-state">${icon("calendar")}No upcoming appointments.</div>`;
    return `<div class="upcoming-list">${appointments.map(item => `<div class="upcoming-card"><div class="date-block"><strong>${new Date(`${item.date}T12:00:00`).getDate()}</strong>${formatDate(item.date, { month: "short" })}</div><div class="upcoming-copy"><strong>${escapeHtml(item.service || "Salon service")}</strong><span>${escapeHtml(item.stylist || "Glowly salon")} · ${formatTime(item.time)}</span></div>${G.renderStatus(item.status)}${item.status !== "completed" && item.status !== "cancelled" ? `<button class="button button-quiet button-sm" data-action="cancel-appointment" data-id="${escapeHtml(item.id)}" type="button" title="Cancel appointment">${icon("more", 14)}</button>` : ""}</div>`).join("")}</div>`;
  }

  function salonGradient(color) {
    const gradients = { lavender: "linear-gradient(135deg, #4a407e, #8f83d7 52%, #e4b79e)", mint: "linear-gradient(135deg, #1c5b59, #74bda3 55%, #ead7a6)", peach: "linear-gradient(135deg, #754752, #d88e77 54%, #f6d29d)", sky: "linear-gradient(135deg, #345777, #78b4d4 55%, #c5d9e9)", rose: "linear-gradient(135deg, #6f3c59, #c57b9b 55%, #f1c5a6)" };
    return gradients[color] || gradients.lavender;
  }

  function renderSalonCard(salon) {
    const favorite = state.favorites.has(salon.id);
    const count = state.data.services.filter(service => service.salonId === salon.id).length;
    return `<article class="salon-card"><div class="salon-card-cover" style="background:${salonGradient(salon.color)}"><span>${escapeHtml(salon.name)}</span></div><div class="salon-card-top" style="margin-top:13px"><span class="status-pill ${G.safeClass(salon.color)}">${escapeHtml(salon.tag || "Most loved")}</span><button class="icon-button ${favorite ? "is-favorite" : ""}" data-action="favorite-salon" data-id="${escapeHtml(salon.id)}" type="button" aria-label="Save salon">${icon("heart", 16)}</button></div><h3>${escapeHtml(salon.name)}</h3><div class="location">${icon("pin", 13)}${escapeHtml(salon.location || salon.address || "Location not listed")}</div><div class="salon-card-footer"><span class="rating">${icon("star", 12)}${escapeHtml(salon.rating || "New")}</span><span>${count || salon.stylists || "Salon team"}</span><button class="card-link" data-action="book-salon" data-id="${escapeHtml(salon.id)}" type="button">Book ${icon("arrow", 12)}</button></div></article>`;
  }

  function renderDiscoverPage() {
    const search = state.search.toLowerCase();
    const category = state.discoverFilter;
    const terms = { "hair color": ["color", "balayage", "gloss"], skincare: ["facial", "skin", "peel"], bridal: ["bridal", "wedding"] }[category] || [];
    const matchingSalonIds = new Set(state.data.services.filter(service => terms.some(term => `${service.name || ""} ${service.description || ""}`.toLowerCase().includes(term))).map(service => service.salonId));
    const salons = state.data.adminSalons.filter(item => {
      const matchesSearch = !search || [item.name, item.address, item.location, item.specialty].some(value => String(value || "").toLowerCase().includes(search));
      const matchesCategory = category === "all" || (state.demo ? String(item.specialty || "").toLowerCase().includes(category) : matchingSalonIds.has(item.id));
      return item.status === "approved" && matchesSearch && matchesCategory;
    });
    return `${G.renderPageHeading("Find your next favorite", "Discover salons", "Independent studios, trusted talent, and a little more you.", `<button class="button button-secondary" data-action="map-view" type="button">${icon("pin", 15)} Map view</button>`)}<div class="filter-row"><label class="filter-search">${icon("search", 15)}<input data-search data-search-scope="discover" type="search" value="${escapeHtml(state.search)}" placeholder="Search salons or services"></label><select class="select-control" data-filter="discover"><option value="all" ${category === "all" ? "selected" : ""}>All specialties</option><option value="hair color" ${category === "hair color" ? "selected" : ""}>Hair color</option><option value="skincare" ${category === "skincare" ? "selected" : ""}>Skincare</option><option value="bridal" ${category === "bridal" ? "selected" : ""}>Bridal</option></select></div><div class="salon-grid">${salons.length ? salons.map(renderSalonCard).join("") : `<div class="empty-state">${icon("pin")}No salons match this search.</div>`}</div>`;
  }

  function renderCustomerAppointmentsPage() {
    const filter = state.stylistAppointmentFilter;
    const rows = state.data.appointments.filter(item => item.customerName === getProfile().name && (filter === "all" || (filter === "upcoming" ? item.date >= todayIso() : item.date < todayIso())));
    return `${G.renderPageHeading("Your time, protected", "My appointments", "Review, reschedule or cancel your upcoming visits.", `<button class="button button-primary" data-action="open-booking" type="button">${icon("plus", 15)} Book a service</button>`)}<div class="filter-row"><select class="select-control" data-filter="stylist-appointment"><option value="all" ${filter === "all" ? "selected" : ""}>All appointments</option><option value="upcoming" ${filter === "upcoming" ? "selected" : ""}>Upcoming</option><option value="past" ${filter === "past" ? "selected" : ""}>Past</option></select></div><section class="card"><div class="card-header"><div><h2 class="card-title">Upcoming & past visits</h2><p class="card-subtitle">All your Glowly appointments in one place</p></div></div>${renderUpcomingList(rows)}</section>`;
  }

  function renderProfilePage() {
    const profile = getProfile();
    return `${G.renderPageHeading("Your details", "My profile", "Keep your contact details and preferences up to date.", `<button class="button button-primary" data-action="edit-profile" type="button">${icon("edit", 15)} Edit profile</button>`)}<div class="booking-layout"><section class="card"><div class="card-header"><div><h2 class="card-title">Personal information</h2><p class="card-subtitle">Used for appointment reminders and receipts</p></div></div><div class="team-list"><div class="team-row"><span class="service-icon" style="width:34px;height:34px">${icon("user", 16)}</span><span class="profile-copy"><strong>${escapeHtml(profile.name)}</strong><span>Full name</span></span></div><div class="team-row"><span class="service-icon" style="width:34px;height:34px">${icon("mail", 16)}</span><span class="profile-copy"><strong>${escapeHtml(profile.email)}</strong><span>Email address</span></span></div><div class="team-row"><span class="service-icon" style="width:34px;height:34px">${icon("phone", 16)}</span><span class="profile-copy"><strong>${escapeHtml(profile.phone || "Not added")}</strong><span>Phone number</span></span></div></div></section><section class="card"><div class="card-header"><div><h2 class="card-title">Your preferences</h2><p class="card-subtitle">Make every visit feel like yours</p></div></div><div class="feature-list" style="border-top:0;padding-top:0;margin-top:0"><div class="team-row"><span class="profile-copy"><strong>Appointment reminders</strong><span>Email me 24 hours before</span></span><span class="status-pill active">On</span></div><div class="team-row"><span class="profile-copy"><strong>Marketing updates</strong><span>Occasional studio news</span></span><span class="status-pill basic">Off</span></div><div class="team-row"><span class="profile-copy"><strong>Default salon</strong><span>Choose during booking</span></span>${icon("chevron", 15)}</div></div></section></div>`;
  }

  function modalHeader(title, description) {
    return `<div class="modal-header"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div><button class="modal-close" data-action="close-modal" type="button" aria-label="Close">${icon("close", 16)}</button></div>`;
  }

  function availableSalons() {
    const current = state.data.currentSalon;
    const list = state.role === "customer" ? state.data.adminSalons : [current, ...state.data.adminSalons.filter(item => item.id !== current?.id)];
    const unique = [];
    list.filter(Boolean).forEach(item => { if (!unique.some(existing => existing.id === item.id)) unique.push(item); });
    return unique;
  }

  function renderBookingModal() {
    const salons = availableSalons();
    const selectedSalonId = state.modal?.salonId || salons[0]?.id;
    const services = state.demo ? state.data.services : state.data.services.filter(item => !selectedSalonId || !item.salonId || item.salonId === selectedSalonId);
    const stylists = state.demo ? state.data.stylists : state.data.stylists.filter(item => !selectedSalonId || !state.data.currentSalon?.id || item.salonId === selectedSalonId || state.role === "customer");
    return `<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="Book an appointment"><div data-modal-content>${modalHeader("Book an appointment", "Choose a service, a stylist and a time that feels good.")}<form class="booking-form" data-form="booking"><div class="form-grid"><div class="form-field full"><label for="booking-salon">Salon</label><select class="form-control" id="booking-salon" name="salonId">${salons.map(salon => `<option value="${escapeHtml(salon.id)}" ${salon.id === selectedSalonId ? "selected" : ""}>${escapeHtml(salon.name)}</option>`).join("")}</select></div><div class="form-field"><label for="booking-service">Service</label><select class="form-control" id="booking-service" name="serviceId" required><option value="">Choose a service</option>${services.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} · ${formatCurrency(item.price)}</option>`).join("")}</select></div><div class="form-field"><label for="booking-stylist">Stylist</label><select class="form-control" id="booking-stylist" name="stylistId"><option value="">Any available stylist</option>${stylists.filter(item => item.status !== "away").map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("")}</select></div><div class="form-field"><label for="booking-date">Date</label><input class="form-control" id="booking-date" name="date" type="date" value="${dateOffset(1)}" required></div><div class="form-field"><label for="booking-time">Time</label><select class="form-control" id="booking-time" name="time">${availabilitySlots.map(time => `<option value="${time}">${formatTime(time)}</option>`).join("")}</select></div><div class="form-field full"><label for="booking-notes">Anything we should know? <span class="muted-label">Optional</span></label><textarea class="form-control" id="booking-notes" name="notes" placeholder="A little context helps your stylist prepare..."></textarea></div></div><div class="form-actions"><button class="button button-secondary" data-action="close-modal" type="button">Cancel</button><button class="button button-primary" type="submit" ${services.length ? "" : "disabled"}>Request appointment ${icon("arrow", 14)}</button></div></form></div></section></div>`;
  }

  function renderAppointmentModal() {
    const item = state.modal?.item || {};
    return `<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="Appointment details"><div data-modal-content>${modalHeader("Appointment details", "Keep the visit moving in the right direction.")}<div class="appointment-detail"><div class="date-block"><strong>${item.date ? new Date(`${item.date}T12:00:00`).getDate() : "—"}</strong>${formatDate(item.date, { month: "short" })}</div><div><h3>${escapeHtml(item.service || "Salon service")}</h3><p>${escapeHtml(item.customerName || "Guest")} · ${escapeHtml(item.stylist || "Unassigned")}</p><p>${formatTime(item.time)} · ${escapeHtml(item.duration || "60 min")} · ${formatCurrency(item.price)}</p></div>${G.renderStatus(item.status)}</div><div class="form-actions">${item.status !== "cancelled" && item.status !== "completed" ? `<button class="button button-secondary" data-action="cancel-appointment" data-id="${escapeHtml(item.id)}" type="button">Cancel</button>` : ""}${item.status === "pending" ? `<button class="button button-mint" data-action="confirm-appointment" data-id="${escapeHtml(item.id)}" type="button">${icon("check", 14)} Confirm</button>` : ""}${item.status === "confirmed" ? `<button class="button button-primary" data-action="complete-appointment" data-id="${escapeHtml(item.id)}" type="button">${icon("checkCircle", 14)} Mark complete</button>` : ""}</div></div></section></div>`;
  }

  function renderStylistModal(modal) {
    const item = modal.item || {};
    return `<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="Stylist details"><div data-modal-content>${modalHeader(item.id ? "Edit stylist" : "Invite a stylist", "Keep your team profile and specialties up to date.")}<form data-form="stylist"><input type="hidden" name="id" value="${escapeHtml(item.id || "")}"><div class="form-grid"><div class="form-field"><label for="stylist-name">Full name</label><input class="form-control" id="stylist-name" name="name" value="${escapeHtml(item.name || "")}" placeholder="e.g. Jamie Lee" required></div><div class="form-field"><label for="stylist-email">Email address</label><input class="form-control" id="stylist-email" name="email" type="email" value="${escapeHtml(item.email || "")}" placeholder="jamie@example.com" required ${item.userId ? "readonly" : ""}></div><div class="form-field"><label for="stylist-role">Role</label><select class="form-control" id="stylist-role" name="role"><option ${item.role === "Manager" || item.role === "manager" ? "selected" : ""}>Manager</option><option ${item.role === "Senior stylist" ? "selected" : ""}>Senior stylist</option><option ${item.role === "Colorist" ? "selected" : ""}>Colorist</option><option ${item.role === "Stylist" || !item.role ? "selected" : ""}>Stylist</option></select></div><div class="form-field"><label for="stylist-specialty">Specialty</label><input class="form-control" id="stylist-specialty" name="specialty" value="${escapeHtml(item.specialty || "")}" placeholder="Cuts, color, styling..." required></div></div><div class="form-actions"><button class="button button-secondary" data-action="close-modal" type="button">Cancel</button><button class="button button-primary" type="submit">${item.id ? "Save changes" : "Create invitation"} ${icon("arrow", 14)}</button></div></form></div></section></div>`;
  }

  function renderSalonModal() {
    const salon = getSalon();
    const timezone = salon.timezone || "America/New_York";
    return `<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="Salon details"><div data-modal-content>${modalHeader("Salon details", "Keep your location and contact information fresh.")}<form data-form="salon"><div class="form-grid"><div class="form-field full"><label for="salon-name">Salon name</label><input class="form-control" id="salon-name" name="name" value="${escapeHtml(salon.name)}" required></div><div class="form-field full"><label for="salon-address">Address</label><input class="form-control" id="salon-address" name="address" value="${escapeHtml(salon.address || "")}" required></div><div class="form-field"><label for="salon-contact">Contact number</label><input class="form-control" id="salon-contact" name="contact" value="${escapeHtml(salon.contact || "")}" required></div><div class="form-field"><label for="salon-timezone">Timezone</label><select class="form-control" id="salon-timezone" name="timezone"><option value="America/New_York" ${timezone === "America/New_York" ? "selected" : ""}>Eastern Time (ET)</option><option value="America/Chicago" ${timezone === "America/Chicago" ? "selected" : ""}>Central Time (CT)</option><option value="America/Los_Angeles" ${timezone === "America/Los_Angeles" ? "selected" : ""}>Pacific Time (PT)</option><option value="Asia/Kolkata" ${timezone === "Asia/Kolkata" ? "selected" : ""}>India Standard Time (IST)</option></select></div></div><div class="form-actions"><button class="button button-secondary" data-action="close-modal" type="button">Cancel</button><button class="button button-primary" type="submit">Save details ${icon("check", 14)}</button></div></form></div></section></div>`;
  }

  function renderPlanModal(modal) {
    const plan = modal.item || {};
    return `<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="Subscription plan"><div data-modal-content>${modalHeader(plan.id ? "Edit subscription plan" : "Create subscription plan", "Define the limits and features that make this plan useful.")}<form data-form="plan"><input type="hidden" name="id" value="${escapeHtml(plan.id || "")}"><div class="form-grid"><div class="form-field"><label for="plan-name">Plan name</label><input class="form-control" id="plan-name" name="name" value="${escapeHtml(plan.name || "")}" placeholder="e.g. Studio" required></div><div class="form-field"><label for="plan-price">Monthly price</label><input class="form-control" id="plan-price" name="price" type="number" min="0" value="${escapeHtml(plan.price || "")}" placeholder="149" required></div><div class="form-field full"><label for="plan-description">Description</label><input class="form-control" id="plan-description" name="description" value="${escapeHtml(plan.description || "")}" placeholder="A short description for salon owners" required></div><div class="form-field"><label for="plan-stylists">Stylist allowance</label><input class="form-control" id="plan-stylists" name="stylistLimit" type="number" min="0" value="${escapeHtml(plan.stylistLimit ?? 3)}" required></div><div class="form-field"><label for="plan-slots">Monthly appointment allowance</label><input class="form-control" id="plan-slots" name="appointmentLimit" type="number" min="0" value="${escapeHtml(plan.appointmentLimit ?? 100)}" required></div><div class="form-field full"><label for="plan-features">Features <span class="muted-label">Separate with commas</span></label><input class="form-control" id="plan-features" name="features" value="${escapeHtml((plan.features || []).join(", "))}" placeholder="Analytics, Priority support"></div><label class="checkbox-row"><input type="checkbox" name="analytics" ${plan.analytics ? "checked" : ""}> Include advanced analytics</label></div><div class="form-actions"><button class="button button-secondary" data-action="close-modal" type="button">Cancel</button><button class="button button-primary" type="submit">${plan.id ? "Save plan" : "Create plan"} ${icon("arrow", 14)}</button></div></form></div></section></div>`;
  }

  function renderProfileModal() {
    const profile = getProfile();
    return `<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="Edit profile"><div data-modal-content>${modalHeader("Edit profile", "Keep your details ready for your next appointment.")}<form data-form="profile"><div class="form-grid"><div class="form-field full"><label for="profile-name">Full name</label><input class="form-control" id="profile-name" name="name" value="${escapeHtml(profile.name)}" required></div><div class="form-field full"><label for="profile-email">Email address</label><input class="form-control" id="profile-email" name="email" type="email" value="${escapeHtml(profile.email)}" readonly></div><div class="form-field full"><label for="profile-phone">Phone number</label><input class="form-control" id="profile-phone" name="phone" value="${escapeHtml(profile.phone || "")}" placeholder="+1 212 555 0100"></div></div><div class="form-actions"><button class="button button-secondary" data-action="close-modal" type="button">Cancel</button><button class="button button-primary" type="submit">Save profile ${icon("check", 14)}</button></div></form></div></section></div>`;
  }

  function renderServiceModal() {
    const item = state.modal?.item || {};
    return `<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${item.id ? "Edit service" : "Add service"}"><div data-modal-content>${modalHeader(item.id ? "Edit service" : "Add a service", "Give your clients something wonderful to book.")}<form data-form="service"><input type="hidden" name="id" value="${escapeHtml(item.id || "")}"><div class="form-grid"><div class="form-field full"><label for="service-name">Service name</label><input class="form-control" id="service-name" name="name" value="${escapeHtml(item.name || "")}" placeholder="e.g. Express gloss" required></div><div class="form-field full"><label for="service-description">Description</label><textarea class="form-control" id="service-description" name="description" placeholder="A short, inviting description">${escapeHtml(item.description || "")}</textarea></div><div class="form-field"><label for="service-price">Price</label><input class="form-control" id="service-price" name="price" type="number" min="0" value="${escapeHtml(item.price || "")}" placeholder="75" required></div><div class="form-field"><label for="service-duration">Duration</label><input class="form-control" id="service-duration" name="duration" value="${escapeHtml(item.duration || "60 min")}" placeholder="60 min" required></div></div><div class="form-actions">${item.id ? `<button class="button button-danger" data-action="delete-service" data-id="${escapeHtml(item.id)}" type="button">${icon("trash", 14)} Remove</button>` : ""}<button class="button button-secondary" data-action="close-modal" type="button">Cancel</button><button class="button button-primary" type="submit">${item.id ? "Save service" : "Add service"} ${icon("arrow", 14)}</button></div></form></div></section></div>`;
  }

  function renderCustomerModal() {
    return `<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="Add customer"><div data-modal-content>${modalHeader("Add a customer", "Create a profile for a walk-in or new client.")}<form data-form="customer"><div class="form-grid"><div class="form-field full"><label for="customer-name">Full name</label><input class="form-control" id="customer-name" name="name" placeholder="e.g. Taylor Reed" required></div><div class="form-field"><label for="customer-email">Email address</label><input class="form-control" id="customer-email" name="email" type="email" placeholder="taylor@example.com" required></div><div class="form-field"><label for="customer-phone">Phone number</label><input class="form-control" id="customer-phone" name="phone" placeholder="+1 212 555 0100"></div></div><div class="form-actions"><button class="button button-secondary" data-action="close-modal" type="button">Cancel</button><button class="button button-primary" type="submit">Add customer ${icon("arrow", 14)}</button></div></form></div></section></div>`;
  }

  function renderConfirmModal() {
    return `<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal modal-compact" role="dialog" aria-modal="true" aria-label="Confirm action"><div data-modal-content>${modalHeader(state.modal.title || "Are you sure?", state.modal.description || "This action cannot be undone.")}<div class="form-actions"><button class="button button-secondary" data-action="close-modal" type="button">Keep it</button><button class="button button-danger" data-action="confirm-action" type="button">Yes, continue</button></div></div></section></div>`;
  }

  function renderModal() {
    if (!state.modal) return "";
    if (state.modal.type === "booking") return renderBookingModal();
    if (state.modal.type === "appointment") return renderAppointmentModal();
    if (state.modal.type === "stylist") return renderStylistModal(state.modal);
    if (state.modal.type === "salon") return renderSalonModal();
    if (state.modal.type === "plan") return renderPlanModal(state.modal);
    if (state.modal.type === "profile") return renderProfileModal();
    if (state.modal.type === "service") return renderServiceModal();
    if (state.modal.type === "customer") return renderCustomerModal();
    if (state.modal.type === "confirm") return renderConfirmModal();
    return "";
  }

  function renderAuth() {
    const registering = state.authMode === "register";
    app.innerHTML = `<div class="auth-page"><section class="auth-visual"><div class="brand"><span class="brand-mark">${icon("sparkle", 18)}</span><span>Glowly</span></div><div class="auth-visual-copy"><div class="eyebrow">The salon workspace</div><h1>More time for what makes your studio special.</h1><p>Bring bookings, your team and your best work together in one calm, beautiful place.</p></div><div class="auth-quote"><span class="quote-mark">“</span>Glowly gives our team the space to focus on the client in front of us.<strong>— Luna & Co., New York</strong></div></section><section class="auth-main"><div class="auth-box"><div class="auth-box-header"><h2>${registering ? "Create your Glowly space" : "Welcome back"}</h2><p>${registering ? "Start with a plan and make it yours." : "Sign in to keep your studio moving beautifully."}</p></div><div class="auth-tabs"><button class="auth-tab ${!registering ? "active" : ""}" data-auth-mode="login" type="button">Sign in</button><button class="auth-tab ${registering ? "active" : ""}" data-auth-mode="register" type="button">Create account</button></div>${renderAuthForm(registering)}${state.demo ? `<div class="demo-note">${icon("info")}<span>Preview mode is active. Add your Supabase keys in <strong>js/config.js</strong> to connect authentication and live data.</span></div>` : ""}<p class="auth-footer">By continuing, you agree to Glowly’s <button data-action="terms" type="button">Terms</button> and <button data-action="privacy" type="button">Privacy Policy</button>.</p></div></section></div>`;
    modalRoot.innerHTML = "";
  }

  function renderAuthForm(registering) {
    if (!registering) return `<form class="auth-form" data-form="login"><div class="form-field"><label for="login-email">Email address</label><input class="form-control" id="login-email" name="email" type="email" placeholder="you@example.com" required></div><div class="form-field"><label for="login-password">Password</label><input class="form-control" id="login-password" name="password" type="password" placeholder="Your password" required></div><button class="button button-primary" type="submit">Sign in ${icon("arrow", 15)}</button><button class="button button-quiet" data-action="forgot-password" type="button">Forgot your password?</button></form>`;
    const owner = state.authRole === "owner";
    return `<form class="auth-form" data-form="register"><div class="form-field"><label>I'm joining as</label><div class="role-choice-grid"><button class="role-choice ${owner ? "selected" : ""}" data-auth-role="owner" type="button"><strong>Salon owner</strong><span>Run a studio</span></button><button class="role-choice ${!owner ? "selected" : ""}" data-auth-role="customer" type="button"><strong>Customer</strong><span>Book a service</span></button></div></div>${owner ? `<div class="form-field"><label>Choose your plan</label><div class="plan-choice-grid">${state.data.plans.map(plan => `<button class="plan-choice ${state.authPlan === plan.id ? "selected" : ""}" data-auth-plan="${escapeHtml(plan.id)}" type="button"><strong>${escapeHtml(plan.name)}</strong><span>${formatCurrency(plan.price)} / month</span></button>`).join("")}</div></div><div class="form-field"><label for="register-salon">Salon name</label><input class="form-control" id="register-salon" name="salonName" placeholder="e.g. Luna & Co." required></div><div class="form-field"><label for="register-address">Salon address</label><input class="form-control" id="register-address" name="address" placeholder="Street, city, state" required></div>` : ""}<div class="form-field"><label for="register-name">Your name</label><input class="form-control" id="register-name" name="name" placeholder="Your full name" required></div><div class="form-field"><label for="register-email">Email address</label><input class="form-control" id="register-email" name="email" type="email" placeholder="you@example.com" required></div><div class="form-field"><label for="register-phone">Phone number</label><input class="form-control" id="register-phone" name="phone" type="phone" placeholder="+1 212 555 0100"></div><div class="form-field"><label for="register-password">Create a password</label><input class="form-control" id="register-password" name="password" type="password" minlength="6" placeholder="At least 6 characters" required></div><button class="button button-primary" type="submit">Create account ${icon("arrow", 15)}</button></form>`;
  }

  G.renderStylistView = renderStylistView;
  G.renderCustomerView = renderCustomerView;
  G.renderView = () => {
    const role = getProfile().role;
    if (role === "admin") return G.renderViewAdmin();
    if (role === "stylist") return renderStylistView();
    if (role === "customer") return renderCustomerView();
    return G.renderViewOwner();
  };
  G.renderViewOwner = () => {
    if (state.activeView === "appointments") return G.renderAppointmentsPage();
    if (state.activeView === "team") return G.renderTeamPage();
    if (state.activeView === "services") return G.renderServicesPage();
    if (state.activeView === "customers") return G.renderCustomersPage();
    if (state.activeView === "subscription") return G.renderSubscriptionPage();
    return G.renderOwnerOverview();
  };
  G.renderViewAdmin = () => {
    if (state.activeView === "salons") return G.renderAdminSalonsPage();
    if (state.activeView === "plans") return G.renderAdminPlansPage();
    if (state.activeView === "revenue") return G.renderRevenuePage();
    return G.renderAdminOverview();
  };
  G.renderModal = renderModal;
  G.renderAuth = renderAuth;
  G.renderScheduleList = renderScheduleList;
  G.renderAvailabilityGrid = renderAvailabilityGrid;
  G.renderMiniAvailability = renderMiniAvailability;
  G.renderUpcomingList = renderUpcomingList;
})();
