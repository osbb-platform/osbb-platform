"use client";

type Props = {
  name: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
  emptyLabel: string;
  className?: string;
};

export function PublicPlanArchiveMonthSelect({
  name,
  defaultValue,
  options,
  emptyLabel,
  className,
}: Props) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className={className}
    >
      {options.length > 0 ? (
        options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))
      ) : (
        <option value="">{emptyLabel}</option>
      )}
    </select>
  );
}
