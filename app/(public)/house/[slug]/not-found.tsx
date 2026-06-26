"use client";

import Link from "next/link";
import { PubEmptyState } from "@/src/shared/ui/public/PubEmptyState";
import { PubButton } from "@/src/shared/ui/public/PubButton";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";

export default function PublicHouseNotFound() {
  return (
    <div className="px-4 py-8">
      <PubEmptyState
        icon={<PubIcon name="search" className="h-7 w-7" />}
        title="Сторінку не знайдено"
        description="Будинок або сторінка недоступні. Перевірте адресу або поверніться на головну."
        action={
          <Link prefetch={false} href="/">
            <PubButton variant="primary" leftIcon={<PubIcon name="home" className="h-5 w-5" />}>
              На головну
            </PubButton>
          </Link>
        }
      />
    </div>
  );
}
