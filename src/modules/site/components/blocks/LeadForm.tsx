"use client";

import { useState } from "react";

const roles = [
  "Голова ОСББ",
  "Член правління",
  "Управляюча компанія",
  "Інше",
] as const;

export function LeadForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (isSubmitted) {
    return (
      <div className="osbb-form-success" role="status">
        <span aria-hidden="true">✓</span>
        <div>
          <h3>Дякуємо за заявку</h3>
          <p>Ми зв&apos;яжемося з вами у робочий час.</p>
        </div>
      </div>
    );
  }

  return (
    <form
      className="osbb-form"
      onSubmit={(event) => {
        event.preventDefault();
        setIsSubmitted(true);
      }}
    >
      <div className="osbb-form__grid">
        <label>
          <span>Ваше ім&apos;я</span>
          <input
            autoComplete="name"
            maxLength={80}
            name="name"
            placeholder="Як до вас звертатися"
            required
            type="text"
          />
        </label>

        <label>
          <span>Телефон</span>
          <input
            autoComplete="tel"
            inputMode="tel"
            name="phone"
            placeholder="+38 (___) ___-__-__"
            required
            type="tel"
          />
        </label>

        <label>
          <span>Місто</span>
          <input
            autoComplete="address-level2"
            maxLength={80}
            name="city"
            placeholder="Ваше місто"
            required
            type="text"
          />
        </label>

        <label>
          <span>Ваша роль</span>
          <select defaultValue="" name="role" required>
            <option disabled value="">
              Оберіть варіант
            </option>

            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        <span>Коротко про будинок або запит</span>
        <textarea
          maxLength={1000}
          name="message"
          placeholder="Необов’язково"
          rows={4}
        />
      </label>

      <input
        aria-hidden="true"
        autoComplete="off"
        className="osbb-form__honeypot"
        name="company_website"
        tabIndex={-1}
        type="text"
      />

      <input name="utm_source" type="hidden" />
      <input name="utm_medium" type="hidden" />
      <input name="utm_campaign" type="hidden" />
      <input name="utm_content" type="hidden" />
      <input name="landing_page" type="hidden" />
      <input name="referrer" type="hidden" />

      <button className="osbb-btn osbb-btn--primary" type="submit">
        Залишити заявку
      </button>

      <p className="osbb-form__legal">
        Натискаючи кнопку, ви погоджуєтеся з політикою конфіденційності.
      </p>
    </form>
  );
}
