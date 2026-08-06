import { beforeEach, describe, expect, it } from "vitest";

import { DATE_PRESETS, useDateFilterStore } from "@/stores/date-filter-store";

describe("date filter store", () => {
  beforeEach(() => {
    useDateFilterStore.setState({ preset: "all", dateFrom: "2024-01-01", dateTo: "2026-01-01" });
  });

  it("exposes a curated list of presets", () => {
    const keys = DATE_PRESETS.map((p) => p.key);
    expect(DATE_PRESETS.length).toBeGreaterThanOrEqual(12);
    expect(keys).toContain("this_quarter");
    expect(keys).toContain("last_year");
  });

  it("resolves this_year to current year start", () => {
    useDateFilterStore.getState().setPreset("this_year");
    const { dateFrom, dateTo, preset } = useDateFilterStore.getState();
    expect(preset).toBe("this_year");
    expect(dateFrom).toBe(`${new Date().getFullYear()}-01-01`);
    expect(dateTo).toBe(new Date().toISOString().slice(0, 10));
  });

  it("keeps custom range without switching preset", () => {
    const { dateFrom, dateTo, preset } = useDateFilterStore.getState();
    expect(dateFrom).toBe("2024-01-01");
    expect(dateTo).toBe("2026-01-01");
    expect(preset).toBe("all");
  });

  it("setPreset ignores the custom marker", () => {
    useDateFilterStore.getState().setPreset("custom");
    expect(useDateFilterStore.getState().preset).not.toBe("custom");
  });

  it("setCustomRange switches to custom preset", () => {
    useDateFilterStore.getState().setCustomRange("2025-03-01", "2025-03-31");
    const state = useDateFilterStore.getState();
    expect(state.preset).toBe("custom");
    expect(state.getParams()).toEqual({ date_from: "2025-03-01", date_to: "2025-03-31" });
  });

  it("setPreset changes the stored range", () => {
    useDateFilterStore.getState().setPreset("7d");
    const state = useDateFilterStore.getState();
    expect(state.preset).toBe("7d");
    expect(state.dateFrom).toBeTruthy();
    expect(state.dateTo).toBeTruthy();
  });

  it("getParams reflects the current range for the all preset", () => {
    const { date_from, date_to } = useDateFilterStore.getState().getParams();
    expect(date_from).toBe("2024-01-01");
    expect(date_from < date_to).toBe(true);
  });
});
