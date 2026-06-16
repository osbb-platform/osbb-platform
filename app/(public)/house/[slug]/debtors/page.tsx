import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHouseDebtors } from "@/src/modules/houses/services/getPublishedHouseDebtors";
import { PublicDebtorsPaymentBlock } from "@/src/modules/houses/components/PublicDebtorsPaymentBlock";
import { PublicDebtorsCalculatorBlock } from "@/src/modules/houses/components/PublicDebtorsCalculatorBlock";
import { isAmountEligibleForDebtors } from "@/src/modules/houses/utils/debtorsThreshold";

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

type CalculatorSettings = {
  enabled: boolean;
  courtFee: string;
  legalAid: string;
  inflationRate: string;
  enforcementRate: string;
  title: string;
  note: string;
  disclaimer: string;
};

function normalizeAmount(value: string) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, "")
    .replace(",", ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasValidBalance(value: string) {
  if (!String(value ?? "").trim()) return false;

  return Number.isFinite(
    Number(
      String(value ?? "")
        .replace(/\s+/g, "")
        .replace(",", "."),
    ),
  );
}

function isDebtBalance(value: string) {
  return isAmountEligibleForDebtors(value);
}

function normalizeSearchValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[№#]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function itemMatchesQuery(item: DebtorItem, query: string) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return true;
  }

  return [
    item.apartmentLabel,
    item.accountNumber,
    item.ownerName,
    item.apartmentLabel.replace(/^кв\.?\s*/i, ""),
  ].some((value) => normalizeSearchValue(value).includes(normalizedQuery));
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
    .filter((item) => hasValidBalance(item.amount));
}

function normalizeCalculator(value: unknown): CalculatorSettings | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;

  return {
    enabled: Boolean(raw.enabled),
    courtFee: String(raw.courtFee ?? "302.80").trim(),
    legalAid: String(raw.legalAid ?? "1000").trim(),
    inflationRate: String(raw.inflationRate ?? "20").trim(),
    enforcementRate: String(raw.enforcementRate ?? "10").trim(),
    title: String(raw.title ?? "Калькулятор судових витрат").trim(),
    note: String(raw.note ?? "").trim(),
    disclaimer: String(raw.disclaimer ?? "").trim(),
  };
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
    title:
      String(raw.title ?? "Оплата заборгованості").trim() ||
      "Оплата заборгованості",
    note: String(raw.note ?? "").trim(),
    buttonLabel:
      String(raw.buttonLabel ?? "Оплатити").trim() || "Оплатити",
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

function formatSignedBalance(amount: number) {
  if (amount > 0) return `+${formatCurrency(amount)} ₴`;
  if (amount < 0) return `−${formatCurrency(Math.abs(amount))} ₴`;

  return "0 ₴";
}

function getBalanceStatus(amount: number) {
  if (amount < 0) return "Є заборгованість";
  if (amount > 0) return "Позитивний баланс";

  return "Баланс 0";
}

function getBalanceRowClass(amount: number) {
  if (amount < 0) {
    return "border-[#E6CFCF] bg-[#F8ECEC]";
  }

  if (amount > 0) {
    return "border-[#CFE4D4] bg-[#EAF4EC]";
  }

  return "border-[#E5DBCF]";
}

function getBalanceTextClass(amount: number) {
  if (amount < 0) return "text-red-700";
  if (amount > 0) return "text-emerald-700";

  return "text-[#1F2A37]";
}

