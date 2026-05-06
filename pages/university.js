// ═══════════════════════════════════════════════
// UNIROUTE — university.js
// ═══════════════════════════════════════════════

const FOCUS_MAP    = { CO:'Comprehensive', FO:'Focused', FC:'Fully Comprehensive', SP:'Specialist' };
const RESEARCH_MAP = { VH:'Very High', HI:'High', MD:'Medium', LO:'Low' };
const SIZE_MAP     = { S:'Small', M:'Medium', L:'Large', XL:'Extra Large' };

async function renderUniversity(params={}) {
  const dv = document.getElementById('dynamicView');

  // Show loading cover immediately
  dv.innerHTML = `
    <div class="page-wrap uni-detail-wrap">
      ${backBtn('Back')}
      <div class="detail-cover" style="background:linear-gradient(160deg,#2a2a2a 0%,#181818 55%,#0f0f0f 100%)">
        <div class="detail-cover-content">
          <div class="detail-identity">
            <span class="detail-alpha2">—</span>
            <div class="detail-identity-text">
              <span class="detail-rank-badge">Loading…</span>
              <h2 class="detail-uni-name">Loading university…</h2>
            </div>
          </div>
        </div>
      </div>
      <div style="padding:40px 28px">
        <div class="api-loading"><div class="loading-spinner"></div><p>Loading details…</p></div>
      </div>
    </div>`;

  try {
    const u = await apiGetUniversity(params.id);
    _renderUniversityData(u, params.tab || 'overview');
  } catch(err) {
    console.error('University load error:', err);
    dv.innerHTML = `
      <div class="coming-soon">
        <h2>Not Found</h2>
        <p>This university could not be found.</p>
        <button class="back-btn" onclick="goBack()">← Back</button>
      </div>`;
  }
}

// Store current university so tabs can access it without serialization
let _currentUni = null;

function _switchTab(tab) {
  if (!_currentUni) return;
  if (tab === 'nearby') {
    // Update active tab visually then load
    document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active', i===2));
    _loadNearby(_currentUni);
  } else {
    _renderUniversityData(_currentUni, tab);
  }
}

function _renderUniversityData(u, activeTab) {
  _currentUni = u; // always update
  const dv = document.getElementById('dynamicView');
  if (!dv) return;

  const alpha2  = (u.alpha2||'').toUpperCase() || '—';
  const rc      = rankColor(u.rank);
  const rankTxt = u.rank ? `#${u.rank}` : 'Unranked';
  const domain  = u.domain || null;

  const scores = [
    { label:'QS Overall',    val: u.overall  },
    { label:'Academic Rep.', val: u.ar_score },
    { label:'Employer Rep.', val: u.er_score },
  ].filter(m => m.val && parseFloat(m.val) > 0);

  dv.innerHTML = `
    <div class="page-wrap uni-detail-wrap">
      ${backBtn('Back')}

      <div class="detail-cover" style="background:linear-gradient(160deg,${rc}55 0%,#181818 55%,#0f0f0f 100%)">
        <div class="detail-cover-content">
          <div class="detail-identity">
            <span class="detail-alpha2">${alpha2}</span>
            <div class="detail-identity-text">
              <span class="detail-rank-badge" style="border-color:${rc};color:${rc}">${rankTxt}</span>
              <h2 class="detail-uni-name">${escHtml(u.name)}</h2>
              <p class="detail-location">${u.state ? escHtml(u.state)+', ' : ''}${escHtml(u.country)}</p>
              ${domain ? `<a class="detail-web" href="${fixDomain(domain)}" target="_blank" rel="noopener">${domain}</a>` : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="detail-tabs">
        <button class="tab-btn ${activeTab==='overview'?'active':''}"
          onclick="_switchTab('overview')">Overview</button>
        <button class="tab-btn ${activeTab==='metrics'?'active':''}"
          onclick="_switchTab('metrics')">QS Metrics</button>
        <button class="tab-btn ${activeTab==='nearby'?'active':''}"
          onclick="_switchTab('nearby')">
          More in ${escHtml(u.country)}
        </button>
      </div>

      <div class="tab-content" id="uniTabContent">
        ${activeTab === 'overview' ? _overviewTab(u, scores, rc) : ''}
        ${activeTab === 'metrics'  ? _metricsTab(u, scores, rc) : ''}
      </div>
    </div>`;
}

