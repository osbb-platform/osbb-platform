import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHouseDebtors } from "@/src/modules/houses/services/getPublishedHouseDebtors";
import { PublicDebtorsPaymentBlock } from "@/src/modules/houses/components/PublicDebtorsPaymentBlock";
import { PublicDebtorsCalculatorBlock } from "@/src/modules/houses/components/PublicDebtorsCalculatorBlock";
import { computeDebtorTotals } from "@/src/modules/houses/debtors-history/computeDebtorTotals";
import { isAmountEligibleForDebtors } from "@/src/modules/houses/utils/debtorsThreshold";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";

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
  monthsInDebt: number;
  seriesBroken: boolean;
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
        monthsInDebt:
          typeof raw.monthsInDebt === "number" && Number.isFinite(raw.monthsInDebt)
            ? raw.monthsInDebt
            : Number(String(raw.days ?? "0")) || 0,
        seriesBroken: Boolean(raw.seriesBroken),
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

const PERIOD_MONTHS = [
  "січень", "лютий", "березень", "квітень", "травень", "червень",
  "липень", "серпень", "вересень", "жовтень", "листопад", "грудень",
];

function formatPeriodLabel(
  period: { periodYear: number; periodMonth: number } | null | undefined,
) {
  if (!period) return "—";
  return `${PERIOD_MONTHS[period.periodMonth - 1] ?? period.periodMonth} ${period.periodYear}`;
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

// Семантика рядка балансу через токени: борг → danger, плюс → success.
function getBalanceRowClass(amount: number) {
  if (amount < 0) {
    return "border-[var(--pub-danger-border)] bg-[var(--pub-danger-bg)]";
  }

  if (amount > 0) {
    return "border-[var(--pub-success-border)] bg-[var(--pub-success-bg)]";
  }

  return "border-[var(--pub-border)]";
}

function getBalanceTextClass(amount: number) {
  if (amount < 0) return "text-[var(--pub-danger-text)]";
  if (amount > 0) return "text-[var(--pub-success-text)]";

  return "text-[var(--pub-text)]";
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
        latestPublishedMonth: debtors.latestPublishedMonth,
      }
    : null;

  const updatedAtLabel = formatUpdatedAt(content?.updatedAt);
  const latestPeriodLabel = formatPeriodLabel(content?.latestPublishedMonth);
  const payment = normalizePayment(content?.payment);
  const calculator = normalizeCalculator(content?.calculator);
  const balanceItems = normalizeItems(content?.activeItems);
  const debtItems = balanceItems.filter((item) => isDebtBalance(item.amount));

  const totals = computeDebtorTotals({
    rows: balanceItems.map((item) => ({
      accountNumber: item.accountNumber,
      closingBalance: normalizeAmount(item.amount),
    })),
  });

  const visibleItems = searchQuery
    ? balanceItems.filter((item) => itemMatchesQuery(item, searchQuery))
    : debtItems;

  const hasPublishedSnapshot = Boolean(content && balanceItems.length > 0);
  const noPublishedState = !hasPublishedSnapshot;
  const noDebtorsState = hasPublishedSnapshot && !searchQuery && debtItems.length === 0;
  const noSearchResultsState =
    hasPublishedSnapshot && Boolean(searchQuery) && visibleItems.length === 0;

  return (
    <div className="grid min-w-0 gap-6">
      <section className="w-full min-w-0 rounded-[var(--r-3xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-6 text-center shadow-[var(--pub-shadow-sm)] sm:p-8 lg:p-10">
        <h1 className="font-[var(--font-serif)] text-[clamp(2rem,4vw,3.4rem)] font-semibold tracking-[-0.01em] text-[var(--pub-text)]">
          Нарахування та боржники
        </h1>

        <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-[var(--pub-text-muted)] sm:text-lg">
          Актуальний баланс особових рахунків та список квартир із заборгованістю.
        </p>

        <div className="mt-6 inline-flex rounded-[var(--r-pill)] border border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] px-4 py-2 text-sm font-medium text-[var(--pub-text-muted)]">
          Актуальний період: {latestPeriodLabel} · Опубліковано: {updatedAtLabel}
        </div>
      </section>

      <section className="mx-auto grid min-w-0 w-full max-w-5xl justify-center gap-4 text-center lg:grid-cols-3">
        <article className="rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 shadow-[var(--pub-shadow-sm)] sm:p-6">
          <div className="text-sm font-medium text-[var(--pub-text-muted)]">Кількість боржників</div>
          <div className="mt-3 font-[var(--font-serif)] text-3xl font-semibold text-[var(--pub-text)]">
            {totals.debtorsCount}
          </div>
        </article>

        <article className="rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 shadow-[var(--pub-shadow-sm)] sm:p-6">
          <div className="text-sm font-medium text-[var(--pub-text-muted)]">Загальна сума заборгованості</div>
          <div className="mt-3 font-[var(--font-serif)] text-3xl font-semibold text-[var(--pub-text)]">
            {formatCurrency(totals.totalDebt)} ₴
          </div>
          <div className="mt-2 text-xs leading-5 text-[var(--pub-text-muted)]">
            Сума заборгованості всіх квартир будинку
          </div>
        </article>

        <article className="rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 shadow-[var(--pub-shadow-sm)] sm:p-6">
          <div className="text-sm font-medium text-[var(--pub-text-muted)]">Статус публікації</div>
          <div className="mt-3 text-lg font-semibold text-[var(--pub-text)]">
            {noPublishedState
              ? "Баланси не опубліковано"
              : debtItems.length === 0
                ? "Боржників немає"
                : "Баланси опубліковано"}
          </div>
        </article>
      </section>

      <div className="w-full min-w-0 rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-6">
        <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--pub-text-soft)]">
              <PubIcon name="search" className="h-[18px] w-[18px]" />
            </span>
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Введіть квартиру або особовий рахунок"
              className="h-12 w-full rounded-[var(--r-lg)] border border-[var(--pub-border-strong)] bg-[var(--pub-surface-elevated)] pl-11 pr-4 text-[15px] text-[var(--pub-text)] outline-none transition-shadow placeholder:text-[var(--pub-text-soft)] focus:border-[var(--pub-accent)] focus:shadow-[0_0_0_3px_var(--pub-accent-soft)]"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-[var(--r-pill)] bg-[var(--pub-accent)] px-6 text-sm font-semibold text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)] transition hover:brightness-[1.04] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)]"
          >
            Знайти
          </button>
        </form>

        <p className="mt-3 text-sm leading-6 text-[var(--pub-text-muted)]">
          Без пошуку показуються тільки квартири із заборгованістю. Через пошук мешканець може перевірити актуальний баланс своєї квартири або особового рахунку.
        </p>
      </div>

      <section className="min-w-0">
        {noPublishedState ? (
          <div className="rounded-[var(--r-2xl)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-6 text-[var(--pub-text-muted)]">
            Немає опублікованого списку балансів.
          </div>
        ) : noDebtorsState ? (
          <div className="rounded-[var(--r-2xl)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-6 text-[var(--pub-text-muted)]">
            На даний момент за опублікованими балансами боржників немає. Для перевірки конкретної квартири скористайтесь пошуком.
          </div>
        ) : noSearchResultsState ? (
          <div className="rounded-[var(--r-2xl)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-6 text-[var(--pub-text-muted)]">
            За вашим запитом нічого не знайдено.
          </div>
        ) : (
          <div className="w-full min-w-0 overflow-hidden rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)]">
            <div className="max-h-[520px] w-full overflow-x-auto overflow-y-auto overscroll-x-contain">
              <table className="w-full table-auto border-collapse">
                <thead className="sticky top-0 z-10 bg-[var(--pub-bg-quiet)]">
                  <tr className="border-b border-[var(--pub-border)] text-left">
                    <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--pub-text-muted)]">
                      Квартира
                    </th>
                    <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--pub-text-muted)]">
                      Особовий рахунок
                    </th>
                    <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--pub-text-muted)]">
                      Баланс
                    </th>
                    <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--pub-text-muted)]">
                      Місяців у боргу
                    </th>
                    <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--pub-text-muted)]">
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
                        className={`border-b ${getBalanceRowClass(amount)}`}
                      >
                        <td className="px-5 py-4 text-sm font-medium text-[var(--pub-text)]">
                          {item.apartmentLabel || "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-[var(--pub-text-muted)]">
                          {item.accountNumber || "—"}
                        </td>
                        <td className={`px-5 py-4 text-sm font-semibold ${getBalanceTextClass(amount)}`}>
                          {formatSignedBalance(amount)}
                        </td>
                        <td className="px-5 py-4 text-sm text-[var(--pub-text-muted)]">
                          {isDebtBalance(item.amount) &&
                          item.monthsInDebt >= 2 &&
                          !item.seriesBroken
                            ? item.monthsInDebt
                            : "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-[var(--pub-text-muted)]">
                          {getBalanceStatus(amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[var(--pub-border)] px-5 py-3 text-xs text-[var(--pub-text-muted)]">
              Історія ведеться з червня 2026
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
    </div>
  );
}
