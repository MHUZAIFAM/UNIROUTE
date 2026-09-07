// ═══════════════════════════════════════════════
// UNIROUTE — api.js
// Central API client. All pages use these
// functions instead of the local data globals.
// ═══════════════════════════════════════════════

const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001/api'
  : 'https://uniroute-ii-production.up.railway.app/api';

// ── Generic fetch with error handling ──────────
async function apiFetch(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// ── Universities ───────────────────────────────
async function apiSearch(params={}) {
  const p = new URLSearchParams();
  if (params.q)       p.set('q',       params.q);
  if (params.country) p.set('country', params.country);
  if (params.region)  p.set('region',  params.region);
  if (params.rankMax) p.set('rankMax', params.rankMax);
  if (params.sort)    p.set('sort',    params.sort);
  if (params.ranked)  p.set('ranked',  'true');
  if (params.page)    p.set('page',    params.page);
  if (params.limit)   p.set('limit',   params.limit || 24);
  return apiFetch('/search?' + p.toString());
}

async function apiGetUniversity(id) {
  return apiFetch('/universities/' + id);
}

async function apiGetUniversities(params={}) {
  const p = new URLSearchParams();
  if (params.page)  p.set('page',  params.page);
  if (params.limit) p.set('limit', params.limit || 24);
  return apiFetch('/universities?' + p.toString());
}

// ── Rankings ───────────────────────────────────
async function apiGetRankings(params={}) {
  const p = new URLSearchParams();
  if (params.q)       p.set('q',       params.q);
  if (params.country) p.set('country', params.country);
  if (params.region)  p.set('region',  params.region);
  if (params.page)    p.set('page',    params.page);
  if (params.limit)   p.set('limit',   params.limit || 50);
  return apiFetch('/rankings?' + p.toString());
}

// ── Countries ──────────────────────────────────
async function apiGetCountries() {
  return apiFetch('/countries');
}

async function apiGetCountryUniversities(country, params={}) {
  const p = new URLSearchParams();
  if (params.q)     p.set('q',     params.q);
  if (params.sort)  p.set('sort',  params.sort);
  if (params.page)  p.set('page',  params.page);
  if (params.limit) p.set('limit', params.limit || 24);
  const encoded = encodeURIComponent(country);
  return apiFetch('/countries/' + encoded + '/universities?' + p.toString());
}

// ── Loading state helper ───────────────────────
function showLoading(containerId, message='Loading…') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `
    <div class="api-loading">
      <div class="loading-spinner"></div>
      <p>${message}</p>
    </div>`;
}

function showError(containerId, message='Failed to load data.') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `
    <div class="empty-state">
      <p>${message}</p>
      <button class="ghost-btn" onclick="location.reload()">Retry</button>
    </div>`;
}