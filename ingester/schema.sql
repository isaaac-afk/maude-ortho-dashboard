-- ============================================================
--  MAUDE Orthopedic Adverse-Event Dashboard — Supabase schema
--  Run this in the Supabase SQL Editor (Dashboard > SQL Editor).
--  Cohort: hip & knee joint prostheses (21 CFR Part 888), 55 codes.
-- ============================================================

-- Reference table: the locked cohort. One row per FDA product code.
create table if not exists product_codes (
    code               text primary key,
    device_name        text not null,
    panel              text not null check (panel in ('hip','knee')),
    regulation_number  text            -- nullable; can be backfilled later
);

-- One row per MDR report. Deduped by mdr_report_key.
-- The "primary" device fields are the cohort device flattened in for easy
-- browsing/filtering; the full many-to-many lives in event_product_codes.
create table if not exists events (
    mdr_report_key       text primary key,
    report_number        text,
    event_type           text,          -- Death / Injury / Malfunction / Other
    date_received        date,          -- most reliable date field
    date_of_event        date,          -- often null/approximate
    product_problem_flag text,          -- Y / N
    number_devices       int,
    number_patients      int,
    primary_product_code text references product_codes(code),
    brand_name           text,
    generic_name         text,
    manufacturer_name    text,          -- FREE TEXT — not a clean key (see notes)
    manufacturer_state   text,
    model_number         text,
    implant_flag         text,
    device_age_text      text,
    ingested_at          timestamptz not null default now()
);

-- Many-to-many: which cohort codes appear on an event. Prevents double-counting
-- events while still letting you count per code.
create table if not exists event_product_codes (
    event_mdr_key text references events(mdr_report_key) on delete cascade,
    product_code  text references product_codes(code),
    primary key (event_mdr_key, product_code)
);

-- Narrative text per event. This is the Phase 5 (LLM failure-mode) fuel.
-- narrative_key = "<mdr_report_key>:<index-in-mdr_text-array>" keeps re-runs idempotent.
create table if not exists event_narratives (
    narrative_key           text primary key,
    event_mdr_key           text references events(mdr_report_key) on delete cascade,
    text_type_code          text,   -- "Description of Event" / "Additional Manufacturer Narrative"
    patient_sequence_number text,
    text                    text
);

-- ---- Indexes for the dashboard's common filters ----
create index if not exists idx_events_date        on events (date_received);
create index if not exists idx_events_event_type  on events (event_type);
create index if not exists idx_events_prim_code    on events (primary_product_code);
create index if not exists idx_epc_code            on event_product_codes (product_code);
create index if not exists idx_narr_event          on event_narratives (event_mdr_key);

-- ---- Convenience view: report VOLUME per code (NOT a failure rate) ----
create or replace view v_event_volume_by_code as
select pc.code,
       pc.panel,
       pc.device_name,
       count(epc.event_mdr_key) as report_count
from product_codes pc
left join event_product_codes epc on epc.product_code = pc.code
group by pc.code, pc.panel, pc.device_name
order by report_count desc;

