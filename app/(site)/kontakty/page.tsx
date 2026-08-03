import { CtaBlock } from "@/src/modules/site/components/blocks/CtaBlock";
import { PageHero } from "@/src/modules/site/components/blocks/PageHero";
import { Card } from "@/src/modules/site/components/ui/Card";
import { Eyebrow } from "@/src/modules/site/components/ui/Eyebrow";
import { Section } from "@/src/modules/site/components/ui/Section";
import { siteSettings } from "@/src/modules/site/data/siteContent";

function toTelephoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export default function ContactsPage() {
  return (
    <main id="main">
      <PageHero
        breadcrumb="Контакти"
        description="Відповідаємо в робочий час. Якщо зручніше писати — пишіть у месенджер."
        eyebrow="Контакти"
        title="Зв’яжіться з нами"
      />

      <Section tone="quiet">
        <div className="osbb-head">
          <Eyebrow>Як нас знайти</Eyebrow>
          <h2>Виберіть, як вам зручніше</h2>
        </div>

        <div className="osbb-grid osbb-grid--3">
          <Card>
            <p className="osbb-contact-card__label">Телефон</p>

            <h3>
              <a href={toTelephoneHref(siteSettings.primaryPhone)}>
                {siteSettings.primaryPhone}
              </a>
            </h3>

            <p>Мобільний, приймаємо і в месенджерах.</p>
          </Card>

          <Card>
            <p className="osbb-contact-card__label">Telegram</p>

            <h3>
              <a
                href={siteSettings.telegramUrl}
                rel="noreferrer"
                target="_blank"
              >
                {siteSettings.telegramHandle}
              </a>
            </h3>

            <p>Напишіть — відповімо в робочий час.</p>
          </Card>

          <Card>
            <p className="osbb-contact-card__label">WhatsApp</p>

            <h3>
              <a
                href={siteSettings.whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                {siteSettings.primaryPhone}
              </a>
            </h3>

            <p>Зручно надіслати фото документів.</p>
          </Card>

          <Card>
            <p className="osbb-contact-card__label">Пошта</p>

            <h3>
              <a href={`mailto:${siteSettings.email}`}>
                {siteSettings.email}
              </a>
            </h3>

            <p>Для документів і детальних звернень.</p>
          </Card>

          <Card>
            <p className="osbb-contact-card__label">
              Міський телефон
            </p>

            <h3>
              <a href={toTelephoneHref(siteSettings.secondaryPhone)}>
                {siteSettings.secondaryPhone}
              </a>
            </h3>

            <p>{siteSettings.workingHours}</p>
          </Card>
        </div>
      </Section>

      <CtaBlock
        description="Чотири поля і одна кнопка. Зателефонуємо в робочий час, покажемо кабінет і розрахуємо умови для вашого будинку."
        eyebrow="Заявка"
        title="Підключіть свій будинок"
      />

      <Section>
        <div className="osbb-head">
          <Eyebrow>Реквізити</Eyebrow>
          <h2>Компанія-партнер</h2>
        </div>

        <dl className="osbb-company-details">
          <div>
            <dt>Назва</dt>
            <dd>{siteSettings.partnerName}</dd>
          </div>

          <div>
            <dt>Місто</dt>
            <dd>{siteSettings.partnerCity}</dd>
          </div>

          <div>
            <dt>Досвід роботи з ОСББ</dt>
            <dd>{siteSettings.partnerExperience}</dd>
          </div>

          <div>
            <dt>Пошта</dt>
            <dd>
              <a href={`mailto:${siteSettings.email}`}>
                {siteSettings.email}
              </a>
            </dd>
          </div>
        </dl>
      </Section>
    </main>
  );
}
