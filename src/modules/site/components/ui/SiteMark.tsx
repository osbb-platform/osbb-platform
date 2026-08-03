import Image from "next/image";

type SiteMarkProps = {
  className?: string;
};

export function SiteMark({ className }: SiteMarkProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={40}
      priority
      src="/site/osbb-admin-mark.svg"
      width={40}
    />
  );
}
