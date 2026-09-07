// ═══════════════════════════════════════════════
// UNIROUTE — university.js
// ═══════════════════════════════════════════════

const FOCUS_MAP    = { CO:'Comprehensive', FO:'Focused', FC:'Fully Comprehensive', SP:'Specialist' };
const RESEARCH_MAP = { VH:'Very High', HI:'High', MD:'Medium', LO:'Low' };
const SIZE_MAP     = { S:'Small', M:'Medium', L:'Large', XL:'Extra Large' };
const DEGREE_MAP   = {
  'BSc':      'Bachelor of Science',
  'BA':       'Bachelor of Arts',
  'BSc/BA':   'Bachelor\'s (BSc / BA)',
  'BEng':     'Bachelor of Engineering',
  'BBA':      'Bachelor of Business Administration',
  'MSc':      'Master of Science',
  'MA':       'Master of Arts',
  'MSc/MA':   'Master\'s (MSc / MA)',
  'MEng':     'Master of Engineering',
  'MBA':      'Master of Business Administration',
  'MPhil':    'Master of Philosophy',
  'LLM':      'Master of Laws',
  'MArch':    'Master of Architecture',
  'PhD':      'Doctor of Philosophy (PhD)',
  'MD':       'Doctor of Medicine (MD)',
  'JD':       'Juris Doctor (JD)',
  'EdD':      'Doctor of Education',
  'Diploma':  'Diploma',
  'Certificate': 'Certificate',
};

async function renderUniversity(params={}) {
  const dv = document.getElementById('dynamicView');

  dv.innerHTML = `
    <div class="page-wrap uni-detail-wrap">
      ${backBtn('Back')}
      <div class="detail-cover">
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
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const idx = ['overview','admissions','academics','nearby'].indexOf(tab);
  if (idx >= 0) document.querySelectorAll('.tab-btn')[idx]?.classList.add('active');

  if (tab === 'nearby') {
    _loadNearby(_currentUni);
  } else {
    const content = document.getElementById('uniTabContent');
    if (!content) return;
    const rc = rankColor(_currentUni.rank);
    if (tab === 'overview')   content.innerHTML = _overviewTab(_currentUni, rc);
    if (tab === 'admissions') content.innerHTML = _admissionsTab(_currentUni, rc);
    if (tab === 'academics') {
      content.innerHTML = _academicsTab(_currentUni, rc);
      _loadUniversityPrograms(_currentUni);
    }
  }
}

function _renderUniversityData(u, activeTab) {
  _currentUni = u;
  const dv = document.getElementById('dynamicView');
  if (!dv) return;

  const alpha2  = (u.alpha2||'').toUpperCase() || '—';
  const rc      = rankColor(u.rank);
  const rankTxt = u.rank ? `#${u.rank}` : 'Unranked';
  const domain  = u.domain || null;

  // Quick stats for cover banner
  const quickStats = [
    u.founded        ? { label:'Founded',  val: u.founded }                           : null,
    u.students       ? { label:'Students', val: Number(u.students).toLocaleString() } : null,
    u.public_private ? { label:'Type',     val: u.public_private }                    : null,
  ].filter(Boolean);

  dv.innerHTML = `
    <div class="page-wrap uni-detail-wrap">
      ${backBtn('Back')}

      <div class="detail-cover">
        <div class="detail-cover-content">
          <div class="detail-identity">
            <span class="detail-alpha2">${alpha2}</span>
            <div class="detail-identity-text">
              <span class="detail-rank-badge" style="border-color:${rc};color:${rc}">${rankTxt}</span>
              <h2 class="detail-uni-name">${escHtml(u.name)}</h2>
              <p class="detail-location">${u.city ? escHtml(u.city)+', ' : u.state ? escHtml(u.state)+', ' : ''}${escHtml(u.country)}</p>
              ${domain ? `<a class="detail-web" href="${fixDomain(domain)}" target="_blank" rel="noopener">${domain}</a>` : ''}
            </div>
          </div>
          ${quickStats.length > 0 ? `
          <div class="cover-quick-stats">
            ${quickStats.map(s => `
              <div class="cqs-item">
                <span class="cqs-val">${escHtml(String(s.val))}</span>
                <span class="cqs-label">${s.label}</span>
              </div>`).join('<div class="cqs-divider"></div>')}
          </div>` : ''}
        </div>
      </div>

      <div class="detail-tabs">
        <button class="tab-btn ${activeTab==='overview'  ?'active':''}" onclick="_switchTab('overview')">Overview</button>
        <button class="tab-btn ${activeTab==='admissions'?'active':''}" onclick="_switchTab('admissions')">Admissions</button>
        <button class="tab-btn ${activeTab==='academics' ?'active':''}" onclick="_switchTab('academics')">Academics</button>
        <button class="tab-btn ${activeTab==='nearby'    ?'active':''}" onclick="_switchTab('nearby')">More in ${escHtml(u.country)}</button>
      </div>

      <div class="tab-content" id="uniTabContent">
        ${activeTab === 'overview'   ? _overviewTab(u, rc)   : ''}
        ${activeTab === 'admissions' ? _admissionsTab(u, rc) : ''}
        ${activeTab === 'academics'  ? _academicsTab(u, rc)  : ''}
      </div>
    </div>`;

  // The Academics panel is filled asynchronously from the API
  if (activeTab === 'academics') _loadUniversityPrograms(u);
}

