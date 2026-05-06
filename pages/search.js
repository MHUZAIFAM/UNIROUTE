// ═══════════════════════════════════════════════
// UNIROUTE — search.js
// ═══════════════════════════════════════════════

let _searchState = { q:'', country:'', rankMax:'', region:'', sort:'rank', ranked:false, page:0 };
let _searchLists = null;

async function _getSearchLists() {
  if (!_searchLists) {
    const countries = await apiGetCountries();
    _searchLists = {
      countries: countries.map(c=>c.name).sort(),
      regions:   [...new Set(countries.map(c=>c.region).filter(Boolean))].sort(),
    };
  }
  return _searchLists;
}

function _countriesForRegion(region) {
  if (!_searchLists) return [];
  if (!region) return _searchLists.countries;
  const all = _searchLists.countries;
  // Filter using cached countries data
  const inRegion = new Set(
    (_countriesCache||[]).filter(c=>c.region===region).map(c=>c.name)
  );
  return all.filter(c => inRegion.has(c));
}

async function renderSearch(params={}) {
  _searchState = { ..._searchState, ...params };
  if (Object.keys(params).length > 0 && params.page === undefined) _searchState.page = 0;

  // Get lists first (cached after first call)
  await _getSearchLists();
  _buildSearchShell();
  _runSearch();
}

function _buildSearchShell() {
  const dv = document.getElementById('dynamicView');
  if (!dv) return;
  const { q, country, rankMax, region, sort, ranked } = _searchState;
  const countries = _countriesForRegion(region);
  const regions   = _searchLists?.regions || [];

  dv.innerHTML = `
    <div class="page-wrap search-page">
      <div class="search-hero">
        <input class="search-big" id="sIn" type="text"
          placeholder="Search universities, countries, domains…"
          value="${escHtml(q)}" autocomplete="off" />
        <button class="search-go-btn" id="sGo">Search</button>
      </div>
      <div class="filter-bar">
        <div class="filter-group">
          <label>Region</label>
          <select class="filter-select" id="fReg">
            <option value="">All Regions</option>
            ${regions.map(r=>`<option value="${escHtml(r)}" ${region===r?'selected':''}>${r}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Country</label>
          <select class="filter-select" id="fCnt">
            <option value="">All Countries</option>
            ${countries.map(c=>`<option value="${escHtml(c)}" ${country===c?'selected':''}>${escHtml(c)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Rank Range</label>
          <select class="filter-select" id="fRnk">
            <option value="">Any Rank</option>
            <option value="10"  ${rankMax==='10' ?'selected':''}>Top 10</option>
            <option value="50"  ${rankMax==='50' ?'selected':''}>Top 50</option>
            <option value="100" ${rankMax==='100'?'selected':''}>Top 100</option>
            <option value="200" ${rankMax==='200'?'selected':''}>Top 200</option>
            <option value="500" ${rankMax==='500'?'selected':''}>Top 500</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Sort By</label>
          <select class="filter-select" id="fSrt">
            <option value="rank"    ${sort==='rank'   ?'selected':''}>Rank</option>
            <option value="name"    ${sort==='name'   ?'selected':''}>Name A–Z</option>
            <option value="country" ${sort==='country'?'selected':''}>Country</option>
          </select>
        </div>
        <label class="ranked-toggle">
          <input type="checkbox" id="fRkd" ${ranked?'checked':''}/>
          <span>Ranked only</span>
        </label>
        <button class="filter-reset-btn" id="fRst">Reset</button>
      </div>
      <div id="sFilters"></div>
      <div id="sMeta" class="results-meta"></div>
      <div id="sGrid"></div>
      <div id="sPages"></div>
    </div>`;

  const inp  = document.getElementById('sIn');
  const go   = document.getElementById('sGo');
  const fReg = document.getElementById('fReg');
  const fCnt = document.getElementById('fCnt');
  const fRnk = document.getElementById('fRnk');
  const fSrt = document.getElementById('fSrt');
  const fRkd = document.getElementById('fRkd');
  const fRst = document.getElementById('fRst');

  let timer;
  inp.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { _searchState.q=inp.value.trim(); _searchState.page=0; _runSearch(); }, 400);
  });
  inp.addEventListener('keydown', e => {
    if(e.key==='Enter'){ clearTimeout(timer); _searchState.q=inp.value.trim(); _searchState.page=0; _runSearch(); }
  });
  go.addEventListener('click', () => {
    clearTimeout(timer); _searchState.q=inp.value.trim(); _searchState.page=0; _runSearch();
  });

  fReg.addEventListener('change', () => {
    _searchState.region = fReg.value; _searchState.page=0;
    const valid = _countriesForRegion(fReg.value);
    if (_searchState.country && !valid.includes(_searchState.country)) _searchState.country='';
    fCnt.innerHTML = ['<option value="">All Countries</option>',
      ...valid.map(c=>`<option value="${escHtml(c)}">${escHtml(c)}</option>`)
    ].join('');
    fCnt.value = _searchState.country;
    _runSearch();
  });

  fCnt.addEventListener('change', () => { _searchState.country=fCnt.value; _searchState.page=0; _runSearch(); });
  fRnk.addEventListener('change', () => { _searchState.rankMax=fRnk.value; _searchState.page=0; _runSearch(); });
  fSrt.addEventListener('change', () => { _searchState.sort   =fSrt.value; _searchState.page=0; _runSearch(); });
  fRkd.addEventListener('change', () => { _searchState.ranked =fRkd.checked; _searchState.page=0; _runSearch(); });

  fRst.addEventListener('click', () => {
    _searchState = { q:'', country:'', rankMax:'', region:'', sort:'rank', ranked:false, page:0 };
    _buildSearchShell(); _runSearch();
  });

  inp.focus();
}

