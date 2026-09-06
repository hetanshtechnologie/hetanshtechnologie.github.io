/* ============================================================================
   BillEase v2 - Products, Menu, Ingredients & Recipes module
   Catalogue with stock, HSN/SAC codes, menu availability, raw ingredients
   and dish recipes (ingredient bill of materials).
   ========================================================================== */

let productTab = 'menu';

// ---------- Tabs ----------
function setProductTab(tab) {
  productTab = tab;
  document.querySelectorAll('#prod-seg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const productsView = document.getElementById('products-view');
  const recipesView = document.getElementById('recipes-view');
  productsView.classList.toggle('hidden', tab === 'recipes');
  recipesView.classList.toggle('hidden', tab !== 'recipes');
  if (tab === 'recipes') renderRecipes();
  else renderProducts();
}

// ---------- List ----------
function renderProducts() {
  const q = (document.getElementById('prod-search').value || '').toLowerCase();
  let list = products.filter(p => !q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));

  if (productTab === 'menu') {
    list = list.filter(p => !p.is_ingredient);
  } else if (productTab === 'inventory') {
    list = list.filter(p => !p.is_service);
  } else if (productTab === 'ingredients') {
    list = list.filter(p => p.is_ingredient);
  }

  list.sort((a, b) => a.name.localeCompare(b.name));

  document.getElementById('products-body').innerHTML = list.map(p => {
    const low = !p.is_service && p.low_stock_at > 0 && p.stock <= p.low_stock_at;
    const stockCell = p.is_service
      ? '<span style="color:var(--muted)">Service</span>'
      : '<span class="' + (low ? 'stock-low' : 'stock-ok') + '">' + Number(p.stock) + ' ' + escHtml(p.unit) + (low ? ' (low)' : '') + '</span>';
    const statusCell = p.is_ingredient
      ? '<span class="badge badge-draft">Ingredient</span>'
      : (p.available
          ? '<span class="badge badge-paid">Available</span>'
          : '<span class="badge badge-cancelled">Sold Out</span>');
    const menuActions = productTab === 'menu'
      ? '<button class="btn btn-xs btn-secondary" onclick="toggleAvailable(\'' + p.id + '\')">' + (p.available ? 'Sold Out' : 'Make Available') + '</button>'
      : '';
    return '<tr>' +
      '<td><b>' + escHtml(p.name) + '</b>' + (p.is_ingredient ? ' <span class="loyalty-chip">raw</span>' : '') + '</td>' +
      '<td>' + escHtml(p.sku || '&mdash;') + '</td>' +
      '<td>' + escHtml(p.category || '&mdash;') + '</td>' +
      '<td>' + escHtml(p.hsn || '&mdash;') + '</td>' +
      '<td>' + fmtMoney(p.selling_price) + '</td>' +
      '<td>' + Number(p.gst_rate) + '%</td>' +
      '<td>' + stockCell + '</td>' +
      '<td>' + statusCell + '</td>' +
      '<td class="actions">' + menuActions +
        '<button class="btn btn-xs btn-secondary" onclick="editProduct(\'' + p.id + '\')">Edit</button>' +
        (!p.is_ingredient ? '<button class="btn btn-xs btn-secondary" onclick="showRecipeModal(\'' + p.id + '\')">Recipe</button>' : '') +
        '<button class="btn btn-xs btn-danger" onclick="deleteProduct(\'' + p.id + '\')">Delete</button>' +
      '</td></tr>';
  }).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:30px;">No products found. Add a product to get started.</td></tr>';
}

async function toggleAvailable(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const { error } = await sb.from('be_products').update({ available: !p.available }).eq('id', id);
  if (error) return showToast('Update failed: ' + error.message, 'error');
  p.available = !p.available;
  renderProducts();
  renderPOS();
}

