import type {
  ImportAdapter,
  ImportAdapterKey,
  RawSheet,
} from "./types";

type AnyImportAdapter = ImportAdapter<unknown>;

const adapters = new Map<ImportAdapterKey, AnyImportAdapter>();

export function registerAdapter<TRow>(
  adapter: ImportAdapter<TRow>,
): void {
  if (adapters.has(adapter.key)) {
    throw new Error(
      `Import adapter is already registered: ${adapter.key}`,
    );
  }

  adapters.set(
    adapter.key,
    adapter as AnyImportAdapter,
  );
}

export function getAdapter<TRow>(
  key: ImportAdapterKey,
): ImportAdapter<TRow> | null {
  return (
    adapters.get(key) as ImportAdapter<TRow> | undefined
  ) ?? null;
}

export function requireAdapter<TRow>(
  key: ImportAdapterKey,
): ImportAdapter<TRow> {
  const adapter = getAdapter<TRow>(key);

  if (!adapter) {
    throw new Error(`Import adapter is not registered: ${key}`);
  }

  return adapter;
}

export function detectAdapter(
  sheet: RawSheet,
): AnyImportAdapter | null {
  const matches = [...adapters.values()]
    .map((adapter) => ({
      adapter,
      result: adapter.detect(sheet),
    }))
    .filter(({ result }) => result.matched)
    .sort(
      (left, right) =>
        right.result.confidence - left.result.confidence,
    );

  return matches[0]?.adapter ?? null;
}

export function listRegisteredAdapters(): readonly ImportAdapterKey[] {
  return [...adapters.keys()];
}

export function resetImportAdapterRegistryForTests(): void {
  adapters.clear();
}
