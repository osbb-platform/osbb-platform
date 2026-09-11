import { existsSync } from "node:fs";
import path from "node:path";

let loaded = false;

// Real-DB acceptance suites need NEXT_PUBLIC_SUPABASE_URL /
// SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY, the same local
// Supabase credentials the dev server reads from .env.local. Next.js loads
// that file itself; a standalone `vitest run` does not, which previously
// left these suites unable to run without a manual env export step. In CI
// or any environment where .env.local does not exist, this is a no-op and
// real env vars injected by the platform are used as-is.
export function loadLocalEnvForRealDbTests(): void {
  if (loaded) return;
  loaded = true;

  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(envLocalPath)) return;

  try {
    process.loadEnvFile(envLocalPath);
  } catch {
    // Non-fatal: fall back to whatever is already in process.env.
  }
}
