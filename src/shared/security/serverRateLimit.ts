import "server-only";

import { createHash } from "node:crypto";

import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import type { RateLimitPolicy } from "@/src/shared/security/rateLimitPolicies";

type RateLimitRpcRow = {
  allowed?: unknown;
  retry_after_seconds?: unknown;
  blocked_until?: unknown;
  attempt_count?: unknown;
};

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
  blockedUntil: number | null;
  attemptCount: number;
};

function normalizeIdentifier(value: string): string {
  const normalized = value.trim().toLowerCase().slice(0, 512);

  return normalized || "unknown";
}

export function buildRateLimitKeyHash(
  scope: string,
  identifier: string,
): string {
  return createHash("sha256")
    .update(`${scope}\u0000${normalizeIdentifier(identifier)}`)
    .digest("hex");
}

function toNonNegativeInteger(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function parseBlockedUntil(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function parseDecision(data: unknown): RateLimitDecision {
  const row = Array.isArray(data)
    ? (data[0] as RateLimitRpcRow | undefined)
    : undefined;

  if (!row || typeof row.allowed !== "boolean") {
    throw new Error("[rate-limit] Invalid database response");
  }

  return {
    allowed: row.allowed,
    retryAfterSeconds: toNonNegativeInteger(
      row.retry_after_seconds,
    ),
    blockedUntil: parseBlockedUntil(row.blocked_until),
    attemptCount: toNonNegativeInteger(row.attempt_count),
  };
}

function getRpcKey(policy: RateLimitPolicy, identifier: string) {
  return {
    p_scope: policy.scope,
    p_key_hash: buildRateLimitKeyHash(
      policy.scope,
      identifier,
    ),
  };
}

export async function getRateLimitState(
  policy: RateLimitPolicy,
  identifier: string,
): Promise<RateLimitDecision> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc(
    "get_rate_limit_state",
    getRpcKey(policy, identifier),
  );

  if (error) {
    console.error("[rate-limit] State check failed", {
      scope: policy.scope,
      code: error.code,
    });

    throw new Error("[rate-limit] State check failed");
  }

  return parseDecision(data);
}

export async function recordRateLimitFailure(
  policy: RateLimitPolicy,
  identifier: string,
): Promise<RateLimitDecision> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc(
    "record_rate_limit_failure",
    {
      ...getRpcKey(policy, identifier),
      p_max_attempts: policy.maxAttempts,
      p_window_seconds: policy.windowSeconds,
      p_block_seconds: policy.blockSeconds,
    },
  );

  if (error) {
    console.error("[rate-limit] Failure recording failed", {
      scope: policy.scope,
      code: error.code,
    });

    throw new Error("[rate-limit] Failure recording failed");
  }

  return parseDecision(data);
}

export async function consumeRateLimit(
  policy: RateLimitPolicy,
  identifier: string,
): Promise<RateLimitDecision> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc(
    "consume_rate_limit",
    {
      ...getRpcKey(policy, identifier),
      p_max_attempts: policy.maxAttempts,
      p_window_seconds: policy.windowSeconds,
      p_block_seconds: policy.blockSeconds,
    },
  );

  if (error) {
    console.error("[rate-limit] Request consumption failed", {
      scope: policy.scope,
      code: error.code,
    });

    throw new Error("[rate-limit] Request consumption failed");
  }

  return parseDecision(data);
}

export async function clearRateLimit(
  policy: RateLimitPolicy,
  identifier: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.rpc(
    "clear_rate_limit",
    getRpcKey(policy, identifier),
  );

  if (error) {
    console.error("[rate-limit] Reset failed", {
      scope: policy.scope,
      code: error.code,
    });

    throw new Error("[rate-limit] Reset failed");
  }
}
