/**
 * UNIROUTE — seedPrograms.js
 * Creates the fields / programs / university_programs schema and seeds the
 * field + program catalogue from data/data.js.
 *
 * Run: node seedPrograms.js
 *
 * Idempotent: re-running re-syncs the catalogue and NEVER touches
 * university_programs, so the university→program links you add later survive.
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

function loadCatalogue() {
  const dataPath = path.join(__dirname, '..', 'data', 'data.js');
  let code = fs.readFileSync(dataPath, 'utf8')
    .replace(/^const\s+/gm, 'global.')
    .replace(/^let\s+/gm,   'global.')
    .replace(/^var\s+/gm,   'global.');
  eval(code);
  if (!global.FIELDS?.length)   throw new Error('FIELDS not found in data.js');
  if (!global.PROGRAMS?.length) throw new Error('PROGRAMS not found in data.js');
  return { fields: global.FIELDS, programs: global.PROGRAMS };
}

async function seed() {
  const { fields, programs } = loadCatalogue();
  console.log(`Read ${fields.length} fields and ${programs.length} programs from data.js`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS fields (
        id   SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS programs (
        id       SERIAL PRIMARY KEY,
        name     TEXT NOT NULL,
        degree   TEXT NOT NULL,
        field_id INTEGER NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
        UNIQUE (name, degree, field_id)
      )
    `);

    // The join table is the part that will hold real, sourced data. `source`
    // records where a link came from so it can be audited later; nothing is
    // inserted here by this script.
    await client.query(`
      CREATE TABLE IF NOT EXISTS university_programs (
        university_id INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
        program_id    INTEGER NOT NULL REFERENCES programs(id)     ON DELETE CASCADE,
        source        TEXT,
        url           TEXT,
        created_at    TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (university_id, program_id)
      )
    `);

    // Preserve the ids from data.js so PROGRAMS.field_id keeps pointing at the
    // right field.
    for (const f of fields) {
      await client.query(
        `INSERT INTO fields (id, name) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [f.id, f.name]
      );
    }
    await client.query(`SELECT setval('fields_id_seq', (SELECT MAX(id) FROM fields))`);
    console.log(`  fields:   ${fields.length} upserted`);

    let inserted = 0;
    for (const p of programs) {
      const res = await client.query(
        `INSERT INTO programs (name, degree, field_id) VALUES ($1, $2, $3)
         ON CONFLICT (name, degree, field_id) DO NOTHING`,
        [p.name, p.degree, p.field_id]
      );
      inserted += res.rowCount;
    }
    console.log(`  programs: ${programs.length} processed, ${inserted} new`);

    await client.query('CREATE INDEX IF NOT EXISTS idx_programs_field ON programs(field_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_programs_degree ON programs(degree)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_unipro_program ON university_programs(program_id)');

    await client.query('COMMIT');

    const links = await client.query('SELECT COUNT(*) FROM university_programs');
    console.log(`\nDone. university_programs currently holds ${links.rows[0].count} link(s).`);
    if (links.rows[0].count === '0') {
      console.log('No university→program links yet — the Academics tab and "Find Unis"');
      console.log('will show an explicit "not yet available" state until they are added.');
    }
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
