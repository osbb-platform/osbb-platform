"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";

type HouseBlockSelectorProps = {
  houseId: string;
  activeBlock: string;
};

const houseNavigationBlocks = [
  { value: "announcements", label: "Объявления" },
  { value: "reports", label: "Отчеты" },
  { value: "plan", label: "План работ" },
  { value: "meetings", label: "Собрания" },
  { value: "board", label: "Правление" },
  { value: "information", label: "Информация" },
  { value: "requisites", label: "Реквизиты" },
  { value: "specialists", label: "Специалисты" },
  { value: "debtors", label: "Должники" },
] as const;

export function HouseBlockSelector({
  houseId,
  activeBlock,
}: HouseBlockSelectorProps) {
  const router = useRouter();
  const [selectedBlock, setSelectedBlock] = useState(activeBlock);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedBlock(activeBlock);
  }, [activeBlock]);

  const activeLabel = useMemo(() => {
    return (
      houseNavigationBlocks.find((block) => block.value === selectedBlock)
        ?.label ?? "раздел"
    );
  }, [selectedBlock]);

  return (
    <div className="relative">
      <select
        value={selectedBlock}
        disabled={isPending}
        onChange={(event) => {
          const nextBlock = event.target.value;
          setSelectedBlock(nextBlock);

          startTransition(() => {
            router.push(`/admin/houses/${houseId}?block=${nextBlock}`);
          });
        }}
        className="w-full rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-4 py-3 text-sm text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-strong)] disabled:cursor-wait disabled:opacity-80"
      >
        {houseNavigationBlocks.map((block) => (
          <option key={block.value} value={block.value}>
            {block.label}
          </option>
        ))}
      </select>

      <PlatformSectionLoader
        active={isPending}
        delayMs={280}
        label={`Открываем раздел «${activeLabel}»...`}
        className="rounded-2xl"
      />
    </div>
  );
}
