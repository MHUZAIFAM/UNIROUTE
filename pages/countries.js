// ═══════════════════════════════════════════════
// UNIROUTE — countries.js
// ═══════════════════════════════════════════════

const REGION_ORDER = ['Europe','Asia','North America','South America','Middle East','Africa','Oceania','Other'];

// Cache countries list so we don't re-fetch on every filter
let _countriesCache = null;

async function renderCountries(params={}) {
  const dv = document.getElementById('dynamicView');

  if (params.country) {
    renderCountryDetail(params.country, params.page||0, params.search||'', params.sort||'rank');
    return;
  }

  // Build shell immediately so user sees layout
  const search       = (params.search||'').toLowerCase();
  const regionFilter = params.region||'';

  dv.innerHTML = `
    <div class="page-wrap">
      ${backBtn('Home')}
      <div class="page-header">
        <div>
          <h2 class="page-title">Countries</h2>
          <p class="page-subtitle" id="countriesSubtitle">Loading…</p>
        </div>
      </div>
      <div class="countries-toolbar">
        <input class="toolbar-search" id="countrySearchInput" type="text"
          placeholder="Search countries…" value="${escHtml(params.search||'')}" />
        <div class="region-chips">
          <span class="rchip ${!regionFilter?'active':''}" data-region="">All</span>
          ${REGION_ORDER.map(r=>`<span class="rchip ${regionFilter===r?'active':''}" data-region="${r}">${r}</span>`).join('')}
        </div>
      </div>
      <div class="countries-body" id="countriesBody">
        <div class="api-loading"><div class="loading-spinner"></div><p>Loading countries…</p></div>
      </div>
    </div>`;

  // Wire search + region chips immediately
  const inp = document.getElementById('countrySearchInput');
  if (inp) {
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
    let timer;
    inp.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => renderCountries({ search: inp.value, region: regionFilter }), 220);
    });
  }
  document.querySelectorAll('.rchip[data-region]').forEach(chip => {
    chip.addEventListener('click', () =>
      renderCountries({ search: params.search||'', region: chip.dataset.region }));
  });

  try {
    // Fetch from cache or API
    if (!_countriesCache) {
      _countriesCache = await apiGetCountries();
    }
    let list = _countriesCache;

    // Update subtitle
    const total = list.reduce((s,c) => s + parseInt(c.count), 0);
    const sub = document.getElementById('countriesSubtitle');
    if (sub) sub.textContent = `${list.length} countries · ${total.toLocaleString()} universities`;

    // Filter
    if (search)       list = list.filter(c => c.name.toLowerCase().includes(search));
    if (regionFilter) list = list.filter(c => c.region === regionFilter);

    // Group by region
    const grouped = {};
    list.forEach(c => {
      const r = c.region || 'Other';
      if (!grouped[r]) grouped[r] = [];
      grouped[r].push(c);
    });
    const regions = REGION_ORDER.filter(r => grouped[r] && grouped[r].length > 0);

    const body = document.getElementById('countriesBody');
    if (!body) return;

    if (regions.length === 0) {
      body.innerHTML = `<div class="empty-state"><p>No countries found.</p></div>`;
    } else {
      body.innerHTML = regions.map(region => `
        <div class="region-group">
          <h3 class="region-heading">${region}</h3>
          <div class="country-grid">
            ${grouped[region].sort((a,b)=>a.name.localeCompare(b.name)).map(c => countryCardHTML(c)).join('')}
          </div>
        </div>`).join('');

      // Wire country card clicks
      body.querySelectorAll('.country-card[data-country]').forEach(card => {
        card.addEventListener('click', () =>
          navigateTo('countries', { country: card.dataset.country }));
      });
    }

  } catch (err) {
    console.error('Countries load error:', err);
    const body = document.getElementById('countriesBody');
    if (body) body.innerHTML = `<div class="empty-state"><p>Could not load countries. Is the server running?</p></div>`;
  }
}

function countryCardHTML(c) {
  const alpha2 = (c.alpha2||'').toUpperCase() || c.name.slice(0,2).toUpperCase();
  const ranked = parseInt(c.ranked) || 0;
  return `
    <div class="country-card" data-country="${escHtml(c.name)}">
      <div class="country-flag country-alpha2">${alpha2}</div>
      <div class="country-info">
        <h4 class="country-name">${escHtml(c.name)}</h4>
        <p class="country-stats">${parseInt(c.count).toLocaleString()} universities${ranked ? ` · <span class="ranked-pill">${ranked} ranked</span>` : ''}</p>
      </div>
      <span class="country-arrow">›</span>
    </div>`;
}

