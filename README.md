# UNIROUTE

A searchable directory of 10,000+ universities worldwide, with QS World Rankings data, country/region browsing, and a university detail view. Built as a static frontend backed by a small REST API over PostgreSQL.

**Live:** [uniroute-ii.vercel.app](https://uniroute-ii.vercel.app)

## Tech stack

| Layer    | Tech                                   |
|----------|-----------------------------------------|
| Frontend | Vanilla HTML/CSS/JS (no framework, no build step) |
| Backend  | Node.js + Express 5                     |
| Database | PostgreSQL (hosted on Railway)          |
| Hosting  | Frontend on Vercel · Backend on Railway |

No bundler, transpiler, or frontend framework is used — pages are plain `.js` files loaded via `<script>` tags in `index.html`, and a small hand-rolled router (`pages/app.js`) swaps view containers in and out based on `data-view` clicks and browser history.

## Project structure

```
.
├── index.html              # Single HTML shell — all views live inside it
├── assets/
│   └── style.css           # All styling
├── data/
│   └── data.js             # Source dataset (merged QS rankings + domains list), used by backend/seed.js
├── pages/                  # Frontend "pages" — one file per view/route
│   ├── app.js               # Router + shared helpers (escHtml, uniCardHTML, rankColor, ...)
│   ├── api.js                # Fetch wrapper for the backend API
│   ├── home.js, search.js, countries.js, rank.js, university.js
└── backend/
    ├── server.js             # Express app entrypoint
    ├── db.js                 # PostgreSQL connection pool
    ├── seed.js                # One-off script: loads data/data.js into Postgres
    ├── routes/
    │   ├── universities.js    # GET /api/universities, /api/universities/:id
    │   ├── search.js          # GET /api/search
    │   ├── countries.js       # GET /api/countries, /api/countries/:country/universities
    │   └── rankings.js        # GET /api/rankings
    └── utils/
        └── pagination.js      # Shared page/limit parsing + clamping
```

## Getting started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (e.g. a free [Railway](https://railway.app) Postgres instance)

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env` (gitignored — never commit this):

```
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
PORT=3001
```

Seed the database once (reads `data/data.js`, creates the `universities` table, and inserts ~10k rows):

```bash
node seed.js
```

Start the API:

```bash
npm start
```

The API is now running at `http://localhost:3001`, with a health check at `GET /api/health`.

### 2. Frontend

The frontend is fully static — just open `index.html` in a browser, or serve the repo root with any static file server:

```bash
npx serve .
```

**Note:** `pages/api.js` currently hardcodes the production API URL (`https://uniroute-ii-production.up.railway.app/api`). To point the frontend at your local backend during development, change the `API` constant at the top of that file.

## API reference

All endpoints return JSON. List endpoints share the same pagination shape:

```json
{ "universities": [...], "total": 1234, "page": 0, "pages": 52 }
```

`limit` is capped at 100 per page on every list endpoint.

| Endpoint | Description | Query params |
|---|---|---|
| `GET /api/universities` | Paginated list of all universities | `page`, `limit` |
| `GET /api/universities/:id` | Single university by id | — |
| `GET /api/search` | Full-text-ish search across name/country/domain | `q`, `country`, `region`, `rankMax`, `sort` (`rank`\|`name`\|`country`), `ranked` (`true`), `page`, `limit` |
| `GET /api/countries` | All countries with university counts | — |
| `GET /api/countries/:country/universities` | Universities in a given country | `q`, `sort`, `page`, `limit` |
| `GET /api/rankings` | QS-ranked universities only | `q`, `country`, `region`, `page`, `limit` |
| `GET /api/health` | Health check | — |

## Deployment

- **Frontend** — Vercel is connected to this repo's `main` branch and deploys the static files directly (no build step configured).
- **Backend** — deployed separately on Railway, pointed at a Railway-managed Postgres instance. Push to `main` and redeploy the `backend/` service there to pick up API changes; Vercel only serves the frontend.

## Security notes

- All SQL queries are parameterized — no raw string interpolation of user input into SQL.
- List endpoints clamp `limit` to 100 to prevent large/unbounded result-set requests.
- API errors are logged server-side and return a generic message to clients (no internal error details are leaked).
