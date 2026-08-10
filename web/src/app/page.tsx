import { supabase } from "@/lib/supabase";
import EventTypeChart from "@/components/EventTypeChart";
import PanelDonut from "@/components/PanelDonut";
import TopCodesChart from "@/components/TopCodesChart";
import TrendChart from "@/components/TrendChart";
import YearFilter from "@/components/YearFilter";

export const dynamic = "force-dynamic";

type TypeRow = { event_type: string; n: number };
type PanelRow = { panel: string; n: number };
type CodeRow = { code: string; report_count: number };
type YearRow = { year: number; n: number };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  const year = sp.year ? Number(sp.year) : null;

  const { data: total } = await supabase.rpc("f_total", { p_year: year });

  const { data: typeRows } = await supabase.rpc("f_event_type_counts", { p_year: year });
  const typeData = (typeRows ?? []) as TypeRow[];

  const { data: panelRows } = await supabase.rpc("f_panel_counts", { p_year: year });
  const panelData = (panelRows ?? []) as PanelRow[];

  const { data: codeRows } = await supabase.rpc("f_top_codes", { p_year: year });
  const codeData = (codeRows ?? []) as CodeRow[];

  const { data: yearRows } = await supabase
    .from("v_events_per_year")
    .select("year, n")
    .order("year");
  const yearData = (yearRows ?? []) as YearRow[];
  const years = yearData.map((r) => r.year);

  const label = year ? `${year}` : "all years";

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">Orthopedic Adverse-Event Dashboard</h1>
        <p className="mt-2 text-sm text-gray-500">
          FDA MAUDE reports for hip &amp; knee joint prostheses. Report volume,
          not failure rates.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <span className="text-sm text-gray-500">Filter by year:</span>
          <YearFilter years={years} current={year ? String(year) : ""} />
        </div>

        <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-500">Total reports ({label})</div>
          <div className="text-4xl font-bold">
            {Number(total ?? 0).toLocaleString()}
          </div>
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
          <div className="mb-4 text-sm font-medium text-gray-500">
            Reports per year (all years)
          </div>
          <TrendChart data={yearData} />
        </div>
      </div>
    </main>
  );
}