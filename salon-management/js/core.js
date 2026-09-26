(() => {
  "use strict";

  const config = window.SALON_CONFIG || {};
  const app = document.getElementById("app");
  const modalRoot = document.getElementById("modal-root");
  const toastRegion = document.getElementById("toast-region");

  const iconPaths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 9.5h18"/>',
    users: '<path d="M16 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H6.4A3.4 3.4 0 0 0 3 18.4V20"/><circle cx="9.5" cy="7.5" r="3.5"/><path d="M17 11a3.5 3.5 0 1 0-1.2-6.8M21 20v-1.6a3.4 3.4 0 0 0-2.5-3.3"/>',
    scissors: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="m8.1 7.4 10.4 9.2M8.1 16.6 18.5 7.4"/>',
    heart: '<path d="M20.8 8.7c0 5.2-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z"/>',
    card: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="M2.5 9.5h19M6.5 15h4"/>',
    settings: '<path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/><path d="M19.4 15a2 2 0 0 0 .4 1.9 2 2 0 0 1-2.8 2.8 2 2 0 0 0-1.9-.4 2 2 0 0 0-1.2 1.8v.2a2 2 0 0 1-4 0v-.2a2 2 0 0 0-1.2-1.8 2 2 0 0 0-1.9.4 2 2 0 1 1-2.8-2.8 2 2 0 0 0 .4-1.9 2 2 0 0 0-1.8-1.2H4a2 2 0 0 1 0-4h.2a2 2 0 0 0 1.8-1.2 2 2 0 0 0-.4-1.9 2 2 0 1 1 2.8-2.8 2 2 0 0 0 1.9.4 2 2 0 0 0 1.2-1.8V2a2 2 0 0 1 4 0v.2a2 2 0 0 0 1.2 1.8 2 2 0 0 0 1.9-.4 2 2 0 1 1 2.8 2.8 2 2 0 0 0-.4 1.9 2 2 0 0 0 1.8 1.2h.2a2 2 0 0 1 0 4H21a2 2 0 0 0-1.6 1.5Z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 4.1 1.7c-.9.8-1.8 1.2-1.8 2.8M12 16.8h.01"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    trend: '<path d="m3 17 6-6 4 4 7-8"/><path d="M15 7h5v5"/>',
    more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
    pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    check: '<path d="m5 12 4.2 4.2L19 6.5"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 9"/>',
    edit: '<path d="M13.5 5.5 18.5 10.5M4 20l4.4-1 9.9-9.9a2.1 2.1 0 0 0-3-3L5.4 16 4 20Z"/>',
    trash: '<path d="M4 7h16M10 11v5M14 11v5M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    phone: '<path d="M6.5 3.5 9 3l2 5-2.2 1.7a15 15 0 0 0 5 5L15.5 12l5 2-.5 2.5a3 3 0 0 1-3.3 2.4C10 17.8 6.2 14 4.1 7.8A3 3 0 0 1 6.5 3.5Z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    sparkle: '<path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3ZM19 16l.6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z"/>',
    briefcase: '<rect x="3" y="6.5" width="18" height="13" rx="2"/><path d="M8 6.5V4h8v2.5M3 11h18M10 11v2h4v-2"/>',
    receipt: '<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3ZM8 8h8M8 12h8M8 16h4"/>',
    chart: '<path d="M4 19V5M4 19h17M8 16v-4M12 16V8M16 16v-7M20 16v-5"/>',
    shield: '<path d="M12 21s8-3.5 8-10V5l-8-3-8 3v6c0 6.5 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    logout: '<path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M15 16l4-4-4-4M19 12H9"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    building: '<path d="M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M16 8h3a1 1 0 0 1 1 1v12M8 7h4M8 11h4M8 15h4M8 21v-2h4v2M2 21h20"/>',
    crown: '<path d="m3 7 4 4 5-7 5 7 4-4-2 12H5L3 7ZM5 19h14"/>',
    wallet: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19a1 1 0 0 1 1 1v15H6.5A2.5 2.5 0 0 1 4 17.5v-11Z"/><path d="M4 7h14a2 2 0 0 1 2 2v3h-5a2 2 0 0 0 0 4h5v2M15 14h.01"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4L3 9M3 4v5h5M4 13a8 8 0 0 0 14.5 4L21 15M21 20v-5h-5"/>',
    alert: '<path d="M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5ZM4 5.5V21M8 7h8M8 11h8"/>',
    tag: '<path d="M20 13 13 20l-9-9V4h7l9 9ZM7.5 8.5h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15"/>'
  };

  const state = {
    client: null,
    session: null,
    profile: { id: "demo-user", name: "Olivia Bennett", email: "olivia@luna.co", role: "owner" },
    role: "owner",
    activeView: "overview",
    view: "app",
    demo: true,
    search: "",
    appointmentFilter: "all",
    customerFilter: "all",
    salonFilter: "all",
    stylistAppointmentFilter: "all",
    stylistSlotFilter: "all",
    discoverFilter: "all",
    favorites: new Set(["salon-luna"]),
    availability: [],
    planRequests: [],
    modal: null,
    authMode: "login",
    authRole: "owner",
    authPlan: "premium",
    data: null
  };

  function localIso(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function todayIso() {
    return localIso(new Date());
  }

  function dateOffset(days) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return localIso(date);
  }

  function createDemoData() {
    return {
      currentSalon: { id: "salon-luna", name: "Luna & Co.", address: "42 Mercer Street, SoHo, New York", contact: "+1 (212) 555-0194", timezone: "America/New_York", plan: "Premium", planId: "premium", status: "approved", members: 12, usage: 78 },
      plans: [
        { id: "basic", name: "Basic", description: "A thoughtful start for new studios.", price: 79, stylists: "Up to 3 stylists", slots: "100 appointments / month", analytics: false, features: ["Booking page", "3 stylist seats", "Email reminders"] },
        { id: "premium", name: "Premium", description: "Everything a growing salon needs.", price: 149, stylists: "Up to 10 stylists", slots: "500 appointments / month", analytics: true, features: ["Advanced analytics", "10 stylist seats", "Priority support"] },
        { id: "enterprise", name: "Enterprise", description: "Scale beautifully across locations.", price: 299, stylists: "Unlimited stylists", slots: "Unlimited appointments", analytics: true, features: ["Multi-location insights", "Unlimited seats", "Dedicated success manager"] }
      ],
      stylists: [
        { id: "st-1", name: "Maya Chen", role: "Senior stylist", specialty: "Balayage & color", rating: "4.9", appointments: 8, status: "active", color: "lavender" },
        { id: "st-2", name: "Jordan Bell", role: "Stylist", specialty: "Cuts & styling", rating: "4.8", appointments: 6, status: "active", color: "mint" },
        { id: "st-3", name: "Amara Okafor", role: "Colorist", specialty: "Color correction", rating: "5.0", appointments: 5, status: "active", color: "peach" },
        { id: "st-4", name: "Noah Williams", role: "Stylist", specialty: "Texture & care", rating: "4.7", appointments: 4, status: "active", color: "sky" },
        { id: "st-5", name: "Sofia Rossi", role: "Stylist", specialty: "Bridal styling", rating: "4.9", appointments: 3, status: "away", color: "rose" }
      ],
      appointments: [
        { id: "ap-1", customerName: "Ava Thompson", customerEmail: "ava@example.com", service: "Signature cut & style", serviceId: "svc-1", salonId: "salon-luna", stylist: "Maya Chen", stylistId: "st-1", date: todayIso(), time: "09:00", duration: "60 min", status: "confirmed", price: 85, color: "lavender" },
        { id: "ap-2", customerName: "Liam Carter", customerEmail: "liam@example.com", service: "Balayage refresh", serviceId: "svc-2", salonId: "salon-luna", stylist: "Amara Okafor", stylistId: "st-3", date: todayIso(), time: "10:30", duration: "150 min", status: "confirmed", price: 210, color: "peach" },
        { id: "ap-3", customerName: "Mia Anderson", customerEmail: "mia@example.com", service: "Glow facial", serviceId: "svc-3", salonId: "salon-luna", stylist: "Jordan Bell", stylistId: "st-2", date: todayIso(), time: "12:00", duration: "45 min", status: "pending", price: 65, color: "mint" },
        { id: "ap-4", customerName: "Ethan Brooks", customerEmail: "ethan@example.com", service: "Beard sculpt", serviceId: "svc-4", salonId: "salon-luna", stylist: "Noah Williams", stylistId: "st-4", date: todayIso(), time: "13:30", duration: "30 min", status: "confirmed", price: 38, color: "sky" },
        { id: "ap-5", customerName: "Isla Martin", customerEmail: "isla@example.com", service: "Bridal trial", serviceId: "svc-5", salonId: "salon-luna", stylist: "Sofia Rossi", stylistId: "st-5", date: todayIso(), time: "15:00", duration: "90 min", status: "pending", price: 120, color: "rose" },
        { id: "ap-6", customerName: "Oliver Reed", customerEmail: "oliver@example.com", service: "Color gloss", serviceId: "svc-2", salonId: "salon-luna", stylist: "Amara Okafor", stylistId: "st-3", date: dateOffset(1), time: "09:30", duration: "75 min", status: "confirmed", price: 140, color: "peach" },
        { id: "ap-7", customerName: "Harper Lewis", customerEmail: "harper@example.com", service: "Signature cut & style", serviceId: "svc-1", salonId: "salon-luna", stylist: "Maya Chen", stylistId: "st-1", date: dateOffset(1), time: "11:00", duration: "60 min", status: "confirmed", price: 85, color: "lavender" },
        { id: "ap-8", customerName: "James Walker", customerEmail: "james@example.com", service: "Texture & care", serviceId: "svc-6", salonId: "salon-luna", stylist: "Noah Williams", stylistId: "st-4", date: dateOffset(2), time: "14:00", duration: "60 min", status: "pending", price: 75, color: "sky" }
      ],
      services: [
        { id: "svc-1", salonId: "salon-luna", name: "Signature cut & style", description: "A tailored cut, finish and styling ritual.", price: 85, duration: "60 min", durationMinutes: 60, bookings: 48, color: "lavender" },
        { id: "svc-2", salonId: "salon-luna", name: "Balayage refresh", description: "Dimensional color with a soft, natural finish.", price: 210, duration: "150 min", durationMinutes: 150, bookings: 22, color: "peach" },
        { id: "svc-3", salonId: "salon-luna", name: "Glow facial", description: "A restorative facial for healthy, luminous skin.", price: 65, duration: "45 min", durationMinutes: 45, bookings: 31, color: "mint" },
        { id: "svc-4", salonId: "salon-luna", name: "Bridal trial", description: "Personalized styling for your most important day.", price: 120, duration: "90 min", durationMinutes: 90, bookings: 12, color: "sky" },
        { id: "svc-5", salonId: "salon-luna", name: "Beard sculpt", description: "A precise shape and finish.", price: 38, duration: "30 min", durationMinutes: 30, bookings: 16, color: "sky" },
        { id: "svc-6", salonId: "salon-luna", name: "Texture & care", description: "Healthy texture, tailored to you.", price: 75, duration: "60 min", durationMinutes: 60, bookings: 20, color: "mint" }
      ],
      availability: [],
      customers: [
        { id: "cus-1", name: "Ava Thompson", email: "ava@example.com", phone: "+1 212 555 0111", visits: 12, spent: 1240, lastVisit: dateOffset(-4), status: "vip", color: "lavender" },
        { id: "cus-2", name: "Liam Carter", email: "liam@example.com", phone: "+1 212 555 0132", visits: 8, spent: 890, lastVisit: dateOffset(-12), status: "active", color: "mint" },
        { id: "cus-3", name: "Mia Anderson", email: "mia@example.com", phone: "+1 212 555 0184", visits: 5, spent: 420, lastVisit: dateOffset(-20), status: "active", color: "peach" },
        { id: "cus-4", name: "Ethan Brooks", email: "ethan@example.com", phone: "+1 212 555 0198", visits: 3, spent: 285, lastVisit: dateOffset(-35), status: "new", color: "sky" }
      ],
      invoices: [
        { id: "INV-1048", date: "Jun 01, 2024", description: "Premium plan · June", amount: 149, status: "paid" },
        { id: "INV-1031", date: "May 01, 2024", description: "Premium plan · May", amount: 149, status: "paid" },
        { id: "INV-1014", date: "Apr 01, 2024", description: "Premium plan · April", amount: 149, status: "paid" }
      ],
      planRequests: [
        { id: "plan-request-1", salon: "Moss & Mane", requestedPlan: "Premium", status: "pending", created_at: dateOffset(-2) },
        { id: "plan-request-2", salon: "The Edit Room", requestedPlan: "Enterprise", status: "approved", created_at: dateOffset(-9) }
      ],
      adminSalons: [
        { id: "sal-1", name: "Luna & Co.", owner: "Olivia Bennett", email: "olivia@luna.co", plan: "Premium", specialty: "Hair color", status: "approved", usage: 78, joined: "May 12, 2024", color: "lavender" },
        { id: "sal-2", name: "Moss & Mane", owner: "Sienna Hart", email: "sienna@mossmane.co", plan: "Basic", specialty: "Skincare", status: "pending", usage: 36, joined: "Jun 17, 2024", color: "mint" },
        { id: "sal-3", name: "The Edit Room", owner: "Nora Patel", email: "nora@editroom.co", plan: "Premium", specialty: "Bridal", status: "approved", usage: 64, joined: "Apr 29, 2024", color: "peach" },
        { id: "sal-4", name: "Atelier 19", owner: "Camille Jones", email: "camille@atelier19.co", plan: "Enterprise", specialty: "Hair color", status: "approved", usage: 91, joined: "Mar 08, 2024", color: "sky" },
        { id: "sal-5", name: "Good Hair Day", owner: "Evan Miller", email: "evan@goodhairday.co", plan: "Basic", specialty: "Skincare", status: "rejected", usage: 18, joined: "Jun 15, 2024", color: "rose" }
      ]
    };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function safeClass(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9-]/g, "-");
  }

  function initials(name) {
    return String(name || "GL").split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  }

  function formatDate(value, options) {
    if (!value) return "—";
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return new Intl.DateTimeFormat("en-US", options || { month: "short", day: "numeric" }).format(date);
  }

  function formatLongDate(value) {
    return formatDate(value, { weekday: "long", month: "long", day: "numeric" });
  }

  function formatTime(value) {
    if (!value) return "—";
    const parts = String(value).split(":");
    const date = new Date(2000, 0, 1, Number(parts[0]), Number(parts[1]));
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  function greeting() {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  }

  function currentDateLabel() {
    return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date());
  }

  function icon(name, size) {
    const sizeValue = size || 18;
    return `<svg aria-hidden="true" width="${sizeValue}" height="${sizeValue}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name] || iconPaths.info}</svg>`;
  }

  function getProfile() {
    return state.profile || { name: "Olivia Bennett", email: "olivia@luna.co", role: state.role };
  }

  function isSlotAvailable(date, time, stylistId) {
    const row = (state.data && state.data.availability || []).find(item => item.date === date && item.time === time && (!stylistId || item.stylistId === stylistId));
    return row ? row.isAvailable !== false : true;
  }

  function getSalon() {
    return state.data.currentSalon;
  }

  function getPlan() {
    return state.data.plans.find(plan => plan.id === getSalon().planId) || state.data.plans[1];
  }

  function getNavItems() {
    const role = getProfile().role;
    if (role === "admin") return [["overview", "Overview", "grid"], ["salons", "Salon directory", "building"], ["plans", "Subscription plans", "crown"], ["revenue", "Revenue & usage", "chart"]];
    if (role === "stylist") return [["overview", "My day", "grid"], ["schedule", "Appointments", "calendar"], ["availability", "Availability", "clock"]];
    if (role === "customer") return [["overview", "My overview", "grid"], ["discover", "Discover salons", "heart"], ["appointments", "My appointments", "calendar"], ["profile", "My profile", "user"]];
    return [["overview", "Overview", "grid"], ["appointments", "Appointments", "calendar"], ["team", "Team members", "users"], ["services", "Services", "scissors"], ["customers", "Customers", "heart"], ["subscription", "Subscription", "card"]];
  }

  window.Glowly = { config, app, modalRoot, toastRegion, state, icon, escapeHtml, safeClass, initials, formatDate, formatLongDate, formatTime, formatCurrency, greeting, currentDateLabel, todayIso, dateOffset, isSlotAvailable, createDemoData, getProfile, getSalon, getPlan, getNavItems };
})();
