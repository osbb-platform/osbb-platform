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
    <div className="grid min-w-0 gap-1.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A9AB0] sm:pt-1">
        {label}
      </div>
      {href ? (
        <a
          href={href}
          className="min-w-0 break-words text-base leading-7 text-[#2F3A4F] transition hover:text-[#1F2A37]"
        >
          {value}
        </a>
      ) : (
        <div className="min-w-0 break-words text-base leading-7 text-[#2F3A4F]">{value}</div>
      )}
    </div>
  );
}

function getRoleTone(status: BoardRoleStatus) {
  switch (status) {
    case "chairman":
      return {
        chip: "border-[#E4C9C3] bg-[#F4E7E3] text-[#8C4C43]",
      };
    case "vice_chairman":
      return {
        chip: "border-[#C8D7EB] bg-[#EAF1F8] text-[#4A678A]",
      };
    case "revision_commission":
      return {
        chip: "border-[#CFE1D5] bg-[#E7F0E9] text-[#436B52]",
      };
    case "member":
    default:
      return {
        chip: "border-[#E3D6BA] bg-[#F4EEDF] text-[#866A36]",
      };
  }
}

function RoleCard({ role }: { role: BoardRoleItem }) {
  const tone = getRoleTone(role.status);

  return (
    <article
      className="w-full min-w-0 rounded-[24px] border border-[#E2D8CC] bg-[#F9F6F2] p-5 shadow-[0_8px_24px_rgba(31,42,55,0.05)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_14px_36px_rgba(31,42,55,0.08)] sm:rounded-[30px] sm:p-7"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className={`inline-flex rounded-full border px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone.chip}`}>
          {role.role || houseBoardCopy.card.roleFallback}
        </div>
      </div>

      <h3 className="mt-5 break-words text-2xl font-semibold tracking-tight text-[#1F2A37] sm:text-[3.1rem] sm:leading-[1.05]">
        {role.name || houseBoardCopy.card.nameFallback}
      </h3>

      <div className="mt-6 rounded-[22px] border border-[#E4DBD1] bg-[#F5F1EB] px-4 py-4 sm:mt-7 sm:px-5">
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
        <div className="mt-4 rounded-[20px] border border-[#E4DBD1] bg-[#F5F1EB] px-4 py-4 sm:mt-6 sm:px-5 sm:py-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A9AB0]">
            {houseBoardCopy.card.description}
          </div>
          <div className="mt-3 break-words text-sm leading-7 text-[#42546A] sm:text-base">
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
        <section className="w-full min-w-0 rounded-[28px] border border-[#E4DBD1] bg-[#F3EEE8] p-4 shadow-sm sm:rounded-[36px] sm:p-8 lg:p-10">
          <div className="min-w-0 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1F2A37] sm:text-4xl lg:text-6xl">
              {houseBoardCopy.page.title}
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#5B6B7C] sm:mt-5 sm:text-lg sm:leading-8">
              {houseBoardCopy.page.description}
            </p>
          </div>
          <div className="mt-8 rounded-[28px] border border-[#DDD4CA] bg-[#ECE6DF] p-3 shadow-sm backdrop-blur-sm">
            <div className="flex w-full min-w-0 justify-center gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
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
                        ? "border-2 text-[color:var(--tab-active-text)] bg-[color:var(--tab-active-bg)]"
                        : "border border-[#D8CEC2] bg-[#F6F2EC] text-[#2A3642] hover:bg-[#F0E9E1]"
                    }`}
                    style={isActive ? { "--tab-active-bg": `${districtColor}20`, "--tab-active-text": "#1F2A37", borderColor: districtColor } as React.CSSProperties : undefined}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isActive ? "bg-[#D9CFC3] text-[#1F2A44] border border-[#C4B7A7]" : "bg-[#E7DED3] text-[#2F3A4F] border border-[#D2C6B8]"
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
          <section className="relative w-full min-w-0 overflow-hidden rounded-[28px] border border-[#E4DBD1] bg-[linear-gradient(135deg,#F5EFE7_0%,#EEE7DE_100%)] p-5 shadow-[0_10px_30px_rgba(31,42,55,0.06)] sm:rounded-[34px] sm:p-8 lg:p-10">
            <div className="absolute inset-y-0 left-0 w-1.5 rounded-full bg-[#D8CEC2]" />
            <div className="pl-3 sm:pl-4">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7A5C3E]">
                {houseBoardCopy.page.intro}
              </div>
              <div className="mt-4 max-w-6xl whitespace-pre-wrap break-words text-base leading-8 text-[#34465B] sm:text-[1.65rem] sm:leading-[1.7]">
                {intro}
              </div>
            </div>
          </section>
        ) : null}

        {filteredRoles.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[#D8CEC2] bg-[#F9F6F2] p-4 text-center text-sm text-[#5F5A54] shadow-sm sm:rounded-[32px] sm:p-8">
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
