const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/rankings?page=0&country=&region=&q=
router.get('/', async (req, res) => {
  try {
    const { country='', region='', q='' } = req.query;
    const page     = parseInt(req.query.page)  || 0;
    const pageSize = parseInt(req.query.limit) || 50;
    const offset   = page * pageSize;

    const conditions = [`rank IS NOT NULL AND rank != ''`];
    const values     = [];
    let   idx        = 1;

    if (q) {
      conditions.push(`(name ILIKE $${idx} OR country ILIKE $${idx})`);
      values.push(`%${q}%`);
      idx++;
    }
    if (country) {
      conditions.push(`country = $${idx}`);
      values.push(country);
      idx++;
    }
    if (region) {
      conditions.push(`region = $${idx}`);
      values.push(region);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await db.query(`SELECT COUNT(*) FROM universities ${where}`, values);
    const total    = parseInt(countRes.rows[0].count);

    const result = await db.query(
      `SELECT id, name, country, alpha2, rank, rank_num, overall, ar_score, er_score, region, status, size, focus, research, domain
       FROM universities ${where}
       ORDER BY rank_num ASC
       LIMIT $${idx} OFFSET $${idx+1}`,
      [...values, pageSize, offset]
    );

    res.json({
      universities: result.rows,
      total,
      page,
      pages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
