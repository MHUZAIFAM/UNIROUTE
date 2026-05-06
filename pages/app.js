// ═══════════════════════════════════════════════
// UNIROUTE — app.js  (router + shared utilities)
// ═══════════════════════════════════════════════

const State = { view:'home', historyStack:[] };

// ── Flag emoji ─────────────────────────────────
function flagEmoji(alpha2) {
  if (!alpha2 || alpha2.length !== 2) return '🏫';
  const b = 0x1F1E6;
  return String.fromCodePoint(b + alpha2.toUpperCase().charCodeAt(0) - 65) +
         String.fromCodePoint(b + alpha2.toUpperCase().charCodeAt(1) - 65);
}

// ── Rank badge color ───────────────────────────
function rankColor(rank) {
  const r = parseInt(rank);
  if (!r)      return '#6550a3';
  if (r <= 10) return '#f5a623';
  if (r <= 50) return '#e8e8e8';
  if (r <= 100) return '#b0b0b0';
  if (r <= 200) return '#888888';
  return '#555555';
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
  State.historyStack.push({ view: State.view, params: State.params || {} });
  State.params = params;
  _render(viewId, params);
  closeMobileSidebar();
}

function goBack() {
  const prev = State.historyStack.pop();
  if (!prev) { _render('home', {}); return; }
  State.params = prev.params || {};
  _render(prev.view, prev.params || {});
}

function _render(viewId, params={}) {
  State.view = viewId;
  document.getElementById('mainContent').scrollTop = 0;

  // Sidebar active state
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const sb = document.querySelector(`.nav-btn[data-view="${viewId}"]`);
  if (sb) sb.classList.add('active');

  // Clear dynamic view
  const dv = document.getElementById('dynamicView');
  dv.innerHTML = '';
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

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
  }

  updateBreadcrumb(viewId, params);
}