async function _runSearch() {
  // Show loading in grid
  const gridEl = document.getElementById('sGrid');
  if (gridEl) gridEl.innerHTML = `<div class="api-loading" style="padding:0 28px"><div class="loading-spinner"></div><p>Searching…</p></div>`;

  const metaEl = document.getElementById('sMeta');
  if (metaEl) metaEl.innerHTML = '';

  try {
    const data = await apiSearch({ ..._searchState, limit: 24 });

    // Active filter pills
    const filtersEl = document.getElementById('sFilters');
    if (filtersEl) {
      const { q, region, country, rankMax, ranked } = _searchState;
      const pills = [];
      if (q)       pills.push(`<span class="active-pill">"${escHtml(q)}" <button data-clr="q">×</button></span>`);
      if (region)  pills.push(`<span class="active-pill">${escHtml(region)} <button data-clr="region">×</button></span>`);
      if (country) pills.push(`<span class="active-pill">${escHtml(country)} <button data-clr="country">×</button></span>`);
      if (rankMax) pills.push(`<span class="active-pill">Top ${rankMax} <button data-clr="rankMax">×</button></span>`);
      if (ranked)  pills.push(`<span class="active-pill">Ranked only <button data-clr="ranked">×</button></span>`);
      filtersEl.innerHTML = pills.length ? `<div class="active-filters">${pills.join('')}</div>` : '';
      filtersEl.querySelectorAll('[data-clr]').forEach(btn => {
        btn.addEventListener('click', () => {
          const k = btn.dataset.clr;
          if (k==='ranked') { _searchState.ranked=false; const cb=document.getElementById('fRkd'); if(cb) cb.checked=false; }
          else if (k==='region') {
            _searchState.region=''; _searchState.country='';
            const fR=document.getElementById('fReg'); if(fR) fR.value='';
            const fC=document.getElementById('fCnt');
            if(fC) { fC.innerHTML=['<option value="">All Countries</option>',...(_searchLists?.countries||[]).map(c=>`<option value="${escHtml(c)}">${escHtml(c)}</option>`)].join(''); }
          } else {
            _searchState[k]='';
            const el=document.getElementById(k==='country'?'fCnt':k==='rankMax'?'fRnk':null);
            if(el) el.value='';
          }
          _searchState.page=0; _runSearch();
        });
      });
    }

    // Meta
    if (metaEl) metaEl.innerHTML = `
      <span><strong>${data.total.toLocaleString()}</strong> universities${_searchState.q?` for "<strong>${escHtml(_searchState.q)}</strong>"`:''}</span>
      <span class="results-page-info">${data.pages>1?`Page ${_searchState.page+1} of ${data.pages}`:''}</span>`;

    // Grid
    if (gridEl) {
      if (data.universities.length === 0) {
        gridEl.innerHTML = `
          <div class="empty-state-rich">
            <h3 class="es-title">No universities found</h3>
            <p class="es-sub">Try broadening your search or removing some filters.</p>
            <div class="es-actions">
              <button class="ghost-btn" id="esClear">Clear all filters</button>
            </div>
          </div>`;
        document.getElementById('esClear')?.addEventListener('click', () => {
          _searchState={q:'',country:'',rankMax:'',region:'',sort:'rank',ranked:false,page:0};
          _buildSearchShell(); _runSearch();
        });
      } else {
        gridEl.innerHTML = `<div class="uni-grid" style="padding:0 28px 8px">${data.universities.map(u=>uniCardHTML(u)).join('')}</div>`;
      }
    }

    // Pagination
    const pageEl = document.getElementById('sPages');
    if (pageEl) {
      if (data.pages > 1) {
        const cur = _searchState.page;
        const mb  = (p,l) => `<button class="page-btn ${p===cur?'active':''}" data-sp="${p}">${l}</button>`;
        let b='';
        if(cur>0) b+=mb(cur-1,'‹ Prev');
        for(let i=Math.max(0,cur-2);i<=Math.min(data.pages-1,cur+2);i++) b+=mb(i,i+1);
        if(cur<data.pages-1) b+=mb(cur+1,'Next ›');
        pageEl.innerHTML=`<div class="pagination">${b}</div>`;
        setTimeout(()=>{
          pageEl.querySelectorAll('[data-sp]').forEach(btn=>
            btn.addEventListener('click',()=>{
              _searchState.page=parseInt(btn.dataset.sp);
              _runSearch();
              document.getElementById('mainContent').scrollTop=0;
            }));
        },0);
      } else pageEl.innerHTML='';
    }

  } catch(err) {
    console.error('Search error:', err);
    const g=document.getElementById('sGrid');
    if(g) g.innerHTML=`<div class="empty-state"><p>Search failed. Is the server running?</p></div>`;
  }
}