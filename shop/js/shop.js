const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo';
const SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co';
const _shop = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1`;

const UPI_ID = 'hetanshtechnologie@okaxis';
const UPI_PHONE = '+919974031480';
const RAZORPAY_KEY_ID = 'rzp_live_T69SbFfk53qNmY';

async function getCurrentUser() {
  const { data: { user }, error } = await _shop.auth.getUser();
  return error || !user ? null : user;
}

async function signUp(email, password) {
  const { data, error } = await _shop.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const { data, error } = await _shop.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (window.sitengSetUser) window.sitengSetUser(data.user?.email, data.user?.id);
  return data;
}

async function signOut() {
  const { error } = await _shop.auth.signOut();
  if (error) throw error;
  if (window.sitengSetUser) window.sitengSetUser(null);
}

function onAuthChange(cb) {
  _shop.auth.onAuthStateChange((event, session) => cb(event, session?.user || null));
}

async function getProducts() {
  const { data, error } = await _shop.from('shop_products').select('*').order('title');
  if (error) throw error;
  return data;
}

async function getProduct(slug) {
  const { data, error } = await _shop.from('shop_products').select('*').eq('slug', slug).single();
  if (error) throw error;
  return data;
}

async function getCart(userId) {
  const { data, error } = await _shop
    .from('shop_cart')
    .select('*, shop_products(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}

async function addToCart(userId, productId) {
  const { data, error } = await _shop
    .from('shop_cart')
    .insert({ user_id: userId, product_id: productId })
    .select()
    .single();
  if (error && error.code === '23505') return;
  if (error) throw error;
  return data;
}

async function removeFromCart(cartId) {
  const { error } = await _shop.from('shop_cart').delete().eq('id', cartId);
  if (error) throw error;
}

async function clearCart(userId) {
  const { error } = await _shop.from('shop_cart').delete().eq('user_id', userId);
  if (error) throw error;
}

function formatPrice(p) { return '\u20b9' + Number(p).toFixed(2); }

async function createOrder(paymentMethod, transactionId) {
  const session = await _shop.auth.getSession();
  const token = session.data?.session?.access_token;
  const res = await fetch(`${EDGE_FUNCTION_URL}/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ payment_method: paymentMethod, transaction_id: transactionId })
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to create order'); }
  return res.json();
}

function getCartTotal(cartItems) {
  return cartItems.reduce((sum, item) => sum + Number(item.shop_products?.price || 0), 0);
}

async function createRazorpayOrder() {
  const session = await _shop.auth.getSession();
  const token = session.data?.session?.access_token;
  const res = await fetch(`${EDGE_FUNCTION_URL}/create-razorpay-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    let msg = 'Failed to create Razorpay order';
    try { const e = await res.json(); msg = e.details || e.error || msg; } catch (_) { try { msg = await res.text(); } catch (_2) {} }
    throw new Error(msg);
  }
  return res.json();
}

async function verifyRazorpayPayment(payload) {
  const session = await _shop.auth.getSession();
  const token = session.data?.session?.access_token;
  const res = await fetch(`${EDGE_FUNCTION_URL}/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    let msg = 'Payment verification failed';
    try { const e = await res.json(); msg = e.error || msg; } catch (_) { try { msg = await res.text(); } catch (_2) {} }
    throw new Error(msg);
  }
  return res.json();
}

async function socialLogin(provider) {
  const { data, error } = await _shop.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + window.location.pathname + window.location.search }
  });
  if (error) throw error;
}

function escapeHtml(t) {
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}
