"use client";
import { houseHomeCopy } from "@/src/shared/publicCopy/house";

import { useEffect, useMemo, useState } from "react";

type PublicHouseHeroCarouselProps = {
  slug: string;
  districtColor: string;
  headline: string;
  subheadline: string;
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
}: PublicHouseHeroCarouselProps) {
  const slides = useMemo<Slide[]>(
    () => [
      {
        image:
          "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1280&q=68",
        eyebrow: houseHomeCopy.hero.slides.main.eyebrow,
        title: headline,
        description:
          subheadline || houseHomeCopy.hero.slides.main.fallbackDescription,
      },
      {
        image:
          "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1280&q=68",
        eyebrow: houseHomeCopy.hero.slides.life.eyebrow,
        title: houseHomeCopy.hero.slides.life.title,
        description:
          houseHomeCopy.hero.slides.life.description,
      },
      {
        image:
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1280&q=68",
        eyebrow: houseHomeCopy.hero.slides.all.eyebrow,
        title: houseHomeCopy.hero.slides.all.title,
        description:
          houseHomeCopy.hero.slides.all.description,
      },
    ],
    [headline, subheadline],
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
      <div className="relative overflow-hidden overflow-hidden rounded-[30px]">
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-300"
          style={{ backgroundImage: `url("${currentSlide.image}")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />

        <div className="relative overflow-hidden flex min-h-[460px] flex-col justify-between p-6 text-white sm:min-h-[540px] sm:p-8 lg:min-h-[620px] lg:p-10">
          <div className="flex items-start justify-between gap-4">
            <div
              className="inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm"
              style={{ backgroundColor: districtColor + "CC" }}
            >
              {houseHomeCopy.hero.badge}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPrev}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/25 backdrop-blur-md text-white shadow-md transition hover:bg-white/40"
                aria-label={houseHomeCopy.hero.navigation.prev}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <button
                type="button"
                onClick={goToNext}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/25 backdrop-blur-md text-white shadow-md transition hover:bg-white/40"
                aria-label={houseHomeCopy.hero.navigation.next}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>

          <div className="max-w-4xl">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/78">
              {currentSlide.eyebrow}
            </div>

            <h1 className="mt-4 max-w-4xl text-[clamp(2.6rem,6vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
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
                  className={`h-2.5 rounded-full transition-all ${
                    isActive ? "w-12 bg-white" : "w-2.5 bg-white/40"
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
