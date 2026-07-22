"use client";

import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]',
    ),
  );
}

function isVisible(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    styles.display !== "none" &&
    styles.visibility !== "hidden" &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function findVisibleElement<T extends HTMLElement>(selector: string) {
  return Array.from(document.querySelectorAll<T>(selector)).find(isVisible) ?? null;
}

export function useWorkspaceKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const editableTarget = isEditableTarget(event.target);
      const dialog = findVisibleElement<HTMLElement>('[role="dialog"][aria-modal="true"]');

      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        if (!dialog) return;

        const form = dialog.querySelector<HTMLFormElement>("form");
        if (!form) return;

        event.preventDefault();
        form.requestSubmit();
        return;
      }

      if (editableTarget || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === "/") {
        if (dialog) return;

        const searchInput = findVisibleElement<HTMLInputElement>('input[type="search"]');
        if (!searchInput) return;

        event.preventDefault();
        searchInput.focus();
        searchInput.select();
        return;
      }

      if (event.key.toLowerCase() === "n") {
        if (dialog) return;

        const createButton = findVisibleElement<HTMLButtonElement>(
          '[data-workspace-create-action="true"]:not(:disabled)',
        );
        if (!createButton) return;

        event.preventDefault();
        createButton.click();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
