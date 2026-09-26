(() => {
  "use strict";

  const G = window.Glowly;
  const { config, state, toastRegion, icon, escapeHtml, todayIso, dateOffset, createDemoData, getProfile, getSalon } = G;
  state.data = createDemoData();

  let lastFocusedElement = null;
  let authQueue = Promise.resolve();
  const handledInvitations = new Set();

  function relation(value) {
    if (Array.isArray(value)) return value[0] || {};
    return value && typeof value === "object" ? value : {};
  }

  function durationText(value) {
    if (value == null || value === "") return "60 min";
    const number = Number(String(value).replace(/[^0-9.]/g, ""));
    return `${number || 60} min`;
  }

  function durationNumber(value) {
    const number = Number(String(value || "").replace(/[^0-9.]/g, ""));
    return number > 0 ? number : 60;
  }

  function mapPlan(item) {
    return {
      ...item,
      stylists: Number(item.stylist_limit) === 0 ? "Unlimited stylists" : `Up to ${item.stylist_limit} stylists`,
      slots: Number(item.appointment_limit) === 0 ? "Unlimited appointments" : `${item.appointment_limit} appointments / month`,
      analytics: Boolean(item.analytics_enabled),
      stylistLimit: Number(item.stylist_limit || 0),
      appointmentLimit: Number(item.appointment_limit || 0),
      features: Array.isArray(item.features) ? item.features : []
    };
  }

  function mapSalon(item, index) {
    const plan = relation(item.plans);
    const owner = relation(item.owner);
    return {
      ...item,
      planId: item.plan_id,
      plan: plan.name || item.plan_name || item.plan || "Basic",
      planDetails: plan,
      owner: owner.name || item.owner_name || "Salon owner",
      email: owner.email || item.contact || "",
      location: item.address || "Location not listed",
      usage: item.usage_percent == null ? item.usage || 0 : item.usage_percent,
      joined: item.created_at ? G.formatDate(String(item.created_at).slice(0, 10)) : "—",
      color: ["lavender", "mint", "peach", "sky", "rose"][index % 5]
    };
  }

  function mapService(item) {
    return {
      ...item,
      salonId: item.salon_id,
      durationMinutes: Number(item.duration_minutes || 60),
      duration: durationText(item.duration_minutes || item.duration),
      bookings: item.bookings || 0,
      color: ["lavender", "mint", "peach", "sky", "rose"][Math.abs(String(item.name || "").length) % 5]
    };
  }

  function mapAppointment(item) {
    const customer = relation(item.customer);
    const stylist = relation(item.stylist);
    const service = relation(item.service);
    return {
      ...item,
      customerName: customer.name || item.customer_name || item.customerName || "Guest",
      customerEmail: customer.email || item.customer_email || item.customerEmail || "",
      customerId: customer.id || item.customer_id || item.customerId || "",
      stylist: stylist.name || item.stylist_name || item.stylist || "Unassigned",
      stylistId: stylist.id || item.stylist_id || item.stylistId || "",
      service: service.name || item.service || "Salon service",
      serviceId: item.service_id || item.serviceId || service.id || "",
      salonId: item.salon_id || item.salonId || "",
      date: item.date || item.appointment_date || todayIso(),
      time: item.time || "09:00",
      duration: durationText(item.duration_minutes || item.duration),
      price: Number(item.price || service.price || 0),
      color: item.color || "lavender",
      status: item.status || "pending"
    };
  }

  async function query(builder) {
    const result = await builder;
    if (result.error) throw new Error(result.error.message);
    return result.data;
  }

  function openModal(type, payload) {
    lastFocusedElement = document.activeElement;
    state.modal = { type, ...(payload || {}) };
    G.render();
    window.setTimeout(() => document.querySelector(".modal input, .modal select, .modal textarea, .modal button")?.focus(), 0);
  }

  function closeModal() {
    state.modal = null;
    G.render();
    if (lastFocusedElement && document.contains(lastFocusedElement)) lastFocusedElement.focus();
    lastFocusedElement = null;
  }

  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast ${type || "success"}`;
    toast.innerHTML = `${icon(type === "error" ? "alert" : "checkCircle", 17)}<span>${escapeHtml(message)}</span>`;
    toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3400);
  }

  function setFormBusy(form, busy) {
    const button = form.querySelector("button[type=submit]");
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.innerHTML;
      button.disabled = true;
      button.textContent = "Saving...";
      return;
    }
    button.disabled = false;
    if (button.dataset.originalText) button.innerHTML = button.dataset.originalText;
  }

  function switchRole(role) {
    if (!role || role === state.role) return;
    const names = { owner: "Olivia Bennett", admin: "Alex Morgan", stylist: "Maya Chen", customer: "Ava Thompson" };
    state.role = role;
    state.profile = { ...(state.profile || {}), name: names[role] || "Glowly member", role };
    state.activeView = "overview";
    state.search = "";
    state.appointmentFilter = "all";
    state.customerFilter = "all";
    state.salonFilter = "all";
    state.discoverFilter = "all";
    state.modal = null;
    state.data = createDemoData();
    if (role === "admin") state.data.currentSalon = { ...state.data.currentSalon, name: "Glowly Platform", address: "Global workspace", city: "All markets" };
    G.render();
    showToast(`Previewing the ${role === "customer" ? "customer" : role} workspace`);
  }

  async function loadPlans() {
    if (!state.client) return;
    try {
      const plans = await query(state.client.from("glowly_plans").select("*").eq("active", true).order("price"));
      if (plans && plans.length) {
        state.data.plans = plans.map(mapPlan);
        if (!state.data.plans.some(plan => plan.id === state.authPlan)) {
          state.authPlan = (state.data.plans.find(plan => plan.name === "Premium") || state.data.plans[0]).id;
        }
      }
    } catch (error) {
      showToast("Plans are unavailable right now", "error");
    }
  }

  async function loadProfile(user) {
    const metadata = user.user_metadata || {};
    const fallbackRole = metadata.role === "owner" ? "owner" : "customer";
    if (!state.client) return { id: user.id, name: metadata.name || "Glowly member", email: user.email || "", phone: metadata.phone || "", role: fallbackRole };
    try {
      let profile = await query(state.client.from("glowly_users").select("id, name, email, phone, role").eq("id", user.id).maybeSingle());
      if (!profile) {
        await new Promise(resolve => window.setTimeout(resolve, 120));
        profile = await query(state.client.from("glowly_users").select("id, name, email, phone, role").eq("id", user.id).maybeSingle());
      }
      let membership = null;
      try {
        membership = await query(state.client.from("glowly_salon_stylists").select("salon_id").eq("user_id", user.id).eq("active", true).limit(1).maybeSingle());
      } catch (error) {
        membership = null;
      }
      const storedRole = profile?.role || fallbackRole;
      const role = storedRole === "admin" || storedRole === "owner" ? storedRole : membership ? "stylist" : storedRole;
      return {
        id: user.id,
        name: profile?.name || metadata.name || user.email || "Glowly member",
        email: user.email || profile?.email || "",
        phone: profile?.phone || metadata.phone || "",
        role
      };
    } catch (error) {
      return { id: user.id, name: metadata.name || user.email || "Glowly member", email: user.email || "", phone: metadata.phone || "", role: fallbackRole };
    }
  }

  async function acceptInvitation() {
    const invitationId = new URLSearchParams(window.location.search).get("invite");
    if (!invitationId || handledInvitations.has(invitationId)) return;
    const result = await state.client.rpc("glowly_accept_salon_invitation", { target_invitation_id: invitationId });
    if (result.error) throw new Error(result.error.message);
    handledInvitations.add(invitationId);
    window.history.replaceState({}, document.title, window.location.pathname);
    showToast("Your stylist invitation was accepted");
  }

  async function ensureOwnerSalon(user) {
    if (state.profile.role !== "owner") return;
    const existing = await query(state.client.from("glowly_salons").select("id").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle());
    if (existing) return;
    const metadata = user.user_metadata || {};
    if (!metadata.salonName) return;
    const plan = state.data.plans.find(item => item.id === metadata.planId) || state.data.plans.find(item => item.name === metadata.planName) || state.data.plans[0];
    if (!plan || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plan.id)) throw new Error("Active subscription plans are unavailable; please try again shortly");
    const result = await state.client.from("glowly_salons").insert({ owner_id: user.id, name: metadata.salonName, address: metadata.address || "", contact: metadata.contact || metadata.phone || "", plan_id: plan.id, status: "pending" });
    if (result.error) throw new Error(result.error.message);
  }

  async function initializeClient() {
    const previewAuth = new URLSearchParams(window.location.search).get("auth") === "1";
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY || !window.supabase) {
      state.demo = true;
      state.view = previewAuth ? "auth" : "app";
      G.render();
      return;
    }
    try {
      state.client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      state.demo = false;
      await loadPlans();
      const result = await state.client.auth.getSession();
      if (result.error) throw new Error(result.error.message);
      state.client.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") {
          resetSession();
          return;
        }
        if (session && event !== "TOKEN_REFRESHED") {
          authQueue = authQueue.then(() => activateSession(session)).catch(error => showToast(error.message, "error"));
        }
      });
      if (result.data.session) await activateSession(result.data.session);
      else {
        state.view = "auth";
        G.render();
      }
    } catch (error) {
      state.client = null;
      state.demo = true;
      state.view = previewAuth ? "auth" : "app";
      showToast("Supabase could not be reached, using preview data");
      G.render();
    }
  }

  async function activateSession(sessionOrUser) {
    const user = sessionOrUser?.user || sessionOrUser;
    if (!user?.id) return;
    if (state.session?.user?.id === user.id && state.view === "app") return;
    state.session = { user };
    if (state.client && !state.demo) await acceptInvitation();
    state.profile = await loadProfile(user);
    state.role = state.profile.role || "customer";
    state.activeView = "overview";
    state.view = "app";
    state.search = "";
    if (state.client && !state.demo && state.role === "owner") await ensureOwnerSalon(user);
    G.render();
    await hydrateData();
    G.render();
  }

  function resetSession() {
    state.session = null;
    state.profile = null;
    state.role = "owner";
    state.activeView = "overview";
    state.modal = null;
    state.demo = !state.client;
    state.view = state.demo ? "app" : "auth";
    state.data = createDemoData();
    G.render();
  }

  async function hydrateData() {
    if (!state.client || !state.profile) return;
    const client = state.client;
    try {
      await loadPlans();
      if (state.role === "owner") {
        state.data.appointments = [];
        state.data.services = [];
        state.data.stylists = [];
        state.data.customers = [];
        state.data.invoices = [];
        state.data.planRequests = [];
        state.data.adminSalons = [];
        const salon = await query(client.from("glowly_salons").select("*, glowly_plans(name, price)").eq("owner_id", state.profile.id).order("created_at", { ascending: true }).limit(1).maybeSingle());
        if (!salon) return;
        state.data.currentSalon = mapSalon(salon, 0);
        const salonId = salon.id;
        const [appointments, services, memberships, customerRecords, invoices, requests] = await Promise.all([
          query(client.from("glowly_appointments").select("*, customer:glowly_users!glowly_appointments_customer_id_fkey(id, name, email), stylist:glowly_users!glowly_appointments_stylist_id_fkey(id, name), service:glowly_services!glowly_appointments_service_id_fkey(name, price, duration_minutes)").eq("salon_id", salonId).order("date", { ascending: true }).limit(100)),
          query(client.from("glowly_services").select("*").eq("salon_id", salonId).eq("active", true).order("created_at", { ascending: true })),
          query(client.from("glowly_salon_stylists").select("user_id, role, active").eq("salon_id", salonId).eq("active", true)),
          query(client.from("glowly_salon_customers").select("*").eq("salon_id", salonId).order("created_at", { ascending: false })),
          query(client.from("glowly_invoices").select("*").eq("salon_id", salonId).order("created_at", { ascending: false }).limit(12)),
          query(client.from("glowly_subscription_requests").select("*").eq("salon_id", salonId).order("created_at", { ascending: false }).limit(12))
        ]);
        state.data.appointments = appointments.map(mapAppointment);
        state.data.services = services.map(mapService);
        const stylistIds = memberships.map(item => item.user_id).filter(Boolean);
        if (stylistIds.length) {
          const users = await query(client.from("glowly_users").select("id, name, email").in("id", stylistIds));
          state.data.stylists = users.map((user, index) => {
            const membership = memberships.find(item => item.user_id === user.id) || {};
            const count = state.data.appointments.filter(item => item.stylistId === user.id && item.date === todayIso()).length;
            return { ...user, userId: user.id, salonId, role: membership.role === "manager" ? "Manager" : "Stylist", specialty: "Hair & styling", rating: "New", appointments: count, status: "active", color: ["lavender", "mint", "peach", "sky", "rose"][index % 5] };
          });
        }
        state.data.customers = mergeCustomerRecords(customerRecords, state.data.appointments);
        state.data.invoices = invoices.map(item => ({ ...item, date: item.created_at ? G.formatDate(String(item.created_at).slice(0, 10)) : "—", description: item.description || "Salon subscription" }));
        state.data.planRequests = requests.map(item => ({ ...item, requestedPlan: state.data.plans.find(plan => plan.id === item.requested_plan_id)?.name || "Plan" }));
        const plan = state.data.plans.find(item => item.id === salon.plan_id);
        if (plan && Number(plan.appointment_limit) > 0) state.data.currentSalon.usage = Math.min(100, Math.round((state.data.appointments.length / Number(plan.appointment_limit)) * 100));
        return;
      }
      if (state.role === "admin") {
        const [plans, salons, invoices, requests] = await Promise.all([
          query(client.from("glowly_plans").select("*").order("price")),
          query(client.from("glowly_salons").select("*, glowly_plans(name, price)").order("created_at", { ascending: false })),
          query(client.from("glowly_invoices").select("*").order("created_at", { ascending: false }).limit(20)),
          query(client.from("glowly_subscription_requests").select("*").order("created_at", { ascending: false }).limit(50))
        ]);
        state.data.plans = plans.map(mapPlan);
        state.data.currentSalon = { id: "platform", name: "Glowly Platform", address: "", contact: "", plan: state.data.plans[0]?.name || "Platform", planId: state.data.plans[0]?.id || "", status: "approved" };
        state.data.adminSalons = salons.map((item, index) => mapSalon(item, index));
        const ownerIds = salons.map(item => item.owner_id).filter(Boolean);
        if (ownerIds.length) {
          const owners = await query(client.from("glowly_users").select("id, name, email").in("id", ownerIds));
          state.data.adminSalons = state.data.adminSalons.map((item, index) => ({ ...item, owner: owners.find(owner => owner.id === salons[index].owner_id)?.name || "Salon owner", email: owners.find(owner => owner.id === salons[index].owner_id)?.email || item.contact || "" }));
        }
        state.data.invoices = invoices.map(item => ({ ...item, date: item.created_at ? G.formatDate(String(item.created_at).slice(0, 10)) : "—", description: item.description || "Salon subscription" }));
        state.data.planRequests = requests.map(item => ({ ...item, salon: state.data.adminSalons.find(salon => salon.id === item.salon_id)?.name || "Salon", requestedPlan: state.data.plans.find(plan => plan.id === item.requested_plan_id)?.name || "Plan" }));
        return;
      }
      if (state.role === "stylist") {
        state.data.appointments = [];
        state.data.services = [];
        state.data.availability = [];
        state.data.stylists = [{ ...state.profile, role: "Stylist", specialty: "Hair & styling", rating: "New", appointments: 0, status: "active", color: "lavender" }];
        const membership = await query(client.from("glowly_salon_stylists").select("salon_id, role").eq("user_id", state.profile.id).eq("active", true).limit(1).maybeSingle());
        if (!membership) return;
        const salon = await query(client.from("glowly_salons").select("*, glowly_plans(name, price)").eq("id", membership.salon_id).maybeSingle());
        if (!salon) return;
        state.data.currentSalon = mapSalon(salon, 0);
        const [appointments, services, availability] = await Promise.all([
          query(client.from("glowly_appointments").select("*, customer:glowly_users!glowly_appointments_customer_id_fkey(id, name, email), stylist:glowly_users!glowly_appointments_stylist_id_fkey(id, name), service:glowly_services!glowly_appointments_service_id_fkey(name, price, duration_minutes)").eq("salon_id", membership.salon_id).eq("stylist_id", state.profile.id).order("date", { ascending: true }).limit(100)),
          query(client.from("glowly_services").select("*").eq("salon_id", membership.salon_id).eq("active", true).order("name")),
          query(client.from("glowly_availability").select("*").eq("salon_id", membership.salon_id).eq("stylist_id", state.profile.id).gte("date", todayIso()).lte("date", dateOffset(6)).order("date"))
        ]);
        state.data.appointments = appointments.map(mapAppointment);
        state.data.services = services.map(mapService);
        state.data.availability = availability.map(item => ({ ...item, stylistId: item.stylist_id, isAvailable: item.is_available, time: String(item.time_slot).slice(0, 5) }));
        return;
      }
      state.data.appointments = [];
      state.data.services = [];
      state.data.stylists = [];
      state.data.adminSalons = [];
      state.data.currentSalon = { id: "discovery", name: "Glowly Discovery", address: "", contact: "", plan: "Customer", planId: "", status: "approved" };
      const [appointments, salons, services] = await Promise.all([
        query(client.from("glowly_appointments").select("*, customer:glowly_users!glowly_appointments_customer_id_fkey(id, name, email), stylist:glowly_users!glowly_appointments_stylist_id_fkey(id, name), service:glowly_services!glowly_appointments_service_id_fkey(name, price, duration_minutes)").eq("customer_id", state.profile.id).order("date", { ascending: true }).limit(100)),
        query(client.from("glowly_salons").select("*, glowly_plans(name, price)").eq("status", "approved").order("name").limit(30)),
        query(client.from("glowly_services").select("*").eq("active", true).order("name").limit(100))
      ]);
      state.data.appointments = appointments.map(mapAppointment);
      state.data.adminSalons = salons.map((item, index) => mapSalon(item, index));
      state.data.services = services.map(mapService);
    } catch (error) {
      showToast(error.message || "Live data is unavailable; showing the latest preview", "error");
    }
  }

  function mergeCustomerRecords(records, appointments) {
    const result = records.map(item => ({ ...item, visits: Number(item.visits || 0), spent: Number(item.spent || 0), lastVisit: item.last_visit || todayIso(), color: "lavender" }));
    const byId = new Map(result.map(item => [item.id, item]));
    appointments.forEach(appointment => {
      if (!appointment.customerId) return;
      const current = byId.get(appointment.customerId);
      if (current) {
        current.visits += appointment.status === "completed" ? 1 : 0;
        current.spent += appointment.status === "completed" ? Number(appointment.price || 0) : 0;
        if (appointment.date > current.lastVisit) current.lastVisit = appointment.date;
        return;
      }
      byId.set(appointment.customerId, { id: appointment.customerId, name: appointment.customerName, email: appointment.customerEmail, phone: "—", visits: appointment.status === "completed" ? 1 : 0, spent: appointment.status === "completed" ? Number(appointment.price || 0) : 0, lastVisit: appointment.date, status: "new", color: "mint" });
    });
    return Array.from(byId.values());
  }

  function dataFrom(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  async function handleSubmit(event) {
    const form = event.target.closest("form[data-form]");
    if (!form) return;
    event.preventDefault();
    const values = dataFrom(form);
    setFormBusy(form, true);
    try {
      if (form.dataset.form === "login") await submitLogin(values);
      else if (form.dataset.form === "register") await submitRegister(values);
      else if (form.dataset.form === "booking") await submitBooking(values);
      else if (form.dataset.form === "stylist") await submitStylist(values);
      else if (form.dataset.form === "salon") await submitSalon(values);
      else if (form.dataset.form === "plan") await submitPlan(values);
      else if (form.dataset.form === "profile") await submitProfile(values);
      else if (form.dataset.form === "service") await submitService(values);
      else if (form.dataset.form === "customer") await submitCustomer(values);
    } catch (error) {
      showToast(error.message || "Something went wrong. Please try again.", "error");
      setFormBusy(form, false);
    }
  }

  async function submitLogin(values) {
    if (!state.client || state.demo) {
      const email = String(values.email || "").toLowerCase();
      const role = email.includes("admin") ? "admin" : email.includes("stylist") ? "stylist" : email.includes("client") || email.includes("customer") ? "customer" : "owner";
      const names = { owner: "Olivia Bennett", admin: "Alex Morgan", stylist: "Maya Chen", customer: "Ava Thompson" };
      state.profile = { id: "demo-user", name: names[role], email: values.email, phone: "", role };
      state.role = role;
      state.session = { user: { id: "demo-user", email: values.email } };
      state.view = "app";
      state.activeView = "overview";
      G.render();
      showToast("Welcome back to your Glowly workspace");
      return;
    }
    const result = await state.client.auth.signInWithPassword({ email: values.email, password: values.password });
    if (result.error) throw new Error(result.error.message);
    await activateSession(result.data.session);
    showToast("Welcome back to your Glowly workspace");
  }

  async function submitRegister(values) {
    const role = state.authRole === "owner" ? "owner" : "customer";
    if (!state.client || state.demo) {
      state.profile = { id: "demo-user", name: values.name, email: values.email, phone: values.phone || "", role };
      state.role = role;
      state.session = { user: { id: "demo-user", email: values.email } };
      state.view = "app";
      state.activeView = "overview";
      if (role === "owner" && values.salonName) {
        const plan = state.data.plans.find(item => item.id === state.authPlan) || state.data.plans[1];
        state.data.currentSalon = { ...state.data.currentSalon, name: values.salonName, address: values.address, contact: values.phone || values.email, plan: plan.name, planId: plan.id, status: "pending" };
      }
      G.render();
      showToast(role === "owner" ? "Your salon registration is ready for approval" : "Your Glowly account is ready");
      return;
    }
    await loadPlans();
    const plan = state.data.plans.find(item => item.id === state.authPlan) || state.data.plans[0];
    const result = await state.client.auth.signUp({ email: values.email, password: values.password, options: { data: { name: values.name, phone: values.phone || "", role, salonName: values.salonName || "", address: values.address || "", planId: plan?.id || "", planName: plan?.name || "" } } });
    if (result.error) throw new Error(result.error.message);
    if (!result.data.session) {
      showToast("Check your email to confirm your account, then come back to sign in");
      state.view = "auth";
      G.render();
      return;
    }
    await activateSession(result.data.session);
    showToast(role === "owner" ? "Your salon registration is ready for approval" : "Your Glowly account is ready");
    G.render();
  }

  async function submitBooking(values) {
    if (state.client && !state.demo && state.role !== "customer") throw new Error("Only registered customers can create live appointments");
    const service = state.data.services.find(item => item.id === values.serviceId || item.name === values.service);
    const stylist = state.data.stylists.find(item => item.id === values.stylistId);
    const salonId = values.salonId || state.data.currentSalon?.id;
    if (!service || !salonId) throw new Error("Choose a salon and service first");
    const appointment = { id: `local-${Date.now()}`, customerName: getProfile().name, customerEmail: getProfile().email, customerId: getProfile().id, service: service.name, serviceId: service.id, salonId, stylist: stylist ? stylist.name : "Any available stylist", stylistId: values.stylistId || "", date: values.date, time: values.time, duration: durationText(service.durationMinutes || service.duration), status: "pending", price: Number(service.price || 0), color: service.color || "lavender" };
    if (state.client && !state.demo) {
      const result = await state.client.from("glowly_appointments").insert({ customer_id: getProfile().id, stylist_id: values.stylistId || null, salon_id: salonId, service_id: service.id, service: service.name, date: values.date, time: values.time, duration_minutes: durationNumber(service.durationMinutes || service.duration), price: Number(service.price || 0), status: "pending", notes: values.notes || "" });
      if (result.error) throw new Error(result.error.message);
      await hydrateData();
    } else {
      state.data.appointments.unshift(appointment);
    }
    closeModal();
    showToast("Your appointment request is in the studio queue");
  }

  async function submitStylist(values) {
    const existing = state.modal?.item;
    const isEditing = Boolean(existing?.id);
    if (state.client && !state.demo) {
      if (isEditing && (existing.userId || existing.id)) {
        const result = await state.client.from("glowly_salon_stylists").update({ role: values.role === "Manager" ? "manager" : "stylist" }).eq("salon_id", state.data.currentSalon.id).eq("user_id", existing.userId || existing.id);
        if (result.error) throw new Error(result.error.message);
      } else {
        const result = await query(state.client.from("glowly_salon_invitations").insert({ salon_id: state.data.currentSalon.id, email: values.email, display_name: values.name, role: values.role === "Manager" ? "manager" : "stylist", specialty: values.specialty }).select("id").single());
        const invite = `${window.location.origin}${window.location.pathname}?invite=${result.id}`;
        try {
          await navigator.clipboard.writeText(invite);
          showToast("Invitation link copied to your clipboard");
        } catch (error) {
          showToast(`Invitation created: ${invite}`);
        }
      }
      closeModal();
      await hydrateData();
      return;
    }
    const item = { id: existing?.id || `st-${Date.now()}`, name: values.name, email: values.email, role: values.role, specialty: values.specialty, rating: existing?.rating || "New", appointments: existing?.appointments || 0, status: "active", color: existing?.color || "mint" };
    const index = state.data.stylists.findIndex(stylist => stylist.id === item.id);
    if (index >= 0) state.data.stylists[index] = { ...state.data.stylists[index], ...item };
    else state.data.stylists.push(item);
    closeModal();
    showToast(isEditing ? "Stylist details updated" : "Stylist added to your team");
  }

  async function submitSalon(values) {
    const payload = { name: values.name, address: values.address, contact: values.contact, timezone: values.timezone || "America/New_York" };
    if (state.client && !state.demo) {
      const result = await state.client.from("glowly_salons").update(payload).eq("id", state.data.currentSalon.id);
      if (result.error) throw new Error(result.error.message);
      await hydrateData();
    } else {
      state.data.currentSalon = { ...state.data.currentSalon, ...payload };
    }
    closeModal();
    showToast("Salon details saved");
  }

  async function submitPlan(values) {
    if (state.role !== "admin") throw new Error("Only platform administrators can manage plans");
    const features = String(values.features || "").split(",").map(item => item.trim()).filter(Boolean);
    const stylistLimit = Number(values.stylistLimit || 0);
    const appointmentLimit = Number(values.appointmentLimit || 0);
    const plan = { id: values.id || `local-plan-${Date.now()}`, name: values.name, description: values.description, price: Number(values.price), stylists: stylistLimit ? `Up to ${stylistLimit} stylists` : "Unlimited stylists", slots: appointmentLimit ? `${appointmentLimit} appointments / month` : "Unlimited appointments", features, analytics: values.analytics === "on", stylistLimit, appointmentLimit };
    const index = state.data.plans.findIndex(item => item.id === plan.id);
    if (index >= 0) state.data.plans[index] = { ...state.data.plans[index], ...plan };
    else state.data.plans.push(plan);
    if (state.client && !state.demo) {
      const payload = { name: plan.name, description: plan.description, price: plan.price, features: plan.features, stylist_limit: plan.stylistLimit, appointment_limit: plan.appointmentLimit, analytics_enabled: plan.analytics, active: true };
      const result = values.id ? await state.client.from("glowly_plans").update(payload).eq("id", values.id) : await state.client.from("glowly_plans").insert(payload);
      if (result.error) throw new Error(result.error.message);
      await loadPlans();
    }
    closeModal();
    showToast(values.id ? "Subscription plan updated" : "Subscription plan created");
  }

  async function submitProfile(values) {
    const payload = { name: values.name, phone: values.phone || "" };
    state.profile = { ...state.profile, ...payload };
    if (state.client && !state.demo) {
      const result = await state.client.from("glowly_users").update(payload).eq("id", state.profile.id);
      if (result.error) throw new Error(result.error.message);
    }
    closeModal();
    showToast("Profile updated");
  }

  async function submitService(values) {
    const existing = state.modal?.item;
    const duration = durationNumber(values.duration);
    const item = { id: existing?.id || `local-service-${Date.now()}`, salonId: state.data.currentSalon.id, name: values.name, description: values.description, price: Number(values.price), durationMinutes: duration, duration: durationText(duration), bookings: existing?.bookings || 0, color: existing?.color || "lavender" };
    if (state.client && !state.demo) {
      const payload = { salon_id: item.salonId, name: item.name, description: item.description, price: item.price, duration_minutes: duration, active: true };
      const result = existing?.id ? await state.client.from("glowly_services").update(payload).eq("id", existing.id) : await state.client.from("glowly_services").insert(payload);
      if (result.error) throw new Error(result.error.message);
      await hydrateData();
    } else {
      const index = state.data.services.findIndex(service => service.id === item.id);
      if (index >= 0) state.data.services[index] = { ...state.data.services[index], ...item };
      else state.data.services.push(item);
    }
    closeModal();
    showToast(existing?.id ? "Service updated" : "Service added to your menu");
  }

  async function submitCustomer(values) {
    if (state.client && !state.demo) {
      const result = await state.client.from("glowly_salon_customers").insert({ salon_id: state.data.currentSalon.id, name: values.name, email: values.email, phone: values.phone || "" }).select().single();
      if (result.error) throw new Error(result.error.message);
      await hydrateData();
    } else {
      state.data.customers.unshift({ id: `local-customer-${Date.now()}`, name: values.name, email: values.email, phone: values.phone, visits: 0, spent: 0, lastVisit: todayIso(), status: "new", color: "lavender" });
    }
    closeModal();
    showToast("Customer profile created");
  }

  async function updateAppointment(id, status) {
    const appointment = state.data.appointments.find(item => item.id === id);
    if (!appointment) return;
    if (state.client && !state.demo) {
      const result = await state.client.from("glowly_appointments").update({ status }).eq("id", id);
      if (result.error) throw new Error(result.error.message);
    }
    appointment.status = status;
    closeModal();
    showToast(status === "confirmed" ? "Appointment confirmed" : status === "completed" ? "Appointment marked complete" : "Appointment cancelled");
  }

  async function updateSalonStatus(id, status) {
    const salon = state.data.adminSalons.find(item => item.id === id);
    if (!salon) return;
    if (state.client && !state.demo) {
      const result = await state.client.from("glowly_salons").update({ status }).eq("id", id);
      if (result.error) throw new Error(result.error.message);
    }
    salon.status = status;
    G.render();
    showToast(status === "approved" ? `${salon.name} is now approved` : `${salon.name} was rejected`);
  }

  async function requestPlanChange(planId) {
    const plan = state.data.plans.find(item => item.id === planId);
    if (!plan || plan.id === state.data.currentSalon.planId) return;
    if (state.data.planRequests.some(item => item.status === "pending")) return showToast("A plan change is already awaiting review");
    if (state.client && !state.demo) {
      const result = await state.client.from("glowly_subscription_requests").insert({ salon_id: state.data.currentSalon.id, requested_plan_id: plan.id, note: "Owner requested a plan change from the Glowly workspace" });
      if (result.error) throw new Error(result.error.message);
    }
    state.data.planRequests.unshift({ id: `local-request-${Date.now()}`, requested_plan_id: plan.id, requestedPlan: plan.name, status: "pending", created_at: new Date().toISOString() });
    showToast(`${plan.name} plan change requested for review`);
    G.render();
  }

  async function resolvePlanRequest(id, status) {
    if (state.client && !state.demo) {
      const result = await state.client.rpc("glowly_resolve_subscription_request", { target_request_id: id, resolution: status });
      if (result.error) throw new Error(result.error.message);
      await hydrateData();
    } else {
      const request = state.data.planRequests.find(item => item.id === id);
      if (request) request.status = status;
    }
    G.render();
    showToast(status === "approved" ? "Subscription request approved" : "Subscription request rejected");
  }

  async function deleteService(id) {
    if (state.client && !state.demo) {
      const result = await state.client.from("glowly_services").update({ active: false }).eq("id", id);
      if (result.error) throw new Error(result.error.message);
      await hydrateData();
    } else {
      state.data.services = state.data.services.filter(item => item.id !== id);
    }
    closeModal();
    showToast("Service removed from the booking menu");
  }

  async function toggleAvailability(date, time) {
    const stylistId = state.profile.id;
    const current = state.data.availability.find(item => item.date === date && item.time === time && item.stylistId === stylistId);
    const isAvailable = current ? !current.isAvailable : true;
    if (current) current.isAvailable = isAvailable;
    else state.data.availability.push({ id: `local-availability-${Date.now()}`, salonId: state.data.currentSalon.id, stylistId, date, time, isAvailable });
    if (state.client && !state.demo) {
      const result = await state.client.from("glowly_availability").upsert({ salon_id: state.data.currentSalon.id, stylist_id: stylistId, date, time_slot: time, is_available: isAvailable }, { onConflict: "salon_id,stylist_id,date,time_slot" });
      if (result.error) throw new Error(result.error.message);
    }
    G.render();
  }

  async function copyAvailability() {
    const monday = dateOffset(0);
    const source = state.data.availability.filter(item => item.date === monday);
    for (let index = 1; index < 7; index += 1) {
      const date = dateOffset(index);
      for (const slot of source) {
        const key = `${date}-${slot.time}`;
        const existing = state.data.availability.find(item => item.date === date && item.time === slot.time && item.stylistId === state.profile.id);
        if (existing) existing.isAvailable = slot.isAvailable;
        else state.data.availability.push({ id: `local-availability-${key}`, salonId: state.data.currentSalon.id, stylistId: state.profile.id, date, time: slot.time, isAvailable: slot.isAvailable });
      }
    }
    if (state.client && !state.demo && source.length) {
      const rows = source.flatMap(slot => Array.from({ length: 6 }, (_, index) => ({ salon_id: state.data.currentSalon.id, stylist_id: state.profile.id, date: dateOffset(index + 1), time_slot: slot.time, is_available: slot.isAvailable })));
      const result = await state.client.from("glowly_availability").upsert(rows, { onConflict: "salon_id,stylist_id,date,time_slot" });
      if (result.error) throw new Error(result.error.message);
    }
    G.render();
    showToast("Availability copied to the rest of the week");
  }

  async function logout() {
    if (state.client && !state.demo) await state.client.auth.signOut();
    else resetSession();
  }

  function downloadCsv(action) {
    let header = [];
    let rows = [];
    if (action === "export-tenants" || (action === "export-report" && state.role === "admin")) {
      header = ["Salon", "Owner", "Plan", "Status", "Usage"];
      rows = state.data.adminSalons.map(item => [item.name, item.owner, item.plan, item.status, `${item.usage}%`]);
    } else if (action === "customer-export") {
      header = ["Customer", "Email", "Phone", "Visits", "Spent"];
      rows = state.data.customers.map(item => [item.name, item.email, item.phone, item.visits, item.spent]);
    } else if (action === "download-invoices") {
      header = ["Invoice", "Date", "Description", "Amount", "Status"];
      rows = state.data.invoices.map(item => [item.id, item.date, item.description, item.amount, item.status]);
    } else {
      header = ["Customer", "Service", "Stylist", "Date", "Time", "Status"];
      rows = state.data.appointments.map(item => [item.customerName, item.service, item.stylist, item.date, item.time, item.status]);
    }
    const csv = [header, ...rows].map(row => row.map(value => `"${String(value || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `glowly-${action}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("CSV export downloaded");
  }

  function handleClick(event) {
    const target = event.target.closest("button, a, [data-action]");
    if (!target) return;
    if (target.dataset.view) {
      state.activeView = target.dataset.view;
      state.search = "";
      state.modal = null;
      G.render();
      return;
    }
    if (target.dataset.authMode) {
      state.authMode = target.dataset.authMode;
      G.renderAuth();
      return;
    }
    if (target.dataset.authRole) {
      state.authRole = target.dataset.authRole === "stylist" ? "customer" : target.dataset.authRole;
      G.renderAuth();
      return;
    }
    if (target.dataset.authPlan) {
      state.authPlan = target.dataset.authPlan;
      G.renderAuth();
      return;
    }
    if (target.dataset.role) {
      switchRole(target.dataset.role);
      return;
    }
    const action = target.dataset.action;
    if (!action) return;
    if (action === "preview-signin") {
      state.demo = true;
      state.view = "auth";
      G.render();
      return;
    }
    if (action === "toggle-sidebar") {
      document.getElementById("sidebar")?.classList.toggle("open");
      document.querySelector(".mobile-overlay")?.classList.toggle("visible");
      return;
    }
    if (action === "open-booking") return openModal("booking");
    if (action === "book-salon") return openModal("booking", { salonId: target.dataset.id });
    if (action === "add-stylist" || action === "team-invite") return openModal("stylist");
    if (action === "edit-stylist") return openModal("stylist", { item: state.data.stylists.find(item => item.id === target.dataset.id) });
    if (action === "edit-salon" || action === "workspace-menu") {
      if (getProfile().role === "owner") openModal("salon");
      else showToast("Salon settings are available to owners", "error");
      return;
    }
    if (action === "show-plans" || action === "change-plan") {
      state.activeView = "subscription";
      state.modal = null;
      G.render();
      return;
    }
    if (action === "add-plan") return openModal("plan");
    if (action === "edit-plan") return openModal("plan", { item: state.data.plans.find(item => item.id === target.dataset.id) });
    if (action === "add-service") return openModal("service");
    if (action === "edit-service") return openModal("service", { item: state.data.services.find(item => item.id === target.dataset.id) });
    if (action === "add-customer") return openModal("customer");
    if (action === "edit-profile") return openModal("profile");
    if (action === "close-modal") return closeModal();
    if (action === "modal-backdrop" && event.target === target) return closeModal();
    if (action === "approve-salon") return updateSalonStatus(target.dataset.id, "approved").catch(error => showToast(error.message, "error"));
    if (action === "reject-salon") return updateSalonStatus(target.dataset.id, "rejected").catch(error => showToast(error.message, "error"));
    if (action === "confirm-appointment") return updateAppointment(target.dataset.id, "confirmed").catch(error => showToast(error.message, "error"));
    if (action === "complete-appointment") return updateAppointment(target.dataset.id, "completed").catch(error => showToast(error.message, "error"));
    if (action === "cancel-appointment") return openModal("confirm", { action: "cancel-appointment", id: target.dataset.id, title: "Cancel this appointment?", description: "The salon will be notified and this time will be released." });
    if (action === "appointment-menu") return openModal("appointment", { item: state.data.appointments.find(item => item.id === target.dataset.id) });
    if (action === "confirm-action") {
      const confirmAction = state.modal?.action;
      if (confirmAction === "cancel-appointment") return updateAppointment(state.modal.id, "cancelled").catch(error => showToast(error.message, "error"));
      if (confirmAction === "delete-service") return deleteService(state.modal.id).catch(error => showToast(error.message, "error"));
      return;
    }
    if (action === "delete-service") return openModal("confirm", { action: "delete-service", id: target.dataset.id, title: "Remove this service?", description: "It will no longer appear in the booking menu. Existing appointments will not be affected." });
    if (action === "choose-plan") return requestPlanChange(target.dataset.id).catch(error => showToast(error.message, "error"));
    if (action === "approve-plan-request") return resolvePlanRequest(target.dataset.id, "approved").catch(error => showToast(error.message, "error"));
    if (action === "reject-plan-request") return resolvePlanRequest(target.dataset.id, "rejected").catch(error => showToast(error.message, "error"));
    if (action === "logout") return logout();
    if (action === "notifications") return showToast("You’re all caught up");
    if (["export-report", "export-appointments", "customer-export", "export-tenants", "download-invoices"].includes(action)) return downloadCsv(action);
    if (action === "support" || action === "billing-support") return showToast("Our support team will be in touch shortly");
    if (action === "forgot-password") {
      const email = document.getElementById("login-email")?.value;
      if (!email || !state.client || state.demo) return showToast("Enter your email first, then try again", "error");
      state.client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${window.location.pathname}` }).then(result => { if (result.error) showToast(result.error.message, "error"); else showToast("Password reset instructions are on their way"); });
      return;
    }
    if (action === "favorite-salon") {
      const id = target.dataset.id;
      if (state.favorites.has(id)) state.favorites.delete(id); else state.favorites.add(id);
      target.classList.toggle("is-favorite", state.favorites.has(id));
      showToast(state.favorites.has(id) ? "Salon saved to your favorites" : "Salon removed from favorites");
      return;
    }
    if (action === "availability-shortcut") {
      state.activeView = "availability";
      G.render();
      return;
    }
    if (action === "save-availability") return showToast("Availability changes save automatically");
    if (action === "copy-availability") return copyAvailability().catch(error => showToast(error.message, "error"));
    if (action === "toggle-slot") return toggleAvailability(target.dataset.date, target.dataset.time).catch(error => showToast(error.message, "error"));
    if (["calendar-view", "map-view", "date-filter", "service-order", "invite-salon"].includes(action)) return showToast("That view is ready for your next workflow");
    if (action === "terms" || action === "privacy") return showToast("This policy is available in the full Glowly terms");
    if (action === "customer-menu" || action === "salon-menu") return showToast("More actions are available from the detail view");
  }

  function handleInput(event) {
    const target = event.target.closest("[data-search]");
    if (!target) return;
    state.search = target.value;
    const scope = target.dataset.searchScope || "global";
    G.render();
    const replacement = document.querySelector(`[data-search-scope="${scope}"]`);
    if (replacement) {
      replacement.focus();
      replacement.setSelectionRange(replacement.value.length, replacement.value.length);
    }
  }

  function handleChange(event) {
    const target = event.target;
    if (target.id === "booking-salon") {
      if (state.modal?.type === "booking") {
        state.modal.salonId = target.value;
        G.render();
      }
      return;
    }
    if (!target.matches("[data-filter]")) return;
    const filter = target.dataset.filter;
    if (filter === "appointment") state.appointmentFilter = target.value;
    if (filter === "customer") state.customerFilter = target.value;
    if (filter === "salon") state.salonFilter = target.value;
    if (filter === "stylist-appointment") state.stylistAppointmentFilter = target.value;
    if (filter === "stylist-slot") state.stylistSlotFilter = target.value;
    if (filter === "discover") state.discoverFilter = target.value;
    if (filter === "revenue") showToast("Revenue range updated");
    G.render();
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && state.modal) closeModal();
  }

  document.addEventListener("click", handleClick);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleChange);
  document.addEventListener("keydown", handleKeydown);

  G.showToast = showToast;
  G.openModal = openModal;
  G.closeModal = closeModal;
  G.initializeClient = initializeClient;
  G.activateSession = activateSession;
  G.loadProfile = loadProfile;
  G.hydrateData = hydrateData;
  G.mapAppointment = mapAppointment;
  G.logout = logout;
})();
