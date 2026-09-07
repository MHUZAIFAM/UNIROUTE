// ═══════════════════════════════════════════════
// UNIROUTE — app.js  (router + shared utilities)
// ═══════════════════════════════════════════════

const State = { view:'home', historyStack:[], params:{} };

// ── Rank badge color ───────────────────────────
function rankColor(rank) {
  const r       = parseInt(rank);
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  // Dark-mode values are kept bright enough to clear 4.5:1 against both the
  // page background (#0f0f0f) and the card badge pill. The old #888888/#555555
  // greys sat at 2.3–2.6:1 and were effectively invisible.
  if (!r)       return isLight ? '#7c6fcd' : '#9b87e0';   // purple / light purple
  if (r <= 10)  return '#f5a623';                          // amber — same both modes
  if (r <= 50)  return isLight ? '#5b4fcf' : '#e8e8e8';   // deep purple / light grey
  if (r <= 100) return isLight ? '#7c6fcd' : '#c4c4c4';   // medium purple / mid grey
  if (r <= 200) return isLight ? '#a89ddd' : '#a3a3a3';   // soft lilac / grey
  return isLight ? '#c4bce8' : '#8a8a8a';                 // pale lilac / dim grey
}

// ── Toast ──────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

// ── Router ─────────────────────────────────────
function navigateTo(viewId, params={}) {
  // Push to browser history so back button works
  history.pushState({ view: viewId, params }, '', null);
  State.params = params;
  _render(viewId, params);
  closeMobileSidebar();
}

function goBack() {
  // Use browser back — popstate handler will call _render
  history.back();
}

function _render(viewId, params={}) {
  State.view   = viewId;
  State.params = params;
  document.getElementById('mainContent').scrollTop = 0;

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const sb = document.querySelector(`.nav-btn[data-view="${viewId}"]`);
  if (sb) sb.classList.add('active');

  const dv = document.getElementById('dynamicView');
  dv.innerHTML = '';
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Pages are async — call without await so UI stays responsive
  switch(viewId) {
    case 'home':       renderHome();             break;
    case 'countries':  renderCountries(params);  break;
    case 'search':     renderSearch(params);     break;
    case 'rank':       renderRank(params);       break;
    case 'university': if(params.id) renderUniversity(params); else renderUniversityBrowser(params); break;
    case 'programs':   renderPrograms(params);   break;
    case 'intake':     renderIntake();           break;
    default:           renderComingSoon(viewId); break;
  }

  if (viewId !== 'home') {
    document.getElementById('view-home').classList.remove('active');
    dv.classList.add('active');
  } else {
    document.getElementById('view-home').classList.add('active');
    dv.classList.remove('active');
  }

  updateBreadcrumb(viewId, params);
}

// ── Breadcrumb ─────────────────────────────────
function updateBreadcrumb(viewId, params={}) {
  const bc = document.getElementById('breadcrumb');

  if (viewId === 'home') { bc.innerHTML = ''; return; }

  let html = '';

  if (viewId === 'countries' && params.country) {
    html = `<span class="bc-item" onclick="navigateTo('home')">Home</span>
            <span class="bc-sep">›</span>
            <span class="bc-item" onclick="navigateTo('countries')">Countries</span>
            <span class="bc-sep">›</span>
            <span class="bc-item bc-current">${params.country}</span>`;
  } else if (viewId === 'university' && params.id) {
    html = `<span class="bc-item" onclick="navigateTo('home')">Home</span>
            <span class="bc-sep">›</span>
            <span class="bc-item" onclick="navigateTo('countries')">Countries</span>
            <span class="bc-sep">›</span>
            <span class="bc-item bc-current">University</span>`;
  } else if (viewId === 'search' && params.q) {
    html = `<span class="bc-item" onclick="navigateTo('home')">Home</span>
            <span class="bc-sep">›</span>
            <span class="bc-item" onclick="navigateTo('search')">Search</span>
            <span class="bc-sep">›</span>
            <span class="bc-item bc-current">"${escHtml(params.q)}"</span>`;
  } else {
    html = `<span class="bc-item" onclick="navigateTo('home')">Home</span>
            <span class="bc-sep">›</span>
            <span class="bc-item bc-current">${viewId.charAt(0).toUpperCase()+viewId.slice(1)}</span>`;
  }
  bc.innerHTML = html;
}

// ── Coming soon ────────────────────────────────
function renderComingSoon(viewId) {
  document.getElementById('dynamicView').innerHTML = `
    <div class="coming-soon">
      <h2>${viewId.charAt(0).toUpperCase()+viewId.slice(1)}</h2>
      <p>This section is coming soon.</p>
      <button class="back-btn" onclick="navigateTo('home')">← Back to Home</button>
    </div>`;
}

