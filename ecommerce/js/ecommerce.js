// ============================================================
// Hetansh Technologie - Ecommerce Shared JavaScript Library
// Multi-vendor platform powered by Supabase + Razorpay
// ============================================================

// ============================================================
// CONFIGURATION
// ============================================================
const EC_SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co';
const EC_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo';
const EC_RAZORPAY_KEY = 'rzp_live_T69SbFfk53qNmY';
const EC_SITE_URL = 'https://HetanshTechnologie.github.io';

// ============================================================
// SUPABASE CLIENT
// ============================================================
// Clean up empty hash from OAuth redirects (prevents Supabase hanging)
if (window.location.hash === '#') {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}
const ec = supabase.createClient(EC_SUPABASE_URL, EC_SUPABASE_KEY);

// Global state
let ecCurrentUser = null;

// ============================================================
// AUTH
// ============================================================

async function ecCheckAuth() {
  try {
    const { data, error } = await ec.auth.getUser();
    if (data && data.user) {
      ecCurrentUser = data.user;
    } else {
      ecCurrentUser = null;
    }
  } catch (e) {
    ecCurrentUser = null;
  }
  return ecCurrentUser;
}

async function ecLogin(email, password) {
  const { data, error } = await ec.auth.signInWithPassword({ email, password });
  if (error) throw error;
  ecCurrentUser = data.user;
  if (window.sitengSetUser) window.sitengSetUser(data.user?.email, data.user?.id);
  return data.user;
}

async function ecSignup(email, password) {
  const { data, error } = await ec.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function ecLogout() {
  const { error } = await ec.auth.signOut();
  if (error) throw error;
  ecCurrentUser = null;
  if (window.sitengSetUser) window.sitengSetUser(null);
}

async function ecSocialLogin(provider) {
  const { data, error } = await ec.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + window.location.pathname + window.location.search }
  });
  if (error) throw error;
  return data;
}

function ecRequireAuth() {
  if (!ecCurrentUser) {
    window.location.href = 'index.html';
    return null;
  }
  return ecCurrentUser;
}

// ============================================================
// HELPERS
// ============================================================

function ecEscape(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(s));
  return div.innerHTML;
}

function ecShowAlert(msg, type) {
  const el = document.getElementById('alert');
  if (!el) return;
  const cls = type === 'error' ? 'bg-red-100 text-red-700 border-red-300'
    : type === 'success' ? 'bg-green-100 text-green-700 border-green-300'
    : 'bg-blue-100 text-blue-700 border-blue-300';
  el.innerHTML = `<div class="border px-4 py-3 rounded ${cls}">${ecEscape(msg)}</div>`;
  el.style.display = 'block';
}

function ecMoney(n) {
  const num = parseFloat(n) || 0;
  return '\u20B9' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ecNumberToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };
  const parts = num.toString().split('.');
  let result = convert(parseInt(parts[0]));
  if (parts.length > 1 && parseInt(parts[1]) > 0) {
    result += ' and ' + convert(parseInt(parts[1])) + ' Paise';
  }
  return result + ' Only';
}

// ============================================================
// CATEGORIES
// ============================================================

