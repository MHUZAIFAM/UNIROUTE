// ═══════════════════════════════════════════════
// UNIROUTE — rank.js
// ═══════════════════════════════════════════════

let _rankLists = null;

async function renderRank(params={}) {
  const dv = document.getElementById('dynamicView');
  const page    = params.page    || 0;
  const search  = params.search  || '';
  const country = params.country || '';
  const region  = params.region  || '';

  // Build shell
  dv.innerHTML = `
    <div class="page-wrap">
      ${backBtn('Home')}
      <div class="page-header">
        <div>
          <h2 class="page-title">QS World Rankings 2026</h2>
          <p class="page-subtitle" id="rankSubtitle">Loading…</p>
        </div>
      </div>
      <div class="filter-bar" style="margin:0 28px 16px">
        <div class="filter-group">
          <label>Search</label>
          <input class="filter-select" id="rankSearch" type="text"
            placeholder="University or country…" value="${escHtml(search)}"
            style="width:220px" />
        </div>
        <div class="filter-group">
          <label>Region</label>
          <select class="filter-select" id="rankRegion">
            <option value="">All Regions</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Country</label>
          <select class="filter-select" id="rankCountry">
            <option value="">All Countries</option>
          </select>
        </div>
      </div>
      <div style="padding:0 28px">
        <p class="results-meta-txt" style="margin-bottom:12px" id="rankMeta"></p>
        <div id="rankTable">
          <div class="api-loading"><div class="loading-spinner"></div><p>Loading rankings…</p></div>
        </div>
        <div id="rankPages"></div>
      </div>
    </div>`;

  // Load filter lists and data in parallel
  try {
    if (!_rankLists) {
      const countries = await apiGetCountries();
      _rankLists = {
        countries: countries.map(c=>c.name).sort(),
        regions:   [...new Set(countries.map(c=>c.region).filter(Boolean))].sort(),
      };
    }

    // Populate filter dropdowns
    const regSel = document.getElementById('rankRegion');
    const cntSel = document.getElementById('rankCountry');
    if (regSel) regSel.innerHTML += _rankLists.regions.map(r=>`<option value="${r}" ${region===r?'selected':''}>${r}</option>`).join('');
    if (cntSel) cntSel.innerHTML += _rankLists.countries.map(c=>`<option value="${escHtml(c)}" ${country===c?'selected':''}>${escHtml(c)}</option>`).join('');

    // Wire filters
    let timer;
    document.getElementById('rankSearch')?.addEventListener('input', function() {
      clearTimeout(timer);
      timer = setTimeout(() => _rankFilter(), 400);
    });
    document.getElementById('rankRegion')?.addEventListener('change', _rankFilter);
    document.getElementById('rankCountry')?.addEventListener('change', _rankFilter);

    // Load rankings
    await _loadRankings(page, search, country, region);

  } catch(err) {
    console.error('Rank error:', err);
    const t = document.getElementById('rankTable');
    if(t) t.innerHTML = `<div class="empty-state"><p>Could not load rankings.</p></div>`;
  }
}