// ── Shared university card ─────────────────────
function uniCardHTML(u) {
  const rc      = rankColor(u.rank);
  const rankTxt = u.rank ? `#${u.rank}` : 'Unranked';
  const domain  = u.domain || (u.domains && u.domains[0]) || '';
  const alpha2  = u.alpha2 ? u.alpha2.toUpperCase() : '—';
  return `
    <div class="uni-card" onclick="navigateTo('university',{id:${u.id}})">
      <div class="uni-card-top" style="background:linear-gradient(135deg,${rc}40,${rc}18)">
        <span class="uni-alpha2">${alpha2}</span>
        <span class="uni-rank-badge" style="border-color:${rc};color:${rc}">${rankTxt}</span>
      </div>
      <div class="uni-card-body">
        <h3 class="uni-card-name">${escHtml(u.name)}</h3>
        <p class="uni-card-loc">${u.state ? escHtml(u.state)+', ' : ''}${escHtml(u.country)}</p>
        ${domain ? `<p class="uni-card-domain">${escHtml(domain)}</p>` : ''}
        ${u.overall ? `<div class="uni-qs-row"><span class="qs-label">QS Score</span><span class="qs-val">${u.overall}</span></div>` : ''}
        <button class="uni-view-btn">View Details →</button>
      </div>
    </div>`;
}

// ── Skeleton cards ─────────────────────────────
function skeletonCardsHTML(count=6) {
  return Array(count).fill(`
    <div class="uni-card skeleton-card">
      <div class="skeleton-top"></div>
      <div class="skeleton-body">
        <div class="skeleton-line w80"></div>
        <div class="skeleton-line w50"></div>
        <div class="skeleton-line w60"></div>
      </div>
    </div>`).join('');
}

// ── Helpers ────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function backBtn(label) { return ''; }

function paginate(items, page, pageSize) {
  const start = page * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    pages: Math.ceil(items.length / pageSize),
    page,
  };
}

// ── Mobile sidebar ─────────────────────────────
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

function toggleMobileSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  const isOpen = sb.classList.contains('mobile-open');
  sb.classList.toggle('mobile-open', !isOpen);
  ov.classList.toggle('active', !isOpen);
}

// ── Splash screen ──────────────────────────────
function showSplash() {
  const bar    = document.getElementById('splashBar');
  const count  = document.getElementById('splashCount');
  const splash = document.getElementById('splash');

  let p = 0;
  const iv = setInterval(() => {
    p = Math.min(p + Math.random() * 18, 95);
    bar.style.width = p + '%';
  }, 80);

  setTimeout(() => {
    clearInterval(iv);
    bar.style.width = '100%';
    if (count) count.textContent = '10,876 universities';
    setTimeout(() => {
      splash.classList.add('splash-hide');
      setTimeout(() => { splash.style.display = 'none'; }, 500);
    }, 300);
  }, 1200);
}

// ── Init ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // ── Theme init ───────────────────────────────
  const savedTheme = localStorage.getItem('uniroute-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.innerHTML = savedTheme === 'dark' ? ICONS.moon : ICONS.sun;
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('uniroute-theme', next);
    document.getElementById('themeToggle').innerHTML = next === 'dark' ? ICONS.moon : ICONS.sun;
  });

  // ── Browser back/forward button support ──────
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.view) {
      _render(e.state.view, e.state.params || {});
    } else {
      _render('home', {});
    }
  });

  showSplash();

  // Desktop sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    const sb = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
      toggleMobileSidebar();
    } else {
      sb.classList.toggle('collapsed');
    }
  });

  // Mobile hamburger
  const mobileBtn = document.getElementById('mobileMenuBtn');
  if (mobileBtn) mobileBtn.addEventListener('click', toggleMobileSidebar);

  // Overlay
  document.getElementById('sidebarOverlay').addEventListener('click', closeMobileSidebar);

  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.addEventListener('click', () => navigateTo(btn.dataset.view)));

  // Carousel
  let ci = 0;
  function carouselGo(idx) {
    document.querySelectorAll('.carousel-slide').forEach((s,i) => s.classList.toggle('active', i===idx));
    document.querySelectorAll('.dot').forEach((d,i) => d.classList.toggle('active', i===idx));
    ci = idx;
  }
  document.querySelectorAll('.dot').forEach(d =>
    d.addEventListener('click', () => carouselGo(parseInt(d.dataset.index))));
  setInterval(() => carouselGo((ci+1) % 3), 3500);

  document.querySelectorAll('.card-cta').forEach(btn =>
    btn.addEventListener('click', () => navigateTo(btn.dataset.view)));
  document.querySelectorAll('.see-all-btn').forEach(btn =>
    btn.addEventListener('click', () => navigateTo(btn.dataset.view)));
  document.querySelectorAll('.chip[data-program]').forEach(chip =>
    chip.addEventListener('click', () => navigateTo('search', { q: chip.dataset.program })));

  // Seed initial history state so back works from first page
  history.replaceState({ view: 'home', params: {} }, '', null);
  navigateTo('home');
});

// ── Smart domain URL helper ────────────────────
function fixDomain(domain) {
  if (!domain) return '#';
  const parts = domain.replace(/^https?:\/\//,'').split('.');
  if (parts.length >= 3) return 'https://' + parts.join('.');
  return 'https://www.' + parts.join('.');
}