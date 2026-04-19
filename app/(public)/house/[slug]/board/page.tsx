import { houseBoardCopy } from "@/src/shared/publicCopy/house";
import Link from "next/link";
import { ensureHouseBoardSection } from "@/src/modules/houses/services/ensureHouseBoardSection";
import { getEnsuredPublishedHomeSectionsBySlug } from "@/src/modules/houses/services/getEnsuredPublishedHomeSectionsBySlug";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ filter?: string }>;
};

type BoardRoleStatus =
  | "chairman"
  | "vice_chairman"
  | "member"
  | "revision_commission";

type BoardFilter = "all" | BoardRoleStatus;

type BoardRoleItem = {
  id: string;
  status: BoardRoleStatus;
  name: string;
  role: string;
  phone: string;
  email: string;
  officeHours: string;
  description: string;
  sortOrder: number;
};

const FILTERS: Array<{
  key: BoardFilter;
  label: string;
}> = [
  { key: "all", label: houseBoardCopy.filters.all },
  { key: "chairman", label: houseBoardCopy.filters.chairman },
  { key: "vice_chairman", label: houseBoardCopy.filters.viceChairman },
  { key: "member", label: houseBoardCopy.filters.member },
  { key: "revision_commission", label: houseBoardCopy.filters.revisionCommission },
];

function normalizeFilter(value: unknown): BoardFilter {
  return value === "chairman" ||
    value === "vice_chairman" ||
    value === "member" ||
    value === "revision_commission" ||
    value === "all"
    ? value
    : "all";
}

function normalizePhoneForHref(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return `+${digits}`;
}

function normalizeBoardContent(content: Record<string, unknown>) {
  const intro =
    typeof content.intro === "string"
      ? content.intro.trim()
      : typeof content.message === "string"
        ? content.message.trim()
        : "";

  const roles =
    Array.isArray(content.roles)
      ? content.roles
          .map((item, index) => {
            if (!item || typeof item !== "object") return null;
            const raw = item as Record<string, unknown>;

            const status: BoardRoleStatus =
              raw.status === "chairman" ||
              raw.status === "vice_chairman" ||
              raw.status === "member" ||
              raw.status === "revision_commission"
                ? raw.status
                : "member";

            return {
              id:
                typeof raw.id === "string" && raw.id.trim()
                  ? raw.id
                  : `role-${index + 1}`,
              status,
              name: String(raw.name ?? "").trim(),
              role: String(raw.role ?? "").trim(),
              phone: String(raw.phone ?? "").trim(),
              email: String(raw.email ?? "").trim(),
              officeHours: String(raw.officeHours ?? "").trim(),
              description: String(raw.description ?? "").trim(),
              sortOrder:
                typeof raw.sortOrder === "number" ? raw.sortOrder : index,
            } satisfies BoardRoleItem;
          })
          .filter((item): item is BoardRoleItem => Boolean(item))
      : [];

  return { intro, roles };
}

function sortRolesByPriority(roles: BoardRoleItem[]) {
  const priorityMap = new Map<BoardRoleStatus, number>([
    ["chairman", 0],
    ["vice_chairman", 1],
    ["member", 2],
    ["revision_commission", 3],
  ]);

  return [...roles].sort((a, b) => {
    const aPriority = priorityMap.get(a.status) ?? 999;
    const bPriority = priorityMap.get(b.status) ?? 999;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return a.sortOrder - b.sortOrder;
  });
}

function ContactLine({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  if (!value) return null;

  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="w-20 shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 sm:w-[110px]">
        {label}
      </div>
      {href ? (
        <a
          href={href}
          className="min-w-0 break-words text-sm leading-7 text-slate-700 transition hover:text-slate-950"
        >
          {value}
        </a>
      ) : (
        <div className="min-w-0 break-words text-sm leading-7 text-slate-700">{value}</div>
      )}
    </div>
  );
}

