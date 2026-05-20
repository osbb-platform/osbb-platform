import { registerHandler } from "../registry";

/**
 * Central content-engine v2 handler registration point.
 *
 * N3 will add the first real handler:
 *   registerHandler(announcementsHandler)
 *
 * N5 will add the remaining migrated handlers one by one.
 */
export function registerAllHandlers() {
  void registerHandler;
}
