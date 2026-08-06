import { describe, expect, it } from "vitest";

import {
  collectQueryKeys,
  DERIVED_QUERY_KEYS,
  isSyncableMutation,
  resolveDomainsFromUrl,
} from "./domains";

describe("resolveDomainsFromUrl", () => {
  it("maps the leading path segment to its domain", () => {
    expect(resolveDomainsFromUrl("/orders")).toEqual(["orders"]);
    expect(resolveDomainsFromUrl("/orders/abc-123")).toEqual(["orders"]);
    expect(resolveDomainsFromUrl("/payments/abc-123")).toEqual(["payments"]);
    expect(resolveDomainsFromUrl("/inventory/products/abc-123/adjust")).toEqual(["inventory"]);
    expect(resolveDomainsFromUrl("/users/me")).toEqual(["users"]);
    expect(resolveDomainsFromUrl("/roles/abc-123/permissions")).toEqual(["roles"]);
    expect(resolveDomainsFromUrl("/statistics/refresh")).toEqual(["statistics"]);
  });

  it("ignores query strings", () => {
    expect(resolveDomainsFromUrl("/orders?status=pending&page=1")).toEqual(["orders"]);
  });

  it("returns an empty list for unknown paths", () => {
    expect(resolveDomainsFromUrl("/unknown-route")).toEqual([]);
    expect(resolveDomainsFromUrl("")).toEqual([]);
  });
});

describe("isSyncableMutation", () => {
  it("accepts mutating methods", () => {
    expect(isSyncableMutation("post", "/orders")).toBe(true);
    expect(isSyncableMutation("PATCH", "/orders/abc")).toBe(true);
    expect(isSyncableMutation("delete", "/customers/abc")).toBe(true);
    expect(isSyncableMutation("put", "/settings/abc")).toBe(true);
  });

  it("rejects reads", () => {
    expect(isSyncableMutation("get", "/orders")).toBe(false);
    expect(isSyncableMutation("GET", "/orders")).toBe(false);
  });

  it("rejects excluded paths", () => {
    expect(isSyncableMutation("post", "/auth/login")).toBe(false);
    expect(isSyncableMutation("post", "/auth/refresh")).toBe(false);
    expect(isSyncableMutation("post", "/auth/logout")).toBe(false);
    expect(isSyncableMutation("post", "/business/reports/export")).toBe(false);
  });

  it("rejects missing inputs", () => {
    expect(isSyncableMutation(undefined, "/orders")).toBe(false);
    expect(isSyncableMutation("post", undefined)).toBe(false);
  });
});

describe("collectQueryKeys", () => {
  it("includes the shared derived keys for every mutation", () => {
    const keys = collectQueryKeys(["orders"]);
    for (const derived of DERIVED_QUERY_KEYS) {
      expect(keys).toContainEqual(derived);
    }
  });

  it("includes the domain-specific keys", () => {
    const keys = collectQueryKeys(["orders"]);
    expect(keys).toContainEqual(["orders"]);
  });

  it("deduplicates keys and merges multiple domains", () => {
    const keys = collectQueryKeys(["orders", "payments"]);
    const serialized = keys.map((key) => JSON.stringify(key));
    expect(new Set(serialized).size).toBe(serialized.length);
    expect(keys).toContainEqual(["orders"]);
    expect(keys).toContainEqual(["payments"]);
  });
});
