// ═══════════════════════════════════════════════
// UNIROUTE — home.js
// ═══════════════════════════════════════════════

async function renderHome() {
  document.getElementById('view-home').classList.add('active');

  // Wire UI interactions immediately
  document.querySelectorAll('.chip[data-program]').forEach(chip => {
    chip.onclick = () => navigateTo('search', { q: chip.dataset.program });
  });
  document.querySelectorAll('.see-all-btn').forEach(btn => {
    btn.onclick = () => navigateTo(btn.dataset.view || 'search');
  });
  document.querySelectorAll('.card-cta').forEach(btn => {
    btn.onclick = () => navigateTo(btn.dataset.view || 'search');
  });

  // Show skeleton cards while loading
  const grid = document.getElementById('homeUniGrid');
  if (grid) grid.innerHTML = skeletonCardsHTML(8);

  try {
    // Load top 8 ranked + stats in parallel
    const [rankData, countryData] = await Promise.all([
      apiGetRankings({ limit: 8 }),
      apiGetCountries(),
    ]);

    // Render university cards
    if (grid) grid.innerHTML = rankData.universities.map(u => uniCardHTML(u)).join('');

    // Update stats
    const ranked = rankData.total;
    const countries = countryData.length;
    const total = countryData.reduce((s, c) => s + parseInt(c.count), 0);

    const els = {
      'stat-countries': countries,
      'stat-unis':      total.toLocaleString() + '+',
      'stat-ranked':    ranked.toLocaleString(),
      'stat-programs':  PROGRAMS ? PROGRAMS.length : 64,
    };
    Object.entries(els).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });

  } catch (err) {
    console.error('Home load error:', err);
    if (grid) grid.innerHTML = `<div class="empty-state"><p>Could not load universities. Is the server running?</p></div>`;
  }
}