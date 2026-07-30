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
      </div>
    </main>
  );
}