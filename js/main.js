/* ════════════════════════════════════════════
   FORTHRIGHT EVENTS — main.js
   Public site: reads events from Supabase.
   ════════════════════════════════════════════ */

const MONTHS       = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAT_LABELS   = { sports: 'Sports', teambuilding: 'Team Building', corporate: 'Corporate' };

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(dateStr) {
  const d = parseLocalDate(dateStr);
  return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

function isUpcoming(ev) {
  const today = new Date(); today.setHours(0,0,0,0);
  return parseLocalDate(ev.date) >= today;
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 40);
});

function scrollToTop(e) {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

function switchTab(which) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + which).classList.add('active');
  document.getElementById('panel-' + which).classList.add('active');
}

async function loadEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });
  if (error) { console.error('Error loading events:', error.message); return []; }
  return data || [];
}

function buildCalendar(events) {
  const byMonth = {};
  events.forEach(ev => {
    const d   = parseLocalDate(ev.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!byMonth[key]) byMonth[key] = { label: `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`, events: [] };
    byMonth[key].events.push(ev);
  });
  const strip = document.getElementById('calendarStrip');
  strip.innerHTML = '';
  Object.values(byMonth).forEach(month => {
    const block = document.createElement('div');
    block.className = 'cal-month';
    block.innerHTML = `<div class="cal-month-header">${month.label}</div>`;
    month.events.forEach(ev => {
      const d    = parseLocalDate(ev.date);
      const item = document.createElement('div');
      item.className = 'cal-event-item';
      item.innerHTML = `
        <span class="cal-day">${d.getDate()}</span>
        <div class="cal-info">
          <div class="cal-title">${ev.title}</div>
          <div class="cal-loc">${ev.location || ''}</div>
        </div>`;
      item.onclick = () => {
        const card = document.getElementById('evcard-' + ev.id);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      block.appendChild(item);
    });
    strip.appendChild(block);
  });
}

function renderUpcoming(events) {
  const grid = document.getElementById('upcomingGrid');
  if (!events.length) {
    grid.innerHTML = '<div class="events-loading">No upcoming events at the moment — check back soon!</div>';
    return;
  }
  grid.innerHTML = events.map(ev => {
    const d       = parseLocalDate(ev.date);
    const timeStr = ev.time     ? ` · ${formatTime(ev.time)}` : '';
    const timeEnd = ev.end_time ? ` – ${formatTime(ev.end_time)}` : '';
    return `
      <div class="event-card" id="evcard-${ev.id}">
        <div class="event-card-img">
          <img src="${ev.cover_image || 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80'}"
               alt="${ev.title}" loading="lazy">
          <span class="event-cat-badge">${CAT_LABELS[ev.category] || ev.category}</span>
          <div class="event-date-badge">
            <span class="event-date-day">${d.getDate()}</span>
            <span class="event-date-month">${MONTHS[d.getMonth()]}</span>
          </div>
        </div>
        <div class="event-card-body">
          <h3>${ev.title}</h3>
          <div class="event-meta">
            <span>📅 ${formatDate(ev.date)}${timeStr}${timeEnd}</span>
            ${ev.location ? `<span>📍 ${ev.location}</span>` : ''}
            ${ev.spots    ? `<span>👥 ${ev.spots}</span>`    : ''}
          </div>
          ${ev.description ? `<p class="event-desc">${ev.description}</p>` : ''}
        </div>
      </div>`;
  }).join('');
}

function renderPast(events) {
  const grid = document.getElementById('pastGrid');
  if (!events.length) {
    grid.innerHTML = '<div class="events-loading">No past events yet.</div>';
    return;
  }
  grid.innerHTML = events.map(ev => {
    const linkHtml = ev.facebook_album
      ? `<a href="${ev.facebook_album}" target="_blank" rel="noopener" class="past-card-link">📷 View Photos</a>`
      : `<span class="past-card-nolink">📷 Photos coming soon</span>`;
    return `
      <div class="past-card" ${ev.facebook_album ? `onclick="window.open('${ev.facebook_album}','_blank')"` : ''}>
        <img src="${ev.cover_image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80'}"
             alt="${ev.title}" loading="lazy">
        <div class="past-card-overlay">
          <div class="past-card-cat">${CAT_LABELS[ev.category] || ev.category}</div>
          <div class="past-card-title">${ev.title}</div>
          <div class="past-card-date">${formatDate(ev.date)}</div>
          ${linkHtml}
        </div>
      </div>`;
  }).join('');
}

function submitForm(e) {
  e.preventDefault();
  document.getElementById('formSuccess').style.display = 'block';
  e.target.reset();
  setTimeout(() => { document.getElementById('formSuccess').style.display = 'none'; }, 5000);
}

document.getElementById('footerYear').textContent = new Date().getFullYear();

(async () => {
  const all      = await loadEvents();
  const upcoming = all.filter(isUpcoming);
  const past     = all.filter(ev => !isUpcoming(ev)).reverse();
  buildCalendar(upcoming);
  renderUpcoming(upcoming);
  renderPast(past);
})();
