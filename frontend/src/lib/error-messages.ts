import i18n from "@/i18n";

import type { ApiClientError } from "@/lib/api";

const CODE_KEYS: Record<string, string> = {
  NOT_FOUND: "errors.notFound",
  CONFLICT: "errors.conflict",
  UNAUTHORIZED: "errors.unauthorized",
  FORBIDDEN: "errors.forbidden",
  BAD_REQUEST: "errors.badRequest",
  VALIDATION_ERROR: "errors.validationError",
  INTERNAL_ERROR: "errors.internalError",
  RATE_LIMITED: "errors.rateLimited",
  HTTP_ERROR: "errors.generic",
};

const STATUS_KEYS: Record<number, string> = {
  401: "errors.unauthorized",
  403: "errors.forbidden",
  404: "errors.notFound",
  409: "errors.conflict",
  422: "errors.validationError",
  429: "errors.rateLimited",
  500: "errors.internalError",
  502: "errors.networkError",
  503: "errors.networkError",
  504: "errors.timeout",
};

const MESSAGE_PATTERNS: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /already exists/i, key: "errors.alreadyExists" },
  { pattern: /not found/i, key: "errors.notFound" },
  { pattern: /in use/i, key: "errors.resourceInUse" },
  { pattern: /required field is missing/i, key: "errors.requiredFieldMissing" },
  { pattern: /network error/i, key: "errors.networkError" },
  { pattern: /timeout|timed out/i, key: "errors.timeout" },
  { pattern: /permission|forbidden|not allowed/i, key: "errors.forbidden" },
];

function isTranslationKey(key: string): boolean {
  return Boolean(i18n.exists(key));
}

export function getErrorMessage(error: ApiClientError | Error | unknown): string {
  if (!(error instanceof Error)) {
    return i18n.t("errors.generic");
  }

  const clientError = error as ApiClientError;

  if (clientError.code) {
    const key = CODE_KEYS[clientError.code];
    if (key && isTranslationKey(key)) return i18n.t(key);
  }

  if (clientError.status && STATUS_KEYS[clientError.status]) {
    const key = STATUS_KEYS[clientError.status];
    if (isTranslationKey(key)) return i18n.t(key);
  }

  const message = clientError.message ?? clientError.detail;
  if (message && typeof message === "string") {
    for (const { pattern, key } of MESSAGE_PATTERNS) {
      if (pattern.test(message)) {
        if (isTranslationKey(key)) return i18n.t(key);
      }
    }
  }

  if (clientError.detail && typeof clientError.detail === "string") {
    return clientError.detail;
  }

  return i18n.t("errors.generic");
}