// ── Tab 1: Overview ────────────────────────────
function _overviewTab(u, rc) {
  const ri = rankInk(u.rank);
  const scores = [
    { label:'QS Overall',    val: u.overall  },
    { label:'Academic Rep.', val: u.ar_score },
    { label:'Employer Rep.', val: u.er_score },
  ].filter(m => m.val && parseFloat(m.val) > 0);

  return `
    <div class="overview-grid">
      <div class="overview-main">
        <h3 class="panel-title">Institutional Profile</h3>
        <div class="profile-grid">
          <div class="profile-item"><span class="pi-label">Country</span><span class="pi-val">${escHtml(u.country)}</span></div>
          ${u.city         ? `<div class="profile-item"><span class="pi-label">City</span><span class="pi-val">${escHtml(u.city)}</span></div>` : ''}
          ${u.founded      ? `<div class="profile-item"><span class="pi-label">Founded</span><span class="pi-val">${escHtml(u.founded)}</span></div>` : ''}
          ${u.public_private ? `<div class="profile-item"><span class="pi-label">Type</span><span class="pi-val">${escHtml(u.public_private)}</span></div>` : u.status ? `<div class="profile-item"><span class="pi-label">Status</span><span class="pi-val">${escHtml(u.status)}</span></div>` : ''}
          ${u.students     ? `<div class="profile-item"><span class="pi-label">Students</span><span class="pi-val">${Number(u.students).toLocaleString()}</span></div>` : ''}
          ${u.int_students_pct ? `<div class="profile-item"><span class="pi-label">Intl. Students</span><span class="pi-val">${escHtml(u.int_students_pct)}</span></div>` : ''}
          ${u.size         ? `<div class="profile-item"><span class="pi-label">Size</span><span class="pi-val">${SIZE_MAP[u.size]||u.size}</span></div>` : ''}
          ${u.focus        ? `<div class="profile-item"><span class="pi-label">Academic Focus</span><span class="pi-val">${FOCUS_MAP[u.focus]||u.focus}</span></div>` : ''}
          ${u.research     ? `<div class="profile-item"><span class="pi-label">Research</span><span class="pi-val">${RESEARCH_MAP[u.research]||u.research}</span></div>` : ''}
          ${u.region       ? `<div class="profile-item"><span class="pi-label">Region</span><span class="pi-val">${escHtml(u.region)}</span></div>` : ''}
          ${u.teaching_language ? `<div class="profile-item"><span class="pi-label">Language</span><span class="pi-val">${escHtml(u.teaching_language)}</span></div>` : ''}
          ${u.domain       ? `<div class="profile-item"><span class="pi-label">Website</span><span class="pi-val"><a href="${fixDomain(u.domain)}" target="_blank">${u.domain}</a></span></div>` : ''}
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

      <div class="overview-side">
        ${scores.length > 0 ? `
        <div class="side-card">
          <h4>QS Scores</h4>
          <div class="qs-scores-list">
            ${scores.map(m=>`
              <div class="qs-score-row">
                <span class="qsr-label">${m.label}</span>
                <div class="qsr-bar-wrap"><div class="qsr-bar" style="width:${Math.min(parseFloat(m.val),100)}%;background:${rc}"></div></div>
                <span class="qsr-val" style="color:${ri}">${m.val}</span>
              </div>`).join('')}
          </div>
        </div>` : ''}

        ${(u.tuition_ug_intl || u.acceptance_rate) ? `
        <div class="side-card" style="margin-top:14px">
          <h4>Quick Facts</h4>
          <div class="facts-list">
            ${u.acceptance_rate  ? `<li><span>Acceptance Rate</span><strong>${escHtml(u.acceptance_rate)}</strong></li>`   : ''}
            ${u.tuition_ug_intl  ? `<li><span>UG Tuition (Intl.)</span><strong>${escHtml(u.tuition_ug_intl)}</strong></li>` : ''}
            ${u.tuition_pg_intl  ? `<li><span>PG Tuition (Intl.)</span><strong>${escHtml(u.tuition_pg_intl)}</strong></li>` : ''}
            ${u.intakes          ? `<li><span>Intakes</span><strong>${escHtml(u.intakes)}</strong></li>`                    : ''}
          </div>
        </div>` : ''}

        ${(u.scholarships === 'Yes' || u.phd_funded === 'Yes') ? `
        <div class="side-card" style="margin-top:14px">
          <h4>Financial Aid</h4>
          <div class="aid-list">
            ${u.scholarships === 'Yes' ? `<div class="aid-item aid-yes">Scholarships available</div>` : ''}
            ${u.phd_funded   === 'Yes' ? `<div class="aid-item aid-yes">PhD fully funded</div>`       : ''}
          </div>
        </div>` : ''}
      </div>
    </div>`;
}

