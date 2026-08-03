import type { CabinetMockupData } from "@/src/modules/site/data/mockupData";

type CabinetMockupProps = {
  data: CabinetMockupData;
};

const navigation = [
  "Головна",
  "Оголошення",
  "Інформація",
  "Звіти",
  "План",
  "Збори",
  "Боржники",
  "Правління",
  "Спеціалісти",
  "Реквізити",
  "Документи",
  "Опитування",
] as const;

const statusLabels = {
  draft: "Чернетка",
  published: "Опубліковано",
  active: "Активно",
  completed: "Завершено",
  planned: "Заплановано",
} as const;

export function CabinetMockup({ data }: CabinetMockupProps) {
  return (
    <div className="osbb-cabinet">
      <div className="osbb-cabinet__bar">
        <span />
        <span />
        <span />
        <p>ОСББ «Соборний 186»</p>
      </div>

      <div className="osbb-cabinet__body">
        <aside className="osbb-cabinet__nav">
          <strong>Кабінет будинку</strong>

          <ul>
            {navigation.map((item) => (
              <li
                className={
                  item === data.activeNavigation
                    ? "osbb-cabinet__nav-active"
                    : undefined
                }
                key={item}
              >
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <div className="osbb-cabinet__content">
          <p className="osbb-cabinet__eyebrow">{data.eyebrow}</p>
          <h3>{data.title}</h3>
          <p className="osbb-cabinet__description">{data.description}</p>

          <div className="osbb-cabinet__rows">
            {data.rows.map((row) => (
              <div className="osbb-cabinet__row" key={`${row.label}-${row.meta}`}>
                <div>
                  <strong>{row.label}</strong>
                  {row.meta ? <small>{row.meta}</small> : null}
                </div>

                <div className="osbb-cabinet__row-side">
                  {row.value ? <span>{row.value}</span> : null}

                  {row.status ? (
                    <span
                      className={`osbb-cabinet__status osbb-cabinet__status--${row.status}`}
                    >
                      {statusLabels[row.status]}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
