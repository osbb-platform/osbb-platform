import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";

// Vitest's default per-test timeout (5000ms) is shorter than a cold
// `docker exec ... psql` round trip, which was causing real-DB acceptance
// tests to fail on infrastructure, not on the behavior under test.
// Real-DB suites must pass this explicitly as the last argument to `it(...)`.
export const REAL_DB_TEST_TIMEOUT = 20_000;

let verifiedDatabaseIdentity: string | null = null;
const execFileAsync = promisify(execFile);

function databasePort(): string {
  const port = requiredIdentityEnv("OSBB_TEST_DB_PORT");
  if (!/^\d{2,5}$/u.test(port)) {
    throw new Error("OSBB_TEST_DB_PORT_INVALID");
  }

  return port;
}

function directPsqlArgs(): string[] {
  return [
    "-h",
    "127.0.0.1",
    "-p",
    databasePort(),
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
  ];
}

function requiredIdentityEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `OSBB_TEST_DB_IDENTITY_REQUIRED: set ${name} for the isolated disposable database`,
    );
  }

  return value;
}

export function dbContainer(): string {
  const requestedName = process.env.OSBB_TEST_DB_CONTAINER?.trim();

  if (!requestedName || !requestedName.startsWith("supabase_db_")) {
    throw new Error(
      "OSBB_TEST_DB_CONTAINER_REQUIRED: set an explicit isolated OSBB test container",
    );
  }

  const output = execFileSync("docker", ["ps", "--format", "{{.Names}}"], {
    encoding: "utf8",
  });

  const exists = output
    .split("\n")
    .map((line) => line.trim())
    .includes(requestedName);

  if (!exists) {
    throw new Error(
      `OSBB_TEST_DB_CONTAINER_NOT_RUNNING: ${requestedName}`,
    );
  }

  const expectedIdentity = requiredIdentityEnv("OSBB_TEST_DB_IDENTITY");
  const expectedProjectId = requiredIdentityEnv("OSBB_TEST_DB_PROJECT_ID");
  const expectedSystemIdentifier = requiredIdentityEnv(
    "OSBB_TEST_DB_SYSTEM_IDENTIFIER",
  );
  const expectedPort = databasePort();
  const verificationKey = [
    requestedName,
    expectedIdentity,
    expectedProjectId,
    expectedSystemIdentifier,
    expectedPort,
  ].join("|");

  if (verifiedDatabaseIdentity !== verificationKey) {
    const containerIdentity = execFileSync(
      "docker",
      [
        "exec",
        requestedName,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-At",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        "select identity || '|' || project_id || '|' || " +
          "(select system_identifier from pg_control_system())::text " +
          "from osbb_test_guard.environment_identity where singleton;",
      ],
      { encoding: "utf8" },
    ).trim();

    const directIdentity = execFileSync(
      "psql",
      [
        ...directPsqlArgs(),
        "-c",
        "select identity || '|' || project_id || '|' || " +
          "(select system_identifier from pg_control_system())::text " +
          "from osbb_test_guard.environment_identity where singleton;",
      ],
      { encoding: "utf8", env: { ...process.env, PGPASSWORD: "postgres" } },
    ).trim();

    const expectedDatabaseIdentity = [
      expectedIdentity,
      expectedProjectId,
      expectedSystemIdentifier,
    ].join("|");

    if (
      containerIdentity !== expectedDatabaseIdentity ||
      directIdentity !== expectedDatabaseIdentity
    ) {
      throw new Error(
        `OSBB_TEST_DB_IDENTITY_MISMATCH: refusing ${requestedName}`,
      );
    }

    verifiedDatabaseIdentity = verificationKey;
  }

  return requestedName;
}

export function sql(query: string): string {
  dbContainer();
  return execFileSync(
    "psql",
    [...directPsqlArgs(), "-c", query],
    { encoding: "utf8", env: { ...process.env, PGPASSWORD: "postgres" } },
  ).trim();
}

export async function sqlAsync(query: string): Promise<string> {
  dbContainer();
  const { stdout } = await execFileAsync(
    "psql",
    [
      ...directPsqlArgs(),
      "-c",
      query,
    ],
    { encoding: "utf8", env: { ...process.env, PGPASSWORD: "postgres" } },
  );

  return stdout.trim();
}

// Runs several single-row, single-column statements over one `docker exec`
// process instead of one process per statement. Each `docker exec` spawn is
// the dominant cost of a real-DB test under parallel-worker CPU contention,
// so batching keeps a multi-step scenario (e.g. "6 consecutive rate-limit
// attempts") comfortably inside its timeout instead of accumulating spawn
// overhead per statement.
export function sqlBatch(queries: string[]): string[] {
  dbContainer();
  const script = queries.join("\n");
  const output = execFileSync(
    "psql",
    [...directPsqlArgs(), "-f", "-"],
    {
      encoding: "utf8",
      input: script,
      env: { ...process.env, PGPASSWORD: "postgres" },
    },
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
