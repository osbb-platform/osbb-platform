export type CountedReadError = {
  message: string;
};

export type CountedReadPage<TRow> = {
  data: TRow[] | null;
  error: CountedReadError | null;
  count: number | null;
};

type ReadAllCountedPagesParams<TRow> = {
  label: string;
  getRowKey: (row: TRow) => string | number;
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<CountedReadPage<TRow>>;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 500;
const MAX_PAGE_REQUESTS = 10_000;

export function chunkValues<T>(
  values: readonly T[],
  maxChunkSize: number,
): T[][] {
  if (!Number.isInteger(maxChunkSize) || maxChunkSize < 1) {
    throw new Error("invalid chunk size");
  }

  const chunks: T[][] = [];
  for (let from = 0; from < values.length; from += maxChunkSize) {
    chunks.push(values.slice(from, from + maxChunkSize));
  }

  return chunks;
}

/**
 * Reads a deterministic ordered query to completion and reconciles every page
 * with PostgREST's exact total. Advancing by the number actually returned also
 * works when the project Max Rows setting is lower than the requested page.
 */
export async function readAllCountedPages<TRow>({
  label,
  getRowKey,
  fetchPage,
  pageSize = DEFAULT_PAGE_SIZE,
}: ReadAllCountedPagesParams<TRow>): Promise<TRow[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error(`${label}: invalid page size`);
  }

  const rows: TRow[] = [];
  const seenRowKeys = new Set<string>();
  let expectedCount: number | null = null;

  for (let request = 0; request < MAX_PAGE_REQUESTS; request += 1) {
    const from = rows.length;
    const page = await fetchPage(from, from + pageSize - 1);

    if (page.error) {
      throw new Error(`${label}: ${page.error.message}`);
    }

    if (!Number.isInteger(page.count) || Number(page.count) < 0) {
      throw new Error(`${label}: exact row count is unavailable`);
    }

    const pageCount = Number(page.count);

    if (expectedCount === null) {
      expectedCount = pageCount;
    } else if (pageCount !== expectedCount) {
      throw new Error(`${label}: row count changed while pages were being read`);
    }

    const pageRows = page.data ?? [];

    if (pageRows.length === 0) {
      if (rows.length === expectedCount) {
        return rows;
      }

      throw new Error(`${label}: result ended before the exact count`);
    }

    if (rows.length + pageRows.length > expectedCount) {
      throw new Error(`${label}: result exceeded the exact count`);
    }

    for (const row of pageRows) {
      const rawKey = getRowKey(row);
      const key = `${typeof rawKey}:${String(rawKey)}`;

      if (seenRowKeys.has(key)) {
        throw new Error(
          `${label}: duplicate row detected while pages were being read`,
        );
      }

      seenRowKeys.add(key);
    }

    rows.push(...pageRows);

    if (rows.length === expectedCount) {
      return rows;
    }
  }

  throw new Error(`${label}: pagination safety limit exceeded`);
}
