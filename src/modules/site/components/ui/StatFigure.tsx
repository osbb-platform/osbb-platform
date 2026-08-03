type StatFigureProps = {
  label: string;
  value: number | string;
};

export function StatFigure({ label, value }: StatFigureProps) {
  return (
    <div className="osbb-stat">
      <div className="osbb-stat__num">{value}</div>
      <p className="osbb-stat__label">{label}</p>
    </div>
  );
}