function RoleCard({ role }: { role: BoardRoleItem }) {
  return (
    <article className="w-full min-w-0 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-[30px] sm:p-7">
      <div className="inline-flex rounded-full border border-slate-300 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-900">
        {role.role || houseBoardCopy.card.roleFallback}
      </div>

      <h3 className="mt-3 break-words text-lg font-semibold tracking-tight text-slate-950 sm:mt-5 sm:text-3xl">
        {role.name || houseBoardCopy.card.nameFallback}
      </h3>

      <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
        <ContactLine
          label={houseBoardCopy.card.phone}
          value={role.phone}
          href={role.phone ? `tel:${normalizePhoneForHref(role.phone)}` : undefined}
        />

        <ContactLine
          label={houseBoardCopy.card.email}
          value={role.email}
          href={role.email ? `mailto:${role.email}` : undefined}
        />

        <ContactLine
          label={houseBoardCopy.card.officeHours}
          value={role.officeHours}
        />
      </div>

      {role.description ? (
        <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 sm:mt-6 sm:rounded-[22px] sm:px-5 sm:py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {houseBoardCopy.card.description}
          </div>
          <div className="mt-2 break-words text-sm leading-6 text-slate-700 sm:mt-3 sm:leading-7">
            {role.description}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default async function BoardPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filter = normalizeFilter(resolvedSearchParams.filter);

  const { house, sections } =
    await getEnsuredPublishedHomeSectionsBySlug({
      slug,
      ensureSection: ensureHouseBoardSection,
    });

  const districtColor = house.district?.theme_color ?? "#0f172a";
  const boardSection = sections.find((section) => section.kind === "contacts");

  const content =
    boardSection &&
    typeof boardSection.content === "object" &&
    boardSection.content
      ? (boardSection.content as Record<string, unknown>)
      : {};

  const normalized = normalizeBoardContent(content);
  const roles = sortRolesByPriority(normalized.roles);
  const intro = normalized.intro.trim();

  const counts = {
    all: roles.length,
    chairman: roles.filter((item) => item.status === "chairman").length,
    vice_chairman: roles.filter((item) => item.status === "vice_chairman").length,
    member: roles.filter((item) => item.status === "member").length,
    revision_commission: roles.filter(
      (item) => item.status === "revision_commission",
    ).length,
  };

  const filteredRoles =
    filter === "all"
      ? roles
      : roles.filter((item) => item.status === filter);

  return (
    <section className="mx-auto w-full min-w-0 max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid min-w-0 gap-6">
        <section className="w-full min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[36px] sm:p-8 lg:p-10">
          <div className="min-w-0 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-6xl">
              {houseBoardCopy.page.title}
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:mt-5 sm:text-lg sm:leading-8">
              {houseBoardCopy.page.description}
            </p>
          </div>
          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur-sm">
            <div className="flex w-full min-w-0 gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
              {FILTERS.map((item) => {
                const isActive = filter === item.key;
                const count =
                  item.key === "all" ? counts.all : counts[item.key];

                return (
                  <Link
                    key={item.key}
                    href={`/house/${slug}/board?filter=${item.key}`}
                    className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${
                      isActive
                        ? "text-white shadow-sm"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                    style={isActive ? { backgroundColor: districtColor } : undefined}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isActive ? "bg-white/20 text-white" : "bg-white text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {intro ? (
          <section className="w-full min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[30px] sm:p-8">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              {houseBoardCopy.page.intro}
            </div>
            <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 sm:mt-4 sm:text-lg sm:leading-8">
              {intro}
            </div>
          </section>
        ) : null}

        {filteredRoles.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-4 text-sm text-center text-slate-500 shadow-sm sm:rounded-[32px] sm:p-8">
            {houseBoardCopy.page.empty}
          </div>
        ) : (
          <div className="grid min-w-0 gap-5 md:grid-cols-2">
            {filteredRoles.map((role) => (
              <RoleCard key={role.id} role={role} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
