const MAX_PAGE_SIZE = 100;

function parsePage(value) {
  const n = parseInt(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parsePageSize(value, def) {
  const n = parseInt(value);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(n, MAX_PAGE_SIZE);
}

module.exports = { parsePage, parsePageSize };
