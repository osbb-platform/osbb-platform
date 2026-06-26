import { houseBoardCopy } from "@/src/shared/publicCopy/house";
import { notFound } from "next/navigation";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHouseBoard } from "@/src/modules/houses/services/getPublishedHouseBoard";
import { PubSectionHeader } from "@/src/shared/ui/public/PubSectionHeader";
import { PubFilterTabs, type PubFilterTabItem } from "@/src/shared/ui/public/PubFilterTabs";
import { PubBadge } from "@/src/shared/ui/public/PubBadge";
import type { PubTone } from "@/src/shared/ui/public/pubStyles";

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

function normalizeBoardRoleLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return "";
  }

  const map: Record<string, string> = {
    "Председатель": "Голова правління",
    "Председатель правления": "Голова правління",
    "Голова ОСББ": "Голова правління",
    "Заместитель председателя": "Заступник голови правління",
    "Член правления": "Член правління",
    "Члены правления": "Члени правління",
    "Ревизионная комиссия": "Ревізійна комісія",
  };

  return map[normalized] ?? normalized;
}

function normalizeBoardData(board: Awaited<ReturnType<typeof getPublishedHouseBoard>>) {
  return {
    intro: board.intro.intro.trim(),
    roles: board.members.map((member, index) => ({
      id: member.id,
      status: member.roleStatus,
      name: member.name.trim(),
      role: normalizeBoardRoleLabel(member.role),
      phone: member.phone.trim(),
      email: member.email.trim(),
      officeHours: member.officeHours.trim(),
      description: member.description.trim(),
      sortOrder:
        typeof member.sortOrder === "number" ? member.sortOrder : index,
    }) satisfies BoardRoleItem),
  };
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
    <div className="grid min-w-0 gap-1.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pub-text-soft)] sm:pt-1">
        {label}
      </div>
      {href ? (
        <a
          href={href}
          className="min-w-0 break-words text-base leading-7 text-[var(--pub-text)] transition hover:text-[var(--pub-accent-strong)]"
        >
          {value}
        </a>
      ) : (
        <div className="min-w-0 break-words text-base leading-7 text-[var(--pub-text)]">{value}</div>
      )}
    </div>
  );
}

function getRoleTone(status: BoardRoleStatus): PubTone {
  switch (status) {
    case "chairman":
      return "accent";
    case "vice_chairman":
      return "info";
    case "revision_commission":
      return "success";
    case "member":
    default:
      return "warning";
  }
}

function RoleCard({ role }: { role: BoardRoleItem }) {
  return (
    <article className="w-full min-w-0 rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 shadow-[var(--pub-shadow-sm)] transition hover:shadow-[var(--pub-shadow-md)] sm:p-7">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <PubBadge tone={getRoleTone(role.status)}>
          {role.role || houseBoardCopy.card.roleFallback}
        </PubBadge>
      </div>

      <h3 className="mt-5 break-words font-[var(--font-serif)] text-2xl font-semibold tracking-tight text-[var(--pub-text)] sm:text-[2.6rem] sm:leading-[1.08]">
        {role.name || houseBoardCopy.card.nameFallback}
      </h3>

      <div className="mt-6 rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-4 py-4 sm:mt-7 sm:px-5">
        <div className="space-y-4 sm:space-y-5">
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
      </div>

      {role.description ? (
        <div className="mt-4 rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-4 py-4 sm:mt-6 sm:px-5 sm:py-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pub-text-soft)]">
            {houseBoardCopy.card.description}
          </div>
          <div className="mt-3 break-words text-sm leading-7 text-[var(--pub-text-muted)] sm:text-base">
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

  const house = await getHouseBySlug(slug);

  if (!house) {
    notFound();
  }

  const board = await getPublishedHouseBoard(house.id);

  const normalized = normalizeBoardData(board);
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

  const filterTabs: PubFilterTabItem[] = FILTERS.map((item) => ({
    key: item.key,
    label: item.label,
    href: `/board?filter=${item.key}`,
    count: item.key === "all" ? counts.all : counts[item.key],
    active: filter === item.key,
  }));

  return (
    <div className="grid min-w-0 gap-6">
      <PubSectionHeader
        title={houseBoardCopy.page.title}
        description={houseBoardCopy.page.description}
      >
        <PubFilterTabs items={filterTabs} ariaLabel={houseBoardCopy.page.title} />
      </PubSectionHeader>

      {intro ? (
        <section className="relative w-full min-w-0 overflow-hidden rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-5 pl-6 shadow-[var(--pub-shadow-sm)] sm:p-8 sm:pl-9 lg:p-10 lg:pl-11">
          <span
            aria-hidden="true"
            className="absolute inset-y-5 left-0 w-1 rounded-[var(--r-pill)] bg-[var(--pub-accent)]"
          />
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--pub-text-soft)]">
            {houseBoardCopy.page.intro}
          </div>
          <div className="mt-4 max-w-6xl whitespace-pre-wrap break-words font-[var(--font-serif)] text-base leading-8 text-[var(--pub-text)] sm:text-[1.5rem] sm:leading-[1.7]">
            {intro}
          </div>
        </section>
      ) : null}

      {filteredRoles.length === 0 ? (
        <div className="rounded-[var(--r-2xl)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-surface)] p-6 text-center text-sm text-[var(--pub-text-muted)] shadow-[var(--pub-shadow-sm)] sm:p-8">
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
  );
}
