const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/countries — all countries with university counts
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        country                          AS name,
        COUNT(*)                         AS count,
        COUNT(*) FILTER (WHERE rank IS NOT NULL AND rank != '') AS ranked,
        MAX(alpha2)                      AS alpha2,
        MAX(region)                      AS region
      FROM universities
      GROUP BY country
      ORDER BY country ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/countries/:country/universities — unis in a country
router.get('/:country/universities', async (req, res) => {
  try {
    const { sort='rank', page=0, limit=24, q='' } = req.query;
    const offset = page * limit;
    const country = req.params.country;

    const conditions = [`country = $1`];
    const values     = [country];
    let   idx        = 2;

    if (q) {
      conditions.push(`name ILIKE $${idx}`);
      values.push(`%${q}%`);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const orderMap = {
      rank:  'rank_num ASC NULLS LAST',
      name:  'name ASC',
    };
    const order = orderMap[sort] || orderMap.rank;

    const countRes  = await db.query(`SELECT COUNT(*) FROM universities ${where}`, values);
    const total     = parseInt(countRes.rows[0].count);
    const result    = await db.query(
      `SELECT * FROM universities ${where} ORDER BY ${order} LIMIT $${idx} OFFSET $${idx+1}`,
      [...values, limit, offset]
    );

    res.json({
      universities: result.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
