type FeatureLineIconKind =
  | "information"
  | "meetings"
  | "debtors"
  | "board"
  | "specialists"
  | "requisites"
  | "documents"
  | "polls";

type FeatureLineIconProps = {
  kind: FeatureLineIconKind;
};

const labels: Record<FeatureLineIconKind, string> = {
  information: "Інформація",
  meetings: "Збори",
  debtors: "Нарахування та боржники",
  board: "Правління",
  specialists: "Спеціалісти",
  requisites: "Реквізити",
  documents: "Установчі документи",
  polls: "Опитування",
};

function IconArtwork({ kind }: { kind: FeatureLineIconKind }) {
  switch (kind) {
    case "information":
      return (
        <g data-icon="information">
          <rect height="78" rx="12" width="64" x="28" y="21" />
          <path d="M43 43h34M43 56h22M43 82h34" />
          <circle cx="68" cy="69" r="2" />
          <path d="M68 69v8" />
        </g>
      );

    case "meetings":
      return (
        <g data-icon="meetings">
          <rect height="68" rx="12" width="82" x="19" y="31" />
          <path d="M19 48h82M39 23v16M81 23v16" />
          <circle cx="47" cy="66" r="8" />
          <circle cx="73" cy="66" r="8" />
          <path d="M34 89c3-10 10-15 21-15M86 89c-3-10-10-15-21-15" />
        </g>
      );

    case "debtors":
      return (
        <g data-icon="debtors">
          <rect height="62" rx="12" width="82" x="19" y="34" />
          <path d="M19 52h82M34 34V25h45v9" />
          <circle cx="76" cy="72" r="12" />
          <path d="M76 64v16M71 68h8M71 76h8" />
          <path d="M34 69h21M34 81h13" />
        </g>
      );

    case "board":
      return (
        <g data-icon="board">
          <circle cx="60" cy="42" r="13" />
          <circle cx="31" cy="53" r="9" />
          <circle cx="89" cy="53" r="9" />
          <path d="M39 92c1-18 9-28 21-28s20 10 21 28" />
          <path d="M16 92c1-14 7-22 17-22 5 0 9 2 12 6" />
          <path d="M104 92c-1-14-7-22-17-22-5 0-9 2-12 6" />
          <path d="m54 82 5 5 10-12" />
        </g>
      );

    case "specialists":
      return (
        <g data-icon="specialists">
          <circle cx="42" cy="43" r="13" />
          <path d="M20 94c2-23 9-34 22-34 8 0 14 4 18 12" />
          <path d="M72 30a17 17 0 0 0 18 24L69 75l-11-11 21-21a17 17 0 0 0-7-13Z" />
          <circle cx="86" cy="34" r="4" />
          <path d="m68 76 14 14" />
        </g>
      );

    case "requisites":
      return (
        <g data-icon="requisites">
          <path d="M19 47 60 24l41 23" />
          <path d="M26 49h68M31 49v35M48 49v35M72 49v35M89 49v35" />
          <path d="M21 85h78M16 96h88" />
          <rect height="18" rx="5" width="38" x="67" y="69" />
          <path d="M75 78h10M91 78h6" />
        </g>
      );

    case "documents":
      return (
        <g data-icon="documents">
          <path d="M33 24h43l16 16v55H33Z" />
          <path d="M76 24v17h16M46 55h32M46 67h32M46 79h20" />
          <path d="M27 33H19v63h56v-7" />
          <circle cx="83" cy="81" r="15" />
          <path d="m76 81 5 5 10-12" />
        </g>
      );

    case "polls":
      return (
        <g data-icon="polls">
          <rect height="74" rx="12" width="82" x="19" y="23" />
          <path d="M35 80V64M51 80V52M67 80V59M83 80V41" />
          <path d="M33 88h52" />
          <circle cx="37" cy="41" r="8" />
          <path d="m33 41 3 3 6-7" />
        </g>
      );
  }
}

export function FeatureLineIcon({ kind }: FeatureLineIconProps) {
  return (
    <div
      aria-label={labels[kind]}
      className="osbb-feature-line-icon"
      data-kind={kind}
      role="img"
    >
      <svg aria-hidden="true" fill="none" viewBox="0 0 120 120">
        <IconArtwork kind={kind} />
      </svg>

      <span>{labels[kind]}</span>
    </div>
  );
}
