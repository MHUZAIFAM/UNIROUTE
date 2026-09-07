const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { parsePage, parsePageSize } = require('../utils/pagination');

// GET /api/programs/fields — all fields with program counts
router.get('/fields', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT f.id, f.name, COUNT(p.id) AS program_count
      FROM fields f
      LEFT JOIN programs p ON p.field_id = f.id
      GROUP BY f.id, f.name
      ORDER BY f.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/programs/fields failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/programs/degrees — distinct degree levels
router.get('/degrees', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT degree FROM programs ORDER BY degree ASC`
    );
    res.json(result.rows.map(r => r.degree));
  } catch (err) {
    console.error('GET /api/programs/degrees failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/programs?field=&degree=&q=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { field = '', degree = '', q = '' } = req.query;
    const page     = parsePage(req.query.page);
    const pageSize = parsePageSize(req.query.limit, 100);
    const offset   = page * pageSize;

    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (q) {
      conditions.push(`p.name ILIKE $${idx}`);
      values.push(`%${q}%`);
      idx++;
    }
    const fieldId = parseInt(field);
    if (field && Number.isFinite(fieldId)) {
      conditions.push(`p.field_id = $${idx}`);
      values.push(fieldId);
      idx++;
    }
    if (degree) {
      conditions.push(`p.degree = $${idx}`);
      values.push(degree);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await db.query(
      `SELECT COUNT(*) FROM programs p ${where}`, values
    );
    const total = parseInt(countRes.rows[0].count);

    // university_count lets the UI show which programs actually have links yet
    const result = await db.query(
      `SELECT p.id, p.name, p.degree, p.field_id, f.name AS field_name,
              COUNT(up.university_id) AS university_count
       FROM programs p
       JOIN fields f ON f.id = p.field_id
       LEFT JOIN university_programs up ON up.program_id = p.id
       ${where}
       GROUP BY p.id, p.name, p.degree, p.field_id, f.name
       ORDER BY f.name ASC, p.name ASC, p.degree ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, pageSize, offset]
    );

    res.json({
      programs: result.rows,
      total,
      page,
      pages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error('GET /api/programs failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/programs/:id/universities — universities offering a program
router.get('/:id/universities', async (req, res) => {
  try {
    const programId = parseInt(req.params.id);
    if (!Number.isFinite(programId)) {
      return res.status(400).json({ error: 'Invalid program id' });
    }

    const page     = parsePage(req.query.page);
    const pageSize = parsePageSize(req.query.limit, 24);
    const offset   = page * pageSize;

    const prog = await db.query(
      `SELECT p.id, p.name, p.degree, f.name AS field_name
       FROM programs p JOIN fields f ON f.id = p.field_id
       WHERE p.id = $1`,
      [programId]
    );
    if (prog.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const countRes = await db.query(
      `SELECT COUNT(*) FROM university_programs WHERE program_id = $1`,
      [programId]
    );
    const total = parseInt(countRes.rows[0].count);

    const result = await db.query(
      `SELECT u.*, up.source, up.url AS program_url
       FROM university_programs up
       JOIN universities u ON u.id = up.university_id
       WHERE up.program_id = $1
       ORDER BY u.rank_num ASC NULLS LAST, u.name ASC
       LIMIT $2 OFFSET $3`,
      [programId, pageSize, offset]
    );

    res.json({
      program: prog.rows[0],
      universities: result.rows,
      total,
      page,
      pages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error('GET /api/programs/:id/universities failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
