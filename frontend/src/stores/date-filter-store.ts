import { create } from "zustand";

export type DatePreset = "today" | "yesterday" | "7d" | "30d" | "90d" | "this_month" | "last_month" | "this_quarter" | "last_quarter" | "this_year" | "last_year" | "all" | "custom";

interface DateFilterState {
  preset: DatePreset;
  dateFrom: string;
  dateTo: string;
  setPreset: (preset: DatePreset) => void;
  setCustomRange: (from: string, to: string) => void;
  getParams: () => { date_from: string; date_to: string };
}

function resolvePreset(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return { from: fmt(d), to: fmt(d) };
    }
    case "7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { from: fmt(d), to: today };
    }
    case "30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return { from: fmt(d), to: today };
    }
    case "90d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return { from: fmt(d), to: today };
    }
    case "this_month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(d), to: today };
    }
    case "last_month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmt(first), to: fmt(last) };
    }
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      const first = new Date(now.getFullYear(), q * 3, 1);
      return { from: fmt(first), to: today };
    }
    case "last_quarter": {
      const q = Math.floor(now.getMonth() / 3) - 1;
      const year = q < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const qm = q < 0 ? 2 : q;
      const first = new Date(year, qm * 3, 1);
      const last = new Date(year, qm * 3 + 3, 0);
      return { from: fmt(first), to: fmt(last) };
    }
    case "this_year": {
      return { from: `${now.getFullYear()}-01-01`, to: today };
    }
    case "last_year": {
      return { from: `${now.getFullYear() - 1}-01-01`, to: `${now.getFullYear() - 1}-12-31` };
    }
    case "all":
      return { from: "2024-01-01", to: today };
    default:
      return { from: "2024-01-01", to: today };
  }
}

const initial = resolvePreset("all");

export const useDateFilterStore = create<DateFilterState>()((set, get) => ({
  preset: "all",
  dateFrom: initial.from,
  dateTo: initial.to,
  setPreset: (preset) => {
    if (preset === "custom") return;
    const range = resolvePreset(preset);
    set({ preset, dateFrom: range.from, dateTo: range.to });
  },
  setCustomRange: (from, to) => {
    set({ preset: "custom", dateFrom: from, dateTo: to });
  },
  getParams: () => ({ date_from: get().dateFrom, date_to: get().dateTo }),
}));

export const DATE_PRESETS: Array<{ key: DatePreset; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "90d", label: "Last 90 Days" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "this_quarter", label: "This Quarter" },
  { key: "last_quarter", label: "Last Quarter" },
  { key: "this_year", label: "This Year" },
  { key: "last_year", label: "Last Year" },
  { key: "all", label: "All Time" },
];
