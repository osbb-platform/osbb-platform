import { describe, expect, it, vi } from "vitest";

import {
  chunkValues,
  readAllCountedPages,
} from "../../src/shared/data/readAllCountedPages";

describe("debtor reads are complete beyond PostgREST response caps", () => {
  it("reads 325 x 4 rows and keeps the 1001st row", async () => {
    const source = Array.from({ length: 1_300 }, (_, index) => ({
      id: String(index + 1).padStart(4, "0"),
    }));

    const fetchPage = vi.fn(async (from: number, to: number) => {
      const configuredApiCap = 137;
      const requestedLength = to - from + 1;
      const returnedLength = Math.min(configuredApiCap, requestedLength);

      return {
        data: source.slice(from, from + returnedLength),
        error: null,
        count: source.length,
      };
    });

    const rows = await readAllCountedPages({
      label: "test debtor history",
      pageSize: 500,
      getRowKey: (row) => row.id,
      fetchPage,
    });

    expect(rows).toHaveLength(1_300);
    expect(rows[1_000]?.id).toBe("1001");
    expect(rows.at(-1)?.id).toBe("1300");
    expect(fetchPage).toHaveBeenCalledTimes(10);
  });

  it("reads 325 x 5 rows within a deterministic five-request budget", async () => {
    const source = Array.from({ length: 1_625 }, (_, index) => ({
      id: index + 1,
    }));
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      data: source.slice(from, Math.min(from + 325, to + 1)),
      error: null,
      count: source.length,
    }));

    const rows = await readAllCountedPages({
      label: "five monthly revisions",
      pageSize: 500,
      getRowKey: (row) => row.id,
      fetchPage,
    });

    expect(rows).toHaveLength(1_625);
    expect(rows[1_000]?.id).toBe(1_001);
    expect(fetchPage).toHaveBeenCalledTimes(5);
  });

  it("chunks 250 snapshot ids into three bounded queries instead of N+1", () => {
    const ids = Array.from({ length: 250 }, (_, index) => `snapshot-${index}`);
    const chunks = chunkValues(ids, 100);

    expect(chunks.map((chunk) => chunk.length)).toEqual([100, 100, 50]);
    expect(chunks).toHaveLength(3);
    expect(Math.max(...chunks.map((chunk) => chunk.length))).toBe(100);
  });

  it("fails closed instead of returning a partial array on a page error", async () => {
    await expect(
      readAllCountedPages<{ id: number }>({
        label: "published debtor rows",
        pageSize: 2,
        getRowKey: (row) => row.id,
        fetchPage: async (from) =>
          from === 0
            ? { data: [{ id: 1 }, { id: 2 }], error: null, count: 4 }
            : {
                data: null,
                error: { message: "statement timeout" },
                count: 4,
              },
      }),
    ).rejects.toThrow("published debtor rows");
  });

  it("fails closed when the exact count changes between pages", async () => {
    await expect(
      readAllCountedPages<{ id: number }>({
        label: "debtor rows",
        pageSize: 2,
        getRowKey: (row) => row.id,
        fetchPage: async (from) => ({
          data: from === 0 ? [{ id: 1 }, { id: 2 }] : [{ id: 3 }],
          error: null,
          count: from === 0 ? 4 : 3,
        }),
      }),
    ).rejects.toThrow("changed while pages were being read");
  });

  it("fails closed when the server stops before the exact count", async () => {
    await expect(
      readAllCountedPages<{ id: number }>({
        label: "debtor rows",
        pageSize: 2,
        getRowKey: (row) => row.id,
        fetchPage: async (from) => ({
          data: from === 0 ? [{ id: 1 }, { id: 2 }] : [],
          error: null,
          count: 3,
        }),
      }),
    ).rejects.toThrow("ended before the exact count");
  });

  it("fails closed when offset pagination drifts and repeats a row", async () => {
    await expect(
      readAllCountedPages<{ id: number }>({
        label: "mutable debtor rows",
        pageSize: 2,
        getRowKey: (row) => row.id,
        fetchPage: async (from) => ({
          data:
            from === 0
              ? [{ id: 1 }, { id: 2 }]
              : [{ id: 2 }, { id: 3 }],
          error: null,
          count: 4,
        }),
      }),
    ).rejects.toThrow("duplicate row detected");
  });
});