// ── Tab 2: Admissions ──────────────────────────
function _admissionsTab(u, rc) {
  const ri = rankInk(u.rank);
  const hasAdmissions = u.acceptance_rate || u.tuition_ug_intl || u.tuition_pg_intl ||
                        u.ielts_min || u.toefl_min || u.gpa_min ||
                        u.deadline_ug || u.deadline_pg || u.intakes || u.living_cost;

  if (!hasAdmissions) return `
    <div class="empty-state" style="padding:50px 0">
      <p>Admissions data not available for this university.</p>
      ${u.domain ? `<a class="website-btn" href="${fixDomain(u.domain)}" target="_blank" rel="noopener" style="margin-top:16px;display:inline-flex">Check Official Website</a>` : ''}
    </div>`;

  return `
    <div class="admissions-wrap">

      ${(u.acceptance_rate || u.tuition_ug_intl || u.tuition_pg_intl || u.living_cost) ? `
      <div class="adm-section">
        <h3 class="panel-title">Key Facts</h3>
        <div class="adm-stats-grid">
          ${u.acceptance_rate ? `<div class="adm-stat-card"><span class="asc-icon">${ICONS.target}</span><span class="asc-val">${escHtml(u.acceptance_rate)}</span><span class="asc-label">Acceptance Rate</span></div>` : ''}
          ${u.tuition_ug_intl ? `<div class="adm-stat-card"><span class="asc-icon">${ICONS.dollar}</span><span class="asc-val">${escHtml(u.tuition_ug_intl)}</span><span class="asc-label">UG Tuition / Year</span></div>` : ''}
          ${u.tuition_pg_intl ? `<div class="adm-stat-card"><span class="asc-icon">${ICONS.dollar}</span><span class="asc-val">${escHtml(u.tuition_pg_intl)}</span><span class="asc-label">PG Tuition / Year</span></div>` : ''}
          ${u.living_cost     ? `<div class="adm-stat-card"><span class="asc-icon">${ICONS.home}</span><span class="asc-val">${escHtml(u.living_cost)}</span><span class="asc-label">Living Cost / Year</span></div>` : ''}
        </div>
      </div>` : ''}

      ${u.intakes ? `
      <div class="adm-section">
        <h3 class="panel-title">Intake Seasons</h3>
        <div class="intake-chips">
          ${u.intakes.split(',').map(i => `<span class="intake-chip">${escHtml(i.trim())}</span>`).join('')}
        </div>
      </div>` : ''}

      ${(u.deadline_ug || u.deadline_pg) ? `
      <div class="adm-section">
        <h3 class="panel-title">Application Deadlines</h3>
        <div class="deadline-grid">
          ${u.deadline_ug ? `<div class="deadline-card"><span class="dl-type">Undergraduate</span><span class="dl-date">${escHtml(u.deadline_ug)}</span></div>` : ''}
          ${u.deadline_pg ? `<div class="deadline-card"><span class="dl-type">Postgraduate</span><span class="dl-date">${escHtml(u.deadline_pg)}</span></div>` : ''}
        </div>
      </div>` : ''}

      ${(u.ielts_min || u.toefl_min || u.gpa_min) ? `
      <div class="adm-section">
        <h3 class="panel-title">Entry Requirements</h3>
        <div class="req-grid">
          ${u.ielts_min ? `<div class="req-card"><span class="req-name">IELTS</span><span class="req-val" style="color:${ri}">${escHtml(u.ielts_min)}</span><span class="req-sub">Minimum score</span></div>` : ''}
          ${u.toefl_min ? `<div class="req-card"><span class="req-name">TOEFL iBT</span><span class="req-val" style="color:${ri}">${escHtml(u.toefl_min)}</span><span class="req-sub">Minimum score</span></div>` : ''}
          ${u.gpa_min   ? `<div class="req-card"><span class="req-name">GPA</span><span class="req-val" style="color:${ri}">${escHtml(u.gpa_min)}</span><span class="req-sub">Minimum GPA</span></div>` : ''}
        </div>
      </div>` : ''}

      ${(u.scholarships === 'Yes' || u.phd_funded === 'Yes') ? `
      <div class="adm-section">
        <h3 class="panel-title">Financial Aid</h3>
        <div class="aid-grid">
          ${u.scholarships === 'Yes' ? `<div class="aid-card aid-yes"><span class="aid-icon">${ICONS.check}</span><div><strong>Scholarships Available</strong><p>International students may apply for scholarships</p></div></div>` : ''}
          ${u.phd_funded   === 'Yes' ? `<div class="aid-card aid-yes"><span class="aid-icon">${ICONS.check}</span><div><strong>PhD Fully Funded</strong><p>PhD programs are typically fully funded</p></div></div>` : ''}
        </div>
      </div>` : ''}

      <p class="adm-disclaimer">Data is approximate. Always verify with the official university website before applying.</p>
    </div>`;
}

