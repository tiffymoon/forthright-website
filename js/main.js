// ════════════════════════════════════════════
// FORTHRIGHT EVENTS — Public Site JS
// ════════════════════════════════════════════
let allPastEvents = [];
const today = new Date().toISOString().split('T')[0];
const isHomepage = !document.getElementById('past-grid');

async function loadEvents() {
  const upcomingGrid  = document.getElementById('upcoming-grid');
  const upcomingEmpty = document.getElementById('upcoming-empty');
  if (upcomingGrid) upcomingGrid.innerHTML = '<p class="loading-msg">Loading…</p>';

  const { data: events, error } = await db
    .from('events')
    .select('*, clients(logo_url)')
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
  upcomingGrid.className = 'events-list';
  const preview = upcoming.slice(0, 3);
  if (preview.length === 0) {
    if (upcomingEmpty) upcomingEmpty.style.display = 'block';
  } else {
    if (upcomingEmpty) upcomingEmpty.style.display = 'none';
    preview.forEach(e => upcomingGrid.insertAdjacentHTML('beforeend', eventListCard(e)));
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
    upcomingGrid.className = '';
    upcomingGrid.innerHTML = groupedUpcomingHTML(upcoming);
  }

  if (past.length === 0) {
    if (pastEmpty) pastEmpty.style.display = 'block';
  } else {
    if (pastEmpty) pastEmpty.style.display = 'none';
    allPastEvents = past;
    populateYearFilter(allPastEvents);
renderPastEvents(past);
  }
}

function populateYearFilter(events) {
  const select = document.getElementById('filter-year');
  if (!select) return;
  const years = [...new Set(events.map(e => new Date(e.event_date + 'T00:00:00').getFullYear()))].sort((a,b) => b - a);
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    select.appendChild(opt);
  });
}

function renderPastEvents(events) {
  const pastGrid  = document.getElementById('past-grid');
  const pastEmpty = document.getElementById('past-empty');
  if (!pastGrid) return;
  pastGrid.innerHTML = '';
  if (events.length === 0) {
    if (pastEmpty) pastEmpty.style.display = 'block';
  } else {
    if (pastEmpty) pastEmpty.style.display = 'none';
    events.forEach(e => pastGrid.insertAdjacentHTML('beforeend', eventCard(e, true)));
  }
}

function filterPastEvents() {
  const year  = document.getElementById('filter-year')?.value;
  const month = document.getElementById('filter-month')?.value;

  const filtered = allPastEvents.filter(e => {
    const d = new Date(e.event_date + 'T00:00:00');
    const matchName  = e.title.toLowerCase().includes(name);
    const matchYear  = !year  || d.getFullYear() == year;
    const matchMonth = !month || d.getMonth() == month;
    return matchName && matchYear && matchMonth;
  });

  renderPastEvents(filtered);
}

function clearFilters() {
  document.getElementById('filter-year').value  = '';
  document.getElementById('filter-month').value = '';
  renderPastEvents(allPastEvents);
}

function eventListCard(e) {
  const dateStr = new Date(e.event_date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });
  const endDate = e.end_date
    ? ' – ' + new Date(e.end_date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      })
    : '';

  const clientName = e.clients ? e.clients.name : '';
  const firstLetter = e.title.charAt(0).toUpperCase();
  const avatarColor = stringToColor(e.title);
  const logoHtml = (e.clients && e.clients.logo_url)
    ? `<img src="${e.clients.logo_url}" alt="${clientName}">`
    : `<div class="elc-avatar" style="background:${avatarColor}">${firstLetter}</div>`;

  return `
    <div class="event-list-card">
      <div class="elc-logo">${logoHtml}</div>
      <div class="elc-body">
        <h3 class="elc-title">${e.title}</h3>
        <p class="elc-meta">${dateStr}${endDate}</p>
        ${e.location ? `<p class="elc-meta">${e.location}</p>${e.location_url ? `<p class="elc-meta"><a href="${e.location_url}" target="_blank" class="directions-link">(How to get there)</a></p>` : ''}` : ''}
      </div>
    </div>`;
}

function groupedUpcomingHTML(events) {
  const groups = {};
  events.forEach(e => {
    const d = new Date(e.event_date + 'T00:00:00');
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });

  return Object.entries(groups).map(([month, evts]) => `
    <div class="event-group">
      <div class="event-group-header">${month}</div>
      <div class="event-group-list">
        ${evts.map(e => {
          const startDate = new Date(e.event_date + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short', day: 'numeric'
          });
          const endDate = e.end_date
            ? ' – ' + new Date(e.end_date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short', day: 'numeric'
              })
            : '';
          const clientName = e.clients ? e.clients.name : '';
          const firstLetter = e.title.charAt(0).toUpperCase();
          const avatarColor = stringToColor(e.title);
          const logoHtml = (e.clients && e.clients.logo_url)
            ? `<img src="${e.clients.logo_url}" alt="${clientName}">`
            : `<div class="event-row-avatar" style="background:${avatarColor}">${firstLetter}</div>`;
          return `
            <div class="event-row">
              <div class="event-row-logo">${logoHtml}</div>
              <div class="event-row-title">${e.title}</div>
              <div class="event-row-date">${startDate}${endDate}</div>
              <div class="event-row-venue">${e.location || ''}${e.location_url ? `<br><a href="${e.location_url}" target="_blank" class="directions-link">(How to get there)</a>` : ''}</div>
            </div>`;
        }).join('')}
      </div>
    </div>`
  ).join('');
}

function stringToColor(str) {
  const colors = [
    '#2e7d52', '#1565c0', '#6a1b9a', '#c62828',
    '#e65100', '#00695c', '#4527a0', '#ad1457'
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
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
  const startDate = new Date(e.event_date + 'T00:00:00').toLocaleDateString('en-US', {
  month: 'long', day: 'numeric', year: 'numeric'
  });
  const endDate = e.end_date
    ? new Date(e.end_date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      })
    : null;
  const dateStr = endDate ? `${startDate} – ${endDate}` : startDate;
    const coverImg = e.cover_image || (e.clients && e.clients.logo_url) || 'images/forthright-icon.png';
    const isPlaceholder = !e.cover_image;
    const cover = `<div class="card-img ${isPlaceholder ? 'card-img--muted' : ''}" style="background-image:url('${coverImg}');background-size:${isPlaceholder ? 'contain' : 'cover'};background-repeat:no-repeat;background-position:center;background-color:#f0f0f0;"></div>`;

  const albumBtn = isPast && e.facebook_album
    ? `<a href="${e.facebook_album}" target="_blank" class="btn-album">View Photos</a>`
    : '';

  return `
    <div class="event-card ${isPast ? 'event-card--past' : ''}">
      ${cover}
      <div class="card-body">
        <h3 class="card-title">${e.title}</h3>
        <p class="card-date">${dateStr}${e.event_time ? ' · ' + e.event_time : ''}</p>
        ${e.location ? `<p class="card-location">${e.location}${e.location_url ? ` <a href="${e.location_url}" target="_blank" class="directions-link">(How to get there)</a>` : ''}</p>` : ''}
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
