"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import type { HouseHeroSnapshot } from "@/src/modules/houses/services/getAdminHouseHero";
import {
  adminBodyClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSectionTitleClass,
  adminSurfaceClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";

type HeroSnapshot = {
  headline: string;
  subheadline: string;
  ctaLabel: string;
  coverImageUrl: string;
};

type EditHeroSectionFormProps = {
  readOnlyMode?: boolean;
  houseId: string;
  hero: HouseHeroSnapshot;
};

const DEFAULT_HERO: HeroSnapshot = {
  headline: "",
  subheadline: "",
  ctaLabel: "Відкрити оголошення",
  coverImageUrl: "",
};

function normalizeSnapshot(value: HouseHeroSnapshot): HeroSnapshot {
  return {
    headline: value.headline.trim(),
    subheadline: value.subheadline.trim(),
    ctaLabel: value.ctaLabel.trim() || DEFAULT_HERO.ctaLabel,
    coverImageUrl: value.coverImageUrl?.trim() ?? "",
  };
}

export function EditHeroSectionForm({
  readOnlyMode,
  houseId,
  hero,
}: EditHeroSectionFormProps) {
  const { dispatch, isPending, lastError } = useAdminContentCommand();

  const initialSnapshot = useMemo(() => normalizeSnapshot(hero), [hero]);

  const [snapshot, setSnapshot] = useState<HeroSnapshot>(initialSnapshot);
  const [lockVersion, setLockVersion] = useState(hero.lockVersion);

  const isDirty =
    JSON.stringify(snapshot) !== JSON.stringify(initialSnapshot);

  function updateField<K extends keyof HeroSnapshot>(
    key: K,
    value: HeroSnapshot[K],
  ) {
    setSnapshot((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (readOnlyMode) {
      return;
    }

    await dispatch<HouseHeroSnapshot>(
      {
        type: "hero.save",
        houseId,
        payload: {
          lockVersion,
          headline: snapshot.headline,
          subheadline: snapshot.subheadline,
          ctaLabel: snapshot.ctaLabel,
          coverImageUrl: snapshot.coverImageUrl || null,
        },
      },
      {
        onSuccess(data) {
          const saved = data as HouseHeroSnapshot;
          setLockVersion(saved.lockVersion);
          setSnapshot(normalizeSnapshot(saved));
        },
      },
    );
  }

  const isSubmitDisabled = readOnlyMode || isPending || !isDirty;

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-6 ${adminSurfaceClass} p-6`}
      aria-busy={isPending}
    >
      <div>
        <h2 className={adminSectionTitleClass}>Hero секція</h2>
        <p className={`mt-2 ${adminBodyClass}`}>
          Головний екран публічної сторінки будинку. Зміни після збереження
          одразу оновлюють public home.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={`mb-2 block ${adminTextLabelClass}`}>
            Заголовок
          </label>
          <input
            type="text"
            value={snapshot.headline}
            onChange={(event) => updateField("headline", event.target.value)}
            disabled={readOnlyMode || isPending}
            className={adminInputClass}
          />
        </div>

        <div className="md:col-span-2">
          <label className={`mb-2 block ${adminTextLabelClass}`}>
            Підзаголовок
          </label>
          <textarea
            value={snapshot.subheadline}
            onChange={(event) => updateField("subheadline", event.target.value)}
            disabled={readOnlyMode || isPending}
            rows={4}
            className={adminInputClass}
          />
        </div>

        <div>
          <label className={`mb-2 block ${adminTextLabelClass}`}>
            Текст CTA
          </label>
          <input
            type="text"
            value={snapshot.ctaLabel}
            onChange={(event) => updateField("ctaLabel", event.target.value)}
            disabled={readOnlyMode || isPending}
            className={adminInputClass}
          />
        </div>

        <div>
          <label className={`mb-2 block ${adminTextLabelClass}`}>
            Cover image URL
          </label>
          <input
            type="url"
            value={snapshot.coverImageUrl}
            onChange={(event) => updateField("coverImageUrl", event.target.value)}
            disabled={readOnlyMode || isPending}
            placeholder="https://..."
            className={adminInputClass}
          />
        </div>
      </div>

      {lastError ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {lastError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitDisabled}
          aria-disabled={isSubmitDisabled}
          className={`${adminPrimaryButtonClass} disabled:opacity-60`}
        >
          {isPending ? "Зберігаємо..." : "Зберегти hero секцію"}
        </button>

        {readOnlyMode ? (
          <span className="text-sm text-[var(--cms-text-muted)]">
            У вас немає прав на редагування цього блоку.
          </span>
        ) : null}
      </div>
    </form>
  );
}