export default async function DebtorsPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const searchQuery = String(resolvedSearchParams.q ?? "").trim();

  const house = await getHouseBySlug(slug);

  const debtors = house
    ? await getPublishedHouseDebtors(house.id)
    : null;

  const content = debtors
    ? {
        updatedAt: debtors.activeItems.length > 0 ? debtors.updatedAt : null,
        payment: debtors.payment,
        calculator: debtors.calculator,
        activeItems: debtors.activeItems,
      }
    : null;

  const updatedAtLabel = formatUpdatedAt(content?.updatedAt);
  const payment = normalizePayment(content?.payment);
  const calculator = normalizeCalculator(content?.calculator);
  const balanceItems = normalizeItems(content?.activeItems);
  const debtItems = balanceItems.filter((item) => isDebtBalance(item.amount));

  const visibleItems = searchQuery
    ? balanceItems.filter((item) => itemMatchesQuery(item, searchQuery))
    : debtItems;

  const totalDebtAmount = debtItems.reduce(
    (sum, item) => sum + Math.abs(normalizeAmount(item.amount)),
    0,
  );

  const hasPublishedSnapshot = Boolean(content && balanceItems.length > 0);
  const noPublishedState = !hasPublishedSnapshot;
  const noDebtorsState = hasPublishedSnapshot && !searchQuery && debtItems.length === 0;
  const noSearchResultsState =
    hasPublishedSnapshot && Boolean(searchQuery) && visibleItems.length === 0;

  return (
    <section className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full min-w-0 rounded-[24px] border border-[#DDD4CA] bg-[#F3EEE8] p-4 shadow-sm sm:rounded-[32px] sm:p-8">
        <div className="min-w-0 text-center">
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:mt-4 sm:text-5xl">
            Нарахування та боржники
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-[#7A746B]">
            Актуальний баланс особових рахунків та список квартир із заборгованістю.
          </p>

          <div className="mt-6 inline-flex rounded-full border border-[#DDD4CA] bg-[#EAE2D8] px-4 py-2 text-sm font-medium text-[#2A3642]">
            Дата актуальності: {updatedAtLabel}
          </div>
        </div>
      </div>

      <section className="mt-8 mx-auto grid min-w-0 max-w-5xl justify-center gap-4 text-center lg:grid-cols-3">
        <article className="rounded-[22px] border border-[#DDD4CA] bg-[#F6F2EC] p-4 sm:rounded-[28px] sm:p-6">
          <div className="text-sm font-medium text-[#2A3642]">Кількість боржників</div>
          <div className="mt-3 text-3xl font-semibold text-[#1F2A37]">
            {debtItems.length}
          </div>
        </article>

        <article className="rounded-[22px] border border-[#DDD4CA] bg-[#F6F2EC] p-4 sm:rounded-[28px] sm:p-6">
          <div className="text-sm font-medium text-[#2A3642]">Загальна сума заборгованості</div>
          <div className="mt-3 text-3xl font-semibold text-[#1F2A37]">
            {formatCurrency(totalDebtAmount)} ₴
          </div>
        </article>

        <article className="rounded-[22px] border border-[#DDD4CA] bg-[#F6F2EC] p-4 sm:rounded-[28px] sm:p-6">
          <div className="text-sm font-medium text-[#2A3642]">Статус публікації</div>
          <div className="mt-3 text-lg font-semibold text-[#1F2A37]">
            {noPublishedState
              ? "Баланси не опубліковано"
              : debtItems.length === 0
                ? "Боржників немає"
                : "Баланси опубліковано"}
          </div>
        </article>
      </section>

      <div className="mt-8 w-full min-w-0 rounded-[28px] border border-[#DDD4CA] bg-[#EAE2D8] p-6">
        <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder="Введіть квартиру або особовий рахунок"
            className="w-full rounded-2xl border border-[#DDD4CA] bg-[#F6F2EC] px-4 py-3 text-[#1F2A37] outline-none transition hover:border-[#CBBBAA] focus:border-[#CBBBAA] focus:ring-2 focus:ring-[#E5DBCF]"
          />
          <button
            type="submit"
            className="rounded-2xl bg-[#DDD1C3] px-5 py-3 text-sm font-medium text-[#1F2A37] transition hover:bg-[#E5DBCF]"
          >
            Знайти
          </button>
        </form>

        <p className="mt-3 text-sm leading-6 text-[#7A746B]">
          Без пошуку показуються тільки квартири із заборгованістю. Через пошук мешканець може перевірити актуальний баланс своєї квартири або особового рахунку.
        </p>
      </div>

      <section className="mt-8 min-w-0">
        {noPublishedState ? (
          <div className="rounded-[28px] border border-dashed border-[#DDD4CA] bg-[#F6F2EC] p-6 text-[#7A746B]">
            Немає опублікованого списку балансів.
          </div>
        ) : noDebtorsState ? (
          <div className="rounded-[28px] border border-dashed border-[#DDD4CA] bg-[#F6F2EC] p-6 text-[#7A746B]">
            На даний момент за опублікованими балансами боржників немає. Для перевірки конкретної квартири скористайтесь пошуком.
          </div>
        ) : noSearchResultsState ? (
          <div className="rounded-[28px] border border-dashed border-[#DDD4CA] bg-[#F6F2EC] p-6 text-[#7A746B]">
            За вашим запитом нічого не знайдено.
          </div>
        ) : (
          <div className="w-full min-w-0 overflow-hidden rounded-[28px] border border-[#DDD4CA] bg-[#F3EEE8]">
            <div className="max-h-[520px] w-full overflow-x-auto overflow-y-auto overscroll-x-contain">
              <table className="w-full table-auto border-collapse">
                <thead className="sticky top-0 z-10 bg-[#EAE2D8]">
                  <tr className="border-b border-[#E5DBCF] text-left">
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[#2A3642]">
                      Квартира
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[#2A3642]">
                      Особовий рахунок
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[#2A3642]">
                      Баланс
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[#2A3642]">
                      Статус
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleItems.map((item) => {
                    const amount = normalizeAmount(item.amount);

                    return (
                      <tr
                        key={item.apartmentId}
                        className={`border-b border-[#E5DBCF] hover:bg-[#EDE3D9] ${getBalanceRowClass(amount)}`}
                      >
                        <td className="px-5 py-4 text-sm font-medium text-[#1F2A37]">
                          {item.apartmentLabel || "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-[#5B6B7C]">
                          {item.accountNumber || "—"}
                        </td>
                        <td className={`px-5 py-4 text-sm font-semibold ${getBalanceTextClass(amount)}`}>
                          {formatSignedBalance(amount)}
                        </td>
                        <td className="px-5 py-4 text-sm text-[#5B6B7C]">
                          {getBalanceStatus(amount)}
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
        items={debtItems.map((item) => ({
          apartmentId: item.apartmentId,
          apartmentLabel: item.apartmentLabel,
          accountNumber: item.accountNumber,
          amount: String(Math.abs(normalizeAmount(item.amount))),
        }))}
      />

      <PublicDebtorsCalculatorBlock
        calculator={calculator}
        hasPublishedDebtors={!noPublishedState && debtItems.length > 0}
      />
    </section>
  );
}
