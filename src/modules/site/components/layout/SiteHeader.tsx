"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { ROUTES } from "@/src/shared/config/routes/routes.config";

import { SiteMark } from "../ui/SiteMark";

const navigation = [
  {
    href: ROUTES.site.capabilities,
    label: "Можливості",
  },
  {
    href: ROUTES.site.howItWorks,
    label: "Як це працює",
  },
  {
    href: ROUTES.site.pricing,
    label: "Вартість",
  },
  {
    href: ROUTES.site.moreThanPlatform,
    label: "Про нас",
  },
  {
    href: ROUTES.site.blog,
    label: "Блог",
  },
] as const;

export function SiteHeader() {
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <>
      <a className="osbb-skip" href="#main">
        Перейти до основного вмісту
      </a>

      <header className="osbb-header">
        <div className="osbb-container osbb-header__in">
          <Link className="osbb-brand" href={ROUTES.site.home}>
            <SiteMark />
            OSBB Platform
          </Link>

          <nav aria-label="Основне меню" className="osbb-nav">
            {navigation.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="osbb-header__act">
            <Link
              className="osbb-header__link"
              href={ROUTES.site.findHouse}
            >
              Знайти свій будинок
            </Link>

            <Link className="osbb-btn osbb-btn--primary" href="#zayavka">
              Підключити будинок
            </Link>
          </div>

          <button
            aria-controls={menuId}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Закрити меню" : "Відкрити меню"}
            className="osbb-burger"
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            <span aria-hidden="true" className="osbb-burger__lines">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </header>

      <div
        aria-hidden={!isOpen}
        className="osbb-mob"
        data-open={isOpen}
        id={menuId}
      >
        <div className="osbb-mob__top">
          <Link
            className="osbb-brand"
            href={ROUTES.site.home}
            onClick={closeMenu}
          >
            <SiteMark />
            OSBB Platform
          </Link>

          <button
            aria-label="Закрити меню"
            className="osbb-burger osbb-burger--visible"
            onClick={closeMenu}
            type="button"
          >
            <span aria-hidden="true" className="osbb-burger__close" />
          </button>
        </div>

        <nav aria-label="Мобільне меню" className="osbb-mob__nav">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href} onClick={closeMenu}>
              {item.label}
            </Link>
          ))}

          <Link href={ROUTES.site.findHouse} onClick={closeMenu}>
            Знайти свій будинок
          </Link>
        </nav>

        <div className="osbb-mob__act">
          <Link
            className="osbb-btn osbb-btn--primary osbb-btn--wide"
            href="#zayavka"
            onClick={closeMenu}
          >
            Підключити будинок
          </Link>
        </div>
      </div>
    </>
  );
}
