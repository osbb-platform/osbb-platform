import { createClient } from "@supabase/supabase-js";

export type PublishableSupabaseTestClientOptions = {
  supabaseUrl: string;
  publishableKey: string;
  fetch?: typeof globalThis.fetch;
};

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${field} is required`);
  }

  return normalized;
}

function assertPublishableCredential(key: string): void {
  if (/service[_-]?role/i.test(key) || /^sb_secret_/i.test(key)) {
    throw new Error(
      "DB tests must use a publishable or anon key, never a service-role secret",
    );
  }
}

export function createPublishableSupabaseTestClient({
  supabaseUrl,
  publishableKey,
  fetch: customFetch,
}: PublishableSupabaseTestClientOptions) {
  const resolvedUrl = requireNonEmpty(supabaseUrl, "supabaseUrl");
  const resolvedKey = requireNonEmpty(publishableKey, "publishableKey");

  assertPublishableCredential(resolvedKey);

  const auth = {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  };

  if (customFetch) {
    return createClient(resolvedUrl, resolvedKey, {
      auth,
      global: {
        fetch: customFetch,
      },
    });
  }

  return createClient(resolvedUrl, resolvedKey, {
    auth,
  });
}