// ── Tab 3: Academics ───────────────────────────
function _academicsTab(u, rc) {
  const ri = rankInk(u.rank);
  const scores = [
    { label:'QS Overall',    val: u.overall  },
    { label:'Academic Rep.', val: u.ar_score },
    { label:'Employer Rep.', val: u.er_score },
  ].filter(m => m.val && parseFloat(m.val) > 0);

  return `
    <div class="academics-wrap">

      <div class="adm-section">
        <h3 class="panel-title">Programs &amp; Fields</h3>
        <div id="uniProgramsPanel">
          <div class="api-loading"><div class="loading-spinner"></div><p>Loading programs…</p></div>
        </div>
      </div>

      ${scores.length > 0 ? `
      <div class="adm-section">
        <h3 class="panel-title">QS Scores</h3>
        <div class="metrics-full-grid">
          ${scores.map(m=>`
            <div class="metric-card-full">
              <div class="mcf-header">
                <span class="mcf-label">${m.label}</span>
                <span class="mcf-val" style="color:${ri}">${m.val}</span>
              </div>
              <div class="mcf-bar-wrap"><div class="mcf-bar" style="width:${Math.min(parseFloat(m.val),100)}%;background:linear-gradient(90deg,${rc},${rc}88)"></div></div>
              <span class="mcf-sub">${m.val} out of 100</span>
            </div>`).join('')}
        </div>
      </div>` : ''}

      ${(u.size || u.focus || u.research || u.status) ? `
      <div class="adm-section">
        <h3 class="panel-title">Institutional Indicators</h3>
        <div class="indicators-grid">
          ${u.status   ? `<div class="indicator-item"><span class="ind-label">Status</span><span class="ind-val">${escHtml(u.status)}</span></div>` : ''}
          ${u.size     ? `<div class="indicator-item"><span class="ind-label">Size</span><span class="ind-val">${SIZE_MAP[u.size]||u.size}</span></div>` : ''}
          ${u.focus    ? `<div class="indicator-item"><span class="ind-label">Academic Focus</span><span class="ind-val">${FOCUS_MAP[u.focus]||u.focus}</span></div>` : ''}
          ${u.research ? `<div class="indicator-item"><span class="ind-label">Research Intensity</span><span class="ind-val">${RESEARCH_MAP[u.research]||u.research}</span></div>` : ''}
          ${u.region   ? `<div class="indicator-item"><span class="ind-label">QS Region</span><span class="ind-val">${escHtml(u.region)}</span></div>` : ''}
        </div>
      </div>` : ''}

    </div>`;
}

