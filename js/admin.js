/* ════════════════════════════════════════════
   FORTHRIGHT EVENTS — admin.js
   Auth via Supabase. RLS protects all writes.
   ════════════════════════════════════════════ */

const STORAGE_KEY = 'forthright_events';
const CAT_LABELS  = { sports: 'Sports', teambuilding: 'Team Building', corporate: 'Corporate' };
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let events    = [];
let editingId = null;

// ── Helpers ───────────────────────────────────

function isUpcoming(ev) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [y,m,d] = ev.date.split('-').map(Number);
  return new Date(y, m-1, d) >= today;
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function showToast(msg, bg) {
  const t = document.getElementById('toast');
  t.textContent      = msg;
  t.style.background = bg || 'var(--green-deep)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

function setLoading(btn, loading) {
  btn.disabled    = loading;
  btn.textContent = loading ? 'Saving…' : 'Save Event';
}

// ── Auth ──────────────────────────────────────

async function doLogin() {
  const email    = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const btn      = document.getElementById('loginBtn');
  const err      = document.getElementById('loginError');

  err.classList.remove('show');
  btn.disabled    = true;
  btn.textContent = 'Signing in…';

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    err.textContent = error.message;
    err.classList.add('show');
    btn.disabled    = false;
    btn.textContent = 'Sign In';
  }
  // On success, onAuthStateChange fires and calls showAdmin()
}

async function doLogout() {
  await supabase.auth.signOut();
  // onAuthStateChange fires and reloads to login
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminPanel').style.display  = 'none';
}

function showAdmin() {
  console.log('showAdmin called');
  const loginScreen = document.getElementById('loginScreen');
  const adminPanel  = document.getElementById('adminPanel');
  console.log('loginScreen:', loginScreen);
  console.log('adminPanel:', adminPanel);
  if (loginScreen) loginScreen.style.display = 'none';
  if (adminPanel)  adminPanel.style.display  = 'grid';
  loadAndRender();
}

// ── Load Events ───────────────────────────────

async function loadAndRender() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  if (error) { showToast('Error loading events: ' + error.message, '#c0392b'); return; }
  events = data || [];
  renderAdminList();
}

// ── Render List ───────────────────────────────

function renderAdminList() {
  const statusFilter = document.getElementById('filterStatus').value;
  const catFilter    = document.getElementById('filterCat').value;

  let filtered = events.filter(ev => {
    const upcoming = isUpcoming(ev);
    if (statusFilter === 'upcoming' && !upcoming) return false;
    if (statusFilter === 'past'     &&  upcoming) return false;
    if (catFilter !== 'all' && ev.category !== catFilter) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const ad = new Date(a.date), bd = new Date(b.date);
    return isUpcoming(a) ? ad - bd : bd - ad;
  });

  const list = document.getElementById('adminEventsList');
  if (!filtered.length) {
    list.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--ink-muted)">No events found.</div>';
    return;
  }

  list.innerHTML = filtered.map(ev => {
    const upcoming  = isUpcoming(ev);
    const [y, m, d] = ev.date.split('-').map(Number);
    const dateStr   = `${d} ${MONTHS_SHORT[m-1]} ${y}`;
    return `
      <div class="admin-event-row" id="adminrow-${ev.id}">
        <img class="admin-event-thumb"
             src="${ev.cover_image || 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=200&q=60'}"
             alt="${ev.title}" loading="lazy">
        <div class="admin-event-info">
          <div class="admin-event-title">${ev.title}</div>
          <div class="admin-event-meta">${dateStr} · ${ev.location || '—'} · ${CAT_LABELS[ev.category] || ev.category}</div>
        </div>
        <span class="status-pill ${upcoming ? 'status-upcoming' : 'status-past'}">
          ${upcoming ? 'Upcoming' : 'Past'}
        </span>
        <div class="admin-event-actions">
          <button class="btn-edit"   onclick="editEvent('${ev.id}')">Edit</button>
          <button class="btn-delete" onclick="deleteEvent('${ev.id}')">Delete</button>
        </div>
      </div>`;
  }).join('');
}

function filterEvents() { renderAdminList(); }

// ── Sections ──────────────────────────────────

function showSection(id) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById('section-' + id).classList.add('active');
  document.getElementById('link-' + id)?.classList.add('active');
  if (id !== 'add') { editingId = null; resetForm(); }
}

