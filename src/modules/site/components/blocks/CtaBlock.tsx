import { LeadForm } from "./LeadForm";

type CtaBlockProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
};

export function CtaBlock({
  eyebrow = "Підключення",
  title = "Покажемо, як це працює для вашого будинку",
  description = "Залиште контакти — ми зв’яжемося, відповімо на запитання і покажемо кабінет.",
}: CtaBlockProps) {
  return (
    <section className="osbb-cta" id="zayavka">
      <div className="osbb-container osbb-cta__grid">
        <div className="osbb-cta__copy">
          <p className="osbb-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <div className="osbb-cta__form">
          <LeadForm />
        </div>
      </div>
    </section>
  );
}
