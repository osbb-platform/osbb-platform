#!/usr/bin/env node

import fs from "node:fs";

import { createClient } from "@supabase/supabase-js";

const inputPath = process.argv.find(
  (arg, index) =>
    index >= 2 &&
    !arg.startsWith("--"),
);

const apply = process.argv.includes("--apply");

if (!inputPath) {
  console.error(
    "Usage: node scripts/reconcile-house-content-history.mjs <records.json> [--apply]",
  );
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const records = Array.isArray(raw) ? raw : [raw];

for (const record of records) {
  if (
    record?.version !== 1 ||
    record?.kind !== "house_content_history" ||
    typeof record?.reconciliationKey !== "string" ||
    !record?.payload
  ) {
    throw new Error("Invalid history reconciliation record");
  }
}

if (!apply) {
  console.log("MODE=DRY_RUN");
  console.log(`RECORDS=${records.length}`);

  for (const record of records) {
    console.log(`WOULD_RECONCILE=${record.reconciliationKey}`);
  }

  console.log("NO_DB_WRITES=TRUE");
  process.exit(0);
}

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Applying reconciliation requires server-side Supabase URL and service-role key",
  );
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

console.log("MODE=APPLY");
console.log(`RECORDS=${records.length}`);

for (const record of records) {
  const payload = {
    ...record.payload,
    metadata: {
      ...(record.payload.metadata ?? {}),
      reconciliation: {
        key: record.reconciliationKey,
        source: "history-reconciliation-script",
      },
    },
  };

  const { data: existing, error: existingError } = await supabase
    .from("house_content_history")
    .select("id")
    .eq("house_id", payload.house_id)
    .eq("entity_type", payload.entity_type)
    .eq("entity_id", payload.entity_id)
    .eq("action", payload.action)
    .contains("metadata", {
      reconciliation: {
        key: record.reconciliationKey,
      },
    })
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if (existing?.length) {
    console.log(`SKIP_ALREADY_RECONCILED=${record.reconciliationKey}`);
    continue;
  }

  const { error } = await supabase
    .from("house_content_history")
    .insert(payload);

  if (error) {
    throw error;
  }

  console.log(`RECONCILED=${record.reconciliationKey}`);
}

console.log("RECONCILIATION_COMPLETE=TRUE");
