import type { QueryKey } from "@tanstack/react-query";

/**
 * Centralized event-driven synchronization.
 *
 * Every successful mutating HTTP request is intercepted once at the API layer
 * (`src/lib/api.ts`), resolved to one or more business domains, and dispatched
 * to this registry. The registry maps each domain to the React Query keys that
 * must be refreshed so that KPIs, charts, analytics and reports always reflect
 * the latest data without manual reloads.
 *
 * New modules only need to add their domain here (and a matching prefix in
 * DOMAIN_BY_PREFIX); nothing else is required for them to participate.
 */

export const SYNC_DOMAINS = [
  "customers",
  "suppliers",
  "categories",
  "products",
  "orders",
  "payments",
  "inventory",
  "employees",
  "users",
  "roles",
  "kpis",
  "dashboards",
  "reports",
  "settings",
  "notifications",
  "activity-logs",
  "statistics",
] as const;

export type SyncDomain = (typeof SYNC_DOMAINS)[number];

const DOMAIN_BY_PREFIX: Record<string, SyncDomain> = {
  customers: "customers",
  suppliers: "suppliers",
  categories: "categories",
  products: "products",
  orders: "orders",
  payments: "payments",
  inventory: "inventory",
  employees: "employees",
  users: "users",
  roles: "roles",
  kpis: "kpis",
  dashboards: "dashboards",
  reports: "reports",
  settings: "settings",
  notifications: "notifications",
  "activity-logs": "activity-logs",
  statistics: "statistics",
};

/** Paths whose requests never change business data and must not trigger sync. */
export const SYNC_EXCLUDED_PATHS: readonly string[] = ["/auth/", "/business/reports/export"];

export const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

/**
 * Shared derived query keys refreshed on ANY successful mutation.
 *
 * This is the single "refresh everything" rule requested by the product team:
 * whenever any CRUD operation succeeds anywhere in the system, the dashboard,
 * KPIs, charts, analytics, business reports and statistics snapshots are all
 * refreshed centrally. Individual domains additionally refresh their own lists.
 */
export const DERIVED_QUERY_KEYS: readonly (readonly string[])[] = [
  ["dashboard"],
  ["bi"],
  ["analytics"],
  ["business-reports"],
  ["kpis"],
  ["statistics"],
] as const;

/** Per-domain list query keys (in addition to the shared derived keys). */
export const DOMAIN_QUERY_KEYS: Record<SyncDomain, readonly (readonly string[])[]> = {
  customers: [["customers"]],
  suppliers: [["suppliers"]],
  categories: [["categories"], ["products"]],
  products: [["products"], ["inventory"], ["inventory-low-stock"], ["inventory-movements"]],
  orders: [["orders"]],
  payments: [["payments"], ["orders"]],
  inventory: [["inventory"], ["inventory-low-stock"], ["inventory-movements"]],
  employees: [["employees"]],
  users: [["users"], ["employees"]],
  roles: [["roles"], ["users"]],
  kpis: [["kpis"]],
  dashboards: [["dashboards"], ["kpis"]],
  reports: [["reports"]],
  settings: [["settings"]],
  notifications: [["notifications"]],
  "activity-logs": [["activity-logs"]],
  statistics: [["statistics"]],
};

export function isSyncableMutation(method: string | undefined, url: string | undefined): boolean {
  if (!method || !url) return false;
  if (!MUTATING_METHODS.has(method.toLowerCase())) return false;
  const path = url.split("?")[0] ?? url;
  return !SYNC_EXCLUDED_PATHS.some((prefix) => path.startsWith(prefix));
}

/** Resolves an API URL (e.g. "/orders/abc-123") to its business domain(s). */
export function resolveDomainsFromUrl(url: string): SyncDomain[] {
  const path = url.split("?")[0] ?? url;
  const prefix = path.split("/").filter(Boolean)[0] ?? "";
  const domain = DOMAIN_BY_PREFIX[prefix];
  return domain ? [domain] : [];
}

/** Collects the unique query keys to invalidate for the given domains. */
export function collectQueryKeys(domains: readonly SyncDomain[]): QueryKey[] {
  const keys: QueryKey[] = [];
  const seen = new Set<string>();
  const add = (key: readonly unknown[]) => {
    const serialized = JSON.stringify(key);
    if (seen.has(serialized)) return;
    seen.add(serialized);
    keys.push([...key] as QueryKey);
  };
  for (const domain of domains) {
    for (const key of DOMAIN_QUERY_KEYS[domain] ?? []) add(key);
  }
  for (const key of DERIVED_QUERY_KEYS) add(key);
  return keys;
}
