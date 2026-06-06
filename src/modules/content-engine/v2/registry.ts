import type { HandlerKey } from "./types/commands";
import type { ContentHandler } from "./types/handler";

const handlers = new Map<HandlerKey, ContentHandler>();

export function registerHandler(handler: ContentHandler): void {
  if (handlers.has(handler.key)) {
    throw new Error(`Handler уже зарегистрирован: ${handler.key}`);
  }

  handlers.set(handler.key, handler);
}

export function getHandler(key: HandlerKey): ContentHandler | null {
  return handlers.get(key) ?? null;
}

export function getAllHandlers(): ContentHandler[] {
  return Array.from(handlers.values());
}
