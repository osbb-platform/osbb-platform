import type { ReactNode } from "react";

import { Breadcrumbs } from "../layout/Breadcrumbs";
import { Eyebrow } from "../ui/Eyebrow";

type PageHeroProps = {
  breadcrumb: string;
  eyebrow: string;
  title: string;
  description: string;
  note?: string;
  actions?: ReactNode;
  aside?: ReactNode;
};

export function PageHero({
  breadcrumb,
  eyebrow,
  title,
  description,
  note,
  actions,
  aside,
}: PageHeroProps) {
  return (
    <>
      <Breadcrumbs items={[{ label: breadcrumb }]} />

      <section className="osbb-page-hero">
        <div
          className={[
            "osbb-container",
            aside ? "osbb-page-hero__grid" : "osbb-page-hero__single",
          ].join(" ")}
        >
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1>{title}</h1>
            <p className="osbb-lead">{description}</p>

            {note ? <p className="osbb-page-hero__note">{note}</p> : null}
            {actions ? <div className="osbb-actions">{actions}</div> : null}
          </div>

          {aside ? <div>{aside}</div> : null}
        </div>
      </section>
    </>
  );
}
