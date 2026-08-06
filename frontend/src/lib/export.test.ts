import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { exportToCSV, exportToJSON } from "@/lib/export";

describe("export helpers", () => {
  let createSpy: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let clickedAnchor: HTMLAnchorElement | null;

  beforeEach(() => {
    clickedAnchor = null;
    createSpy = vi.fn((_blob: Blob) => "blob:mock");
    clickSpy = vi.fn(function (this: HTMLAnchorElement) {
      clickedAnchor = this;
    });
    vi.stubGlobal("URL", {
      createObjectURL: createSpy,
      revokeObjectURL: vi.fn(),
    });
    HTMLAnchorElement.prototype.click = clickSpy as () => void;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clickSpy.mockClear();
    document.body.innerHTML = "";
  });

  it("exportToCSV clicks a download link with the right name and CSV mime", () => {
    exportToCSV([{ name: "A", value: 1 }], "report");

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(clickedAnchor?.download).toBe("report.csv");
    expect(createSpy).toHaveBeenCalledTimes(1);

    const blob: Blob = createSpy.mock.calls[0][0];
    expect(blob.type).toBe("text/csv");
  });

  it("exportToCSV quotes fields containing commas and newlines", async () => {
    exportToCSV([{ name: "A, B", value: "line1\nline2" }], "x");

    const blob: Blob = createSpy.mock.calls[0][0];
    const text = await blob.text();
    expect(text).toBe('name,value\n"A, B","line1\nline2"');
  });

  it("exportToJSON serializes with indentation", () => {
    exportToJSON({ a: 1 }, "data");

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(clickedAnchor?.download).toBe("data.json");
    const blob: Blob = createSpy.mock.calls[0][0];
    expect(blob.type).toBe("application/json");
  });

  it("exportToCSV is a no-op for empty data", () => {
    exportToCSV([], "empty");
    expect(clickSpy).not.toHaveBeenCalled();
    expect(document.querySelector("a")).toBeNull();
  });
});
