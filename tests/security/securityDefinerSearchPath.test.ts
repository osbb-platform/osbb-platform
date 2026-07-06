import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

type FunctionState = {
  identity: string;
  securityDefiner: boolean;
  explicitSearchPath: boolean;
  source: string;
};

const EXPECTED_SECURITY_DEFINER_IDENTITIES = [
  "public.admin_city_scope()",
  "public.admin_has_house_access(uuid)",
  "public.cleanup_platform_change_history()",
  "public.cleanup_platform_tasks()",
  "public.clear_rate_limit(text,text)",
  "public.consume_rate_limit(text,text,integer,integer,integer)",
  "public.create_house_session(text,text,text,integer)",
  "public.get_house_bell_feed(uuid,integer)",
  "public.get_my_admin_role()",
  "public.get_rate_limit_state(text,text)",
  "public.get_resident_house_apartment_options(uuid,text)",
  "public.get_resident_house_bell_feed(uuid,text,integer)",
  "public.get_resident_house_debtors(uuid,text)",
  "public.get_resident_house_meetings(uuid,text)",
  "public.handle_new_user()",
  "public.is_authenticated_admin()",
  "public.is_house_session_valid(text,text)",
  "public.is_house_session_valid_for_house(uuid,text)",
  "public.is_public_house_active(uuid)",
  "public.publish_house_debtors_draft(uuid)",
  "public.publish_house_faq(uuid,uuid,integer)",
  "public.recalculate_house_meeting_question_counters(uuid)",
  "public.record_house_meeting_manual_vote(uuid,uuid,uuid,text)",
  "public.record_rate_limit_failure(text,text,integer,integer,integer)",
  "public.replace_house_faq_items(uuid,integer,jsonb)",
  "public.replace_house_faq_items_by_id(uuid,uuid,integer,jsonb)",
  "public.upsert_house_access(uuid,text)",
  "public.verify_house_access(text,text)",
] as const;

const CRITICAL_SECURITY_DEFINER_IDENTITIES = [
  "public.create_house_session(text,text,text,integer)",
  "public.get_my_admin_role()",
  "public.is_authenticated_admin()",
  "public.is_house_session_valid(text,text)",
] as const;

const TYPE_ALIASES: Record<string, string> = {
  int: "integer",
  int4: "integer",
  varchar: "character varying",
};

function compareIdentity(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeFunctionName(value: string): string {
  return value
    .split(".")
    .map((part) => part.trim().replace(/^"(.*)"$/, "$1").toLowerCase())
    .join(".");
}

function normalizeType(value: string): string {
  const normalized = normalizeWhitespace(value)
    .replace(/^"(.*)"$/, "$1")
    .toLowerCase();

  return TYPE_ALIASES[normalized] ?? normalized;
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];

  let start = 0;
  let index = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let lineComment = false;
  let blockCommentDepth = 0;
  let dollarTag: string | null = null;

  while (index < sql.length) {
    const current = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      if (current === "\n") {
        lineComment = false;
      }

      index += 1;
      continue;
    }

    if (blockCommentDepth > 0) {
      if (current === "/" && next === "*") {
        blockCommentDepth += 1;
        index += 2;
        continue;
      }

      if (current === "*" && next === "/") {
        blockCommentDepth -= 1;
        index += 2;
        continue;
      }

      index += 1;
      continue;
    }

    if (dollarTag !== null) {
      if (sql.startsWith(dollarTag, index)) {
        index += dollarTag.length;
        dollarTag = null;
      } else {
        index += 1;
      }

      continue;
    }

    if (inSingleQuote) {
      if (current === "'") {
        if (next === "'") {
          index += 2;
          continue;
        }

        inSingleQuote = false;
      }

      index += 1;
      continue;
    }

    if (inDoubleQuote) {
      if (current === '"') {
        if (next === '"') {
          index += 2;
          continue;
        }

        inDoubleQuote = false;
      }

      index += 1;
      continue;
    }

    if (current === "-" && next === "-") {
      lineComment = true;
      index += 2;
      continue;
    }

    if (current === "/" && next === "*") {
      blockCommentDepth = 1;
      index += 2;
      continue;
    }

    if (current === "'") {
      inSingleQuote = true;
      index += 1;
      continue;
    }

    if (current === '"') {
      inDoubleQuote = true;
      index += 1;
      continue;
    }

    if (current === "$") {
      const match = sql
        .slice(index)
        .match(/^(\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$)/);

      if (match) {
        dollarTag = match[1];
        index += dollarTag.length;
        continue;
      }
    }

    if (current === ";") {
      const statement = sql.slice(start, index + 1).trim();

      if (statement !== "") {
        statements.push(statement);
      }

      start = index + 1;
    }

    index += 1;
  }

  const tail = sql.slice(start).trim();

  if (tail !== "") {
    statements.push(tail);
  }

  return statements;
}

