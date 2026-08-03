import Link from "next/link";

import { siteSettings } from "@/src/modules/site/data/siteContent";
import { ROUTES } from "@/src/shared/config/routes/routes.config";

import { SiteMark } from "../ui/SiteMark";

function toTelephoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function SiteFooter() {
  return (
    <footer className="osbb-footer">
      <div className="osbb-container">
        <div className="osbb-footer__grid">
          <div>
            <p className="osbb-footer__brand">
              <SiteMark />
              {siteSettings.organizationName}
            </p>

            <p>
              Особистий кабінет будинку, який веде за вас команда.
            </p>
          </div>

          <div>
            <h3>Сервіс</h3>

            <ul>
              <li>
                <Link href={ROUTES.site.capabilities}>Можливості</Link>
              </li>
              <li>
                <Link href={ROUTES.site.howItWorks}>Як це працює</Link>
              </li>
              <li>
                <Link href={ROUTES.site.pricing}>Вартість</Link>
              </li>
              <li>
                <Link href={ROUTES.site.demo}>Демо-кабінет</Link>
              </li>
              <li>
                <Link href={ROUTES.site.residents}>Мешканцям</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3>Компанія</h3>

            <ul>
              <li>
                <Link href={ROUTES.site.moreThanPlatform}>
                  Більше ніж платформа
                </Link>
              </li>
              <li>
                <Link href={ROUTES.site.blog}>Блог</Link>
              </li>
              <li>
                <Link href={ROUTES.site.releases}>
                  Що ми випустили
                </Link>
              </li>
              <li>
                <Link href={ROUTES.site.contacts}>Контакти</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3>Зв&apos;язок</h3>

            <ul>
              <li>
                <a href={toTelephoneHref(siteSettings.primaryPhone)}>
                  {siteSettings.primaryPhone}
                </a>
              </li>
              <li>
                <a href={toTelephoneHref(siteSettings.secondaryPhone)}>
                  {siteSettings.secondaryPhone}
                </a>
              </li>
              <li>
                <a href={`mailto:${siteSettings.email}`}>
                  {siteSettings.email}
                </a>
              </li>
              <li>
                <a
                  href={siteSettings.telegramUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Telegram
                </a>
              </li>
              <li>
                <a
                  href={siteSettings.whatsappUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  WhatsApp
                </a>
              </li>
            </ul>

            <p className="osbb-footer__partner">
              Партнер сервісу
              <br />
              {siteSettings.partnerName}, {siteSettings.partnerCity}
            </p>
          </div>
        </div>

        <div className="osbb-footer__bot">
          <span>© 2026 {siteSettings.organizationName}</span>

          <Link href={ROUTES.site.privacy}>
            Політика конфіденційності
          </Link>
        </div>
      </div>
    </footer>
  );
}
