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
        countries:      countries.map(c=>c.name).sort(),
        regions:        [...new Set(countries.map(c=>c.region).filter(Boolean))].sort(),
        allCountryData: countries, // needed for region→country filtering
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
    document.getElementById('rankRegion')?.addEventListener('change', () => {
      const newRegion = document.getElementById('rankRegion').value;
      const cntSel    = document.getElementById('rankCountry');
      if (!cntSel || !_rankLists) return;

      // Filter countries to selected region using cached API data
      const validCountries = newRegion
        ? _rankLists.countries.filter(cn => {
            const found = _rankLists.allCountryData?.find(c => c.name === cn);
            return found ? found.region === newRegion : true;
          })
        : _rankLists.countries;

      // Rebuild country dropdown
      cntSel.innerHTML = '<option value="">All Countries</option>' +
        validCountries.map(cn => `<option value="${escHtml(cn)}">${escHtml(cn)}</option>`).join('');

      _rankFilter();
    });
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
// PROGRAMS PAGE (served from the API)
// ═══════════════════════════════════════════════

let _programLists = null;

async function _getProgramLists() {
  if (!_programLists) {
    const [fields, degrees] = await Promise.all([apiGetFields(), apiGetDegrees()]);
    _programLists = { fields, degrees };
  }
  return _programLists;
}