async function _loadRankings(page=0, search='', country='', region='') {
  try {
    const data = await apiGetRankings({ q:search, country, region, page, limit:50 });

    const sub = document.getElementById('rankSubtitle');
    if (sub) sub.textContent = `${data.total.toLocaleString()} ranked universities worldwide`;

    const meta = document.getElementById('rankMeta');
    if (meta) meta.textContent = `${data.total.toLocaleString()} results`;

    const tableEl = document.getElementById('rankTable');
    if (tableEl) {
      if (data.universities.length === 0) {
        tableEl.innerHTML = `<div class="empty-state"><p>No ranked universities found.</p></div>`;
      } else {
        tableEl.innerHTML = `
          <div class="rank-table-wrap">
            <table class="rank-table">
              <thead>
                <tr>
                  <th style="width:70px">Rank</th>
                  <th>University</th>
                  <th>Country</th>
                  <th style="width:90px">QS Score</th>
                  <th style="width:90px">Acad. Rep.</th>
                </tr>
              </thead>
              <tbody>
                ${data.universities.map(u => {
                  const rc = rankColor(u.rank);
                  return `<tr class="rank-row" onclick="navigateTo('university',{id:${u.id}})">
                    <td><span class="rank-num" style="color:${rc}">#${u.rank}</span></td>
                    <td class="rank-name-cell">
                      <span class="rank-alpha2">${(u.alpha2||'').toUpperCase()}</span>
                      <span>${escHtml(u.name)}</span>
                    </td>
                    <td class="rank-country">${escHtml(u.country)}</td>
                    <td><span class="score-pill" style="background:${rc}22;color:${rc}">${u.overall||'—'}</span></td>
                    <td><span class="score-pill">${u.ar_score||'—'}</span></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`;
      }
    }

    // Pagination — use data-* attributes to avoid inline JSON issues
    const pageEl = document.getElementById('rankPages');
    if (pageEl && data.pages > 1) {
      const mb = (p,l) =>
        `<button class="page-btn ${p===page?'active':''}" data-rpage="${p}">${l}</button>`;
      let b='';
      if(page>0) b+=mb(page-1,'‹');
      for(let i=Math.max(0,page-2);i<=Math.min(data.pages-1,page+2);i++) b+=mb(i,i+1);
      if(page<data.pages-1) b+=mb(page+1,'›');
      pageEl.innerHTML=`<div class="pagination">${b}</div>`;
      // Wire clicks
      pageEl.querySelectorAll('[data-rpage]').forEach(btn =>
        btn.addEventListener('click', () => {
          _loadRankings(parseInt(btn.dataset.rpage), search, country, region);
          document.getElementById('mainContent').scrollTop = 0;
        })
      );
    } else if (pageEl) pageEl.innerHTML='';

  } catch(err) {
    console.error('Rankings load error:', err);
    const t = document.getElementById('rankTable');
    if(t) t.innerHTML=`<div class="empty-state"><p>Could not load rankings.</p></div>`;
  }
}

function _rankFilter() {
  const search  = document.getElementById('rankSearch')?.value||'';
  const country = document.getElementById('rankCountry')?.value||'';
  const region  = document.getElementById('rankRegion')?.value||'';
  _loadRankings(0, search, country, region);
}

// ═══════════════════════════════════════════════
// PROGRAMS PAGE (uses local PROGRAMS/FIELDS data)
// ═══════════════════════════════════════════════

function renderPrograms(params={}) {
  const dv = document.getElementById('dynamicView');
  const fieldFilter  = params.field  || '';
  const degreeFilter = params.degree || '';

  const degrees = [...new Set(PROGRAMS.map(p=>p.degree))].sort();
  const fields  = FIELDS;

  let programs = PROGRAMS;
  if (fieldFilter)  programs = programs.filter(p => String(p.field_id) === String(fieldFilter));
  if (degreeFilter) programs = programs.filter(p => p.degree === degreeFilter);

  const byField = {};
  programs.forEach(p => {
    if (!byField[p.field_id]) byField[p.field_id] = [];
    byField[p.field_id].push(p);
  });

  dv.innerHTML = `
    <div class="page-wrap">
      ${backBtn('Home')}
      <div class="page-header">
        <div>
          <h2 class="page-title">Programs & Fields</h2>
          <p class="page-subtitle">${FIELDS.length} fields · ${PROGRAMS.length} programs</p>
        </div>
      </div>
      <div class="filter-bar" style="margin:0 28px 20px">
        <div class="filter-group">
          <label>Field</label>
          <select class="filter-select" onchange="renderPrograms({field:this.value,degree:'${degreeFilter}'})">
            <option value="">All Fields</option>
            ${fields.map(f=>`<option value="${f.id}" ${String(fieldFilter)===String(f.id)?'selected':''}>${escHtml(f.name)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Degree</label>
          <select class="filter-select" onchange="renderPrograms({field:'${fieldFilter}',degree:this.value})">
            <option value="">All Degrees</option>
            ${degrees.map(d=>`<option value="${d}" ${degreeFilter===d?'selected':''}>${d}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="padding:0 28px">
        ${Object.keys(byField).length === 0
          ? `<div class="empty-state"><p>No programs match your filters.</p></div>`
          : Object.entries(byField).map(([fid, progs]) => {
              const field = FIELDS.find(f=>String(f.id)===String(fid));
              return `
                <div class="program-group">
                  <h3 class="program-group-title">${field?escHtml(field.name):'Unknown Field'}</h3>
                  <div class="program-chips-row">
                    ${progs.map(p => `
                      <div class="prog-badge">
                        <span class="prog-badge-name">${escHtml(p.name)}</span>
                        <span class="prog-badge-degree ${p.degree.toLowerCase()}">${p.degree}</span>
                        <button class="prog-search-btn"
                          onclick="navigateTo('search',{q:${JSON.stringify(p.name)}})">Find Unis</button>
                      </div>`).join('')}
                  </div>
                </div>`;
            }).join('')
        }
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════
// INTAKE PAGE
// ═══════════════════════════════════════════════

function renderIntake() {
  const dv = document.getElementById('dynamicView');
  const intakes = [
    { season:'Spring / January', color:'#00e5ff', months:'January – February', deadline:'September – October (previous year)', description:'Spring intake is popular in countries like Canada, Australia, and the UK. Fewer spots available but less competition.', countries:['Canada','Australia','United Kingdom','New Zealand'] },
    { season:'Summer / May',     color:'#ffd700', months:'May – June',          deadline:'January – February',                  description:'Summer intake is less common but available at select universities, especially for short courses and diplomas.',      countries:['United States','Germany','Netherlands'] },
    { season:'Fall / September', color:'#ff9800', months:'September – October', deadline:'December – January',                  description:'Fall is the primary intake worldwide and the most popular for international students. The widest program availability.', countries:['United States','United Kingdom','Canada','Germany','France','Australia','Netherlands'] },
  ];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  dv.innerHTML = `
    <div class="page-wrap">
      ${backBtn('Home')}
      <div class="page-header">
        <div>
          <h2 class="page-title">Intake Calendar</h2>
          <p class="page-subtitle">Plan your application timeline across 3 major intakes</p>
        </div>
      </div>
      <div style="padding:0 28px 32px">
        <div class="intake-timeline-bar">
          ${months.map((m,i) => {
            const isSpring=i<=1, isSummer=i>=4&&i<=5, isFall=i>=8&&i<=9;
            const color=isSpring?'#00e5ff':isSummer?'#ffd700':isFall?'#ff9800':'transparent';
            const label=isSpring?'Spring':isSummer?'Summer':isFall?'Fall':'';
            return `<div class="timeline-month" style="border-top:3px solid ${color||'rgba(255,255,255,0.1)'}">
              <span class="tm-label">${m}</span>
              ${label?`<span class="tm-intake" style="color:${color}">${label}</span>`:''}
            </div>`;
          }).join('')}
        </div>
        <div class="intake-cards">
          ${intakes.map(intake=>`
            <div class="intake-card" style="border-left:4px solid ${intake.color}">
              <div class="intake-card-header">
                <h3 class="intake-title" style="color:${intake.color}">${intake.season}</h3>
              </div>
              <p class="intake-desc">${intake.description}</p>
              <div class="intake-detail-row">
                <div class="intake-detail"><span class="id-label">Starts</span><span class="id-val">${intake.months}</span></div>
                <div class="intake-detail"><span class="id-label">Apply by</span><span class="id-val">${intake.deadline}</span></div>
              </div>
              <div class="intake-countries">
                <span class="id-label">Popular in</span>
                <div class="intake-country-chips">
                  ${intake.countries.map(c=>`<span class="ichip" onclick="navigateTo('countries',{country:'${c}'})">${c}</span>`).join('')}
                </div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}