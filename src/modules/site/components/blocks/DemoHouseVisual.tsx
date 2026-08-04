import Image from "next/image";

type DemoHouseVisualProps = {
  address: string;
  name: string;
};

export function DemoHouseVisual({ address, name }: DemoHouseVisualProps) {
  return (
    <figure className="osbb-demo-house">
      <div className="osbb-demo-house__image">
        <Image
          alt="Показовий багатоквартирний будинок OSBB Platform"
          fill
          sizes="(max-width: 900px) 100vw, 48vw"
          src="/site/house-photo-2.jpg"
        />
      </div>

      <figcaption>
        <strong>{name}</strong>
        <span>{address}</span>
      </figcaption>
    </figure>
  );
}
