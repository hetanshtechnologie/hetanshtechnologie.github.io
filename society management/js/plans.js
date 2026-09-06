const PlansModule = (() => {
  let plans = [];
  let selectedPlan = null;

  function showPricing() {
    plans = [
      { id: 1, name: 'Free', slug: 'free', price: 0, description: 'Basic society management for small communities', features: ['Up to 10 residents', 'Basic maintenance tracking', 'Notice board access', 'Email support'] },
      { id: 2, name: 'Standard', slug: 'standard', price: 49900, description: 'Complete solution for growing societies', features: ['Unlimited residents', 'Maintenance & billing', 'Facility booking', 'Visitor management', 'Complaint tracking', 'Community forum', 'Priority support'] },
      { id: 3, name: 'Premium', slug: 'premium', price: 99900, description: 'Enterprise-grade with all features', features: ['Everything in Standard', 'Advanced analytics & reports', 'Parking management', 'Emergency directory', 'API access', 'Dedicated account manager'] },
    ];
    const el = document.getElementById('app');
    el.innerHTML = `
      <div style="min-height:100vh;background:linear-gradient(135deg,#0d47a1 0%,#1565c0 100%);">
        <div style="max-width:1100px;margin:0 auto;padding:40px 20px;">
          <div style="text-align:center;padding:40px 0;">
            <h1 style="color:#fff;font-size:36px;margin-bottom:8px;">🏘️ Society Manager</h1>
            <p style="color:rgba(255,255,255,0.8);font-size:18px;">Complete digital solution for your housing society</p>
          </div>
          <div class="grid grid-3" id="pricingGrid" style="gap:24px;">${renderPlanCards()}</div>
          <div style="text-align:center;margin-top:40px;color:rgba(255,255,255,0.6);font-size:14px;">
            Already have an account? <a href="#" onclick="PlansModule.showLoginFromPricing()" style="color:#fff;text-decoration:underline;">Sign In</a>
          </div>
        </div>
      </div>
      <div id="pricingModal" class="modal-overlay"></div>`;
  }

  function renderPlanCards() {
    const popularIdx = plans.length > 1 ? 1 : 0;
    return plans.map((plan, i) => {
      const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || []);
      const isPopular = i === popularIdx && plans.length > 1;
      return `
        <div class="card" style="${isPopular ? 'border:2px solid #ffd700;transform:scale(1.03);position:relative;' : ''}padding:32px;text-align:center;">
          ${isPopular ? '<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#ffd700;color:#333;padding:4px 16px;border-radius:12px;font-size:12px;font-weight:700;">MOST POPULAR</div>' : ''}
          <h2 style="font-size:24px;margin-bottom:8px;">${escHtml(plan.name)}</h2>
          <p style="color:var(--text-secondary);font-size:14px;min-height:40px;">${escHtml(plan.description || '')}</p>
          <div style="margin:20px 0;">
            <span style="font-size:36px;font-weight:700;">₹${(plan.price / 100).toLocaleString()}</span>
            <span style="color:var(--text-secondary);">/year</span>
            ${plan.price === 0 ? '<div style="font-size:14px;color:var(--success);font-weight:600;">Free forever</div>' : ''}
          </div>
          <ul style="list-style:none;padding:0;text-align:left;margin-bottom:24px;">
            ${features.map(f => `<li style="padding:6px 0;font-size:14px;">✅ ${escHtml(f)}</li>`).join('')}
          </ul>
          <button class="${plan.price === 0 ? 'btn-outline' : 'btn-primary'}" style="width:100%;padding:12px;font-size:16px;" onclick="PlansModule.selectPlan(${plan.id})">
            ${plan.price === 0 ? 'Get Started Free' : 'Buy Now — ₹' + (plan.price / 100).toLocaleString()}
          </button>
        </div>`;
    }).join('');
  }

  function selectPlan(planId) {
    selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) return;
    showAuthForm();
  }

  function showAuthForm() {
    const isPaid = selectedPlan.price > 0;
    const modal = document.getElementById('pricingModal');
    modal.innerHTML = `
      <div class="modal" style="max-width:440px;">
        <h2 style="text-align:center;">${isPaid ? 'Buy ' : 'Sign up for '}${escHtml(selectedPlan.name)} Plan</h2>
        ${isPaid ? `<p style="text-align:center;color:var(--text-secondary);margin-bottom:16px;">₹${(selectedPlan.price / 100).toLocaleString()}/year — Secure payment via Razorpay</p>` : ''}
        <div id="authFormError" class="hidden" style="background:#fce8e6;color:#db4437;padding:10px;border-radius:6px;margin-bottom:12px;font-size:14px;"></div>
        <div class="form-group"><label>Full Name</label><input type="text" id="af_name" placeholder="Your name"></div>
        <div class="form-group"><label>Email</label><input type="email" id="af_email" placeholder="your@email.com"></div>
        <div class="form-group"><label>Flat Number</label><input type="text" id="af_flat" placeholder="A-101"></div>
        <div class="form-group"><label>Password</label><input type="password" id="af_password" placeholder="Min 6 characters"></div>
        <button class="btn-primary" style="width:100%;padding:12px;font-size:16px;" id="authFormBtn" onclick="PlansModule.handleAuth()">
          ${isPaid ? 'Proceed to Payment' : 'Create Free Account'}
        </button>
        <p style="text-align:center;margin-top:12px;font-size:14px;color:var(--text-secondary);">
          Already have an account? <a href="#" onclick="PlansModule.showSignInForm()">Sign In</a>
        </p>
      </div>`;
    modal.classList.add('active');
  }

  function showSignInForm() {
    const modal = document.getElementById('pricingModal');
    modal.innerHTML = `
      <div class="modal" style="max-width:400px;">
        <h2 style="text-align:center;">Sign In</h2>
        <div id="authFormError" class="hidden" style="background:#fce8e6;color:#db4437;padding:10px;border-radius:6px;margin-bottom:12px;font-size:14px;"></div>
        <div class="form-group"><label>Email</label><input type="email" id="af_email" placeholder="your@email.com"></div>
        <div class="form-group"><label>Password</label><input type="password" id="af_password" placeholder="••••••••"></div>
        <button class="btn-primary" style="width:100%;padding:12px;font-size:16px;" onclick="PlansModule.handleSignIn()">Sign In</button>
        <p style="text-align:center;margin-top:12px;font-size:14px;color:var(--text-secondary);">
          New user? <a href="#" onclick="PlansModule.showAuthForm()">Sign up</a>
        </p>
      </div>`;
    modal.classList.add('active');
  }

  function showLoginFromPricing() {
    document.getElementById('pricingModal').innerHTML = '';
    document.getElementById('pricingModal').classList.remove('active');
    AuthModule.showLogin();
  }

  async function handleAuth() {
    const name = document.getElementById('af_name').value.trim();
    const email = document.getElementById('af_email').value.trim();
    const flat = document.getElementById('af_flat').value.trim();
    const password = document.getElementById('af_password').value;
    const btn = document.getElementById('authFormBtn');
    const errEl = document.getElementById('authFormError');

    if (!name || !email || !flat || !password) { showFormError('Please fill in all fields'); return; }
    if (password.length < 6) { showFormError('Password must be at least 6 characters'); return; }

    btn.disabled = true;
    btn.textContent = 'Please wait...';

    try {
      const { data, error } = await supabaseClient.getClient().auth.signUp({
        email, password,
        options: { data: { full_name: name, flat_number: flat, role: 'resident' } }
      });
      if (error) throw error;
      if (!data.user) throw new Error('Registration failed');

      if (selectedPlan.price > 0) {
        await handlePaidPlan(data.user);
      } else {
        await handleFreePlan(data.user);
      }
    } catch (e) {
      if (e.message?.includes('already registered')) {
        await handleExistingUser(email, password);
      } else {
        showFormError(e.message || 'Registration failed');
        btn.disabled = false;
        btn.textContent = selectedPlan.price > 0 ? 'Proceed to Payment' : 'Create Free Account';
      }
    }
  }

  async function handleExistingUser(email, password) {
    try {
      await supabaseClient.signIn(email, password);
      const user = await supabaseClient.getCurrentUser();
      if (!user) throw new Error('Login failed');

      if (selectedPlan.price > 0) {
        await handlePaidPlan(user);
      } else {
        await handleFreePlan(user);
      }
    } catch (e) {
      showFormError(e.message || 'Login failed. Try a different password.');
      const btn = document.getElementById('authFormBtn');
      btn.disabled = false;
      btn.textContent = selectedPlan.price > 0 ? 'Proceed to Payment' : 'Create Free Account';
    }
  }

  async function handleFreePlan(user) {
    try {
      const client = supabaseClient.getClient();
      const { data: existing } = await client.from('society_purchases').select('id').eq('user_id', user.id);
      if (!existing || existing.length === 0) {
        const { error } = await client.from('society_purchases').insert({
          user_id: user.id, plan_id: selectedPlan.id, status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 86400000).toISOString(),
        });
        if (error && error.code === '42P01') {
          console.log('society_purchases table not yet created, skipping purchase record');
        }
      }
      document.getElementById('pricingModal').classList.remove('active');
      showToast('Welcome! Free plan activated', 'success');
      AuthModule.loadApp();
    } catch (e) {
      document.getElementById('pricingModal').classList.remove('active');
      showToast('Account created! Welcome', 'success');
      AuthModule.loadApp();
    }
  }

  async function handlePaidPlan(user) {
    try {
      const session = await supabaseClient.getClient().auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('No auth token');

      const btn = document.getElementById('authFormBtn');
      btn.textContent = 'Creating order...';

      const orderRes = await fetch(EDGE_FUNCTION_URL + '/society-create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ plan_id: selectedPlan.id })
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error || 'Failed to create order');

      const rzp = new Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Society Manager',
        description: selectedPlan.name + ' Plan',
        order_id: order.id,
        prefill: { name: order.user_name, email: order.user_email },
        theme: { color: '#1a73e8' },
        handler: async function(response) {
          btn.textContent = 'Verifying payment...';
          const vRes = await fetch(EDGE_FUNCTION_URL + '/society-verify-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: selectedPlan.id
            })
          });
          const vData = await vRes.json();
          if (!vRes.ok) throw new Error(vData.error || 'Payment verification failed');
          document.getElementById('pricingModal').classList.remove('active');
          showToast('Payment successful! ' + selectedPlan.name + ' plan activated', 'success');
          AuthModule.loadApp();
        },
        modal: { ondismiss: function() {
          btn.disabled = false;
          btn.textContent = 'Retry Payment — ₹' + (selectedPlan.price / 100).toLocaleString();
        }}
      });
      rzp.open();
    } catch (e) {
      showFormError(e.message || 'Payment failed');
      const btn = document.getElementById('authFormBtn');
      btn.disabled = false;
      btn.textContent = 'Retry Payment — ₹' + (selectedPlan.price / 100).toLocaleString();
    }
  }

  async function handleSignIn() {
    const email = document.getElementById('af_email').value.trim();
    const password = document.getElementById('af_password').value;
    const errEl = document.getElementById('authFormError');
    if (!email || !password) { showFormError('Please fill in all fields'); return; }
    try {
      await supabaseClient.signIn(email, password);
      document.getElementById('pricingModal').classList.remove('active');
      AuthModule.loadApp();
    } catch (e) {
      showFormError(e.message || 'Login failed');
    }
  }

  function showFormError(msg) {
    const el = document.getElementById('authFormError');
    if (el) { el.classList.remove('hidden'); el.textContent = msg; }
  }

  async function checkAccess() {
    const user = AuthModule.currentUser;
    if (!user) return false;
    if (user.profile?.role === 'admin' || user.profile?.role === 'super_admin') return true;
    try {
      const client = supabaseClient.getClient();
      const { data, error } = await client.from('society_purchases').select('*, society_plans(*)').eq('user_id', user.id).eq('status', 'active').limit(1);
      if (error && error.code === '42P01') return true;
      if (data && data.length > 0) {
        window._userPlan = data[0];
        return true;
      }
      return false;
    } catch { return true; }
  }

  return { showPricing, selectPlan, showAuthForm, showSignInForm, showLoginFromPricing, handleAuth, handleSignIn, checkAccess };
})();
