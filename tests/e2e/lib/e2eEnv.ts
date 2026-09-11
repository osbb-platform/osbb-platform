import { existsSync } from "node:fs";
import path from "node:path";

let loaded = false;

function loadLocalEnv(): void {
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

loadLocalEnv();

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`E2E_ENV_MISSING: ${name} is required to run the local browser E2E gate against local Supabase.`);
  }
  return value;
}

export const e2eEnv = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  // The dev server this gate drives. Override with E2E_BASE_URL if the
  // implicit `next dev -p 3100` convention (matching proxy.ts's documented
  // local subdomain routing: admin.localhost / <slug>.localhost) isn't used.
  adminBaseUrl: process.env.E2E_BASE_URL?.trim() || "http://admin.localhost:3100",
  houseBaseHost: process.env.E2E_HOUSE_BASE_HOST?.trim() || "localhost:3100",
  headless: process.env.E2E_HEADED === "1" ? false : true,
};
