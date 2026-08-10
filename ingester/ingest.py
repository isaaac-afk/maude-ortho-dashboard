#!/usr/bin/env python3
"""
MAUDE orthopedic adverse-event ingester.

Pulls device adverse-event reports from the openFDA device/event endpoint for
the locked hip+knee prosthesis cohort (55 product codes) and loads them into
Supabase.

Handles openFDA's ~25k-record pagination ceiling with recursive date-windowing:
if a date range holds more than the ceiling, it splits the range in half and
recurses until each window is pageable.

USAGE
-----
  # 1. See the raw shape of real records before loading anything (do this first):
  python ingest.py --sample

  # 2. Dry run — pull + parse a single year, print counts, load nothing:
  python ingest.py --start 2023-01-01 --end 2023-12-31 --dry-run

  # 3. Load one year into Supabase:
  python ingest.py --start 2023-01-01 --end 2023-12-31

  # 4. Full historical load (2009 -> today):
  python ingest.py

ENV VARS (required unless --sample / --dry-run)
  OPENFDA_API_KEY        your free openFDA key
  SUPABASE_URL           https://<project>.supabase.co
  SUPABASE_SERVICE_KEY   the service_role key (NOT the anon key)
"""

import argparse
import datetime as dt
import os
import sys
import time

import requests

# ---------------------------------------------------------------------------
# Cohort: the 55 locked product codes. Keep in sync with schema.sql / cohort.md.
# ---------------------------------------------------------------------------
HIP = ["JDG","JDH","JDI","JDJ","JDK","JDL","KMC","KWA","KWB","KWL","KWY","KWZ",
       "KXA","KXB","KXD","LPF","LPH","LWJ","LZO","LZY","MAY","MBL","MEH","MRA",
       "NXT","OCG","OQG","OVO","PBI"]
KNEE = ["HRY","HRZ","HSA","HSH","HSX","HTG","JWH","KMB","KRN","KRO","KRP","KRQ",
        "KRR","KRS","KTX","KYK","LGE","LXY","MBD","MBH","MBV","NJD","NJL","NPJ",
        "NRA","OIY"]
COHORT = set(HIP + KNEE)

BASE = "https://api.fda.gov/device/event.json"
PAGE = 1000            # max records per call
SKIP_CEILING = 25000   # openFDA hard cap on skip
SLEEP = 0.3            # ~3.3 req/s, safely under 240/min with a key
DATA_START = dt.date(2009, 1, 1)   # device event API coverage begins ~2009

API_KEY = os.environ.get("OPENFDA_API_KEY", "")


# ---------------------------------------------------------------------------
# openFDA query helpers
# ---------------------------------------------------------------------------
def code_clause():
    """search fragment matching any cohort product code."""
    return "device.device_report_product_code:(" + "+".join(sorted(COHORT)) + ")"


def date_clause(start, end):
    return f"date_received:[{start:%Y%m%d}+TO+{end:%Y%m%d}]"


def api_get(params):
    """GET with the api_key attached; returns (status_code, json_or_None).

    openFDA uses a literal '+' as its query separator (space / AND) and expects
    ':' '(' ')' '[' ']' unencoded. requests' params= dict would percent-encode
    those (e.g. '+' -> '%2B'), which corrupts the query and triggers a 500.
    So we build the query string by hand and preserve the operators, exactly
    like typing the URL into a browser.
    """
    parts = []
    if API_KEY:
        parts.append(f"api_key={API_KEY}")
    for k, v in params.items():
        parts.append(f"{k}={v}")
    url = BASE + "?" + "&".join(parts)
    r = requests.get(url, timeout=60)
    time.sleep(SLEEP)
    if r.status_code == 404:
        # openFDA returns 404 with an error body when a query matches 0 records.
        return 404, None
    r.raise_for_status()
    return r.status_code, r.json()


def window_total(start, end):
    """How many cohort records fall in [start, end] by date_received."""
    search = f"{code_clause()}+AND+{date_clause(start, end)}"
    status, data = api_get({"search": search, "limit": 1})
    if status == 404 or not data:
        return 0
    return data["meta"]["results"]["total"]


def fetch_window(start, end):
    """Yield every event record in [start, end], subdividing if over the ceiling."""
    total = window_total(start, end)
    if total == 0:
        return
    if total > SKIP_CEILING and start < end:
        # Too big to page — split the date range in half and recurse.
        mid = start + (end - start) / 2
        yield from fetch_window(start, mid)
        yield from fetch_window(mid + dt.timedelta(days=1), end)
        return

    search = f"{code_clause()}+AND+{date_clause(start, end)}"
    skip = 0
    pulled = 0
    while skip <= SKIP_CEILING:
        status, data = api_get({"search": search, "limit": PAGE, "skip": skip})
        if status == 404 or not data:
            break
        results = data.get("results", [])
        if not results:
            break
        for rec in results:
            yield rec
        pulled += len(results)
        print(f"    {start:%Y-%m-%d}..{end:%Y-%m-%d}  {pulled}/{total}")
        if len(results) < PAGE:
            break
        skip += PAGE


# ---------------------------------------------------------------------------
# Parsing — MAUDE records into our table rows. Defensive: everything optional.
# ---------------------------------------------------------------------------
def parse_date(s):
    """MAUDE dates are 'YYYYMMDD' strings; return ISO 'YYYY-MM-DD' or None."""
    if not s or not str(s).isdigit() or len(str(s)) != 8:
        return None
    try:
        return dt.datetime.strptime(str(s), "%Y%m%d").date().isoformat()
    except ValueError:
        return None