// ---------- Product modal ----------
function resetProductForm() {
  document.getElementById('product-id').value = '';
  document.getElementById('product-name').value = '';
  document.getElementById('product-sku').value = '';
  document.getElementById('product-category').value = '';
  document.getElementById('product-hsn').value = '';
  document.getElementById('product-unit').value = 'pcs';
  document.getElementById('product-purchase').value = 0;
  document.getElementById('product-price').value = 0;
  document.getElementById('product-gst').value = currentBusiness && currentBusiness.gst_enabled === false ? 0 : 18;
  document.getElementById('product-stock').value = 0;
  document.getElementById('product-lowstock').value = 0;
  document.getElementById('product-sort').value = 0;
  document.getElementById('product-service').checked = false;
  document.getElementById('product-ingredient').checked = false;
  document.getElementById('product-available').checked = true;
}

function showProductModal() {
  resetProductForm();
  document.getElementById('product-modal-title').textContent = 'Add Product';
  openModal('product-modal');
}

function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('product-id').value = p.id;
  document.getElementById('product-name').value = p.name;
  document.getElementById('product-sku').value = p.sku || '';
  document.getElementById('product-category').value = p.category || '';
  document.getElementById('product-hsn').value = p.hsn || '';
  document.getElementById('product-unit').value = p.unit;
  document.getElementById('product-purchase').value = p.purchase_price;
  document.getElementById('product-price').value = p.selling_price;
  document.getElementById('product-gst').value = p.gst_rate;
  document.getElementById('product-stock').value = p.stock;
  document.getElementById('product-lowstock').value = p.low_stock_at;
  document.getElementById('product-sort').value = p.sort_order || 0;
  document.getElementById('product-service').checked = !!p.is_service;
  document.getElementById('product-ingredient').checked = !!p.is_ingredient;
  document.getElementById('product-available').checked = p.available !== false;
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  openModal('product-modal');
}

async function saveProduct() {
  const name = document.getElementById('product-name').value.trim();
  if (!name) return showToast('Enter a product name', 'error');
  const id = document.getElementById('product-id').value;
  const payload = {
    name,
    sku: document.getElementById('product-sku').value.trim(),
    category: document.getElementById('product-category').value.trim(),
    hsn: document.getElementById('product-hsn').value.trim(),
    unit: document.getElementById('product-unit').value,
    purchase_price: Number(document.getElementById('product-purchase').value || 0),
    selling_price: Number(document.getElementById('product-price').value || 0),
    gst_rate: Number(document.getElementById('product-gst').value || 0),
    stock: Number(document.getElementById('product-stock').value || 0),
    low_stock_at: Number(document.getElementById('product-lowstock').value || 0),
    sort_order: Number(document.getElementById('product-sort').value || 0),
    is_service: document.getElementById('product-service').checked,
    is_ingredient: document.getElementById('product-ingredient').checked,
    available: document.getElementById('product-available').checked
  };

  if (id) {
    const { error } = await sb.from('be_products').update(payload).eq('id', id);
    if (error) return showToast('Update failed: ' + error.message, 'error');
    Object.assign(products.find(p => p.id === id), payload);
    showToast('Product updated');
  } else {
    const { data, error } = await sb.from('be_products')
      .insert([{ ...payload, business_id: currentBusiness.id }]).select().single();
    if (error) return showToast('Save failed: ' + error.message, 'error');
    products.push(data);
    showToast('Product added');
  }
  closeModal('product-modal');
  renderProducts();
  renderPOS();
}

async function deleteProduct(id) {
  const p = products.find(x => x.id === id);
  if (!confirm('Delete "' + p.name + '"? Its recipe links will also be removed.')) return;
  await sb.from('be_recipe_items').delete().eq('product_id', id);
  await sb.from('be_recipe_items').delete().eq('ingredient_id', id);
  const { error } = await sb.from('be_products').delete().eq('id', id);
  if (error) return showToast('Delete failed: ' + error.message, 'error');
  products = products.filter(x => x.id !== id);
  showToast('Product deleted');
  renderProducts();
  renderPOS();
}

