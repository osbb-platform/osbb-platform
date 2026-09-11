import { execFileSync } from "node:child_process";

// Vitest's default per-test timeout (5000ms) is shorter than a cold
// `docker exec ... psql` round trip, which was causing real-DB acceptance
// tests to fail on infrastructure, not on the behavior under test.
// Real-DB suites must pass this explicitly as the last argument to `it(...)`.
export const REAL_DB_TEST_TIMEOUT = 20_000;

export function dbContainer(): string {
  const output = execFileSync("docker", ["ps", "--format", "{{.Names}}"], {
    encoding: "utf8",
  });

  const name = output
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("supabase_db_"));

  if (!name) {
    throw new Error("LOCAL_SUPABASE_DB_CONTAINER_REQUIRED");
  }

  return name;
}

export function sql(query: string): string {
  return execFileSync(
    "docker",
    ["exec", dbContainer(), "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", query],
    { encoding: "utf8" },
  ).trim();
}

// Runs several single-row, single-column statements over one `docker exec`
// process instead of one process per statement. Each `docker exec` spawn is
// the dominant cost of a real-DB test under parallel-worker CPU contention,
// so batching keeps a multi-step scenario (e.g. "6 consecutive rate-limit
// attempts") comfortably inside its timeout instead of accumulating spawn
// overhead per statement.
export function sqlBatch(queries: string[]): string[] {
  const script = queries.join("\n");
  const output = execFileSync(
    "docker",
    ["exec", "-i", dbContainer(), "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-f", "-"],
    { encoding: "utf8", input: script },
  );

  const lines = output.split("\n").filter((line) => line.length > 0);

  if (lines.length !== queries.length) {
    throw new Error(
      `SQL_BATCH_OUTPUT_MISMATCH: expected ${queries.length} result lines, got ${lines.length}. Raw output: ${output}`,
    );
  }

  return lines;
}

// Fails fast with a clear message instead of letting the first real assertion
// time out and misreport a container/connectivity problem as a test failure.
export function assertLocalDbReachable(): void {
  try {
    sql("select 1;");
  } catch (error) {
    throw new Error(
      `LOCAL_SUPABASE_DB_UNREACHABLE: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