def to_int(s):
    try:
        return int(s)
    except (TypeError, ValueError):
        return None


def parse_record(rec):
    """Return (event_row, code_rows, narrative_rows) for one MAUDE report."""
    key = rec.get("mdr_report_key")
    if not key:
        return None, [], []

    devices = rec.get("device", []) or []
    # cohort codes present on this report
    codes_on_event = sorted({
        d.get("device_report_product_code")
        for d in devices
        if d.get("device_report_product_code") in COHORT
    })
    # primary device = first cohort device, else first device
    primary = next(
        (d for d in devices if d.get("device_report_product_code") in COHORT),
        devices[0] if devices else {},
    )

    event_row = {
        "mdr_report_key":       key,
        "report_number":        rec.get("report_number"),
        "event_type":           rec.get("event_type"),
        "date_received":        parse_date(rec.get("date_received")),
        "date_of_event":        parse_date(rec.get("date_of_event")),
        "product_problem_flag": rec.get("product_problem_flag"),
        "number_devices":       to_int(rec.get("number_devices_in_event")),
        "number_patients":      to_int(rec.get("number_patients_in_event")),
        "primary_product_code": primary.get("device_report_product_code")
                                if primary.get("device_report_product_code") in COHORT else None,
        "brand_name":           primary.get("brand_name"),
        "generic_name":         primary.get("generic_name"),
        "manufacturer_name":    primary.get("manufacturer_d_name"),
        "manufacturer_state":   primary.get("manufacturer_d_state"),
        "model_number":         primary.get("model_number"),
        "implant_flag":         primary.get("implant_flag"),
        "device_age_text":      primary.get("device_age_text"),
    }

    code_rows = [{"event_mdr_key": key, "product_code": c} for c in codes_on_event]

    narrative_rows = []
    for i, t in enumerate(rec.get("mdr_text", []) or []):
        narrative_rows.append({
            "narrative_key":           f"{key}:{i}",
            "event_mdr_key":           key,
            "text_type_code":          t.get("text_type_code"),
            "patient_sequence_number": t.get("patient_sequence_number"),
            "text":                    t.get("text"),
        })

    return event_row, code_rows, narrative_rows


# ---------------------------------------------------------------------------
# Supabase loading
# ---------------------------------------------------------------------------
def get_supabase():
    from supabase import create_client
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        sys.exit("ERROR: set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.")
    return create_client(url, key)


def upsert_batches(table, rows, conflict, chunk=500):
    if not rows:
        return
    for i in range(0, len(rows), chunk):
        batch = rows[i:i + chunk]
        table.upsert(batch, on_conflict=conflict, ignore_duplicates=False).execute()


def load(sb, events, codes, narrs):
    # order matters: events first (FKs), then children
    upsert_batches(sb.table("events"), events, "mdr_report_key")
    upsert_batches(sb.table("event_product_codes"), codes, "event_mdr_key,product_code")
    #upsert_batches(sb.table("event_narratives"), narrs, "narrative_key")


# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------
def do_sample():
    """Print a few raw records so you can eyeball the real field shape."""
    import json
    one = sorted(COHORT)[0]
    search = f"device.device_report_product_code:{one}"
    status, data = api_get({"search": search, "limit": 2})
    if status == 404 or not data:
        print(f"No records for {one} (unexpected). Try another code.")
        return
    print(f"total for {one}: {data['meta']['results']['total']}\n")
    print(json.dumps(data["results"][:2], indent=2)[:6000])


def run(start, end, dry_run):
    print(f"Cohort: {len(COHORT)} codes.  Range: {start} -> {end}")
    if not API_KEY:
        print("WARNING: no OPENFDA_API_KEY set — you'll hit the 1,000/day cap fast.")

    sb = None if dry_run else get_supabase()

    total_events = 0
    buf_events, buf_codes, buf_narrs = [], [], []
    seen = set()

    for rec in fetch_window(start, end):
        ev, cds, nrs = parse_record(rec)
        if not ev or ev["mdr_report_key"] in seen:
            continue
        seen.add(ev["mdr_report_key"])
        buf_events.append(ev)
        buf_codes.extend(cds)
        buf_narrs.extend(nrs)
        total_events += 1

        if len(buf_events) >= 500 and not dry_run:
            load(sb, buf_events, buf_codes, buf_narrs)
            buf_events, buf_codes, buf_narrs = [], [], []

    if not dry_run and buf_events:
        load(sb, buf_events, buf_codes, buf_narrs)

    print(f"\nDone. Unique events: {total_events}"
          + ("  (dry run — nothing written)" if dry_run else "  (loaded to Supabase)"))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--sample", action="store_true", help="print raw sample records and exit")
    p.add_argument("--dry-run", action="store_true", help="pull+parse but don't write to Supabase")
    p.add_argument("--start", default=DATA_START.isoformat(), help="YYYY-MM-DD")
    p.add_argument("--end", default=dt.date.today().isoformat(), help="YYYY-MM-DD")
    args = p.parse_args()

    if args.sample:
        do_sample()
        return

    start = dt.date.fromisoformat(args.start)
    end = dt.date.fromisoformat(args.end)
    run(start, end, args.dry_run)


if __name__ == "__main__":
    main()