function _overviewTab(u, scores, rc) {
  return `
    <div class="overview-grid">
      <div class="overview-main">
        <h3 class="panel-title">Institutional Profile</h3>
        <div class="profile-grid">
          <div class="profile-item"><span class="pi-label">Country</span><span class="pi-val">${escHtml(u.country)}</span></div>
          ${u.state  ? `<div class="profile-item"><span class="pi-label">State / Province</span><span class="pi-val">${escHtml(u.state)}</span></div>` : ''}
          ${u.status ? `<div class="profile-item"><span class="pi-label">Status</span><span class="pi-val">${escHtml(u.status)}</span></div>` : ''}
          ${u.size   ? `<div class="profile-item"><span class="pi-label">Size</span><span class="pi-val">${SIZE_MAP[u.size]||u.size}</span></div>` : ''}
          ${u.focus  ? `<div class="profile-item"><span class="pi-label">Academic Focus</span><span class="pi-val">${FOCUS_MAP[u.focus]||u.focus}</span></div>` : ''}
          ${u.research?`<div class="profile-item"><span class="pi-label">Research Intensity</span><span class="pi-val">${RESEARCH_MAP[u.research]||u.research}</span></div>` : ''}
          ${u.region ? `<div class="profile-item"><span class="pi-label">Region</span><span class="pi-val">${escHtml(u.region)}</span></div>` : ''}
          ${u.domain ? `<div class="profile-item"><span class="pi-label">Website</span><span class="pi-val"><a href="${fixDomain(u.domain)}" target="_blank">${u.domain}</a></span></div>` : ''}
        </div>

        ${u.overall ? `
        <div class="score-bar-section" style="margin-top:28px">
          <div class="score-bar-header">
            <h4 class="panel-subtitle">QS Overall Score</h4>
            <span class="score-bar-num">${u.overall}<span class="score-bar-denom">/100</span></span>
          </div>
          <div class="score-bar-wrap">
            <div class="score-bar-fill" style="width:${u.overall}%;background:linear-gradient(90deg,${rc},${rc}66)"></div>
          </div>
        </div>` : `
        <div class="unranked-notice" style="margin-top:24px">
          <span class="notice-icon">i</span>
          <p>Not listed in QS World University Rankings 2026.</p>
        </div>`}

        ${u.domain ? `<a class="website-btn" href="${fixDomain(u.domain)}" target="_blank" rel="noopener" style="margin-top:24px;display:inline-flex">Visit Official Website</a>` : ''}
      </div>

      ${scores.length > 0 ? `
      <div class="overview-side">
        <div class="side-card">
          <h4>QS Scores</h4>
          <div class="qs-scores-list">
            ${scores.map(m=>`
              <div class="qs-score-row">
                <span class="qsr-label">${m.label}</span>
                <div class="qsr-bar-wrap"><div class="qsr-bar" style="width:${Math.min(parseFloat(m.val),100)}%;background:${rc}"></div></div>
                <span class="qsr-val" style="color:${rc}">${m.val}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>` : ''}
    </div>`;
}

function _metricsTab(u, scores, rc) {
  if (scores.length === 0) return `
    <div class="empty-state" style="padding:50px 0">
      <p>No QS metrics available for this university.</p>
      <button class="ghost-btn" onclick="navigateTo('rank')" style="margin-top:12px">Browse QS Rankings</button>
    </div>`;

  return `
    <div class="metrics-page">
      <div class="metrics-full-grid">
        ${scores.map(m=>`
          <div class="metric-card-full">
            <div class="mcf-header">
              <span class="mcf-label">${m.label}</span>
              <span class="mcf-val" style="color:${rc}">${m.val}</span>
            </div>
            <div class="mcf-bar-wrap"><div class="mcf-bar" style="width:${Math.min(parseFloat(m.val),100)}%;background:linear-gradient(90deg,${rc},${rc}88)"></div></div>
            <span class="mcf-sub">${m.val} out of 100</span>
          </div>`).join('')}
      </div>
      ${(u.size||u.focus||u.research||u.status) ? `
      <h3 class="panel-title" style="margin-top:32px">Institutional Indicators</h3>
      <div class="indicators-grid">
        ${u.status   ?`<div class="indicator-item"><span class="ind-label">Status</span><span class="ind-val">${escHtml(u.status)}</span></div>`:''}
        ${u.size     ?`<div class="indicator-item"><span class="ind-label">Size</span><span class="ind-val">${SIZE_MAP[u.size]||u.size}</span></div>`:''}
        ${u.focus    ?`<div class="indicator-item"><span class="ind-label">Academic Focus</span><span class="ind-val">${FOCUS_MAP[u.focus]||u.focus}</span></div>`:''}
        ${u.research ?`<div class="indicator-item"><span class="ind-label">Research Intensity</span><span class="ind-val">${RESEARCH_MAP[u.research]||u.research}</span></div>`:''}
        ${u.region   ?`<div class="indicator-item"><span class="ind-label">QS Region</span><span class="ind-val">${escHtml(u.region)}</span></div>`:''}
      </div>` : ''}
    </div>`;
}

async function _loadNearby(u) {
  const tabContent = document.getElementById('uniTabContent');
  if (!tabContent) return;

  // Update tab active state
  document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active', i===2));

  tabContent.innerHTML = `<div class="api-loading"><div class="loading-spinner"></div><p>Loading universities in ${escHtml(u.country)}…</p></div>`;

  try {
    const data = await apiGetCountryUniversities(u.country, { sort:'rank', limit:6 });
    const nearby = data.universities.filter(x => x.id !== u.id);

    tabContent.innerHTML = `
      <div class="nearby-page">
        <div class="nearby-header">
          <h3 class="panel-title">Ranked universities in ${escHtml(u.country)}</h3>
          <button class="ghost-btn" onclick="navigateTo('countries',{country:'${u.country.replace(/'/g,"\\'")}'})"
            >Browse all ${data.total.toLocaleString()} →</button>
        </div>
        ${nearby.length === 0
          ? `<div class="empty-state" style="padding:40px 0"><p>No other ranked universities found.</p></div>`
          : `<div class="uni-grid">${nearby.map(x=>uniCardHTML(x)).join('')}</div>`
        }
      </div>`;
  } catch(err) {
    tabContent.innerHTML = `<div class="empty-state"><p>Could not load nearby universities.</p></div>`;
  }
}

// ── University Browser ──────────────────────────
let _uniBrowserState = { q:'', sort:'rank', page:0, rankedOnly:false };

async function renderUniversityBrowser(params={}) {
  _uniBrowserState = { ..._uniBrowserState, ...params };
  if (Object.keys(params).length > 0 && params.page === undefined) _uniBrowserState.page = 0;

  const dv = document.getElementById('dynamicView');
  const alreadyRendered = !!document.getElementById('uniBrowserSearch');
  if (!alreadyRendered) _renderUniBrowserShell();
  await _runUniBrowserUpdate();
}

function _renderUniBrowserShell() {
  const dv = document.getElementById('dynamicView');
  const { q, sort, rankedOnly } = _uniBrowserState;

  dv.innerHTML = `
    <div class="page-wrap">
      <div class="page-header">
        <div>
          <h2 class="page-title">All Universities</h2>
          <p class="page-subtitle" id="ubSubtitle">Loading…</p>
        </div>
      </div>
      <div class="uni-toolbar" style="padding:0 28px 12px">
        <input class="toolbar-search" id="uniBrowserSearch" type="text"
          placeholder="Search by name, country or domain…"
          value="${escHtml(q)}" autocomplete="off" />
        <div class="sort-row">
          <label>Sort:</label>
          <select class="filter-select" id="uniBrowserSort">
            <option value="rank"  ${sort==='rank' ?'selected':''}>By Rank</option>
            <option value="name"  ${sort==='name' ?'selected':''}>A – Z</option>
          </select>
        </div>
        <label class="ranked-toggle">
          <input type="checkbox" id="uniBrowserRankedOnly" ${rankedOnly?'checked':''}/>
          <span>Ranked only</span>
        </label>
      </div>
      <div id="uniBrowserMeta" class="results-meta" style="padding:0 28px 10px"></div>
      <div id="uniBrowserGrid"></div>
      <div id="uniBrowserPagination"></div>
    </div>`;

  const inp    = document.getElementById('uniBrowserSearch');
  const sortEl = document.getElementById('uniBrowserSort');
  const rankCb = document.getElementById('uniBrowserRankedOnly');

  let timer;
  inp.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { _uniBrowserState.q=inp.value.trim(); _uniBrowserState.page=0; _runUniBrowserUpdate(); }, 350);
  });
  sortEl.addEventListener('change', () => { _uniBrowserState.sort=sortEl.value; _uniBrowserState.page=0; _runUniBrowserUpdate(); });
  rankCb.addEventListener('change', () => { _uniBrowserState.rankedOnly=rankCb.checked; _uniBrowserState.page=0; _runUniBrowserUpdate(); });
  inp.focus();
}

async function _runUniBrowserUpdate() {
  const { q, sort, page, rankedOnly } = _uniBrowserState;

  const gridEl = document.getElementById('uniBrowserGrid');
  if (gridEl) gridEl.innerHTML = `<div class="api-loading" style="padding:0 28px"><div class="loading-spinner"></div></div>`;

  try {
    const data = await apiSearch({ q, sort, ranked: rankedOnly, page, limit:24 });

    const sub = document.getElementById('ubSubtitle');
    if (sub) sub.textContent = `${data.total.toLocaleString()} universities`;

    const metaEl = document.getElementById('uniBrowserMeta');
    if (metaEl) metaEl.innerHTML = `<span><strong>${data.total.toLocaleString()}</strong> universities${q?` matching "<strong>${escHtml(q)}</strong>"`:''}
      </span><span class="results-page-info">${data.pages>1?`Page ${page+1} of ${data.pages}`:''}</span>`;

    if (gridEl) gridEl.innerHTML = data.universities.length === 0
      ? `<div class="empty-state"><p>No universities found.</p></div>`
      : `<div class="uni-grid" style="padding:0 28px 8px">${data.universities.map(u=>uniCardHTML(u)).join('')}</div>`;

    const pageEl = document.getElementById('uniBrowserPagination');
    if (pageEl && data.pages > 1) {
      const mb=(p,l)=>`<button class="page-btn ${p===page?'active':''}" data-ubpage="${p}">${l}</button>`;
      let b='';
      if(page>0) b+=mb(page-1,'‹ Prev');
      for(let i=Math.max(0,page-2);i<=Math.min(data.pages-1,page+2);i++) b+=mb(i,i+1);
      if(page<data.pages-1) b+=mb(page+1,'Next ›');
      pageEl.innerHTML=`<div class="pagination">${b}</div>`;
      setTimeout(()=>{
        pageEl.querySelectorAll('[data-ubpage]').forEach(btn=>
          btn.addEventListener('click',()=>{ _uniBrowserState.page=parseInt(btn.dataset.ubpage); _runUniBrowserUpdate(); document.getElementById('mainContent').scrollTop=0; }));
      },0);
    } else if(pageEl) pageEl.innerHTML='';

  } catch(err) {
    console.error('Browser error:', err);
    if(gridEl) gridEl.innerHTML=`<div class="empty-state"><p>Could not load universities.</p></div>`;
  }
}

// ── Smart domain URL helper ──────────────────────
function fixDomain(domain) {
  if (!domain) return '#';
  const parts = domain.replace(/^https?:\/\//,'').split('.');
  return parts.length >= 3 ? 'https://'+parts.join('.') : 'https://www.'+parts.join('.');
}