// ── Country Detail ──────────────────────────────
async function renderCountryDetail(countryName, page=0, search='', sort='rank') {
  const dv = document.getElementById('dynamicView');
  const cn  = escHtml(countryName);

  // Shell
  dv.innerHTML = `
    <div class="page-wrap">
      ${backBtn('Countries')}
      <div class="country-detail-header">
        <div class="country-detail-flag" id="cdFlag">—</div>
        <div>
          <h2 class="page-title">${cn}</h2>
          <p class="page-subtitle" id="cdSubtitle">Loading…</p>
        </div>
      </div>
      <div class="uni-toolbar">
        <input class="toolbar-search" id="uniDetailSearch" type="text"
          placeholder="Search universities in ${cn}…"
          value="${escHtml(search)}" />
        <div class="sort-row">
          <label>Sort:</label>
          <select class="filter-select" id="uniDetailSort">
            <option value="rank"  ${sort==='rank' ?'selected':''}>By Rank</option>
            <option value="name"  ${sort==='name' ?'selected':''}>A – Z</option>
          </select>
        </div>
      </div>
      <p class="results-meta-txt" style="padding:0 28px 12px" id="cdMeta"></p>
      <div id="cdGrid" style="padding:0 28px">
        <div class="api-loading"><div class="loading-spinner"></div><p>Loading universities…</p></div>
      </div>
      <div id="cdPages"></div>
    </div>`;

  // Wire inputs with debounce
  const searchInp = document.getElementById('uniDetailSearch');
  const sortSel   = document.getElementById('uniDetailSort');
  let timer;
  if (searchInp) {
    searchInp.focus();
    searchInp.setSelectionRange(searchInp.value.length, searchInp.value.length);
    searchInp.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() =>
        renderCountryDetail(countryName, 0, searchInp.value, sortSel?.value||sort), 250);
    });
  }
  if (sortSel) sortSel.addEventListener('change', () =>
    renderCountryDetail(countryName, 0, searchInp?.value||search, sortSel.value));

  try {
    const data = await apiGetCountryUniversities(countryName, { q:search, sort, page, limit:24 });

    // Update flag
    const flagEl = document.getElementById('cdFlag');
    if (flagEl && data.universities.length > 0) {
      flagEl.textContent = (data.universities[0].alpha2||'').toUpperCase() || countryName.slice(0,2).toUpperCase();
    }

    // Subtitle
    const sub = document.getElementById('cdSubtitle');
    const ranked = data.universities.filter(u=>u.rank).length;
    if (sub) sub.innerHTML = `${data.total.toLocaleString()} universities`;

    // Meta
    const meta = document.getElementById('cdMeta');
    if (meta) meta.innerHTML = `Showing <strong>${data.universities.length}</strong> of <strong>${data.total.toLocaleString()}</strong> universities${search?` matching "<strong>${escHtml(search)}</strong>"` : ''}`;

    // Grid
    const grid = document.getElementById('cdGrid');
    if (grid) {
      if (data.universities.length === 0) {
        grid.innerHTML = `<div class="empty-state"><p>No universities found.</p></div>`;
      } else {
        grid.innerHTML = `<div class="uni-grid">${data.universities.map(u => uniCardHTML(u)).join('')}</div>`;
      }
    }

    // Pagination
    const pages = document.getElementById('cdPages');
    if (pages && data.pages > 1) {
      const mb = (p,l) => `<button class="page-btn ${p===page?'active':''}"
        onclick="renderCountryDetail('${countryName.replace(/'/g,"\\'")}',${p},'${escHtml(search)}','${sort}')">${l}</button>`;
      let b='';
      if(page>0) b+=mb(page-1,'‹ Prev');
      for(let i=Math.max(0,page-2);i<=Math.min(data.pages-1,page+2);i++) b+=mb(i,i+1);
      if(page<data.pages-1) b+=mb(page+1,'Next ›');
      pages.innerHTML=`<div class="pagination">${b}</div>`;
    }

  } catch (err) {
    console.error('Country detail error:', err);
    const grid = document.getElementById('cdGrid');
    if (grid) grid.innerHTML = `<div class="empty-state"><p>Could not load universities.</p></div>`;
  }
}