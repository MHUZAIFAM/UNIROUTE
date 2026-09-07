/**
 * UNIROUTE — seed.js
 * Run once: node seed.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seed() {
  console.log('Reading data/data.js...');

  // Read data.js and extract the UNIVERSITIES array using regex
  const dataPath = path.join(__dirname, '..', 'data', 'data.js');
  let   code     = fs.readFileSync(dataPath, 'utf8');

  // Convert const/let/var to global assignments so we can eval safely
  code = code
    .replace(/^const\s+/gm,  'global.')
    .replace(/^let\s+/gm,    'global.')
    .replace(/^var\s+/gm,    'global.');

  // Run in current context so globals are accessible
  eval(code);

  const universities = global.UNIVERSITIES;
  if (!universities || !universities.length) {
    throw new Error('UNIVERSITIES not found in data.js');
  }
  console.log(`Found ${universities.length} universities`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS universities (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        country    TEXT,
        alpha2     TEXT,
        state      TEXT,
        domain     TEXT,
        web        TEXT,
        rank       TEXT,
        rank_num   INTEGER,
        overall    TEXT,
        region     TEXT,
        size       TEXT,
        focus      TEXT,
        research   TEXT,
        status     TEXT,
        ar_score   TEXT,
        er_score   TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Re-seeding wipes universities and renumbers their ids, which would orphan
    // any university_programs links. Refuse to run if links exist, unless the
    // caller explicitly opts in with --force.
    const linkTable = await client.query(`SELECT to_regclass('university_programs') AS t`);
    if (linkTable.rows[0].t) {
      const { rows } = await client.query('SELECT COUNT(*) FROM university_programs');
      const linkCount = parseInt(rows[0].count);
      if (linkCount > 0 && !process.argv.includes('--force')) {
        throw new Error(
          `university_programs holds ${linkCount} link(s). Re-seeding renumbers ` +
          `university ids and would orphan them. Re-run with --force to discard them.`
        );
      }
    }

    await client.query('TRUNCATE universities RESTART IDENTITY CASCADE');
    console.log('Table ready, inserting universities...');

    // Insert in batches of 500
    const BATCH = 500;
    let   count = 0;

    for (let i = 0; i < universities.length; i += BATCH) {
      const batch  = universities.slice(i, i + BATCH);
      const params = [];
      const values = [];
      let   p      = 1;

      for (const u of batch) {
        const domain  = u.domains && u.domains[0] ? u.domains[0] : null;
        const rankNum = u.rank ? parseInt(u.rank) : null;

        params.push(
          u.name, u.country || null, u.alpha2 || null, u.state || null,
          domain, u.web || null,
          u.rank || null, isNaN(rankNum) ? null : rankNum,
          u.overall || null, u.region || null, u.size || null,
          u.focus || null, u.research || null, u.status || null,
          u.ar_score || null, u.er_score || null
        );

        values.push(
          `($${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++})`
        );
      }

      await client.query(
        `INSERT INTO universities
           (name,country,alpha2,state,domain,web,rank,rank_num,overall,region,size,focus,research,status,ar_score,er_score)
         VALUES ${values.join(',')}`,
        params
      );

      count += batch.length;
      process.stdout.write(`\r  Inserted ${count} / ${universities.length}`);
    }

    // Indexes for fast queries
    console.log('\nCreating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_uni_country  ON universities(country)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_uni_rank_num ON universities(rank_num)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_uni_region   ON universities(region)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_uni_name_trg ON universities USING gin(to_tsvector(\'english\', name))');

    await client.query('COMMIT');
    console.log(`\nDone! ${count} universities seeded into PostgreSQL.`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nSeed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });