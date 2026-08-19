import "server-only";

import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { ServerRateLimitPolicy } from "@/src/shared/security/rateLimitPolicies";

export type ServerRateLimitResult = {
  allowed: boolean;
  attempts: number;
  retryAfterSeconds: number;
};

function requireServerRateLimitConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SERVER_RATE_LIMIT_CONFIG_MISSING");
  }

  return {
    supabaseUrl,
    serviceRoleKey,
  };
}

function hashRateLimitSubject(subject: string, secret: string) {
  return createHmac("sha256", secret)
    .update(subject)
    .digest("hex");
}

export async function consumeServerRateLimit(params: {
  policy: ServerRateLimitPolicy;
  subject: string;
}): Promise<ServerRateLimitResult> {
  const normalizedSubject = params.subject.trim();

  if (!normalizedSubject) {
    throw new Error("SERVER_RATE_LIMIT_SUBJECT_REQUIRED");
  }

  const { supabaseUrl, serviceRoleKey } = requireServerRateLimitConfig();

  const subjectHash = hashRateLimitSubject(
    normalizedSubject,
    serviceRoleKey,
  );

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { data, error } = await supabase.rpc(
    "consume_site_rate_limit",
    {
      p_scope: params.policy.scope,
      p_subject_hash: subjectHash,
      p_window_seconds: params.policy.windowSeconds,
      p_max_attempts: params.policy.maxAttempts,
    },
  );

  if (error) {
    console.error("Server rate limit failed", {
      scope: params.policy.scope,
      message: error.message,
    });

    throw new Error("SERVER_RATE_LIMIT_UNAVAILABLE");
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    throw new Error("SERVER_RATE_LIMIT_INVALID_RESPONSE");
  }

  const record = row as Record<string, unknown>;

  return {
    allowed: record.allowed === true,
    attempts: Number(record.attempts ?? 0),
    retryAfterSeconds: Number(
      record.retry_after_seconds ?? 0,
    ),
  };
}
