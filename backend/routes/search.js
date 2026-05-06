const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/search?q=mit&country=Pakistan&region=Asia&rankMax=100&sort=rank&page=0
router.get('/', async (req, res) => {
  try {
    const { q='', country='', region='', rankMax='', sort='rank', ranked='' } = req.query;
    const page     = parseInt(req.query.page)  || 0;
    const pageSize = parseInt(req.query.limit) || 24;
    const offset   = page * pageSize;

    // Build WHERE clauses dynamically
    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (q) {
      conditions.push(`(name ILIKE $${idx} OR country ILIKE $${idx} OR domain ILIKE $${idx})`);
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
    if (rankMax) {
      conditions.push(`rank_num <= $${idx}`);
      values.push(parseInt(rankMax));
      idx++;
    }
    if (ranked === 'true') {
      conditions.push(`rank IS NOT NULL AND rank != ''`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sort
    const orderMap = {
      rank:    'rank_num ASC NULLS LAST, name ASC',
      name:    'name ASC',
      country: 'country ASC, rank_num ASC NULLS LAST',
    };
    const order = orderMap[sort] || orderMap.rank;

    // Count total
    const countResult = await db.query(
      `SELECT COUNT(*) FROM universities ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Fetch page
    const result = await db.query(
      `SELECT * FROM universities ${where}
       ORDER BY ${order}
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
