import axios, { AxiosError, type AxiosRequestConfig } from "axios";

import { notifyDomainsChanged } from "@/lib/sync";
import { isSyncableMutation, resolveDomainsFromUrl } from "@/lib/sync/domains";
import { useAuthStore } from "@/stores/auth-store";
import type { ApiEnvelope, ApiErrorPayload, Paginated, TokenResponse } from "@/types";

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api/v1";

export class ApiClientError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status = 0, detail?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.detail = detail;
  }
}

let refreshPromise: Promise<boolean> | null = null;

function extractErrorMessage(error: AxiosError): string {
  const payload = error.response?.data as ApiErrorPayload | ApiEnvelope<unknown> | undefined;
  if (!payload) return error.message || "Network error";
  if ("detail" in payload) {
    if (typeof payload.detail === "string") return payload.detail;
    if (Array.isArray(payload.detail) && payload.detail.length > 0) {
      return payload.detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join("; ");
    }
  }
  if ("message" in payload && payload.message) return payload.message;
  return error.message || "Request failed";
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    const config = response.config;
    const url = config.url;
    if (url && isSyncableMutation(config.method, url)) {
      const domains = resolveDomainsFromUrl(url);
      if (domains.length > 0) {
        queueMicrotask(() => notifyDomainsChanged(domains));
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as
      | (AxiosRequestConfig & { _retried?: boolean })
      | undefined;

    const isAuthRequest =
      original && (original.url?.includes("/auth/login") || original.url?.includes("/auth/refresh"));

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !isAuthRequest &&
      useAuthStore.getState().refreshToken
    ) {
      original._retried = true;
      const refreshed = await tryRefresh();
      if (refreshed) {
        const accessToken = useAuthStore.getState().accessToken;
        original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${accessToken}` };
        return http(original);
      }
    }

    return Promise.reject(new ApiClientError(extractErrorMessage(error), error.response?.status ?? 0));
  },
);

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return false;

  refreshPromise = http
    .post<ApiEnvelope<TokenResponse>>("/auth/refresh", { refresh_token: refreshToken })
    .then((response) => {
      const data = response.data?.data;
      if (!data) return false;
      useAuthStore.getState().setAuth(data.access_token, data.refresh_token, data.user);
      return true;
    })
    .catch(() => {
      useAuthStore.getState().clearAuth();
      return false;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const response = await promise;
  if (!response.data || !response.data.success) {
    throw new ApiClientError(response.data?.message ?? "Request failed", 0);
  }
  if (response.data.data === null) {
    return null as T;
  }
  return response.data.data;
}

export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<Paginated<T>>,
): Promise<Paginated<T>> {
  const first = await fetchPage(1);
  const totalPages = Math.max(1, first.pages);
  if (totalPages <= 1) return first;
  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 2)),
  );
  return {
    ...first,
    items: remaining.reduce((acc, page) => acc.concat(page.items), [...first.items]),
  };
}

export const api = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return unwrap<T>(http.get<ApiEnvelope<T>>(url, config));
  },

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrap<T>(http.post<ApiEnvelope<T>>(url, data, config));
  },

  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrap<T>(http.patch<ApiEnvelope<T>>(url, data, config));
  },

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return unwrap<T>(http.delete<ApiEnvelope<T>>(url, config));
  },

  raw<T>(config: AxiosRequestConfig): Promise<T> {
    return http.request<ApiEnvelope<T>>(config).then((response) => {
      if (response.data && "data" in response.data) {
        return response.data.data as T;
      }
      return response.data as T;
    });
  },
};
