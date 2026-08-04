import { ApprovedCabinetPreview } from "@/src/modules/site/components/blocks/ApprovedCabinetPreview";
import { FeatureLineIcon } from "@/src/modules/site/components/blocks/FeatureLineIcon";
import { Section } from "@/src/modules/site/components/ui/Section";

type RealPreviewKind = "home" | "announcements" | "reports" | "plan";

type IconKind =
  | "information"
  | "meetings"
  | "debtors"
  | "board"
  | "specialists"
  | "requisites"
  | "documents"
  | "polls";

type FeatureShowcaseProps = {
  bullets: readonly string[];
  id: string;
  index: number;
  reverse?: boolean;
  subtitle: string;
  title: string;
  visual: RealPreviewKind | IconKind;
};

const realPreviewKinds = new Set<RealPreviewKind>([
  "home",
  "announcements",
  "reports",
  "plan",
]);

function isRealPreview(
  visual: RealPreviewKind | IconKind,
): visual is RealPreviewKind {
  return realPreviewKinds.has(visual as RealPreviewKind);
}

export function FeatureShowcase({
  bullets,
  id,
  index,
  reverse = false,
  subtitle,
  title,
  visual,
}: FeatureShowcaseProps) {
  return (
    <Section tone={index % 2 === 0 ? "quiet" : undefined}>
      <article
        className={`osbb-feature ${reverse ? "osbb-feature--reverse" : ""}`}
        id={id}
      >
        <div className="osbb-feature__copy">
          <span className="osbb-feature__index">
            {String(index).padStart(2, "0")}
          </span>

          <h2>{title}</h2>
          <p className="osbb-feature__subtitle">{subtitle}</p>

          <ul className="osbb-check-list">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>

        <div className="osbb-feature__visual">
          {isRealPreview(visual) ? (
            <ApprovedCabinetPreview kind={visual} />
          ) : (
            <FeatureLineIcon kind={visual} />
          )}
        </div>
      </article>
    </Section>
  );
}
