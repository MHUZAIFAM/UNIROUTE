const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { parsePage, parsePageSize } = require('../utils/pagination');

// GET /api/universities — paginated list
router.get('/', async (req, res) => {
  try {
    const page     = parsePage(req.query.page);
    const pageSize = parsePageSize(req.query.limit, 24);
    const offset   = page * pageSize;

    const result = await db.query(
      `SELECT * FROM universities
       ORDER BY rank_num ASC NULLS LAST, name ASC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );

    const total = await db.query('SELECT COUNT(*) FROM universities');

    res.json({
      universities: result.rows,
      total:  parseInt(total.rows[0].count),
      page,
      pages:  Math.ceil(total.rows[0].count / pageSize),
    });
  } catch (err) {
    console.error('GET /api/universities failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/universities/:id/programs — programs offered by a university,
// grouped by field. Returns an empty list (not an error) when no links exist
// yet, so the UI can show an honest "not yet available" state.
router.get('/:id/programs', async (req, res) => {
  try {
    const uniId = parseInt(req.params.id);
    if (!Number.isFinite(uniId)) {
      return res.status(400).json({ error: 'Invalid university id' });
    }

    const result = await db.query(
      `SELECT p.id, p.name, p.degree, f.id AS field_id, f.name AS field_name,
              up.source, up.url
       FROM university_programs up
       JOIN programs p ON p.id = up.program_id
       JOIN fields   f ON f.id = p.field_id
       WHERE up.university_id = $1
       ORDER BY f.name ASC, p.name ASC, p.degree ASC`,
      [uniId]
    );

    const byField = [];
    const index   = new Map();
    for (const row of result.rows) {
      if (!index.has(row.field_id)) {
        index.set(row.field_id, { field_id: row.field_id, field_name: row.field_name, programs: [] });
        byField.push(index.get(row.field_id));
      }
      index.get(row.field_id).programs.push({
        id: row.id, name: row.name, degree: row.degree, source: row.source, url: row.url,
      });
    }

    res.json({ total: result.rows.length, fields: byField });
  } catch (err) {
    console.error('GET /api/universities/:id/programs failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/universities/:id — single university
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM universities WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'University not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/universities/:id failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
