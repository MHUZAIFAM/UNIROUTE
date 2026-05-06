const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/universities — paginated list
router.get('/', async (req, res) => {
  try {
    const page     = parseInt(req.query.page)  || 0;
    const pageSize = parseInt(req.query.limit) || 24;
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
