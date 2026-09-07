require('dotenv').config();
const express    = require('express');
const cors       = require('cors');

const universitiesRouter = require('./routes/universities');
const searchRouter       = require('./routes/search');
const countriesRouter    = require('./routes/countries');
const rankingsRouter     = require('./routes/rankings');
const programsRouter     = require('./routes/programs');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ─────────────────────────────────────
app.use('/api/universities', universitiesRouter);
app.use('/api/search',       searchRouter);
app.use('/api/countries',    countriesRouter);
app.use('/api/rankings',     rankingsRouter);
app.use('/api/programs',     programsRouter);

// ── Health check ───────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'UNIROUTE API running' });
});

// ── 404 handler ────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error handler ──────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`UNIROUTE API running on http://localhost:${PORT}`);
});