// Fills the Academics tab's programs panel. Renders an explicit "not recorded
// yet" state rather than guessing which programs a university offers.
async function _loadUniversityPrograms(u) {
  const panel = document.getElementById('uniProgramsPanel');
  if (!panel) return;

  try {
    const data = await apiGetUniversityPrograms(u.id);

    if (data.total === 0) {
      panel.innerHTML = `
        <div class="unranked-notice">
          The programs offered by ${escHtml(u.name)} haven't been recorded yet.
          Program listings are added from verified sources, so nothing is shown here
          until they are — check the university's own site in the meantime.
        </div>`;
      return;
    }

    panel.innerHTML = `
      <p class="results-meta-txt" style="margin-bottom:12px">
        <strong>${data.total}</strong> ${data.total===1?'program':'programs'}
        across ${data.fields.length} ${data.fields.length===1?'field':'fields'}
      </p>
      ${data.fields.map(f => `
        <div class="program-group">
          <h4 class="program-group-title">${escHtml(f.field_name)}</h4>
          <div class="programs-chips">
            ${f.programs.map(p => `
              <span class="program-chip" data-prog="${p.id}">
                ${escHtml(p.name)} <span class="degree-chip">${escHtml(p.degree)}</span>
              </span>`).join('')}
          </div>
        </div>`).join('')}`;

    panel.querySelectorAll('[data-prog]').forEach(el =>
      el.addEventListener('click', () => navigateTo('programs', { programId: el.dataset.prog })));

  } catch (err) {
    console.error('University programs error:', err);
    panel.innerHTML = `<div class="empty-state"><p>Could not load programs.</p></div>`;
  }
}

async function _loadNearby(u) {
  const tabContent = document.getElementById('uniTabContent');
  if (!tabContent) return;

  tabContent.innerHTML = `<div class="api-loading"><div class="loading-spinner"></div><p>Loading universities in ${escHtml(u.country)}…</p></div>`;

  try {
    const data = await apiGetCountryUniversities(u.country, { sort:'rank', limit:7 });
    const nearby = data.universities.filter(x => x.id !== u.id).slice(0, 6);

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