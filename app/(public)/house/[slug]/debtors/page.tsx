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
      title: "Оплата заборгованості",
      note: "",
      buttonLabel: "Оплатити",
    };
  }

  const raw = value as Record<string, unknown>;

  return {
    url: String(raw.url ?? "").trim(),
    title: String(raw.title ?? "Оплата заборгованості").trim() || "Оплата заборгованості",
    note: String(raw.note ?? "").trim(),
    buttonLabel: String(raw.buttonLabel ?? "Оплатити").trim() || "Оплатити",
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


function getDebtRowClass(amount: number) {
  if (amount >= 10000) {
    return "border-[#E6CFCF] bg-[#F5E6E6]";
  }

  if (amount >= 5000) {
    return "border-[#E6CFCF] bg-[#F8ECEC]";
  }

  return "border-[#E5DBCF]";
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
    <section className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full min-w-0 rounded-[24px] border border-[#DDD4CA] bg-[#F3EEE8] p-4 shadow-sm sm:rounded-[32px] sm:p-8"><div className="min-w-0 text-center">
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:mt-4 sm:text-5xl">
          Боржники
        </h1>

        <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-[#7A746B]">
          Актуальна інформація про заборгованості по будинку та стан нарахувань.
        </p>

        <div className="mt-6 inline-flex rounded-full border border-[#DDD4CA] bg-[#EAE2D8] px-4 py-2 text-sm font-medium text-[#2A3642]">
          Дата актуальності: {updatedAtLabel}
        </div>
      </div></div>

      <section className="mt-8 mx-auto max-w-5xl grid min-w-0 gap-4 lg:grid-cols-3 justify-center text-center">
        <article className="rounded-[22px] border border-[#DDD4CA] bg-[#F6F2EC] p-4 sm:rounded-[28px] sm:p-6">
          <div className="text-sm font-medium text-[#2A3642]">Кількість боржників</div>
          <div className="mt-3 text-3xl font-semibold text-[#1F2A37]">
            {activeItems.length}
          </div>
        </article>

        <article className="rounded-[22px] border border-[#DDD4CA] bg-[#F6F2EC] p-4 sm:rounded-[28px] sm:p-6">
          <div className="text-sm font-medium text-[#2A3642]">Загальна сума заборгованості</div>
          <div className="mt-3 text-3xl font-semibold text-[#1F2A37]">
            {formatCurrency(totalAmount)} ₴
          </div>
        </article>

        <article className="rounded-[22px] border border-[#DDD4CA] bg-[#F6F2EC] p-4 sm:rounded-[28px] sm:p-6">
          <div className="text-sm font-medium text-[#2A3642]">Статус публікації</div>
          <div className="mt-3 text-lg font-semibold text-[#1F2A37]">
            {noPublishedState
              ? "Список не опубліковано"
              : noDebtorsState
                ? "Боржників немає"
                : "Список опубліковано"}
          </div>
        </article>
      </section>

      <div className="mt-8 w-full min-w-0 rounded-[28px] border border-[#DDD4CA] bg-[#EAE2D8] p-6">
        <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder="Пошук за квартирою або особовим рахунком"
            className="w-full rounded-2xl border border-[#DDD4CA] bg-[#F6F2EC] px-4 py-3 text-[#1F2A37] outline-none transition hover:border-[#CBBBAA] focus:border-[#CBBBAA] focus:ring-2 focus:ring-[#E5DBCF]"
          />
          <button
            type="submit"
            className="rounded-2xl bg-[#DDD1C3] px-5 py-3 text-sm font-medium text-[#1F2A37] transition hover:bg-[#E5DBCF]"
          >
            Знайти
          </button>
        </form>
      </div>

      <section className="mt-8 min-w-0">
        {noPublishedState ? (
          <div className="rounded-[28px] border border-dashed border-[#DDD4CA] bg-[#F6F2EC] p-6 text-[#7A746B]">
            Немає опублікованого списку заборгованостей.
          </div>
        ) : noDebtorsState ? (
          <div className="rounded-[28px] border border-dashed border-[#DDD4CA] bg-[#F6F2EC] p-6 text-[#7A746B]">
            На даний момент опублікований список не містить боржників.
          </div>
        ) : noSearchResultsState ? (
          <div className="rounded-[28px] border border-dashed border-[#DDD4CA] bg-[#F6F2EC] p-6 text-[#7A746B]">
            За вашим запитом нічого не знайдено.
          </div>
        ) : (
          <div className="w-full min-w-0 overflow-hidden rounded-[28px] border border-[#DDD4CA] bg-[#F3EEE8]">
            <div className="w-full overflow-x-auto overflow-y-auto max-h-[520px] overscroll-x-contain">
              <table className="w-full table-auto border-collapse">
                <thead className="bg-[#EAE2D8] sticky top-0 z-10">
                  <tr className="border-b border-[#E5DBCF] text-left">
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[#2A3642]">
                      Квартира
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[#2A3642]">
                      Особовий рахунок
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[#2A3642]">
                      Сума
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[#2A3642]">
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
                        className={`border-b border-[#E5DBCF] hover:bg-[#EDE3D9] ${getDebtRowClass(amount)}`}
                      >
                        <td className="px-5 py-4 text-sm font-medium text-[#1F2A37]">
                          {item.apartmentLabel || "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-[#5B6B7C]">
                          {item.accountNumber || "—"}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-[#1F2A37]">
                          {formatCurrency(amount)} ₴
                        </td>
                        <td className="px-5 py-4 text-sm text-[#5B6B7C]">
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
