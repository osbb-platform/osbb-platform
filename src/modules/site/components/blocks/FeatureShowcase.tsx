import type { CabinetMockupData } from "@/src/modules/site/data/mockupData";

import { CabinetMockup } from "./CabinetMockup";
import { Eyebrow } from "../ui/Eyebrow";
import { Section } from "../ui/Section";

type FeatureShowcaseProps = {
  index: number;
  title: string;
  subtitle: string;
  bullets: readonly string[];
  mockup: CabinetMockupData;
  reverse?: boolean;
};

export function FeatureShowcase({
  index,
  title,
  subtitle,
  bullets,
  mockup,
  reverse = false,
}: FeatureShowcaseProps) {
  return (
    <Section
      className={reverse ? "osbb-feature osbb-feature--reverse" : "osbb-feature"}
      tone={index % 2 === 0 ? "quiet" : "default"}
    >
      <div className="osbb-feature__copy">
        <Eyebrow>Розділ {index} з 12</Eyebrow>
        <h2>{title}</h2>
        <p className="osbb-lead">{subtitle}</p>

        <ul className="osbb-check-list">
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </div>

      <div className="osbb-feature__visual">
        <CabinetMockup data={mockup} />
        <p className="osbb-note">
          Макет показового будинку з вигаданими даними.
        </p>
      </div>
    </Section>
  );
}
