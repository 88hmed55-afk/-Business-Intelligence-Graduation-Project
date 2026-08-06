import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { notifyDomainsChanged } = vi.hoisted(() => ({
  notifyDomainsChanged: vi.fn(),
}));

vi.mock("@/lib/sync", () => ({ notifyDomainsChanged }));

import { http } from "@/lib/api";

const originalAdapter = http.defaults.adapter;

function installMockAdapter() {
  http.defaults.adapter = async (config) => ({
    data: { success: true, data: { id: "abc-123" } },
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  });
}

async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("api sync interceptor", () => {
  beforeEach(() => {
    notifyDomainsChanged.mockClear();
    installMockAdapter();
  });

  afterEach(() => {
    http.defaults.adapter = originalAdapter;
  });

  it("notifies the sync bus after a successful mutation", async () => {
    await http.post("/orders", { items: [] });
    await flushMicrotasks();
    expect(notifyDomainsChanged).toHaveBeenCalledWith(["orders"]);
  });

  it("notifies the sync bus for nested mutation routes", async () => {
    await http.patch("/inventory/products/abc-123/adjust", { delta: "-1" });
    await flushMicrotasks();
    expect(notifyDomainsChanged).toHaveBeenCalledWith(["inventory"]);
  });

  it("does not notify for reads", async () => {
    await http.get("/orders");
    await flushMicrotasks();
    expect(notifyDomainsChanged).not.toHaveBeenCalled();
  });

  it("does not notify for auth or export endpoints", async () => {
    await http.post("/auth/login", { email: "a", password: "b" });
    await http.post("/business/reports/export");
    await flushMicrotasks();
    expect(notifyDomainsChanged).not.toHaveBeenCalled();
  });
});
