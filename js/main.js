// ════════════════════════════════════════════
// FORTHRIGHT EVENTS — Public Site JS
// ════════════════════════════════════════════

const today = new Date().toISOString().split('T')[0];
const isHomepage = !document.getElementById('past-grid');

async function loadEvents() {
  const upcomingGrid  = document.getElementById('upcoming-grid');
  const upcomingEmpty = document.getElementById('upcoming-empty');
  if (upcomingGrid) upcomingGrid.innerHTML = '<p class="loading-msg">Loading…</p>';

  const { data: events, error } = await db
    .from('events')
    .select('*')
    .order('event_date', { ascending: true });

  if (error) {
    if (upcomingGrid) upcomingGrid.innerHTML = '<p class="loading-msg">Could not load events.</p>';
    return;
  }

  const upcoming = events.filter(e => e.event_date >= today);
  const past     = events.filter(e => e.event_date <  today).reverse();

  // Homepage: show max 4 upcoming
  if (isHomepage) {
    if (upcomingGrid) upcomingGrid.innerHTML = '';
    const preview = upcoming.slice(0, 4);
    if (preview.length === 0) {
      if (upcomingEmpty) upcomingEmpty.style.display = 'block';
    } else {
      if (upcomingEmpty) upcomingEmpty.style.display = 'none';
      preview.forEach(e => upcomingGrid.insertAdjacentHTML('beforeend', eventCard(e, false)));
    }
    return;
  }

  // Events page: show all
  const pastGrid  = document.getElementById('past-grid');
  const pastEmpty = document.getElementById('past-empty');
  if (upcomingGrid) upcomingGrid.innerHTML = '';
  if (pastGrid)     pastGrid.innerHTML     = '';

  if (upcoming.length === 0) {
    if (upcomingEmpty) upcomingEmpty.style.display = 'block';
  } else {
    if (upcomingEmpty) upcomingEmpty.style.display = 'none';
    upcoming.forEach(e => upcomingGrid.insertAdjacentHTML('beforeend', eventCard(e, false)));
  }

  if (past.length === 0) {
    if (pastEmpty) pastEmpty.style.display = 'block';
  } else {
    if (pastEmpty) pastEmpty.style.display = 'none';
    past.forEach(e => pastGrid.insertAdjacentHTML('beforeend', eventCard(e, true)));
  }
}

async function loadClients() {
  const grid = document.getElementById('clients-grid');
  if (!grid) return;

  const { data, error } = await db
    .from('clients')
    .select('*')
    .eq('featured', true)
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) {
    grid.innerHTML = '<p class="loading-msg">No clients listed yet.</p>';
    return;
  }

  grid.innerHTML = data.map(c => `
    <div class="client-logo-wrap">
      ${c.logo_url
        ? `<img src="${c.logo_url}" alt="${c.name}">`
        : `<span class="client-logo-name">${c.name}</span>`
      }
    </div>`).join('');
}

function eventCard(e, isPast) {
  const dateStr = new Date(e.event_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
  });
  const cover = e.cover_image
    ? `<div class="card-img" style="background-image:url('${e.cover_image}')"></div>`
    : `<div class="card-img card-img--placeholder"><span>${categoryIcon(e.category)}</span></div>`;

  const albumBtn = isPast && e.facebook_album
    ? `<a href="${e.facebook_album}" target="_blank" class="btn-album">📸 View Photos</a>`
    : '';
  const featuredBadge = e.featured ? `<span class="badge-featured">Featured</span>` : '';

  return `
    <div class="event-card ${isPast ? 'event-card--past' : ''}">
      ${cover}
      <div class="card-body">
        <div class="card-meta">
          <span class="badge-category">${e.category}</span>
          ${featuredBadge}
        </div>
        <h3 class="card-title">${e.title}</h3>
        <p class="card-date">📅 ${dateStr}${e.event_time ? ' · ' + e.event_time : ''}</p>
        ${e.location    ? `<p class="card-location">📍 ${e.location}</p>`  : ''}
        ${e.spots       ? `<p class="card-spots">👥 ${e.spots}</p>`        : ''}
        ${e.price       ? `<p class="card-price">💰 ${e.price}</p>`        : ''}
        ${e.description ? `<p class="card-desc">${e.description}</p>`      : ''}
        ${albumBtn}
      </div>
    </div>`;
}

function categoryIcon(cat) {
  const icons = {
    'Badminton':'🏸','Basketball':'🏀','Volleyball':'🏐',
    'Football':'⚽','Flag Football':'🏈','Bowling':'🎳',
    'Team Building':'🤝','Corporate Event':'🏢','Social':'🎉'
  };
  return icons[cat] || '🏆';
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// Mobile nav
const navToggle = document.getElementById('nav-toggle');
const navMenu   = document.getElementById('nav-menu');
if (navToggle) {
  navToggle.addEventListener('click', () => navMenu.classList.toggle('open'));
}

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
    if (navMenu) navMenu.classList.remove('open');
  });
});

loadEvents();
loadClients();
