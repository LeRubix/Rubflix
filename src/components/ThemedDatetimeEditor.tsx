import { useEffect, useMemo, useState } from 'react';
import { ThemedSelect } from './ThemedSelect';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function parseIsoParts(iso: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

function partsToIso(parts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): string {
  const maxDay = daysInMonth(parts.year, parts.month);
  const day = Math.min(parts.day, maxDay);
  const d = new Date(parts.year, parts.month, day, parts.hour, parts.minute, 0, 0);
  return d.toISOString();
}

function buildYearOptions(): { value: string; label: string }[] {
  const now = new Date().getFullYear();
  const out: { value: string; label: string }[] = [];
  for (let y = now + 1; y >= 1970; y--) {
    out.push({ value: String(y), label: String(y) });
  }
  return out;
}

const YEAR_OPTIONS = buildYearOptions();

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: String(h).padStart(2, '0'),
}));

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, m) => ({
  value: String(m),
  label: String(m).padStart(2, '0'),
}));

const selectBtn = 'min-w-[3.25rem] w-auto px-2 py-1 text-xs font-semibold';

export function ThemedDatetimeEditor({
  valueIso,
  onChange,
}: {
  valueIso: string;
  onChange: (iso: string) => void;
}) {
  const initial = parseIsoParts(valueIso) ?? {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    day: new Date().getDate(),
    hour: 12,
    minute: 0,
  };

  const [parts, setParts] = useState(initial);

  useEffect(() => {
    const parsed = parseIsoParts(valueIso);
    if (parsed) setParts(parsed);
  }, [valueIso]);

  const monthOptions = useMemo(
    () =>
      MONTHS.map((label, i) => ({
        value: String(i),
        label,
      })),
    [],
  );

  const dayOptions = useMemo(() => {
    const max = daysInMonth(parts.year, parts.month);
    return Array.from({ length: max }, (_, i) => {
      const d = i + 1;
      return { value: String(d), label: String(d) };
    });
  }, [parts.year, parts.month]);

  const update = (patch: Partial<typeof parts>) => {
    setParts((prev) => {
      const next = { ...prev, ...patch };
      const maxDay = daysInMonth(next.year, next.month);
      if (next.day > maxDay) next.day = maxDay;
      onChange(partsToIso(next));
      return next;
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ThemedSelect
        value={String(parts.month)}
        onChange={(v) => update({ month: Number(v) })}
        options={monthOptions}
        buttonClassName={selectBtn}
        menuZIndex={450}
      />
      <ThemedSelect
        value={String(parts.day)}
        onChange={(v) => update({ day: Number(v) })}
        options={dayOptions}
        buttonClassName={selectBtn}
        menuZIndex={450}
      />
      <ThemedSelect
        value={String(parts.year)}
        onChange={(v) => update({ year: Number(v) })}
        options={YEAR_OPTIONS}
        buttonClassName={`${selectBtn} min-w-[4.25rem]`}
        menuZIndex={450}
      />
      <span className="text-gray-600 text-xs px-0.5">at</span>
      <ThemedSelect
        value={String(parts.hour)}
        onChange={(v) => update({ hour: Number(v) })}
        options={HOUR_OPTIONS}
        buttonClassName={selectBtn}
        menuZIndex={450}
      />
      <span className="text-gray-500 text-xs">:</span>
      <ThemedSelect
        value={String(parts.minute)}
        onChange={(v) => update({ minute: Number(v) })}
        options={MINUTE_OPTIONS}
        buttonClassName={selectBtn}
        menuZIndex={450}
      />
    </div>
  );
}
