import { describe, expect, it } from "vitest";

import {
  clamp,
  formatCompact,
  formatCurrency,
  formatDateShort,
  formatNumber,
  formatPercent,
  initials,
  parseNum,
  toTitleCase,
} from "@/lib/utils";

describe("formatNumber", () => {
  it("formats large numbers", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("respects digit precision", () => {
    expect(formatNumber(12.3456, 2)).toBe("12.35");
  });

  it("renders dash for invalid input", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
    expect(formatNumber(Number.NaN)).toBe("—");
  });
});

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("supports custom currency", () => {
    expect(formatCurrency("99", "EUR")).toBe("€99.00");
  });

  it("treats invalid values as zero", () => {
    expect(formatCurrency(null)).toBe("$0.00");
    expect(formatCurrency("abc")).toBe("$0.00");
  });
});

describe("formatPercent", () => {
  it("formats and rounds", () => {
    expect(formatPercent(12.345, 1)).toBe("12.3%");
  });
});

describe("formatCompact", () => {
  it("compacts thousands", () => {
    expect(formatCompact(1500)).toBe("1.5K");
  });
});

describe("toTitleCase", () => {
  it("splits on separators", () => {
    expect(toTitleCase("order_items")).toBe("Order Items");
    expect(toTitleCase("net-profit")).toBe("Net Profit");
  });
});

describe("initials", () => {
  it("derives initials from names", () => {
    expect(initials("John Smith")).toBe("JS");
    expect(initials("Sara")).toBe("S");
    expect(initials(null)).toBe("?");
    expect(initials("")).toBe("?");
  });
});

describe("parseNum", () => {
  it("parses numeric strings", () => {
    expect(parseNum("42.5")).toBe(42.5);
    expect(parseNum(7)).toBe(7);
    expect(parseNum(null)).toBe(0);
    expect(parseNum("oops")).toBe(0);
  });
});

describe("clamp", () => {
  it("bounds values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(12, 0, 10)).toBe(10);
  });
});

describe("formatDateShort", () => {
  it("formats ISO dates and handles garbage", () => {
    expect(formatDateShort("2025-06-01")).not.toBe("—");
    expect(formatDateShort("not-a-date")).toBe("—");
    expect(formatDateShort(null)).toBe("—");
  });
});
