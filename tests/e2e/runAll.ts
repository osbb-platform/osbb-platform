// Runs every permanent browser E2E scenario in this directory against a
// live server (see each *.e2e.ts file's header comment for exact
// requirements — in short: `next dev -p 3100` or `next start -p 3100`, and
// local Supabase up). Each scenario file is a standalone script that
// manages its own fixtures and sets `process.exitCode` on failure; this
// runner just executes them in sequence and aggregates the result so CI/a
// human only has to run one command.
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const dir = path.dirname(fileURLToPath(import.meta.url));

const scenarioFiles = readdirSync(dir)
  .filter((file) => file.endsWith(".e2e.ts"))
  .sort();

if (scenarioFiles.length === 0) {
  console.error("E2E_NO_SCENARIOS_FOUND");
  process.exit(1);
}

let failures = 0;

for (const file of scenarioFiles) {
  const fullPath = path.join(dir, file);
  console.log(`\n=== RUNNING ${file} ===`);

  try {
    execFileSync("npx", ["tsx", fullPath], { stdio: "inherit" });
    console.log(`=== ${file}: PASS ===`);
  } catch {
    failures += 1;
    console.log(`=== ${file}: FAIL ===`);
  }
}

console.log(`\nE2E_SCENARIOS_TOTAL=${scenarioFiles.length}`);
console.log(`E2E_SCENARIOS_FAILED=${failures}`);

if (failures > 0) {
  process.exit(1);
}
