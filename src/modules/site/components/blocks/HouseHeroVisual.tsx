import Image from "next/image";

export function HouseHeroVisual() {
  return (
    <figure className="osbb-house-hero-visual">
      <div className="osbb-house-hero-visual__image">
        <Image
          alt="Багатоквартирний будинок, підключений до OSBB Platform"
          fill
          priority
          sizes="(max-width: 900px) 100vw, 48vw"
          src="/site/house-photo-1.jpg"
        />
      </div>

      <figcaption>
        Особистий кабінет створюється і налаштовується окремо для кожного
        будинку.
      </figcaption>
    </figure>
  );
}
