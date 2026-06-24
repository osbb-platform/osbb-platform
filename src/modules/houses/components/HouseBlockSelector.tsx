"use client";

import { ROUTES } from "@/src/shared/config/routes/routes.config";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type HouseBlockSelectorProps = {
  houseId: string;
  activeBlock: string;
  onPendingBlockChange?: (block: string | null) => void;
};

export const houseNavigationBlocks = [
  { value: "announcements", label: "Оголошення" },
  { value: "reports", label: "Звіти" },
  { value: "plan", label: "План робіт" },
  { value: "meetings", label: "Збори" },
  { value: "board", label: "Правління" },
  { value: "information", label: "Інформація" },
  { value: "requisites", label: "Реквізити" },
  { value: "specialists", label: "Спеціалісти" },
  { value: "debtors", label: "Боржники" },
  { value: "founding-documents", label: "Установчі документи" },
] as const;

export function getHouseBlockLabel(value: string) {
  return (
    houseNavigationBlocks.find((block) => block.value === value)?.label ??
    "розділ"
  );
}

export function HouseBlockSelector({
  houseId,
  activeBlock,
  onPendingBlockChange,
}: HouseBlockSelectorProps) {
  const router = useRouter();
  const [selectedBlock, setSelectedBlock] = useState(activeBlock);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedBlock(activeBlock);
  }, [activeBlock]);

  useEffect(() => {
    if (!isPending) {
      onPendingBlockChange?.(null);
    }
  }, [isPending, onPendingBlockChange]);

  return (
    <div>
      <select
        value={selectedBlock}
        disabled={isPending}
        onChange={(event) => {
          const nextBlock = event.target.value;
          setSelectedBlock(nextBlock);
          onPendingBlockChange?.(nextBlock);

          startTransition(() => {
            router.push(`${ROUTES.admin.houses}/${houseId}?block=${nextBlock}`);
          });
        }}
        className="w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-4 py-3 text-sm text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-strong)] disabled:cursor-wait disabled:opacity-80"
      >
        {houseNavigationBlocks.map((block) => (
          <option key={block.value} value={block.value}>
            {block.label}
          </option>
        ))}
      </select>
    </div>
  );
}