// ---------- Recipes ----------
function ingredientCost(productId) {
  return recipes
    .filter(r => r.product_id === productId)
    .reduce((s, r) => {
      const ing = products.find(p => p.id === r.ingredient_id);
      return s + (ing ? Number(ing.purchase_price || 0) * Number(r.qty || 0) : 0);
    }, 0);
}

function renderRecipes() {
  const dishes = products.filter(p => !p.is_ingredient && !p.is_service);
  document.getElementById('recipes-body').innerHTML = dishes.map(p => {
    const recipeItems = recipes.filter(r => r.product_id === p.id);
    const parts = recipeItems.map(r => {
      const ing = products.find(x => x.id === r.ingredient_id);
      return Number(r.qty) + ' ' + (ing ? escHtml(ing.unit) : '') + ' ' + (ing ? escHtml(ing.name) : '?');
    });
    const cost = ingredientCost(p.id);
    const margin = p.selling_price > 0 ? round2(((p.selling_price - cost) / p.selling_price) * 100) : 0;
    return '<tr>' +
      '<td><b>' + escHtml(p.name) + '</b></td>' +
      '<td>' + (parts.length ? parts.join(', ') : '<span style="color:var(--muted)">No recipe set</span>') + '</td>' +
      '<td>' + fmtMoney(cost) + '</td>' +
      '<td>' + fmtMoney(p.selling_price) + ' <span style="color:var(--muted);font-size:11px;">(' + margin + '% margin)</span></td>' +
      '<td class="actions">' +
        '<button class="btn btn-xs btn-secondary" onclick="showRecipeModal(\'' + p.id + '\')">' + (parts.length ? 'Edit Recipe' : 'Add Recipe') + '</button>' +
      '</td></tr>';
  }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:30px;">No menu dishes yet. Add products first.</td></tr>';
}

function showRecipeModal(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;
  document.getElementById('recipe-product-id').value = p.id;
  document.getElementById('recipe-product-label').textContent = p.name;
  const body = document.getElementById('recipe-items-body');
  body.innerHTML = '';
  const existing = recipes.filter(r => r.product_id === productId);
  if (!existing.length) addRecipeRow();
  existing.forEach(r => addRecipeRow(r.ingredient_id, r.qty));
  openModal('recipe-modal');
}

function addRecipeRow(ingredientId, qty) {
  const tbody = document.getElementById('recipe-items-body');
  const tr = document.createElement('tr');
  const opts = products.filter(p => p.is_ingredient).map(p =>
    '<option value="' + p.id + '"' + (p.id === ingredientId ? ' selected' : '') + '>' + escHtml(p.name) + ' (' + escHtml(p.unit) + ')</option>'
  ).join('');
  tr.innerHTML =
    '<td><select class="rr-ing">' + opts + '</select></td>' +
    '<td><input type="number" class="rr-qty" step="0.0001" min="0" value="' + Number(qty || 1) + '"></td>' +
    '<td><button class="btn btn-xs btn-danger" onclick="this.closest(\'tr\').remove()">&#10005;</button></td>';
  tbody.appendChild(tr);
}

async function saveRecipe() {
  const productId = document.getElementById('recipe-product-id').value;
  const rows = [...document.querySelectorAll('#recipe-items-body tr')];
  const payload = rows.map(tr => ({
    business_id: currentBusiness.id,
    product_id: productId,
    ingredient_id: tr.querySelector('.rr-ing').value,
    qty: Number(tr.querySelector('.rr-qty').value || 0)
  })).filter(r => r.ingredient_id && r.qty > 0);

  await sb.from('be_recipe_items').delete().eq('product_id', productId);
  if (payload.length) {
    const { error } = await sb.from('be_recipe_items').insert(payload);
    if (error) return showToast('Save failed: ' + error.message, 'error');
  }
  showToast('Recipe saved');
  closeModal('recipe-modal');
  await loadAllData();
  setProductTab('recipes');
}

// ---------- Filters ----------
document.getElementById('prod-search').addEventListener('input', renderProducts);
