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

export function FeatureLineIcon({ kind }: FeatureLineIconProps) {
  return (
    <div
      aria-label={labels[kind]}
      className="osbb-feature-line-icon"
      data-kind={kind}
      role="img"
    >
      <svg aria-hidden="true" fill="none" viewBox="0 0 120 120">
        <rect height="82" rx="14" width="82" x="19" y="19" />
        <path d="M38 43h44M38 59h30M38 75h38" />
        <circle cx="82" cy="76" r="12" />
        <path d="m76 76 4 4 8-9" />
      </svg>

      <span>{labels[kind]}</span>
    </div>
  );
}
