import { beforeEach, describe, expect, it, vi } from "vitest";

const { invalidateQueries } = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
}));

vi.mock("@/lib/query-client", () => ({
  queryClient: { invalidateQueries },
}));

class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];

  onmessage: ((event: { data: unknown }) => void) | null = null;
  posted: unknown[] = [];

  constructor(_name: string) {
    FakeBroadcastChannel.instances.push(this);
  }

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  close(): void {
    // no-op
  }
}

vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);

import { notifyDomainsChanged, setupSyncChannel } from "./index";

describe("sync bus", () => {
  beforeEach(() => {
    invalidateQueries.mockClear();
    for (const instance of FakeBroadcastChannel.instances) {
      instance.posted = [];
    }
  });

  it("invalidates derived and domain query keys for local mutations", () => {
    notifyDomainsChanged(["orders"]);
    const keys = invalidateQueries.mock.calls.map((call) => call[0].queryKey);
    expect(keys).toContainEqual(["orders"]);
    expect(keys).toContainEqual(["dashboard"]);
    expect(keys).toContainEqual(["bi"]);
    expect(keys).toContainEqual(["analytics"]);
    expect(keys).toContainEqual(["business-reports"]);
    expect(keys).toContainEqual(["kpis"]);
    expect(keys).toContainEqual(["statistics"]);
  });

  it("broadcasts the event to other tabs", () => {
    setupSyncChannel();
    const fake = FakeBroadcastChannel.instances[0];
    expect(fake).toBeDefined();
    notifyDomainsChanged(["customers", "orders"]);
    const message = fake.posted[0] as { type: string; domains: string[] };
    expect(message.type).toBe("sync");
    expect(message.domains).toEqual(["customers", "orders"]);
  });

  it("applies sync events received from other tabs", () => {
    setupSyncChannel();
    const fake = FakeBroadcastChannel.instances[0];
    fake.onmessage?.({ data: { type: "sync", domains: ["suppliers"], at: 1 } });
    const keys = invalidateQueries.mock.calls.map((call) => call[0].queryKey);
    expect(keys).toContainEqual(["suppliers"]);
    expect(keys).toContainEqual(["dashboard"]);
  });

  it("ignores malformed broadcast messages", () => {
    setupSyncChannel();
    const fake = FakeBroadcastChannel.instances[0];
    fake.onmessage?.({ data: { type: "other", domains: ["orders"] } });
    fake.onmessage?.({ data: null });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
