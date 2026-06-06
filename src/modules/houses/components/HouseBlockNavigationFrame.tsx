"use client";

import { useState, type ReactNode } from "react";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import { HouseBlockSelector, getHouseBlockLabel } from "@/src/modules/houses/components/HouseBlockSelector";

type HouseBlockNavigationFrameProps = {
  houseId: string;
  activeBlock: string;
  children: ReactNode;
  hideSelector?: boolean;
};

export function HouseBlockNavigationFrame({
  houseId,
  activeBlock,
  children,
  hideSelector = false,
}: HouseBlockNavigationFrameProps) {
  const [pendingBlock, setPendingBlock] = useState<string | null>(null);
  const isPending = pendingBlock !== null;
  const pendingLabel = getHouseBlockLabel(pendingBlock ?? activeBlock);

  return (
    <div className="space-y-6">
      {hideSelector ? null : (
        <HouseBlockSelector
          houseId={houseId}
          activeBlock={activeBlock}
          onPendingBlockChange={setPendingBlock}
        />
      )}

      <div className="relative min-h-[320px]">
        {children}

        <PlatformSectionLoader
          active={isPending}
          delayMs={280}
          label={`Відкриваємо розділ «${pendingLabel}»...`}
        />
      </div>
    </div>
  );
}
