import { debtors1cAdapter } from "./adapters/debtors1c";
import {
  listRegisteredAdapters,
  registerAdapter,
} from "./registry";

export function registerBuiltInImportAdapters(): void {
  if (
    !listRegisteredAdapters().includes(
      debtors1cAdapter.key,
    )
  ) {
    registerAdapter(debtors1cAdapter);
  }
}