function findMatchingParenthesis(
  value: string,
  openIndex: number,
): number | null {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = openIndex; index < value.length; index += 1) {
    const current = value[index];
    const next = value[index + 1];

    if (inSingleQuote) {
      if (current === "'") {
        if (next === "'") {
          index += 1;
          continue;
        }

        inSingleQuote = false;
      }

      continue;
    }

    if (inDoubleQuote) {
      if (current === '"') {
        if (next === '"') {
          index += 1;
          continue;
        }

        inDoubleQuote = false;
      }

      continue;
    }

    if (current === "'") {
      inSingleQuote = true;
      continue;
    }

    if (current === '"') {
      inDoubleQuote = true;
      continue;
    }

    if (current === "(") {
      depth += 1;
      continue;
    }

    if (current === ")") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return null;
}

function splitTopLevelArguments(value: string): string[] {
  if (value.trim() === "") {
    return [];
  }

  const parts: string[] = [];

  let start = 0;
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];
    const next = value[index + 1];

    if (inSingleQuote) {
      if (current === "'") {
        if (next === "'") {
          index += 1;
          continue;
        }

        inSingleQuote = false;
      }

      continue;
    }

    if (inDoubleQuote) {
      if (current === '"') {
        if (next === '"') {
          index += 1;
          continue;
        }

        inDoubleQuote = false;
      }

      continue;
    }

    if (current === "'") {
      inSingleQuote = true;
      continue;
    }

    if (current === '"') {
      inDoubleQuote = true;
      continue;
    }

    if (current === "(" || current === "[") {
      depth += 1;
      continue;
    }

    if (current === ")" || current === "]") {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (current === "," && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  parts.push(value.slice(start).trim());

  return parts.filter(Boolean);
}

function stripArgumentDefault(value: string): string {
  const defaultMatch = value.match(/\s+default\s+/i);

  if (defaultMatch?.index !== undefined) {
    return value.slice(0, defaultMatch.index).trim();
  }

  const equalsIndex = value.indexOf("=");

  if (equalsIndex >= 0) {
    return value.slice(0, equalsIndex).trim();
  }

  return value.trim();
}

function argumentType(argument: string): string {
  const withoutDefault = stripArgumentDefault(argument).replace(
    /^(inout|in|out|variadic)\s+/i,
    "",
  );

  const tokens = normalizeWhitespace(withoutDefault).split(" ");

  if (tokens.length === 1) {
    return normalizeType(tokens[0]);
  }

  const knownFirstToken = normalizeType(tokens[0]);

  const knownTypeNames = new Set([
    "bigint",
    "boolean",
    "character",
    "date",
    "integer",
    "json",
    "jsonb",
    "numeric",
    "real",
    "smallint",
    "text",
    "time",
    "timestamp",
    "uuid",
  ]);

  if (
    knownTypeNames.has(knownFirstToken) ||
    tokens[0].includes(".") ||
    tokens[0].endsWith("[]")
  ) {
    return normalizeType(tokens.join(" "));
  }

  return normalizeType(tokens.slice(1).join(" "));
}

function parseFunctionIdentity(
  statement: string,
  prefixPattern: RegExp,
): string | null {
  const match = prefixPattern.exec(statement);

  if (!match) {
    return null;
  }

  const openParenthesis = statement.indexOf(
    "(",
    match.index + match[0].length,
  );

  if (openParenthesis < 0) {
    return null;
  }

  const closeParenthesis = findMatchingParenthesis(
    statement,
    openParenthesis,
  );

  if (closeParenthesis === null) {
    return null;
  }

  const rawName = statement
    .slice(match.index + match[0].length, openParenthesis)
    .trim();

  const rawArguments = statement.slice(
    openParenthesis + 1,
    closeParenthesis,
  );

  const types = splitTopLevelArguments(rawArguments).map(argumentType);

  return `${normalizeFunctionName(rawName)}(${types.join(",")})`;
}

function hasExplicitSearchPath(statement: string): boolean {
  return /\bset\s+(?:local\s+)?"?search_path"?\s*(?:=|to)\s*/i.test(
    statement,
  );
}

function auditSecurityDefinerFunctions(): FunctionState[] {
  const migrationsDirectory = path.join(
    process.cwd(),
    "supabase",
    "migrations",
  );

  const migrationFiles = fs
    .readdirSync(migrationsDirectory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort(compareIdentity);

  const states = new Map<string, FunctionState>();

  for (const fileName of migrationFiles) {
    const migrationPath = path.join(migrationsDirectory, fileName);
    const sql = fs.readFileSync(migrationPath, "utf8");

    for (const statement of splitSqlStatements(sql)) {
      const createIdentity = parseFunctionIdentity(
        statement,
        /\bcreate\s+(?:or\s+replace\s+)?function\s+/i,
      );

      if (createIdentity !== null) {
        states.set(createIdentity, {
          identity: createIdentity,
          securityDefiner: /\bsecurity\s+definer\b/i.test(statement),
          explicitSearchPath: hasExplicitSearchPath(statement),
          source: fileName,
        });

        continue;
      }

      const alterIdentity = parseFunctionIdentity(
        statement,
        /\balter\s+function\s+(?:if\s+exists\s+)?/i,
      );

      if (alterIdentity === null) {
        continue;
      }

      const current = states.get(alterIdentity);

      if (!current) {
        throw new Error(
          `ALTER FUNCTION target was not found in prior migrations: ` +
            `${alterIdentity} (${fileName})`,
        );
      }

      if (/\bsecurity\s+definer\b/i.test(statement)) {
        current.securityDefiner = true;
      }

      if (/\bsecurity\s+invoker\b/i.test(statement)) {
        current.securityDefiner = false;
      }

      if (hasExplicitSearchPath(statement)) {
        current.explicitSearchPath = true;
      }

      if (
        /\breset\s+"?search_path"?\b/i.test(statement) ||
        /\breset\s+all\b/i.test(statement)
      ) {
        current.explicitSearchPath = false;
      }

      current.source = fileName;
      states.set(alterIdentity, current);
    }
  }

  return [...states.values()]
    .filter((state) => state.securityDefiner)
    .sort((left, right) =>
      compareIdentity(left.identity, right.identity),
    );
}

describe("SECURITY DEFINER migration safety", () => {
  const currentDefiners = auditSecurityDefinerFunctions();

  const currentIdentities = currentDefiners
    .map((definition) => definition.identity)
    .sort(compareIdentity);

  const expectedIdentities = [
    ...EXPECTED_SECURITY_DEFINER_IDENTITIES,
  ].sort(compareIdentity);

  it("matches the complete audited inventory", () => {
    expect(currentIdentities).toEqual(expectedIdentities);
    expect(currentDefiners).toHaveLength(28);
  });

  it("requires an explicit search_path on every current DEFINER function", () => {
    const missingSearchPath = currentDefiners
      .filter((definition) => !definition.explicitSearchPath)
      .map(
        (definition) =>
          `${definition.identity} (${definition.source})`,
      );

    expect(missingSearchPath).toEqual([]);
  });

  it("keeps resident-session and admin authorization functions guarded", () => {
    for (const identity of CRITICAL_SECURITY_DEFINER_IDENTITIES) {
      const definition = currentDefiners.find(
        (candidate) => candidate.identity === identity,
      );

      expect(
        definition,
        `Missing critical SECURITY DEFINER function: ${identity}`,
      ).toBeDefined();

      expect(
        definition?.explicitSearchPath,
        `Critical function has no explicit search_path: ${identity}`,
      ).toBe(true);
    }
  });
});