// ── Breadcrumb ─────────────────────────────────
function updateBreadcrumb(viewId, params={}) {
  const bc = document.getElementById('breadcrumb');
  let html = `<span class="bc-item" onclick="navigateTo('home')">Home</span>`;

  if (viewId === 'home') {
    // nothing extra
  } else if (viewId === 'countries' && params.country) {
    html += `<span class="bc-sep">›</span>
             <span class="bc-item" onclick="navigateTo('countries')">Countries</span>
             <span class="bc-sep">›</span>
             <span class="bc-item bc-current">${params.country}</span>`;
  } else if (viewId === 'university' && params.id) {
    const u = UNI_BY_ID[params.id];
    if (u) {
      const esc = u.country.replace(/'/g, "\\'");
      html += `<span class="bc-sep">›</span>
               <span class="bc-item" onclick="navigateTo('countries')">Countries</span>
               <span class="bc-sep">›</span>
               <span class="bc-item" onclick="navigateTo('countries',{country:'${esc}'})">${u.country}</span>
               <span class="bc-sep">›</span>
               <span class="bc-item bc-current">${u.name}</span>`;
    }
  } else if (viewId === 'search' && params.q) {
    html += `<span class="bc-sep">›</span>
             <span class="bc-item" onclick="navigateTo('search')">Search</span>
             <span class="bc-sep">›</span>
             <span class="bc-item bc-current">"${escHtml(params.q)}"</span>`;
  } else if (viewId !== 'home') {
    html += `<span class="bc-sep">›</span>
             <span class="bc-item bc-current">${viewId.charAt(0).toUpperCase()+viewId.slice(1)}</span>`;
  }
  bc.innerHTML = html;
}

// ── Coming soon ────────────────────────────────
function renderComingSoon(viewId) {
  document.getElementById('dynamicView').innerHTML = `
    <div class="coming-soon">
      <div class="cs-icon">🚧</div>
      <h2>${viewId.charAt(0).toUpperCase()+viewId.slice(1)}</h2>
      <p>This section is coming soon.</p>
      <button class="back-btn" onclick="navigateTo('home')">← Back to Home</button>
    </div>`;
}

// ── Shared university card ─────────────────────
function uniCardHTML(u) {
  const rc       = rankColor(u.rank);
  const rankTxt  = u.rank ? `#${u.rank}` : 'Unranked';
  const domain   = u.domains && u.domains[0] ? u.domains[0] : '';
  // Always use alpha2 text badge — consistent, no emoji overlap issues
  const alpha2   = u.alpha2 ? u.alpha2.toUpperCase() : '—';
  return `
    <div class="uni-card" onclick="navigateTo('university',{id:${u.id}})">
      <div class="uni-card-top" style="background:linear-gradient(135deg,${rc}40,${rc}18)">
        <span class="uni-alpha2">${alpha2}</span>
        <span class="uni-rank-badge" style="border-color:${rc};color:${rc}">${rankTxt}</span>
      </div>
      <div class="uni-card-body">
        <h3 class="uni-card-name">${escHtml(u.name)}</h3>
        <p class="uni-card-loc">📍 ${u.state ? escHtml(u.state)+', ' : ''}${escHtml(u.country)}</p>
        ${domain ? `<p class="uni-card-domain">🌐 ${escHtml(domain)}</p>` : ''}
        ${u.overall ? `<div class="uni-qs-row"><span class="qs-label">QS Score</span><span class="qs-val">${u.overall}</span></div>` : ''}
        <button class="uni-view-btn">View Details →</button>
      </div>
    </div>`;
}

// ── Skeleton card (loading placeholder) ────────
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

function backBtn(label) {
  return ``; // disabled
}

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
  // Animate bar from 0→100% while data.js parses
  const bar   = document.getElementById('splashBar');
  const count = document.getElementById('splashCount');
  let p = 0;
  const iv = setInterval(() => {
    p = Math.min(p + Math.random() * 12, 92);
    bar.style.width = p + '%';
  }, 120);

  // data.js is already loaded synchronously by the time DOMContentLoaded fires
  // So we just let the animation run briefly then dismiss
  setTimeout(() => {
    clearInterval(iv);
    bar.style.width = '100%';
    if (count) count.textContent = `${UNIVERSITIES.length.toLocaleString()} universities loaded`;
    setTimeout(() => {
      const splash = document.getElementById('splash');
      splash.classList.add('splash-hide');
      setTimeout(() => { splash.style.display = 'none'; }, 500);
    }, 400);
  }, 900);
}

// ── Init ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  showSplash();

  // Desktop sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    const sb = document.getElementById('sidebar');
    // On mobile: open/close drawer; on desktop: collapse/expand
    if (window.innerWidth <= 768) {
      toggleMobileSidebar();
    } else {
      sb.classList.toggle('collapsed');
    }
  });

  // Mobile hamburger in header
  const mobileBtn = document.getElementById('mobileMenuBtn');
  if (mobileBtn) mobileBtn.addEventListener('click', toggleMobileSidebar);

  // Overlay click closes sidebar
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

  // Carousel CTAs
  document.querySelectorAll('.card-cta').forEach(btn =>
    btn.addEventListener('click', () => navigateTo(btn.dataset.view)));

  // See all buttons
  document.querySelectorAll('.see-all-btn').forEach(btn =>
    btn.addEventListener('click', () => navigateTo(btn.dataset.view)));

  // Home chip clicks
  document.querySelectorAll('.chip[data-program]').forEach(chip =>
    chip.addEventListener('click', () => navigateTo('search', { q: chip.dataset.program })));

  navigateTo('home');
});

// ── Smart domain URL helper ────────────────────
function fixDomain(domain) {
  if (!domain) return '#';
  const parts = domain.replace(/^https?:\/\//,'').split('.');
  // 3+ parts means subdomain already present (e.g. www.x.com or cs.mit.edu)
  if (parts.length >= 3) return 'https://' + parts.join('.');
  // Bare domain like stanford.edu — add www.
  return 'https://www.' + parts.join('.');
}