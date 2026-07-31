

import TrendChart from "@/components/TrendChart";
import PanelDonut from "@/components/PanelDonut";
import TopCodesChart from "@/components/TopCodesChart";
import { supabase } from "@/lib/supabase";
import EventTypeChart from "@/components/EventTypeChart";

export const dynamic = "force-dynamic";

type TypeRow = { event_type: string; n: number };

export default async function Home() {
  const { count: total } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true });

  const { data: typeRows } = await supabase
    .from("v_event_type_counts")
    .select("event_type, n");
  const typeData = (typeRows ?? []) as TypeRow[];
  const { data: panelRows } = await supabase
    .from("v_panel_counts")
    .select("panel, n");
  const panelData = (panelRows ?? []) as { panel: string; n: number }[];
  const { data: codeRows } = await supabase
    .from("v_event_volume_by_code")
    .select("code, report_count")
    .order("report_count", { ascending: false })
    .limit(10);
  const codeData = (codeRows ?? []) as { code: string; report_count: number }[];
const { data: yearRows } = await supabase
    .from("v_events_per_year")
    .select("year, n")
    .order("year");
  const yearData = (yearRows ?? []) as { year: number; n: number }[];
  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">Orthopedic Adverse-Event Dashboard</h1>
        <p className="mt-2 text-sm text-gray-500">
          FDA MAUDE reports for hip &amp; knee joint prostheses. Report volume,
          not failure rates.
        </p>

        <div className="mt-8 rounded-lg border bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-500">Total reports</div>
          <div className="text-4xl font-bold">{total?.toLocaleString()}</div>
        </div>

        <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 text-sm font-medium text-gray-500">By event type</div>
          <EventTypeChart data={typeData} />
        </div>

        <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 text-sm font-medium text-gray-500">Hip vs knee</div>
          <PanelDonut data={panelData} />
        </div>

<div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 text-sm font-medium text-gray-500">
            Top 10 product codes by report volume
          </div>
          <TopCodesChart data={codeData} />
        </div>

        <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 text-sm font-medium text-gray-500">Reports per year</div>
          <TrendChart data={yearData} />
        </div>
      </div>
    </main>
  );
}