# Cohort Definition — Hip & Knee Joint Prostheses

Generated from the openFDA Device Classification API
(`/device/classification.json`), medical specialty: Orthopedic (21 CFR Part 888).
Cohort rule: every device type FDA classifies as a hip or knee prosthesis.
Locked: 2026-07-27. Source data last_updated: 2026-07-20.

Use these `product_code` values to filter MAUDE adverse events on the field
`device.device_report_product_code`.

## HIP (29 codes)
JDG, JDH, JDI, JDJ, JDK, JDL, KMC, KWA, KWB, KWL, KWY, KWZ, KXA, KXB, KXD,
LPF, LPH, LWJ, LZO, LZY, MAY, MBL, MEH, MRA, NXT, OCG, OQG, OVO, PBI

## KNEE (26 codes)
HRY, HRZ, HSA, HSH, HSX, HTG, JWH, KMB, KRN, KRO, KRP, KRQ, KRR, KRS, KTX,
KYK, LGE, LXY, MBD, MBH, MBV, NJD, NJL, NPJ, NRA, OIY

## Combined (55 codes) — for query building
JDG JDH JDI JDJ JDK JDL KMC KWA KWB KWL KWY KWZ KXA KXB KXD LPF LPH LWJ LZO
LZY MAY MBL MEH MRA NXT OCG OQG OVO PBI HRY HRZ HSA HSH HSX HTG JWH KMB KRN
KRO KRP KRQ KRR KRS KTX KYK LGE LXY MBD MBH MBV NJD NJL NPJ NRA OIY

## Notes
- HIP edge cases (components/accessories, not full joints — kept for clean rule):
  JDJ (acetabular mesh), JDK (cement restrictor), JDL (acetabular component).
- KNEE buckets: total (patellofemorotibial), constrained/hinged, partial/
  unicompartmental, hemi/resurfacing. All kept.
- MAUDE incidence CANNOT be derived from report counts (under-reporting, no
  usage denominator). Report counts = report VOLUME, never failure rate.
