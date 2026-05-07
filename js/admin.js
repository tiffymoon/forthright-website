// ════════════════════════════════════════════
// FORTHRIGHT EVENTS — Admin JS
// ════════════════════════════════════════════

let editingId       = null;
let editingClientId = null;

// ── Auth ──────────────────────────────────
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

// ── Events ────────────────────────────────
async function loadEvents() {
  const tbody = document.getElementById('events-tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">Loading…</td></tr>';

  const { data, error } = await db.from('events').select('*').order('event_date', { ascending: false });
  if (error) { tbody.innerHTML = `<tr><td colspan="5" class="loading-cell">Error: ${error.message}</td></tr>`; return; }
  if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No events yet. Add one above.</td></tr>'; return; }

  tbody.innerHTML = data.map(e => {
    const d = new Date(e.event_date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const status = e.event_date >= new Date().toISOString().split('T')[0] ? 'upcoming' : 'past';
    return `<tr>
      <td><strong>${e.title}</strong>${e.featured ? ' <span class="badge-feat">★</span>' : ''}</td>
      <td>${e.category}</td>
      <td>${d}</td>
      <td><span class="status-badge status-${status}">${status}</span></td>
      <td class="actions-cell">
        <button class="btn-edit" onclick="editEvent('${e.id}')">Edit</button>
        <button class="btn-del"  onclick="deleteEvent('${e.id}', '${e.title.replace(/'/g,"\\'")}')">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

function openForm(event = null) {
  editingId = event ? event.id : null;
  const fields = ['title','category','event_date','event_time','location','spots','price','description','cover_image','facebook_album'];
  fields.forEach(f => { const el = document.getElementById('f-' + f); if (el) el.value = event ? (event[f] || '') : ''; });
  const featuredEl = document.getElementById('f-featured');
  if (featuredEl) featuredEl.checked = event ? !!event.featured : false;

  toggleAlbumField(event ? event.event_date : null);

  document.getElementById('form-section').style.display = 'block';
  document.getElementById('form-title').textContent = event ? 'Edit Event' : 'Add New Event';
  document.getElementById('saveBtn').textContent = event ? 'Update Event' : 'Save Event';
  document.getElementById('saveNote').textContent = '';
  document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });

  document.getElementById('f-event_date').onchange = function() { toggleAlbumField(this.value); };
}

function toggleAlbumField(dateVal) {
  const today = new Date().toISOString().split('T')[0];
  const isPast = dateVal && dateVal < today;
  const row = document.getElementById('album-field-row');
  if (row) row.style.display = isPast ? '' : 'none';
}

function cancelEdit() {
  document.getElementById('form-section').style.display = 'none';
  editingId = null;
}

async function editEvent(id) {
  const { data, error } = await db.from('events').select('*').eq('id', id).single();
  if (error) { toast('Could not load event.', 'error'); return; }
  openForm(data);
}

async function saveEvent() {
  const btn = document.getElementById('saveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const payload = {
    title:          document.getElementById('f-title').value.trim(),
    category:       document.getElementById('f-category').value,
    event_date:     document.getElementById('f-event_date').value,
    event_time:     document.getElementById('f-event_time').value.trim(),
    location:       document.getElementById('f-location').value.trim(),
    spots:          document.getElementById('f-spots').value.trim(),
    price:          document.getElementById('f-price').value.trim(),
    description:    document.getElementById('f-description').value.trim(),
    cover_image:    document.getElementById('f-cover_image').value.trim(),
    facebook_album: document.getElementById('f-facebook_album').value.trim(),
    featured:       document.getElementById('f-featured').checked,
  };

  if (!payload.title || !payload.category || !payload.event_date) {
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

  const { data, error } = await db.from('clients').select('*').order('sort_order', { ascending: true });
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
      <button class="btn-del"  onclick="deleteClient('${c.id}', '${c.name.replace(/'/g,"\\'")}')">Delete</button>
    </td>
  </tr>`).join('');
}

function openClientForm(client = null) {
  editingClientId = client ? client.id : null;
  document.getElementById('fc-name').value      = client ? (client.name || '') : '';
  document.getElementById('fc-logo_url').value  = client ? (client.logo_url || '') : '';
  document.getElementById('fc-sort_order').value = client ? (client.sort_order || 0) : 0;
  document.getElementById('fc-featured').checked = client ? !!client.featured : true;

  document.getElementById('client-form-section').style.display = 'block';
  document.getElementById('client-form-title').textContent = client ? 'Edit Client' : 'Add Client';
  document.getElementById('saveClientBtn').textContent = client ? 'Update Client' : 'Save Client';
  document.getElementById('client-form-section').scrollIntoView({ behavior: 'smooth' });
}

function cancelClientEdit() {
  document.getElementById('client-form-section').style.display = 'none';
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
    logo_url:   document.getElementById('fc-logo_url').value.trim(),
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

// ── Toast ─────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast toast--${type} toast--show`;
  setTimeout(() => el.classList.remove('toast--show'), 3000);
}

document.getElementById('login-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
checkSession();
