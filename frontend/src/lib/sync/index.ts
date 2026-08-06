import { useCallback, useEffect, useRef } from "react";

import { queryClient } from "@/lib/query-client";

import { collectQueryKeys, type SyncDomain } from "./domains";

export interface SyncEvent {
  domains: SyncDomain[];
  source: "local" | "remote";
  at: number;
}

interface SyncMessage {
  type: "sync";
  domains: SyncDomain[];
  at: number;
}

type SyncListener = (event: SyncEvent) => void;

const SYNC_CHANNEL_NAME = "nova-bi-sync";

const listeners = new Set<SyncListener>();
let channel: BroadcastChannel | null = null;

/**
 * Opens the cross-tab broadcast channel. Call once at application bootstrap.
 * If BroadcastChannel is unavailable the app simply falls back to same-tab sync.
 */
export function setupSyncChannel(): void {
  if (channel || typeof BroadcastChannel === "undefined") return;
  try {
    channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent) => {
      const message = event.data as SyncMessage | undefined;
      if (!message || message.type !== "sync" || !Array.isArray(message.domains)) return;
      applySync(message.domains, "remote");
    };
  } catch {
    channel = null;
  }
}

/** Subscribes to data-change events (returns an unsubscribe function). */
export function subscribeSync(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Invalidates every React Query key affected by the given domains. */
export function invalidateDomains(domains: readonly SyncDomain[]): void {
  for (const key of collectQueryKeys(domains)) {
    void queryClient.invalidateQueries({ queryKey: key });
  }
}

function applySync(domains: readonly SyncDomain[], source: SyncEvent["source"]): void {
  invalidateDomains(domains);
  const event: SyncEvent = { domains: [...domains], source, at: Date.now() };
  for (const listener of listeners) {
    listener(event);
  }
}

/**
 * Central entry point invoked after every successful CRUD operation.
 * Refreshes the affected queries in this tab and notifies every other tab.
 */
export function notifyDomainsChanged(domains: readonly SyncDomain[]): void {
  const uniqueDomains = Array.from(new Set(domains));
  if (uniqueDomains.length === 0) return;
  applySync(uniqueDomains, "local");
  channel?.postMessage({
    type: "sync",
    domains: uniqueDomains,
    at: Date.now(),
  } satisfies SyncMessage);
}

/**
 * React hook: runs the callback whenever any synced data changes.
 * Useful for non-React-Query state (e.g. Zustand stores) that mirrors server data.
 */
export function useSyncEvent(listener: SyncListener): void {
  const ref = useRef(listener);
  ref.current = listener;
  const stableListener = useCallback((event: SyncEvent) => ref.current(event), []);
  useEffect(() => subscribeSync(stableListener), [stableListener]);
}
