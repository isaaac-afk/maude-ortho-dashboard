"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Row = { panel: string; n: number };

const COLORS: Record<string, string> = { hip: "#2563eb", knee: "#16a34a" };

export default function PanelDonut({ data }: { data: Row[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="n"
            nameKey="panel"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {data.map((row) => (
              <Cell key={row.panel} fill={COLORS[row.panel] ?? "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => Number(value).toLocaleString()} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}