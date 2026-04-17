import { getPublishedHomeSectionsBySlug } from "@/src/modules/houses/services/getPublishedHomeSectionsBySlug";
import { PublicDebtorsPaymentBlock } from "@/src/modules/houses/components/PublicDebtorsPaymentBlock";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    q?: string;
    paymentAccount?: string;
  }>;
};

type DebtorItem = {
  apartmentId: string;
  apartmentLabel: string;
  accountNumber: string;
  ownerName: string;
  area: number | null;
  amount: string;
  days: string;
};

type PaymentSettings = {
  url: string;
  title: string;
  note: string;
  buttonLabel: string;
};

function normalizeAmount(value: string) {
  const normalized = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(normalized) ? normalized : 0;
}

function normalizeItems(value: unknown): DebtorItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const raw = item as Record<string, unknown>;

      return {
        apartmentId: String(raw.apartmentId ?? "").trim(),
        apartmentLabel: String(raw.apartmentLabel ?? "").trim(),
        accountNumber: String(raw.accountNumber ?? "").trim(),
        ownerName: String(raw.ownerName ?? "").trim(),
        area:
          typeof raw.area === "number" && Number.isFinite(raw.area)
            ? raw.area
            : null,
        amount: String(raw.amount ?? "").trim(),
        days: String(raw.days ?? "").trim(),
      };
    })
    .filter((item): item is DebtorItem => Boolean(item?.apartmentId))
    .filter((item) => normalizeAmount(item.amount) > 0);
}

function normalizePayment(value: unknown): PaymentSettings {
  if (!value || typeof value !== "object") {
    return {
      url: "",
      title: "Оплата задолженности",
      note: "",
      buttonLabel: "Оплатить",
    };
  }

  const raw = value as Record<string, unknown>;

  return {
    url: String(raw.url ?? "").trim(),
    title: String(raw.title ?? "Оплата задолженности").trim() || "Оплата задолженности",
    note: String(raw.note ?? "").trim(),
    buttonLabel: String(raw.buttonLabel ?? "Оплатить").trim() || "Оплатить",
  };
}

function formatUpdatedAt(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function maskAccountNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "—";

  if (trimmed.length <= 4) {
    return trimmed;
  }

  return `****${trimmed.slice(-4)}`;
}

function getDebtRowClass(amount: number) {
  if (amount >= 10000) {
    return "border-red-300 bg-red-50";
  }

  if (amount >= 5000) {
    return "border-red-200 bg-red-50/70";
  }

  return "border-[var(--border)] bg-white";
}

export default async function DebtorsPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const searchQuery = String(resolvedSearchParams.q ?? "").trim();

  const { sections } =
    await getPublishedHomeSectionsBySlug(slug);

  const debtorsSection = sections.find((section) => section.kind === "debtors");

  const content =
    debtorsSection &&
    typeof debtorsSection.content === "object" &&
    debtorsSection.content
      ? (debtorsSection.content as Record<string, unknown>)
      : null;

  const hasPublishedSnapshot = Boolean(
    content &&
      (typeof content.updatedAt === "string" ||
        Array.isArray(content.activeItems)),
  );

  const updatedAtLabel = formatUpdatedAt(content?.updatedAt);
  const payment = normalizePayment(content?.payment);
  const activeItems = normalizeItems(content?.activeItems);

  const visibleItems = searchQuery
    ? activeItems.filter((item) =>
        [item.apartmentLabel, item.accountNumber]
          .join(" ")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      )
    : activeItems;

  const totalAmount = activeItems.reduce(
    (sum, item) => sum + normalizeAmount(item.amount),
    0,
  );

  const noPublishedState = !hasPublishedSnapshot;
  const noDebtorsState = hasPublishedSnapshot && activeItems.length === 0;
  const noSearchResultsState =
    hasPublishedSnapshot && activeItems.length > 0 && visibleItems.length === 0;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8"><div className="text-center">
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Боржники
        </h1>

        <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
          Актуальна інформація про заборгованості по будинку та стан нарахувань.
        </p>

        <div className="mt-6 inline-flex rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--muted)]">
          Дата актуальності: {updatedAtLabel}
        </div>
      </div></div>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <article className="rounded-[28px] border border-[var(--border)] bg-white p-6">
          <div className="text-sm text-[var(--muted)]">Кількість боржників</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">
            {activeItems.length}
          </div>
        </article>

        <article className="rounded-[28px] border border-[var(--border)] bg-white p-6">
          <div className="text-sm text-[var(--muted)]">Загальна сума заборгованості</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(totalAmount)} ₴
          </div>
        </article>

        <article className="rounded-[28px] border border-[var(--border)] bg-white p-6">
          <div className="text-sm text-[var(--muted)]">Статус публікації</div>
          <div className="mt-3 text-lg font-semibold text-slate-900">
            {noPublishedState
              ? "Список не опубліковано"
              : noDebtorsState
                ? "Боржників немає"
                : "Список опубліковано"}
          </div>
        </article>
      </section>

      <div className="mt-8 rounded-[28px] border border-[var(--border)] bg-white p-6">
        <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder="Пошук за квартирою або особовим рахунком"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
          />
          <button
            type="submit"
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Знайти
          </button>
        </form>
      </div>

      <section className="mt-8">
        {noPublishedState ? (
          <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-white p-6 text-[var(--muted)]">
            Немає опублікованого списку заборгованостей.
          </div>
        ) : noDebtorsState ? (
          <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-white p-6 text-[var(--muted)]">
            На даний момент опублікований список не містить боржників.
          </div>
        ) : noSearchResultsState ? (
          <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-white p-6 text-[var(--muted)]">
            За вашим запитом нічого не знайдено.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-white">
            <div className="overflow-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Квартира
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Особовий рахунок
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Сума
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Термін
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleItems.map((item) => {
                    const amount = normalizeAmount(item.amount);

                    return (
                      <tr
                        key={item.apartmentId}
                        className={`border-b border-slate-200 ${getDebtRowClass(amount)}`}
                      >
                        <td className="px-5 py-4 text-sm font-medium text-slate-900">
                          {item.apartmentLabel || "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          {maskAccountNumber(item.accountNumber)}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                          {formatCurrency(amount)} ₴
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          {item.days ? `${item.days} дн.` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <PublicDebtorsPaymentBlock
        payment={payment}
        items={activeItems.map((item) => ({
          apartmentId: item.apartmentId,
          apartmentLabel: item.apartmentLabel,
          accountNumber: item.accountNumber,
          amount: item.amount,
        }))}
      />
    </section>
  );
}
