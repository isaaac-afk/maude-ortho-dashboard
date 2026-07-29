import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  // total reports
  const { count: total } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true });

  // breakdown by event type (counted in the database, no 1000-row cap)
  const { data: typeRows } = await supabase
    .from("v_event_type_counts")
    .select("event_type, n");
  const typeList: [string, number][] = (typeRows ?? []).map((r) => [
    r.event_type as string,
    r.n as number,
  ]);

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
          <div className="mb-3 text-sm font-medium text-gray-500">
            By event type
          </div>
          <ul className="space-y-1">
            {typeList.map(([type, n]) => (
              <li key={type} className="flex justify-between border-b py-1">
                <span>{type}</span>
                <span className="font-mono">{n.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}