async function renderPrograms(params={}) {
  // A program id routes to that program's university list instead
  if (params.programId) return _renderProgramUniversities(params.programId);

  const dv = document.getElementById('dynamicView');
  const fieldFilter  = params.field  || '';
  const degreeFilter = params.degree || '';

  dv.innerHTML = `
    <div class="page-wrap">
      ${backBtn('Home')}
      <div class="page-header">
        <div>
          <h2 class="page-title">Programs &amp; Fields</h2>
          <p class="page-subtitle" id="progSubtitle">Loading…</p>
          <p class="subtle-note" id="progNote" hidden></p>
        </div>
      </div>
      <div id="progFilters"></div>
      <div id="progBody" style="padding:0 28px">
        <div class="api-loading"><div class="loading-spinner"></div><p>Loading programs…</p></div>
      </div>
    </div>`;

  try {
    const [{ fields, degrees }, data] = await Promise.all([
      _getProgramLists(),
      apiGetPrograms({ field: fieldFilter, degree: degreeFilter, limit: 100 }),
    ]);

    document.getElementById('progSubtitle').textContent =
      `${fields.length} fields · ${data.total} programs`;

    document.getElementById('progFilters').innerHTML = `
      <div class="filter-bar" style="margin:0 28px 20px">
        <div class="filter-group">
          <label>Field</label>
          <select class="filter-select" id="progField">
            <option value="">All Fields</option>
            ${fields.map(f=>`<option value="${f.id}" ${String(fieldFilter)===String(f.id)?'selected':''}>${escHtml(f.name)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Degree</label>
          <select class="filter-select" id="progDegree">
            <option value="">All Degrees</option>
            ${degrees.map(d=>`<option value="${escHtml(d)}" ${degreeFilter===d?'selected':''}>${escHtml(d)}</option>`).join('')}
          </select>
        </div>
      </div>`;

    document.getElementById('progField')?.addEventListener('change', e =>
      renderPrograms({ field: e.target.value, degree: degreeFilter }));
    document.getElementById('progDegree')?.addEventListener('change', e =>
      renderPrograms({ field: fieldFilter, degree: e.target.value }));

    const body = document.getElementById('progBody');
    if (data.programs.length === 0) {
      body.innerHTML = `<div class="empty-state"><p>No programs match your filters.</p></div>`;
      return;
    }

    // Group by field for display
    const byField = {};
    data.programs.forEach(p => {
      (byField[p.field_name] ||= []).push(p);
    });

    // Quiet note in the header rather than a banner over the catalogue — the
    // catalogue is useful on its own, and the full explanation lives on the
    // individual program pages where it actually blocks something.
    const anyLinked = data.programs.some(p => parseInt(p.university_count) > 0);
    const note = document.getElementById('progNote');
    if (note) {
      note.textContent = anyLinked ? '' : 'University listings for each program aren’t available yet.';
      note.hidden = anyLinked;
    }

    body.innerHTML = Object.entries(byField).map(([fieldName, progs]) => `
      <div class="program-group">
        <h3 class="program-group-title">${escHtml(fieldName)}</h3>
        <div class="program-chips-row">
          ${progs.map(p => {
            const count = parseInt(p.university_count) || 0;
            return `
              <div class="prog-badge">
                <span class="prog-badge-name">${escHtml(p.name)}</span>
                <span class="prog-badge-degree ${escHtml(p.degree.toLowerCase())}">${escHtml(p.degree)}</span>
                ${count > 0 ? `<span class="prog-badge-count">${count} ${count===1?'university':'universities'}</span>` : ''}
                <button class="prog-search-btn" data-prog="${p.id}">Find Unis</button>
              </div>`;
          }).join('')}
        </div>
      </div>`).join('');

    body.querySelectorAll('[data-prog]').forEach(btn =>
      btn.addEventListener('click', () => navigateTo('programs', { programId: btn.dataset.prog })));

  } catch (err) {
    console.error('Programs load error:', err);
    const body = document.getElementById('progBody');
    if (body) body.innerHTML = `<div class="empty-state"><p>Could not load programs. Is the server running?</p></div>`;
  }
}

// ── Universities offering a single program ─────
async function _renderProgramUniversities(programId, page=0) {
  const dv = document.getElementById('dynamicView');
  dv.innerHTML = `
    <div class="page-wrap">
      <div class="page-header"><div><h2 class="page-title">Loading…</h2></div></div>
      <div style="padding:0 28px">
        <div class="api-loading"><div class="loading-spinner"></div><p>Loading universities…</p></div>
      </div>
    </div>`;

  try {
    const data = await apiGetProgramUniversities(programId, { page, limit: 24 });
    const p = data.program;

    dv.innerHTML = `
      <div class="page-wrap">
        <div class="page-header">
          <div>
            <h2 class="page-title">${escHtml(p.name)}</h2>
            <p class="page-subtitle">${escHtml(p.degree)} · ${escHtml(p.field_name)} ·
              ${data.total} ${data.total===1?'university':'universities'}</p>
          </div>
          <button class="ghost-btn" id="progBack">← All programs</button>
        </div>
        <div style="padding:0 28px">
          ${data.universities.length === 0 ? `
            <div class="empty-state-rich">
              <h3 class="es-title">No universities linked yet</h3>
              <p class="es-sub">
                UNIROUTE doesn't yet record which universities offer
                ${escHtml(p.name)} (${escHtml(p.degree)}). This list fills in as
                verified program data is added — nothing here is guessed.
              </p>
              <div class="es-actions">
                <button class="ghost-btn" id="progSearchFallback">Search universities by name instead</button>
              </div>
            </div>`
          : `<div class="uni-grid">${data.universities.map(u=>uniCardHTML(u)).join('')}</div>`}
        </div>
        <div id="progPages"></div>
      </div>`;

    document.getElementById('progBack')?.addEventListener('click', () => navigateTo('programs'));
    document.getElementById('progSearchFallback')?.addEventListener('click', () => navigateTo('search'));

    const pagesEl = document.getElementById('progPages');
    if (pagesEl && data.pages > 1) {
      const mb = (pg,label) => `<button class="page-btn ${pg===page?'active':''}" data-pp="${pg}">${label}</button>`;
      let html = '';
      if (page > 0) html += mb(page-1,'‹ Prev');
      for (let i=Math.max(0,page-2); i<=Math.min(data.pages-1,page+2); i++) html += mb(i,i+1);
      if (page < data.pages-1) html += mb(page+1,'Next ›');
      pagesEl.innerHTML = `<div class="pagination">${html}</div>`;
      pagesEl.querySelectorAll('[data-pp]').forEach(b =>
        b.addEventListener('click', () => _renderProgramUniversities(programId, parseInt(b.dataset.pp))));
    }
  } catch (err) {
    console.error('Program universities error:', err);
    dv.innerHTML = `<div class="coming-soon"><h2>Not found</h2><p>This program could not be loaded.</p>
      <button class="back-btn" onclick="navigateTo('programs')">← All programs</button></div>`;
  }
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