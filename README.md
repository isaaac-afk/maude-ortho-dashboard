# MAUDE Orthopedic Adverse-Event Dashboard

A full-stack dashboard over the U.S. FDA's medical-device adverse-event data
(MAUDE), scoped to **hip and knee joint prostheses**. It ingests raw openFDA
reports into a Postgres database and surfaces them as a browsable, filterable
dashboard with a longer term goal of using an LLM to extract structured
failure modes from the free-text incident narratives.

> **Data disclaimer.** MAUDE is a passive surveillance system. Report counts
> reflect *reporting volume*, not device failure rates: reporting is voluntary
> for some sources, duplicates exist, and there is no denominator for how many
> devices are actually in use. Nothing here establishes that a device caused an
> event. This project treats the data accordingly and never presents counts as
> failure rates.

## Why this cohort
The cohort is every FDA product code classified as a hip or knee joint
prosthesis under 21 CFR Part 888 — **55 codes total** (29 hip, 26 knee),
generated directly from the openFDA device classification endpoint rather than
hand-picked. That makes the cohort definition reproducible and defensible. The
full list lives in [`cohort.md`](./cohort.md).

## Architecture
```
openFDA MAUDE API  ──►  ingester (Python)  ──►  Supabase / Postgres  ──►  Next.js dashboard
   device/event.json     date-windowed pull        4 tables + a view          (read layer)
```

- **Ingester** — a date-windowed Python pull that works around openFDA's
  ~25k-record pagination ceiling by recursively splitting date ranges, parses
  each report defensively, and upserts into Supabase (idempotent, re-runnable).
- **Database** — four tables that respect the real cardinality of the data (one
  report can list several devices and several narratives):
  - `product_codes` — the 55-code cohort (reference table)
  - `events` — one row per report, deduped by `mdr_report_key`
  - `event_product_codes` — many-to-many between events and cohort codes
  - `event_narratives` — the free-text incident narratives (fuel for the
    planned LLM extraction)
  - plus `v_event_volume_by_code`, a view ranking codes by report volume
- **Web app** — a Next.js read layer (in progress).

## Tech stack
Python (requests, supabase) · Supabase (Postgres) · Next.js · TypeScript

## Project structure
```
maude-ortho-dashboard/
├── README.md
├── .gitignore
├── .env.example         # template — copy and fill in, never commit real values
├── cohort.md            # the locked 55-code cohort definition
├── ingester/
│   ├── ingest.py        # date-windowed MAUDE ingester
│   ├── schema.sql       # Supabase schema + cohort seed
│   └── requirements.txt
└── (Next.js app added at the root in Phase 2)
```

## Running the ingester
1. Create the schema: paste `ingester/schema.sql` into the Supabase SQL Editor
   and run it (creates the tables and seeds the 55 codes).
2. Set environment variables (see `.env.example`): `OPENFDA_API_KEY`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
3. Install deps and run:
   ```
   pip install -r ingester/requirements.txt
   python ingester/ingest.py --start 2023-01-01 --end 2023-12-31   # one year
   python ingester/ingest.py                                       # full 2009→today
   ```
   Add `--dry-run` to pull and parse without writing, or `--sample` to print a
   couple of raw records.

## Roadmap
- [x] **Phase 0 — Foundations.** openFDA key, cohort locked (55 codes).
- [x] **Phase 1 — Data pipeline.** Schema + date-windowed ingester; a sample
      year (~26k reports) loaded end to end.
- [ ] **Phase 2 — Read layer.** Next.js wired to Supabase, real counts on a page.
- [ ] **Phase 3 — Dashboard UI.** Filters by code/manufacturer/date, charts.
- [ ] **Phase 4 — Deploy.** Vercel, live URL.
- [ ] **Phase 5 — LLM failure-mode extraction.** Structured failure modes pulled
      from the incident narratives — the part that turns this from a data
      viewer into something that reads the reports.

## Data source & license
Data from the [openFDA](https://open.fda.gov/) device adverse-event API (public
domain). This repository's own code is released under the MIT License.
