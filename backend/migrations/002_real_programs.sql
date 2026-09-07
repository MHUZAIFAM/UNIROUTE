-- UNIROUTE — migration 002
-- Reshape university_programs to hold real, sourced program listings.
--
-- The original design linked a university to a row in the 64-entry `programs`
-- catalogue. Real catalogue data doesn't work that way: universities publish
-- their own program names ("Biologia (Licenciatura)", "MSc Civil Engineering"),
-- which don't reduce to 64 generic entries without losing the actual name.
--
-- So the join table now stores the program as published, plus provenance.
-- field_id stays OPTIONAL and is only for cross-university browsing
-- ("universities offering Biology"); a program with no field mapping still
-- displays correctly on its university page.

DROP TABLE IF EXISTS university_programs;

CREATE TABLE university_programs (
  id            SERIAL PRIMARY KEY,
  university_id INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,

  -- exactly as the university publishes it
  name          TEXT NOT NULL,
  degree_level  TEXT NOT NULL,             -- Bachelor's | Master's | PhD | N/A

  -- optional taxonomy for search; NULL means "not categorised yet"
  field_id      INTEGER REFERENCES fields(id) ON DELETE SET NULL,

  -- provenance: every row must be traceable back to where it came from
  url           TEXT,                      -- official source page
  verification  TEXT,                      -- how it was verified
  imported_from TEXT,                      -- batch/file this came from

  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE (university_id, name, degree_level)
);

CREATE INDEX idx_unipro_university ON university_programs(university_id);
CREATE INDEX idx_unipro_field      ON university_programs(field_id);
CREATE INDEX idx_unipro_degree     ON university_programs(degree_level);
-- for case-insensitive name search across universities
CREATE INDEX idx_unipro_name_lower ON university_programs(LOWER(name));
