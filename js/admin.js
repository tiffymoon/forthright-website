// ════════════════════════════════════════════
// FORTHRIGHT EVENTS — Admin JS
// ════════════════════════════════════════════

let editingId       = null;
let editingClientId = null;
let sortColumn = 'event_date';
let sortAsc = false;

// ── Auth ──────────────────────────────────
async function loadClientOptions() {
  const select = document.getElementById('f-client_id');
  if (!select) return;
  const { data } = await db.from('clients').select('id, name').order('name');
  if (!data) return;
  select.innerHTML = '<option value="">— No client —</option>' +
    data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

async function checkSession() {
  const { data: { session } } = await db.auth.getSession();
  if (session) { showApp(); loadEvents(); loadClients(); }
  else { showLogin(); }
}

function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}
function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
}

async function login() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');
  errEl.textContent = '';
  btn.disabled = true; btn.textContent = 'Signing in…';
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    errEl.textContent = error.message;
    btn.disabled = false; btn.textContent = 'Sign In';
  } else {
    showApp(); loadEvents(); loadClients();
  }
}

async function logout() {
  await db.auth.signOut();
  showLogin();
}


function switchTab(tab, el) {
  document.getElementById('tab-events').style.display  = tab === 'events'  ? 'block' : 'none';
  document.getElementById('tab-clients').style.display = tab === 'clients' ? 'block' : 'none';
  document.querySelectorAll('.admin-nav-right a').forEach(a => a.style.color = '');
  el.style.color = 'var(--amber)';
}
// ── Events ────────────────────────────────
async function loadEvents() {
  const tbody = document.getElementById('events-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Loading…</td></tr>';

  let query = db.from('events').select('*, clients(name)');

  if (sortColumn === 'clients') {
    query = query.order('client_id', { ascending: sortAsc, nullsFirst: false });
  } else {
    query = query.order(sortColumn, { ascending: sortAsc });
  }

  const { data, error } = await query;
  if (error) { tbody.innerHTML = `<tr><td colspan="6" class="loading-cell">Error: ${error.message}</td></tr>`; return; }
  if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No events yet. Add one above.</td></tr>'; return; }

  // Sort by client name client-side since it's a joined field
  let sorted = [...data];
  if (sortColumn === 'clients') {
    sorted.sort((a, b) => {
      const nameA = a.clients ? a.clients.name : '';
      const nameB = b.clients ? b.clients.name : '';
      return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
  }

  // Update sort icons
  document.querySelectorAll('.sort-icon').forEach(el => el.textContent = '↕');
  const activeIcon = document.getElementById(`sort-${sortColumn}`);
  if (activeIcon) activeIcon.textContent = sortAsc ? '↑' : '↓';

  tbody.innerHTML = sorted.map(e => {
    const d = new Date(e.event_date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const status = e.event_date >= new Date().toISOString().split('T')[0] ? 'upcoming' : 'completed';
    return `<tr>
      <td><strong>${e.title}</strong></td>
      <td>${e.clients ? e.clients.name : '—'}</td>
      <td>${e.category || '—'}</td>
      <td>${d}</td>
      <td><span class="status-badge status-${status}">${status}</span></td>
      <td class="actions-cell">
        <button class="btn-edit" onclick="editEvent('${e.id}')">Edit</button>
        <button class="btn-dupe" onclick="duplicateEvent('${e.id}')">Copy</button>
        <button class="btn-del" onclick="deleteEvent('${e.id}', '${e.title.replace(/'/g,"\\'")}')">Delete</button>
      </td>
    </tr>`;
  }).join('');
}
function sortEvents(column) {
  if (sortColumn === column) {
    sortAsc = !sortAsc;
  } else {
    sortColumn = column;
    sortAsc = true;
  }
  loadEvents();
}

async function openForm(event = null) {
  editingId = event ? event.id : null;
  const fields = ['title','category','event_date','end_date','location','location_url','description','cover_image','facebook_album'];
  fields.forEach(f => { const el = document.getElementById('f-' + f); if (el) el.value = event ? (event[f] || '') : ''; });

  // Show form first before touching preview elements
  document.getElementById('event-drawer').classList.add('open');
  document.getElementById('form-title').textContent = event ? 'Edit Event' : 'Add New Event';
  document.getElementById('saveBtn').textContent = event ? 'Update Event' : 'Save Event';
  document.getElementById('saveNote').textContent = '';
  document.getElementById('drawer-overlay').classList.add('open');

  // Now safe to access preview elements
  const preview = document.getElementById('cover-preview');
  const previewImg = document.getElementById('cover-preview-img');
  if (preview && previewImg) {
    if (event && event.cover_image) {
      previewImg.src = event.cover_image;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  }
  document.getElementById('f-cover_image').value = event ? (event.cover_image || '') : '';
  document.getElementById('f-cover_image_file').value = '';

  toggleAlbumField(event ? event.event_date : null);
  document.getElementById('f-event_date').onchange = function() { toggleAlbumField(this.value); };

  try {
    await loadClientOptions();
    if (event && event.client_id) document.getElementById('f-client_id').value = event.client_id;
  } catch(e) {
    console.error('Could not load clients', e);
  }
}

function toggleAlbumField(dateVal) {
  const today = new Date().toISOString().split('T')[0];
  const isPast = dateVal && dateVal < today;
  const row = document.getElementById('album-field-row');
  if (row) row.style.display = isPast ? '' : 'none';
}

function cancelEdit() {
  document.getElementById('event-drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
  editingId = null;
}

async function editEvent(id) {
  const { data, error } = await db.from('events').select('*').eq('id', id).single();
  if (error) { toast('Could not load event.', 'error'); return; }
  openForm(data);
}

async function uploadCoverImage() {
  const fileInput = document.getElementById('f-cover_image_file');
  const file = fileInput.files[0];
  if (!file) return document.getElementById('f-cover_image').value;

  const ext = file.name.split('.').pop();
  const filename = `cover-${Date.now()}.${ext}`;

  const { data, error } = await db.storage
    .from('event-images')
    .upload(filename, file, { upsert: true });

  if (error) { toast('Image upload failed: ' + error.message, 'error'); return null; }

  const { data: urlData } = db.storage
    .from('event-images')
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

function removeCoverImage() {
  document.getElementById('f-cover_image').value = '';
  document.getElementById('f-cover_image_file').value = '';
  document.getElementById('cover-preview').style.display = 'none';
}

function removeClientLogo() {
  document.getElementById('fc-logo_url').value = '';
  document.getElementById('fc-logo_file').value = '';
  document.getElementById('logo-preview').style.display = 'none';
}

async function saveEvent() {
  const btn = document.getElementById('saveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const payload = {
    title:          document.getElementById('f-title').value.trim(),
    category:       document.getElementById('f-category').value,
    event_date:     document.getElementById('f-event_date').value,
    location:       document.getElementById('f-location').value.trim(),
    location_url: document.getElementById('f-location_url').value.trim(),
    description:    document.getElementById('f-description').value.trim(),
    cover_image:    await uploadCoverImage(),
    facebook_album: document.getElementById('f-facebook_album').value.trim(),
    client_id: document.getElementById('f-client_id').value || null,
    end_date: document.getElementById('f-end_date').value || null,
    
  };

  if (!payload.title || !payload.event_date) {
    toast('Title, category, and date are required.', 'error');
    btn.disabled = false; btn.textContent = editingId ? 'Update Event' : 'Save Event';
    return;
  }

  let error;
  if (editingId) { ({ error } = await db.from('events').update(payload).eq('id', editingId)); }
  else           { ({ error } = await db.from('events').insert(payload)); }

  btn.disabled = false; btn.textContent = editingId ? 'Update Event' : 'Save Event';
  if (error) { toast('Save failed: ' + error.message, 'error'); }
  else { toast(editingId ? 'Event updated!' : 'Event added!', 'success'); cancelEdit(); loadEvents(); }
}

async function duplicateEvent(id) {
  const { data, error } = await db.from('events').select('*').eq('id', id).single();
  if (error) { toast('Could not load event.', 'error'); return; }

  const { id: _, created_at: __, ...payload } = data;
  payload.title = payload.title + ' (Copy)';

  const { error: insertError } = await db.from('events').insert(payload);
  if (insertError) { toast('Duplicate failed: ' + insertError.message, 'error'); }
  else { toast('Event duplicated!', 'success'); loadEvents(); }
}

async function deleteEvent(id, title) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  const { error } = await db.from('events').delete().eq('id', id);
  if (error) toast('Delete failed: ' + error.message, 'error');
  else { toast('Event deleted.', 'success'); loadEvents(); }
}

// ── Clients ───────────────────────────────
async function loadClients() {
  const tbody = document.getElementById('clients-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Loading…</td></tr>';

  const { data, error } = await db.from('clients').select('*').order('name', { ascending: true });
  if (error) { tbody.innerHTML = `<tr><td colspan="4" class="loading-cell">Error: ${error.message}</td></tr>`; return; }
  if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">No clients yet. Add one below.</td></tr>'; return; }

  tbody.innerHTML = data.map(c => `<tr>
    <td><strong>${c.name}</strong></td>
    <td>${c.logo_url ? `<img src="${c.logo_url}" alt="${c.name}" style="height:32px;max-width:100px;object-fit:contain;">` : '<span style="color:var(--text-muted);font-size:.8rem">No logo</span>'}</td>
    <td><label class="toggle-label" style="justify-content:center;">
      <input type="checkbox" ${c.featured ? 'checked' : ''} onchange="toggleClientFeatured('${c.id}', this.checked)">
      <span class="toggle-text">${c.featured ? 'Yes' : 'No'}</span>
    </label></td>
    <td class="actions-cell">
      <button class="btn-edit" onclick="editClient('${c.id}')">Edit</button>
      <button class="btn-del" onclick="deleteClient('${c.id}', '${c.name.replace(/'/g,"\\'")}')">Delete</button>
    </td>
  </tr>`).join('');
}

function openClientForm(client = null) {
  editingClientId = client ? client.id : null;
  document.getElementById('fc-name').value       = client ? (client.name || '') : '';
  document.getElementById('fc-sort_order').value = client ? (client.sort_order || 0) : 0;
  document.getElementById('fc-featured').checked = client ? !!client.featured : true;

  const logoPreview    = document.getElementById('logo-preview');
  const logoPreviewImg = document.getElementById('logo-preview-img');
  if (client && client.logo_url) {
    logoPreviewImg.src = client.logo_url;
    logoPreview.style.display = 'block';
  } else {
    logoPreview.style.display = 'none';
  }
  document.getElementById('fc-logo_url').value  = client ? (client.logo_url || '') : '';
  document.getElementById('fc-logo_file').value = '';

  document.getElementById('client-drawer').classList.add('open');
  document.getElementById('client-form-title').textContent = client ? 'Edit Client' : 'Add Client';
  document.getElementById('saveClientBtn').textContent = client ? 'Update Client' : 'Save Client';
  document.getElementById('drawer-overlay').classList.add('open');
}

function cancelClientEdit() {
  document.getElementById('client-drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
  editingClientId = null;
}

async function editClient(id) {
  const { data, error } = await db.from('clients').select('*').eq('id', id).single();
  if (error) { toast('Could not load client.', 'error'); return; }
  openClientForm(data);
}

async function saveClient() {
  const btn = document.getElementById('saveClientBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const payload = {
    name:       document.getElementById('fc-name').value.trim(),
    logo_url: await uploadClientLogo(),
    sort_order: parseInt(document.getElementById('fc-sort_order').value) || 0,
    featured:   document.getElementById('fc-featured').checked,
  };

  if (!payload.name) {
    toast('Client name is required.', 'error');
    btn.disabled = false; btn.textContent = editingClientId ? 'Update Client' : 'Save Client';
    return;
  }

  let error;
  if (editingClientId) { ({ error } = await db.from('clients').update(payload).eq('id', editingClientId)); }
  else                 { ({ error } = await db.from('clients').insert(payload)); }

  btn.disabled = false; btn.textContent = editingClientId ? 'Update Client' : 'Save Client';
  if (error) { toast('Save failed: ' + error.message, 'error'); }
  else { toast(editingClientId ? 'Client updated!' : 'Client added!', 'success'); cancelClientEdit(); loadClients(); }
}

async function uploadClientLogo() {
  const fileInput = document.getElementById('fc-logo_file');
  const file = fileInput.files[0];
  if (!file) return document.getElementById('fc-logo_url').value;

  const ext = file.name.split('.').pop();
  const filename = `client-${Date.now()}.${ext}`;

  const { data, error } = await db.storage
    .from('event-images')
    .upload(filename, file, { upsert: true });

  if (error) { toast('Logo upload failed: ' + error.message, 'error'); return null; }

  const { data: urlData } = db.storage
    .from('event-images')
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

async function toggleClientFeatured(id, featured) {
  const { error } = await db.from('clients').update({ featured }).eq('id', id);
  if (error) toast('Update failed.', 'error');
  else { toast(featured ? 'Now featured on homepage.' : 'Removed from homepage.', 'success'); loadClients(); }
}

async function deleteClient(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  const { error } = await db.from('clients').delete().eq('id', id);
  if (error) toast('Delete failed: ' + error.message, 'error');
  else { toast('Client deleted.', 'success'); loadClients(); }
}

function closeAllDrawers() {
  document.getElementById('event-drawer').classList.remove('open');
  document.getElementById('client-drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
  editingId = null;
  editingClientId = null;
}

// ── Toast ─────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast toast--${type} toast--show`;
  setTimeout(() => el.classList.remove('toast--show'), 3000);
}

document.getElementById('login-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
checkSession();

document.getElementById('f-cover_image_file')?.addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;
  const preview = document.getElementById('cover-preview');
  const img = document.getElementById('cover-preview-img');
  img.src = URL.createObjectURL(file);
  preview.style.display = 'block';
});

document.getElementById('fc-logo_file')?.addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;
  const preview = document.getElementById('logo-preview');
  const img = document.getElementById('logo-preview-img');
  img.src = URL.createObjectURL(file);
  preview.style.display = 'block';
});

