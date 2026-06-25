import { houseCopy } from "@/src/shared/publicCopy/house";
import type { PublicHouseBellItem } from "@/src/modules/houses/services/getPublicHouseBellFeed";
import { PubIcon, type PubIconName } from "@/src/shared/ui/public/PublicIcons";

type PublicHouseBellPopupProps = {
  items: PublicHouseBellItem[];
};

/** Іконка + тон для секції фіду (вигляд; не змінює дані). */
function sectionLook(section: string): { icon: PubIconName; bg: string; fg: string } {
  const s = section.toLowerCase();
  if (s.includes("оголош")) {
    return { icon: "megaphone", bg: "bg-[var(--pub-warning-bg)]", fg: "text-[var(--pub-warning-text)]" };
  }
  if (s.includes("збор") || s.includes("засідан")) {
    return { icon: "calendar", bg: "bg-[var(--pub-info-bg)]", fg: "text-[var(--pub-info-text)]" };
  }
  if (s.includes("документ") || s.includes("звіт")) {
    return { icon: "doc", bg: "bg-[var(--pub-success-bg)]", fg: "text-[var(--pub-success-text)]" };
  }
  return { icon: "info", bg: "bg-[var(--pub-accent-soft)]", fg: "text-[var(--pub-accent-strong)]" };
}

export function PublicHouseBellPopup({
  items,
}: PublicHouseBellPopupProps) {
  return (
    <div className="fixed left-1/2 top-24 z-[70] w-[calc(100vw-2rem)] max-w-[23rem] -translate-x-1/2 overflow-hidden rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] shadow-[var(--pub-shadow-lg)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+12px)] sm:w-[min(92vw,400px)] sm:max-w-none sm:translate-x-0">
      <div className="border-b border-[var(--pub-border)] px-5 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pub-text-soft)]">
          {houseCopy.bell.title}
        </div>
        <div className="mt-1 text-sm font-medium text-[var(--pub-text-muted)]">
          {houseCopy.bell.period}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-[var(--r-pill)] bg-[var(--pub-accent-soft)] text-[var(--pub-accent-strong)]">
            <PubIcon name="bell" className="h-6 w-6" />
          </span>
          <div className="mt-3 text-sm leading-6 text-[var(--pub-text-muted)]">
            {houseCopy.bell.empty}
          </div>
        </div>
      ) : (
        <div className="max-h-[min(60vh,440px)] overflow-y-auto overscroll-contain sm:max-h-[540px]">
          <div className="divide-y divide-[var(--pub-border)]">
            {items.map((item) => {
              const look = sectionLook(item.section);

              return (
                <div
                  key={item.id}
                  className="flex gap-3.5 px-5 py-4 transition-colors hover:bg-[var(--pub-accent-tint)]"
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-md)] ${look.bg} ${look.fg}`}
                  >
                    <PubIcon name={look.icon} className="h-[18px] w-[18px]" />
                  </span>

                  <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-text-soft)]">
                        {item.section}
                      </div>

                      <div className="mt-1.5 text-[15px] font-medium leading-6 text-[var(--pub-text)]">
                        {item.text}
                      </div>
                    </div>

                    <div className="shrink-0 pt-0.5 text-[12px] font-medium text-[var(--pub-text-soft)]">
                      {item.date}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