// ── Form ──────────────────────────────────────

function resetForm() {
  ['title','category','date','time','end_time','location','spots',
   'cover_image','facebook_album','description'].forEach(f => {
    const el = document.getElementById('f-' + f);
    if (el) el.value = '';
  });
  document.getElementById('f-featured').checked   = false;
  document.getElementById('saveNote').textContent  = '';
  document.getElementById('formTitle').textContent = 'Add New Event';
  document.getElementById('formSubtitle').textContent = 'Fill in the details. The event auto-sorts as Upcoming or Past based on its date.';
}

function editEvent(id) {
  const ev = events.find(e => e.id === id);
  if (!ev) return;
  editingId = id;
  document.getElementById('f-title').value          = ev.title          || '';
  document.getElementById('f-category').value       = ev.category       || '';
  document.getElementById('f-date').value           = ev.date           || '';
  document.getElementById('f-time').value           = ev.time           ? ev.time.slice(0,5) : '';
  document.getElementById('f-end_time').value       = ev.end_time       ? ev.end_time.slice(0,5) : '';
  document.getElementById('f-location').value       = ev.location       || '';
  document.getElementById('f-spots').value          = ev.spots          || '';
  document.getElementById('f-cover_image').value    = ev.cover_image    || '';
  document.getElementById('f-facebook_album').value = ev.facebook_album || '';
  document.getElementById('f-description').value    = ev.description    || '';
  document.getElementById('f-featured').checked     = ev.featured       || false;
  document.getElementById('formTitle').textContent    = 'Edit Event';
  document.getElementById('formSubtitle').textContent = 'Update the details and click Save.';
  showSection('add');
}

async function saveEvent() {
  const title    = document.getElementById('f-title').value.trim();
  const date     = document.getElementById('f-date').value;
  const category = document.getElementById('f-category').value;

  if (!title || !date || !category) {
    showToast('Please fill in Title, Category, and Date.', '#c0392b');
    return;
  }

  const saveBtn = document.getElementById('saveBtn');
  setLoading(saveBtn, true);

  const payload = {
    title,
    category,
    date,
    time:           document.getElementById('f-time').value          || null,
    end_time:       document.getElementById('f-end_time').value      || null,
    location:       document.getElementById('f-location').value.trim()       || null,
    spots:          document.getElementById('f-spots').value.trim()          || null,
    cover_image:    document.getElementById('f-cover_image').value.trim()    || null,
    facebook_album: document.getElementById('f-facebook_album').value.trim() || null,
    description:    document.getElementById('f-description').value.trim()    || null,
    featured:       document.getElementById('f-featured').checked,
  };

  let error;

  if (editingId) {
    ({ error } = await supabase.from('events').update(payload).eq('id', editingId));
  } else {
    ({ error } = await supabase.from('events').insert(payload));
  }

  setLoading(saveBtn, false);

  if (error) {
    showToast('Error: ' + error.message, '#c0392b');
    return;
  }

  showToast(editingId ? '✅ Event updated!' : '✅ Event added!');
  editingId = null;
  resetForm();
  showSection('events');
  await loadAndRender();
}

async function deleteEvent(id) {
  if (!confirm('Delete this event? This cannot be undone.')) return;

  const { error } = await supabase.from('events').delete().eq('id', id);

  if (error) { showToast('Error: ' + error.message, '#c0392b'); return; }

  showToast('🗑 Event deleted.');
  await loadAndRender();
}

function cancelEdit() {
  editingId = null;
  resetForm();
  showSection('events');
}

// ── Auth State Listener ───────────────────────

supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    showAdmin();
  } else {
    showLogin();
  }
});

async function doLogin() {
  const email    = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const btn      = document.getElementById('loginBtn');
  const err      = document.getElementById('loginError');

  err.classList.remove('show');
  btn.disabled    = true;
  btn.textContent = 'Signing in…';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    err.textContent = error.message;
    err.classList.add('show');
    btn.disabled    = false;
    btn.textContent = 'Sign In';
    return;
  }

  if (data.session) {
    showAdmin();
  }
}

// ── Init ──────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
  // Check if already logged in
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    showAdmin();
  } else {
    showLogin();
  }

  // Enter key on login form
  document.getElementById('passwordInput')
    .addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('emailInput')
    .addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
});
