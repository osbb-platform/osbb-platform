import { CtaBlock } from "@/src/modules/site/components/blocks/CtaBlock";
import { PageHero } from "@/src/modules/site/components/blocks/PageHero";
import { Eyebrow } from "@/src/modules/site/components/ui/Eyebrow";
import { Section } from "@/src/modules/site/components/ui/Section";
import { getSiteCmsContent } from "@/src/modules/site/services/getSiteCmsContent";

export default async function ReleasesPage() {
  const { releases } = await getSiteCmsContent();

  const released = releases.filter((release) => release.status === "released");

  const planned = releases.filter((release) => release.status === "planned");

  return (
    <main id="main">
      <PageHero
        breadcrumb="Що ми випустили"
        description="Ми оновлюємо платформу постійно. Тут — що вже працює і над чим працюємо зараз."
        eyebrow="Розвиток"
        title="Що ми випустили"
      />

      <Section>
        <div className="osbb-head">
          <Eyebrow>Уже працює</Eyebrow>
          <h2>Стрічка оновлень</h2>
        </div>

        <ol className="osbb-release-list">
          {released.map((release) => (
            <li key={release.slug}>
              <div className="osbb-release-list__period">
                {release.periodLabel}
              </div>

              <div>
                <h3>{release.title}</h3>
                <p>{release.summary}</p>
              </div>

              <span className="osbb-badge osbb-badge--ok">
                {release.statusLabel}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="quiet">
        <div className="osbb-head">
          <Eyebrow>У роботі</Eyebrow>
          <h2>Над чим працюємо зараз</h2>
        </div>

        <div className="osbb-grid osbb-grid--2">
          {planned.map((release) => (
            <article className="osbb-card" key={release.slug}>
              <span className="osbb-badge osbb-badge--soon">
                {release.statusLabel}
              </span>

              <h3 className="osbb-release-card__title">{release.title}</h3>

              <p>{release.summary}</p>
            </article>
          ))}
        </div>
      </Section>

      <CtaBlock
        description="Залиште контакти — зателефонуємо, покажемо кабінет і розрахуємо умови для вашого будинку. Без зобов'язань."
        eyebrow="Заявка"
        title="Підключіть свій будинок"
      />
    </main>
  );
}
