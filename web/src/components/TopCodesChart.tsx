"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Row = { code: string; report_count: number };

export default function TopCodesChart({ data }: { data: Row[] }) {
  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <XAxis type="number" tickFormatter={(v) => v.toLocaleString()} />
          <YAxis type="category" dataKey="code" width={60} />
          <Tooltip formatter={(value) => Number(value).toLocaleString()} />
          <Bar dataKey="report_count" fill="#7c3aed" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}