async function ecLoadCategories() {
  const { data, error } = await ec
    .from('ec_categories')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

function ecCategoryTree(cats, parentId, depth) {
  if (depth === undefined) depth = 0;
  const children = cats.filter(c => (c.parent_id || null) === (parentId || null));
  if (!children.length) return '';
  let html = '<ul' + (depth === 0 ? ' class="category-root"' : '') + '>';
  for (const c of children) {
    const sub = ecCategoryTree(cats, c.id, depth + 1);
    html += '<li>';
    html += `<a href="products.html?category_id=${c.id}">${ecEscape(c.name)}</a>`;
    if (sub) html += sub;
    html += '</li>';
  }
  html += '</ul>';
  return html;
}

// ============================================================
// PRODUCTS
// ============================================================

async function ecLoadProducts(page, filters) {
  page = page || 1;
  filters = filters || {};
  const perPage = 12;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = ec
    .from('ec_products')
    .select('*, ec_vendors!inner(store_name)', { count: 'exact' })
    .eq('is_active', true)
    .eq('is_approved', true);

  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters.search) {
    const term = String(filters.search).replace(/\*/g, '');
    query = query.or(`name.ilike.*${term}*,slug.ilike.*${term}*,tutorial_slug.ilike.*${term}*`);
  }
  if (filters.min_price) {
    query = query.gte('price', parseFloat(filters.min_price));
  }
  if (filters.max_price) {
    query = query.lte('price', parseFloat(filters.max_price));
  }

  let sortField = 'display_order';
  let sortOrder = { ascending: true };
  if (filters.sort === 'price_asc') {
    sortField = 'price';
    sortOrder = { ascending: true };
  } else if (filters.sort === 'price_desc') {
    sortField = 'price';
    sortOrder = { ascending: false };
  } else if (filters.sort === 'name') {
    sortField = 'name';
    sortOrder = { ascending: true };
  } else if (filters.sort === 'newest') {
    sortField = 'created_at';
    sortOrder = { ascending: false };
  } else if (filters.sort === 'featured') {
    sortField = 'display_order';
    sortOrder = { ascending: true };
  }

  query = query.order(sortField, sortOrder).range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

const EC_BOOK_PLACEHOLDER = '../images/book-cover.svg';

function ecRenderProductCard(p) {
  const defaultImg = p.tutorial_slug ? EC_BOOK_PLACEHOLDER : 'https://placehold.co/300x300?text=No+Image';
  const img = p.images && p.images.length > 0
    ? p.images[0]
    : defaultImg;
  const price = ecMoney(p.price);
  const compare = p.compare_at_price ? ecMoney(p.compare_at_price) : null;
  const hasDiscount = compare && parseFloat(p.compare_at_price) > parseFloat(p.price);
  const discountPct = hasDiscount
    ? Math.round((1 - parseFloat(p.price) / parseFloat(p.compare_at_price)) * 100)
    : 0;
  const store = p.ec_vendors ? p.ec_vendors.store_name : '';
  const stars = p.average_rating
    ? '<span class="text-yellow-500">' + '\u2605'.repeat(Math.round(p.average_rating)) + '</span>'
    : '';
  const reviewText = p.review_count ? `(${p.review_count})` : '';
  const isTutorial = !!p.tutorial_slug;
  const FREE_SLUGS = ['html-tutorial','css-tutorial','nodejs-tutorial','pwa-tutorial','react-tutorial','android-tutorial','dotnetcore-tutorial','c-tutorial','python-tutorial','ios-tutorial','fastapi-tutorial','playwright-tutorial','angular-tutorial','voip-project-delivery','senior-product-owner','terraform-tutorial'];
  const isFree = FREE_SLUGS.indexOf(p.slug) !== -1;
  const tutorialUrl = isTutorial ? '../tutorials/' + p.tutorial_slug + '/' : '';
  let extraBtn = '';
  if (isTutorial && isFree) {
    extraBtn = `<a href="${tutorialUrl}" class="mt-2 block text-center bg-green-600 text-white text-xs py-1.5 rounded hover:bg-green-700 transition font-medium">Start Reading &rarr;</a>`;
  } else if (isTutorial) {
    extraBtn = `<a href="${tutorialUrl}" class="mt-2 block text-center bg-gray-100 text-gray-700 text-xs py-1.5 rounded hover:bg-gray-200 transition font-medium border border-gray-300">Read First 5 Chapters</a>`;
  }

  return `
    <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition flex flex-col">
      <a href="product.html?id=${p.id}" class="block">
        <img src="${ecEscape(img)}" alt="${ecEscape(p.name)}" class="w-full h-48 object-cover"
          onerror="this.src='https://placehold.co/300x300?text=No+Image'">
      </a>
      <div class="p-4 flex flex-col flex-1">
        ${store ? `<p class="text-xs text-gray-500 mb-1">${ecEscape(store)}</p>` : ''}
        <a href="product.html?id=${p.id}" class="text-sm font-semibold text-gray-800 hover:text-blue-600 mb-1 line-clamp-2">${ecEscape(p.name)}</a>
        ${p.brand ? `<p class="text-xs text-gray-400 mb-1">${ecEscape(p.brand)}</p>` : ''}
        <div class="flex items-center gap-1 mb-2">
          ${stars}
          <span class="text-xs text-gray-500">${reviewText}</span>
        </div>
        <div class="mt-auto">
          <div class="flex items-center gap-2">
            ${isTutorial && isFree ? '<span class="text-lg font-bold text-green-600">FREE</span>' : `<span class="text-lg font-bold text-gray-900">${price}</span>`}
            ${hasDiscount ? `<span class="text-sm text-gray-400 line-through">${compare}</span>` : ''}
          </div>
          ${isTutorial && isFree ? '' : `<div class="flex items-center gap-2 mt-1">${hasDiscount ? `<span class="text-xs text-green-600 font-medium">${discountPct}% off</span>` : ''}<span class="inline-block text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">GST ${p.gst_rate || 18}%</span></div>`}
          ${extraBtn}
        </div>
      </div>
    </div>`;
}

async function ecGetProduct(id) {
  const { data, error } = await ec
    .from('ec_products')
    .select('*, ec_vendors(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function ecRelatedProducts(categoryId, excludeId, limit) {
  limit = limit || 4;
  const { data, error } = await ec
    .from('ec_products')
    .select('*, ec_vendors(store_name)')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .eq('is_approved', true)
    .neq('id', excludeId)
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ============================================================
// CART
// ============================================================

async function ecAddToCart(productId, quantity) {
  quantity = quantity || 1;
  const user = ecCurrentUser || await ecCheckAuth();
  if (!user) throw new Error('Please login to add items to cart');
  const { data, error } = await ec
    .from('ec_cart')
    .upsert({ user_id: user.id, product_id: productId, quantity }, { onConflict: 'user_id, product_id' });
  if (error) throw error;
  return data;
}

async function ecRemoveFromCart(productId) {
  const user = ecCurrentUser || await ecCheckAuth();
  if (!user) return;
  const { error } = await ec
    .from('ec_cart')
    .delete()
    .eq('user_id', user.id)
    .eq('product_id', productId);
  if (error) throw error;
}

async function ecUpdateCartQty(productId, quantity) {
  const user = ecCurrentUser || await ecCheckAuth();
  if (!user) return;
  if (quantity < 1) {
    return ecRemoveFromCart(productId);
  }
  const { error } = await ec
    .from('ec_cart')
    .update({ quantity })
    .eq('user_id', user.id)
    .eq('product_id', productId);
  if (error) throw error;
}

async function ecLoadCart() {
  const user = ecCurrentUser || await ecCheckAuth();
  if (!user) return [];
  const { data, error } = await ec
    .from('ec_cart')
    .select('*, ec_products(*)')
    .eq('user_id', user.id);
  if (error) throw error;
  return data || [];
}

async function ecCartCount() {
  const items = await ecLoadCart();
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

async function ecRenderCartSidebar() {
  const el = document.getElementById('cart-sidebar');
  if (!el) return;
  try {
    const items = await ecLoadCart();
    if (!items.length) {
      el.innerHTML = '<div class="p-4 text-center text-gray-500">Your cart is empty</div>';
      return;
    }
    let html = '';
    let total = 0;
    for (const item of items) {
      const p = item.ec_products;
      if (!p) continue;
      const cartDefImg = p.tutorial_slug ? EC_BOOK_PLACEHOLDER : 'https://placehold.co/60x60?text=N';
      const img = p.images && p.images.length > 0 ? p.images[0] : cartDefImg;
      const subtotal = parseFloat(p.price) * item.quantity;
      total += subtotal;
      html += `
        <div class="flex items-center gap-3 p-3 border-b" data-product-id="${p.id}">
          <img src="${ecEscape(img)}" alt="" class="w-14 h-14 object-cover rounded" onerror="this.src='https://placehold.co/60x60?text=N'">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">${ecEscape(p.name)}</p>
            <p class="text-xs text-gray-500">${ecMoney(p.price)} x ${item.quantity}</p>
            <div class="flex items-center gap-1 mt-1">
              <button onclick="ecUpdateCartQty(${p.id}, ${item.quantity - 1}); ecRenderCartSidebar();" class="text-xs bg-gray-200 px-1.5 py-0.5 rounded hover:bg-gray-300">-</button>
              <span class="text-xs px-2">${item.quantity}</span>
              <button onclick="ecUpdateCartQty(${p.id}, ${item.quantity + 1}); ecRenderCartSidebar();" class="text-xs bg-gray-200 px-1.5 py-0.5 rounded hover:bg-gray-300">+</button>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold">${ecMoney(subtotal)}</p>
            <button onclick="ecRemoveFromCart(${p.id}); ecRenderCartSidebar();" class="text-xs text-red-500 hover:text-red-700 mt-1">Remove</button>
          </div>
        </div>`;
    }
    html += `
      <div class="p-3 border-t">
        <div class="flex justify-between font-bold text-lg mb-3">
          <span>Total</span>
          <span>${ecMoney(total)}</span>
        </div>
        <a href="checkout.html" class="block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">Checkout</a>
      </div>`;
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = '<div class="p-4 text-center text-red-500">Error loading cart</div>';
  }
}

// ============================================================
// ADDRESSES
// ============================================================

async function ecLoadAddresses() {
  const user = ecCurrentUser || await ecCheckAuth();
  if (!user) return [];
  const { data, error } = await ec
    .from('ec_addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function ecSaveAddress(data, id) {
  const user = ecCurrentUser || await ecCheckAuth();
  if (!user) throw new Error('Please login');
  const payload = { ...data, user_id: user.id };
  if (id) {
    const { error } = await ec
      .from('ec_addresses')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
  } else {
    const { error } = await ec
      .from('ec_addresses')
      .insert(payload);
    if (error) throw error;
  }
}

async function ecDeleteAddress(id) {
  const user = ecCurrentUser || await ecCheckAuth();
  if (!user) return;
  const { error } = await ec
    .from('ec_addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
}

// ============================================================
// ORDERS
// ============================================================

async function ecCreateOrder(addressId, razorpayPaymentId) {
  const user = ecCurrentUser || await ecCheckAuth();
  if (!user) throw new Error('Please login');

  // Load cart items with product data
  const cartItems = await ecLoadCart();
  if (!cartItems.length) throw new Error('Cart is empty');

  // Compute order values
  let subtotal = 0;
  let totalGst = 0;
  const orderItems = [];
  for (const ci of cartItems) {
    const p = ci.ec_products;
    if (!p) continue;
    const qty = ci.quantity;
    const unitPrice = parseFloat(p.price);
    const gstRate = parseFloat(p.gst_rate || 18);
    const lineTotal = unitPrice * qty;
    const gstAmount = lineTotal * gstRate / 100;
    subtotal += lineTotal;
    totalGst += gstAmount;
    orderItems.push({
      product_id: p.id,
      vendor_id: p.vendor_id,
      product_name: p.name,
      product_sku: p.sku,
      quantity: qty,
      unit_price: unitPrice,
      gst_rate: gstRate,
      gst_amount: gstAmount,
      total_price: lineTotal + gstAmount
    });
  }

  const shippingCharge = subtotal >= 500 ? 0 : 40;
  const total = subtotal + totalGst + shippingCharge;
  const orderNumber = 'ORD-' + Date.now();
  const now = new Date().toISOString();

  // Insert order
  const { data: order, error: orderError } = await ec
    .from('ec_orders')
    .insert({
      order_number: orderNumber,
      user_id: user.id,
      address_id: addressId,
      subtotal: subtotal,
      gst_amount: totalGst,
      shipping_charge: shippingCharge,
      discount: 0,
      total: total,
      payment_method: 'razorpay',
      payment_status: razorpayPaymentId ? 'paid' : 'pending',
      order_status: 'confirmed',
      razorpay_payment_id: razorpayPaymentId || null,
      created_at: now,
      updated_at: now
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Insert order items
  const orderItemsPayload = orderItems.map(oi => ({
    ...oi,
    order_id: order.id,
    created_at: now
  }));
  const { error: itemsError } = await ec
    .from('ec_order_items')
    .insert(orderItemsPayload);
  if (itemsError) throw itemsError;

  // Clear cart
  const { error: cartClearError } = await ec
    .from('ec_cart')
    .delete()
    .eq('user_id', user.id);
  if (cartClearError) throw cartClearError;

  return order;
}

async function ecLoadOrders() {
  const user = ecCurrentUser || await ecCheckAuth();
  if (!user) return [];
  const { data, error } = await ec
    .from('ec_orders')
    .select('*, ec_order_items(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function ecGetOrder(orderId) {
  const { data, error } = await ec
    .from('ec_orders')
    .select('*, ec_order_items(*)')
    .eq('id', orderId)
    .single();
  if (error) throw error;
  return data;
}

function ecGenerateInvoice(order) {
  if (!order) return '';
  const items = order.ec_order_items || [];

  // Company details
  const company = {
    name: 'Hetansh Technologie',
    address: 'Hetansh Technologie Pvt. Ltd., Pune, Maharashtra, India',
    gstin: 'GSTIN-27AAAAA0000A1Z5',
    email: 'support@hetanshtechnologie.github.io'
  };

  // Buyer details from address
  const addr = order.ec_addresses || {};
  const buyerName = addr.full_name || 'Customer';
  const buyerAddress = [addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');

  // Build line items rows
  let itemsHtml = '';
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalGst = 0;

  for (const item of items) {
    const qty = item.quantity;
    const unitPrice = parseFloat(item.unit_price);
    const taxable = qty * unitPrice;
    const gstRate = parseFloat(item.gst_rate || 18);
    const gstAmt = taxable * gstRate / 100;
    const cgst = gstAmt / 2;
    const sgst = gstAmt / 2;
    const totalAmt = taxable + gstAmt;
    const hsn = item.product_sku || (1000 + item.product_id).toString();

    totalTaxable += taxable;
    totalCgst += cgst;
    totalSgst += sgst;
    totalGst += gstAmt;

    itemsHtml += `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${hsn}</td>
        <td style="padding:8px;border:1px solid #ddd;">${ecEscape(item.product_name)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${qty}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${ecMoney(unitPrice)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${ecMoney(taxable)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${gstRate}%</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${ecMoney(cgst)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${ecMoney(sgst)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${ecMoney(totalAmt)}</td>
      </tr>`;
  }

  const grandTotal = parseFloat(order.total || 0);
  const shipping = parseFloat(order.shipping_charge || 0);
  const discount = parseFloat(order.discount || 0);

  return `
    <div style="max-width:800px;margin:0 auto;padding:20px;font-family:Arial,sans-serif;">
      <div style="text-align:center;margin-bottom:30px;">
        <h1 style="margin:0;font-size:24px;">TAX INVOICE</h1>
        <h2 style="margin:5px 0;font-size:18px;color:#333;">${ecEscape(company.name)}</h2>
        <p style="margin:2px 0;font-size:13px;color:#666;">${ecEscape(company.address)}</p>
        <p style="margin:2px 0;font-size:13px;color:#666;">GSTIN: ${company.gstin} | Email: ${company.email}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="width:50%;vertical-align:top;padding:10px;border:1px solid #ddd;">
            <strong>Invoice To:</strong><br>
            ${ecEscape(buyerName)}<br>
            ${ecEscape(buyerAddress)}
          </td>
          <td style="width:50%;vertical-align:top;padding:10px;border:1px solid #ddd;">
            <strong>Invoice Details:</strong><br>
            Invoice No: ${order.invoice_number || order.order_number}<br>
            Order No: ${ecEscape(order.order_number)}<br>
            Date: ${new Date(order.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}<br>
          </td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:8px;border:1px solid #ddd;text-align:center;">HSN</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Description</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center;">Qty</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Rate</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Taxable</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center;">GST%</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">CGST</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">SGST</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;">Totals</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${ecMoney(totalTaxable)}</td>
            <td style="padding:8px;border:1px solid #ddd;"></td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${ecMoney(totalCgst)}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${ecMoney(totalSgst)}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${ecMoney(totalTaxable + totalGst)}</td>
          </tr>
        </tfoot>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;width:70%;">Subtotal</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;width:30%;">${ecMoney(parseFloat(order.subtotal || 0))}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">GST Amount</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${ecMoney(totalGst)}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">Shipping</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${shipping > 0 ? ecMoney(shipping) : 'FREE'}</td>
        </tr>
        ${discount > 0 ? `<tr><td style="padding:8px;border:1px solid #ddd;text-align:right;">Discount</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">-${ecMoney(discount)}</td></tr>` : ''}
        <tr style="font-weight:bold;font-size:16px;">
          <td style="padding:10px;border:1px solid #ddd;text-align:right;">Grand Total</td>
          <td style="padding:10px;border:1px solid #ddd;text-align:right;">${ecMoney(grandTotal)}</td>
        </tr>
      </table>

      <p style="font-size:13px;color:#555;margin-top:10px;">
        <strong>Amount in Words:</strong> ${ecNumberToWords(grandTotal)}
      </p>

      <p style="font-size:12px;color:#888;margin-top:30px;border-top:1px solid #ddd;padding-top:10px;text-align:center;">
        This is a computer-generated invoice. No signature required.<br>
        Subject to Pune jurisdiction.
      </p>
    </div>`;
}

// ============================================================
// REVIEWS
// ============================================================

async function ecLoadReviews(productId) {
  const { data, error } = await ec
    .from('ec_reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function ecSaveReview(productId, rating, title, comment) {
  const user = ecCurrentUser || await ecCheckAuth();
  if (!user) throw new Error('Please login');
  const userEmail = user.email || '';
  const { data, error } = await ec
    .from('ec_reviews')
    .upsert({
      product_id: productId,
      user_id: user.id,
      user_email: userEmail,
      rating,
      title,
      comment,
      is_approved: false
    }, { onConflict: 'product_id, user_id' });
  if (error) throw error;
  return data;
}

async function ecCanReview(productId) {
  const user = ecCurrentUser || await ecCheckAuth();
  if (!user) return false;
  const { data, error } = await ec
    .from('ec_order_items')
    .select('order_id', { count: 'exact', head: true })
    .eq('product_id', productId)
    .eq('status', 'delivered')
    .in('order_id', (await ec
      .from('ec_orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('order_status', 'delivered')
    ).data?.map(o => o.id) || []);
  if (error) return false;
  // Fallback: check via orders directly
  const { data: orders, error: ordErr } = await ec
    .from('ec_orders')
    .select('id')
    .eq('user_id', user.id)
    .eq('order_status', 'delivered');
  if (ordErr || !orders || !orders.length) return false;
  const orderIds = orders.map(o => o.id);
  const { count, error: itemErr } = await ec
    .from('ec_order_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
    .in('order_id', orderIds);
  if (itemErr) return false;
  return (count || 0) > 0;
}

// ============================================================
// NEWSLETTER
// ============================================================

async function ecSubscribeNewsletter(email) {
  const { data, error } = await ec
    .from('ec_newsletter')
    .insert({ email });
  if (error) throw error;
  return data;
}

// ============================================================
// SHIPPING (DUMMY)
// ============================================================

async function ecCreateShipment(orderId) {
  const trackingNumber = 'SHIP-' + orderId + '-' + Date.now();
  const { error } = await ec
    .from('ec_orders')
    .update({
      shipping_courier: 'FedEx',
      shipping_tracking_number: trackingNumber,
      shipping_url: `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`,
      order_status: 'shipped',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);
  if (error) throw error;
  return { trackingNumber, courier: 'FedEx', url: `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}` };
}

// ============================================================
// EXPORT TO WINDOW SCOPE
// ============================================================

window.ec = ec;
window.ecCurrentUser = ecCurrentUser;
window.EC_RAZORPAY_KEY = EC_RAZORPAY_KEY;
window.EC_SITE_URL = EC_SITE_URL;

window.ecCheckAuth = ecCheckAuth;
window.ecLogin = ecLogin;
window.ecSignup = ecSignup;
window.ecLogout = ecLogout;
window.ecSocialLogin = ecSocialLogin;
window.ecRequireAuth = ecRequireAuth;

window.ecEscape = ecEscape;
window.ecShowAlert = ecShowAlert;
window.ecMoney = ecMoney;

window.ecLoadCategories = ecLoadCategories;
window.ecCategoryTree = ecCategoryTree;

window.ecLoadProducts = ecLoadProducts;
window.ecRenderProductCard = ecRenderProductCard;
window.ecGetProduct = ecGetProduct;
window.ecRelatedProducts = ecRelatedProducts;

window.ecAddToCart = ecAddToCart;
window.ecRemoveFromCart = ecRemoveFromCart;
window.ecUpdateCartQty = ecUpdateCartQty;
window.ecLoadCart = ecLoadCart;
window.ecCartCount = ecCartCount;
window.ecRenderCartSidebar = ecRenderCartSidebar;

window.ecLoadAddresses = ecLoadAddresses;
window.ecSaveAddress = ecSaveAddress;
window.ecDeleteAddress = ecDeleteAddress;

window.ecCreateOrder = ecCreateOrder;
window.ecLoadOrders = ecLoadOrders;
window.ecGetOrder = ecGetOrder;
window.ecGenerateInvoice = ecGenerateInvoice;

window.ecLoadReviews = ecLoadReviews;
window.ecSaveReview = ecSaveReview;
window.ecCanReview = ecCanReview;

window.ecSubscribeNewsletter = ecSubscribeNewsletter;

window.ecCreateShipment = ecCreateShipment;