-- ============================================================
--  Seed: the 55 locked cohort codes
-- ============================================================
insert into product_codes (code, device_name, panel) values
-- HIP (29)
('JDG','Prosthesis, Hip, Femoral Component, Cemented, Metal','hip'),
('JDH','Prosthesis, Hip, Hemi-, Trunnion-Bearing, Femoral, Metal/Polyacetal','hip'),
('JDI','Prosthesis, Hip, Semi-Constrained, Metal/Polymer, Cemented','hip'),
('JDJ','Mesh, Surgical, Acetabular, Hip, Prosthesis','hip'),
('JDK','Prosthesis, Hip, Cement Restrictor','hip'),
('JDL','Prosthesis, Hip, Semi-Constrained (Metal Cemented Acetabular Component)','hip'),
('KMC','Prosthesis, Hip, Semi-Constrained, Composite/Metal','hip'),
('KWA','Prosthesis, Hip, Semi-Constrained (Metal Uncemented Acetabular Component)','hip'),
('KWB','Prosthesis, Hip, Hemi-, Acetabular, Cemented, Metal','hip'),
('KWL','Prosthesis, Hip, Hemi-, Femoral, Metal','hip'),
('KWY','Prosthesis, Hip, Hemi-, Femoral, Metal/Polymer, Cemented Or Uncemented','hip'),
('KWZ','Prosthesis, Hip, Constrained, Cemented Or Uncemented, Metal/Polymer','hip'),
('KXA','Prosthesis, Hip, Femoral, Resurfacing','hip'),
('KXB','Prosthesis, Hip, Pelvifemoral Resurfacing, Metal/Polymer','hip'),
('KXD','Prosthesis, Hip, Constrained, Metal','hip'),
('LPF','Prosthesis, Hip, Semi-Constrained, Metal/Ceramic/Ceramic, Cemented','hip'),
('LPH','Prosthesis, Hip, Semi-Constrained, Metal/Polymer, Porous Uncemented','hip'),
('LWJ','Prosthesis, Hip, Semi-Constrained, Metal/Polymer, Uncemented','hip'),
('LZO','Prosthesis, Hip, Semi-Constrained, Metal/Ceramic/Polymer, Cemented Or Non-Porous, Uncemented','hip'),
('LZY','Prosthesis, Hip, Hemi-, Femoral, Metal Ball','hip'),
('MAY','Prosthesis, Hip, Semi-Constrained, Metal/Ceramic/Polymer, Cemented Or Non-Porous Cemented, Osteophilic Finish','hip'),
('MBL','Prosthesis, Hip, Semi-Constrained, Uncemented, Metal/Polymer, Porous','hip'),
('MEH','Prosthesis, Hip, Semi-Constrained, Uncemented, Metal/Polymer, Non-Porous, Calcium Phosphate','hip'),
('MRA','Prosthesis, Hip, Semi-Constrained, Metal/Ceramic/Ceramic/Metal, Cemented Or Uncemented','hip'),
('NXT','Prosthesis, Hip, Semi-Constrained, Metal/Metal, Resurfacing','hip'),
('OCG','Prosthesis, Hip, Pelvifemoral Resurfacing, Metal/Polymer, Uncemented','hip'),
('OQG','Hip Prosthesis, Semi-Constrained, Cemented, Metal/Polymer, + Additive, Porous, Uncemented','hip'),
('OVO','Prosthesis, Hip, Semi-Constrained, Ceramic-On-Metal Articulation','hip'),
('PBI','Prosthesis, Hip, Constrained, Cemented Or Uncemented, Metal/Polymer, + Additive','hip'),
-- KNEE (26)
('HRY','Prosthesis, Knee, Femorotibial, Semi-Constrained, Cemented, Metal/Polymer','knee'),
('HRZ','Prosthesis, Knee, Hinged (Metal-Metal)','knee'),
('HSA','Prosthesis, Knee, Hemi-, Femoral','knee'),
('HSH','Prosthesis, Knee, Hemi-, Tibial, Resurfacing (Uncemented)','knee'),
('HSX','Prosthesis, Knee, Femorotibial, Non-Constrained, Cemented, Metal/Polymer','knee'),
('HTG','Prosthesis, Knee, Hemi-, Patellar Resurfacing, Uncemented','knee'),
('JWH','Prosthesis, Knee, Patellofemorotibial, Semi-Constrained, Cemented, Polymer/Metal/Polymer','knee'),
('KMB','Prosthesis, Knee, Non-Constrained (Metal-Carbon Reinforced Polyethylene) Cemented','knee'),
('KRN','Metal Cemented Constrained Femorotibial Knee Prosthesis','knee'),
('KRO','Prosthesis, Knee, Femorotibial, Constrained, Cemented, Metal/Polymer','knee'),
('KRP','Prosthesis, Knee, Patello/Femorotibial, Constrained, Cemented, Polymer/Metal/Metal','knee'),
('KRQ','Prosthesis, Knee, Patello/Femorotibial, Constrained, Cemented, Polymer/Metal/Polymer','knee'),
('KRR','Prosthesis, Knee, Patello/Femoral, Semi-Constrained, Cemented, Metal/Polymer','knee'),
('KRS','Prosthesis, Knee, Hemi-, Femoral (Uncemented)','knee'),
('KTX','Prosthesis, Knee, Femorotibial, Non-Constrained, Metal/Composite Cemented','knee'),
('KYK','Prosthesis, Knee, Femorotibial, Semi-Constrained, Cemented, Metal/Composite','knee'),
('LGE','Prosthesis, Knee, Femorotibial, Semi-Constrained, Cemented, Trunnion-Bearing','knee'),
('LXY','Prosthesis, Knee, Patello/Femorotibial, Semi-Constrained, Uncemented, Polymer/Metal/Polymer','knee'),
('MBD','Prosthesis, Knee, Patello/Femorotibial, Unconstrained, Uncemented, Porous, Coated, Polymer/Metal/Polymer','knee'),
('MBH','Prosthesis, Knee, Patello/Femorotibial, Semi-Constrained, Uncemented, Porous, Coated, Polymer/Metal/Polymer','knee'),
('MBV','Prosthesis, Knee, Patello/Femorotibial, Semi-Constrained, Uhmwpe, Pegged, Cemented, Polymer/Metal/Polymer','knee'),
('NJD','Prosthesis, Knee, Femorotibial, Unicompartmental/Unicondylar, Uncemented, Porous-Coated, Metal/Polymer','knee'),
('NJL','Prosthesis, Knee, Patellofemorotibial, Semi-Constrained, Metal/Polymer, Mobile Bearing','knee'),
('NPJ','Prosthesis, Knee Patellofemorotibial, Partial, Semi-Constrained, Cemented, Polymer/Metal/Polymer','knee'),
('NRA','Prosthesis, Knee, Femorotibial, Unicompartmental, Semi-Constrained, Metal/Polymer, Mobile Bearing','knee'),
('OIY','Prosthesis, Knee, Patellofemorotibial, Semi-Constrained, Cemented, Polymer + Additive/Metal/Polymer + Additive','knee')
on conflict (code) do update
    set device_name = excluded.device_name,
        panel       = excluded.panel;
