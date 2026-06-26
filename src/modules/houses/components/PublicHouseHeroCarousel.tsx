"use client";
import { houseHomeCopy } from "@/src/shared/publicCopy/house";

import { useEffect, useMemo, useState } from "react";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";

type PublicHouseHeroCarouselProps = {
  slug: string;
  districtColor: string;
  headline: string;
  subheadline: string;
  houseCoverImageUrl?: string | null;
};

type Slide = {
  image: string;
  eyebrow: string;
  title: string;
  description: string;
};

export function PublicHouseHeroCarousel({
  districtColor,
  headline,
  subheadline,
  houseCoverImageUrl,
}: PublicHouseHeroCarouselProps) {
  void districtColor; // акцент району береться з токена --pub-accent, не з пропса

  const slides = useMemo<Slide[]>(
    () => [
      {
        image:
          houseCoverImageUrl ??
          "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1280&q=68",
        eyebrow: houseHomeCopy.hero.slides.main.eyebrow,
        title: headline,
        description:
          subheadline || houseHomeCopy.hero.slides.main.fallbackDescription,
      },
      {
        image: "/images/house/hero-life.jpg",
        eyebrow: houseHomeCopy.hero.slides.life.eyebrow,
        title: houseHomeCopy.hero.slides.life.title,
        description: houseHomeCopy.hero.slides.life.description,
      },
      {
        image: "/images/house/hero-main.jpg",
        eyebrow: houseHomeCopy.hero.slides.all.eyebrow,
        title: houseHomeCopy.hero.slides.all.title,
        description: houseHomeCopy.hero.slides.all.description,
      },
    ],
    [headline, houseCoverImageUrl, subheadline],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSlide = slides[currentIndex];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 7000);

    return () => window.clearInterval(intervalId);
  }, [slides.length]);

  function goToPrev() {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }

  function goToNext() {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }

  return (
    <section className="w-full">
      <div className="relative overflow-hidden rounded-[var(--r-3xl)] border border-[var(--pub-border)]">
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-300"
          style={{ backgroundImage: `url("${currentSlide.image}")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/15" />

        <div className="relative flex min-h-[440px] flex-col justify-between p-6 text-white sm:min-h-[520px] sm:p-8 lg:min-h-[600px] lg:p-10">
          <div className="flex items-start justify-between gap-4">
            <div className="inline-flex rounded-[var(--r-pill)] bg-[var(--pub-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)]">
              {houseHomeCopy.hero.badge}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPrev}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-pill)] border border-white/30 bg-white/20 text-white shadow-md backdrop-blur-md transition hover:bg-white/35"
                aria-label={houseHomeCopy.hero.navigation.prev}
              >
                <PubIcon name="chevron-right" className="h-5 w-5 rotate-180" />
              </button>

              <button
                type="button"
                onClick={goToNext}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-pill)] border border-white/30 bg-white/20 text-white shadow-md backdrop-blur-md transition hover:bg-white/35"
                aria-label={houseHomeCopy.hero.navigation.next}
              >
                <PubIcon name="chevron-right" className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="max-w-4xl">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/78">
              {currentSlide.eyebrow}
            </div>

            <h1 className="mt-4 max-w-4xl font-[var(--font-serif)] text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-[1.0] tracking-[-0.03em]">
              {currentSlide.title}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-white/86 sm:text-lg">
              {currentSlide.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {slides.map((slide, index) => {
              const isActive = index === currentIndex;

              return (
                <button
                  key={slide.title}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2.5 rounded-[var(--r-pill)] transition-all ${
                    isActive ? "w-12 bg-[var(--pub-accent)]" : "w-2.5 bg-white/45"
                  }`}
                  aria-label={houseHomeCopy.hero.navigation.goTo(index + 1)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
