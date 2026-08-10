"use client";

import { useRouter } from "next/navigation";

export default function YearFilter({
  years,
  current,
}: {
  years: number[];
  current: string;
}) {
  const router = useRouter();
  return (
    <select
      defaultValue={current}
      onChange={(e) => {
        const v = e.target.value;
        router.push(v ? `/?year=${v}` : `/`);
      }}
      className="rounded border px-3 py-2 text-sm"
    >
      <option value="">All years</option>
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}